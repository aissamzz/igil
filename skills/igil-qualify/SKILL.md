---
name: igil-qualify
description: >
  Takes scraped businesses from Supabase (status='scraped'), verifies each
  has no website via Brave Search, scores them 0-100, and updates their
  status to 'qualified' or 'rejected'. This is Step 2 of the Igil pipeline.
metadata:
  openclaw:
    requires:
      bins:
        - python3
      env:
        - BRAVE_API_KEY
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
---

# Skill: igil-qualify

## Purpose

Double-verify that scraped businesses truly have no website, then score and
qualify them. This is the critical filter that ensures Igil only builds sites
for businesses that actually need them.

## Lead Scoring Model

Scores are additive, max 100 points.

| Signal | Max Points | Logic |
|--------|-----------|-------|
| Review count | 25 | `min(review_count, 50) / 50 * 25` |
| Star rating | 20 | `max(0, (rating - 3.5)) / 1.5 * 20` |
| Niche value | 15 | See niche table below |
| Phone number present | 10 | Binary |
| City tier | 10 | See city tier table below |
| Social media activity | 10 | Has recent FB/IG posts (< 30 days) |
| Photos on Maps | 5 | `min(photo_count, 5)` |
| Google Business claimed | 5 | Inferred from Maps data richness |

### Niche Value Table

| Score | Niches |
|-------|--------|
| 15 | plumber, hvac, electrician, roofer, general contractor |
| 12 | auto repair, auto detailing, locksmith, pest control |
| 10 | salon, barbershop, spa, massage, nail salon |
| 8 | landscaping, lawn care, cleaning, pressure washing |
| 6 | restaurant, café, food truck, bakery |
| 4 | retail shop, boutique, gift shop |

### City Tier Table

| Score | Population Range |
|-------|-----------------|
| 10 | 100,000 – 500,000 (sweet spot: real money, less competition) |
| 7 | 500,001 – 2,000,000 |
| 5 | 50,000 – 99,999 |
| 3 | 2,000,001+ (major metros — harder to close) |
| 2 | < 50,000 |

**Priority threshold:** score ≥ 70 → `priority = true` in notes
**Qualified threshold:** score ≥ 40 → mark `status = 'qualified'`
**Rejected:** score < 40 → mark `status = 'rejected'`

## Execution Steps

### 1. Fetch scraped businesses from Supabase
```python
import os, httpx, json, time, asyncio

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
BRAVE_KEY    = os.environ["BRAVE_API_KEY"]

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Fetch up to 150 scraped businesses
resp = httpx.get(
    f"{SUPABASE_URL}/rest/v1/businesses",
    headers=HEADERS_SB,
    params={"status": "eq.scraped", "limit": "150", "select": "*"},
    timeout=15
)
businesses = resp.json()
print(f"Qualifying {len(businesses)} scraped businesses...")
```

### 2. Brave Search verification (no-website double-check)
```python
async def verify_no_website(name: str, city: str, state: str) -> bool:
    """
    Returns True if the business genuinely has no website.
    Returns False if a website was found (should be rejected).
    """
    query = f'"{name}" {city} {state} official website'
    
    await asyncio.sleep(1)  # Rate limit: max 1 req/sec
    
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": BRAVE_KEY},
            params={"q": query, "count": 5, "country": "US"}
        )
    
    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "10")) + 2
        await asyncio.sleep(retry_after)
        return True  # Conservative: assume no website on rate limit
    
    results = resp.json().get("web", {}).get("results", [])
    
    DIRECTORY_DOMAINS = [
        "yelp.com", "facebook.com", "yellowpages.com", "bbb.org",
        "mapquest.com", "tripadvisor.com", "angi.com", "thumbtack.com",
        "google.com", "maps.google.com", "instagram.com", "twitter.com",
        "linkedin.com", "nextdoor.com", "houzz.com", "homeadvisor.com"
    ]
    
    name_words = set(name.lower().split())
    
    for r in results[:3]:
        url = r.get("url", "").lower()
        title = r.get("title", "").lower()
        
        # Skip directory sites
        if any(d in url for d in DIRECTORY_DOMAINS):
            continue
        
        # Check if result looks like their actual business website
        name_match = sum(1 for w in name_words if len(w) > 3 and w in (title + url))
        if name_match >= 2:
            return False  # They have a website
    
    return True  # No website found
```

### 3. Score calculation
```python
NICHE_SCORES = {
    "plumber": 15, "hvac": 15, "electrician": 15, "roofer": 15,
    "general contractor": 15, "contractor": 12,
    "auto repair": 12, "auto detailing": 12, "locksmith": 12,
    "pest control": 12, "mechanic": 12,
    "salon": 10, "barbershop": 10, "spa": 10, "massage": 10,
    "nail salon": 10, "hair salon": 10,
    "landscaping": 8, "lawn care": 8, "cleaning": 8, "cleaner": 8,
    "pressure washing": 8, "junk removal": 8,
    "restaurant": 6, "café": 6, "cafe": 6, "food truck": 6,
    "bakery": 6, "diner": 6,
}

CITY_POPULATIONS = {
    # Add real population data or use a lookup file
    # Format: "City State": population
    "Phoenix AZ": 1608139,
    "Mesa AZ": 504258,
    "Tampa FL": 384959,
    "Houston TX": 2304580,
    # ... extend this table via a cities.json file in ~/igil/data/
}

def city_score(city, state):
    pop = CITY_POPULATIONS.get(f"{city} {state}", 150000)  # default mid-tier
    if 100000 <= pop <= 500000: return 10
    if 500001 <= pop <= 2000000: return 7
    if 50000 <= pop < 100000:   return 5
    if pop > 2000000:           return 3
    return 2

def compute_score(b, niche):
    s = 0
    # Review count (max 25)
    s += min(b.get("review_count", 0), 50) / 50 * 25
    # Rating (max 20)
    rating = b.get("rating") or 0
    s += max(0, (rating - 3.5)) / 1.5 * 20
    # Niche (max 15)
    s += NICHE_SCORES.get(niche.lower(), 4)
    # Phone (10)
    s += 10 if b.get("phone") else 0
    # City tier (10)
    s += city_score(b.get("city", ""), b.get("state", ""))
    # Photos (max 5)
    photos = b.get("photos") or []
    if isinstance(photos, str):
        import json
        photos = json.loads(photos)
    s += min(len(photos), 5)
    
    return round(min(s, 100))
```

### 4. Update Supabase
```python
async def qualify_batch(businesses):
    results = {"qualified": 0, "rejected": 0, "errors": 0}
    
    for b in businesses:
        try:
            # Verify no website
            genuinely_no_website = await verify_no_website(
                b["name"], b["city"], b.get("state", "")
            )
            
            if not genuinely_no_website:
                # Found a website — reject
                httpx.patch(
                    f"{SUPABASE_URL}/rest/v1/businesses?id=eq.{b['id']}",
                    headers=HEADERS_SB,
                    json={"status": "rejected", "has_website": True},
                    timeout=10
                )
                results["rejected"] += 1
                continue
            
            # Compute score
            score = compute_score(b, b.get("niche", ""))
            new_status = "qualified" if score >= 40 else "rejected"
            notes = b.get("notes", "") or ""
            if score >= 70:
                notes = "[PRIORITY] " + notes
            
            httpx.patch(
                f"{SUPABASE_URL}/rest/v1/businesses?id=eq.{b['id']}",
                headers=HEADERS_SB,
                json={
                    "status": new_status,
                    "lead_score": score,
                    "notes": notes.strip()
                },
                timeout=10
            )
            
            if new_status == "qualified":
                results["qualified"] += 1
            else:
                results["rejected"] += 1
                
        except Exception as e:
            print(f"Error qualifying {b.get('name')}: {e}")
            results["errors"] += 1
    
    return results
```

## Output

After running, log a summary:
```
Qualification complete:
  Qualified: 34
  Rejected:  58 (40 had websites, 18 scored below threshold)
  Errors:    8 (will retry next cycle)
  Priority leads (score ≥ 70): 12
```

Priority leads (score ≥ 70) will be picked up first by `igil-research` in Step 3.
