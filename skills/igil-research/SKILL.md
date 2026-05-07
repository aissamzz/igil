---
name: igil-research
description: >
  Runs two-phase research for qualified leads: (1) niche research to find the
  top 3 competitor websites in the business's category and city, (2) business-
  specific research to find social media, owner info, photos, and generate an
  upsell hypothesis. Uses Brave Search API exclusively. Step 3 & 4 of pipeline.
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

# Skill: igil-research

## Purpose

Build a rich profile of each qualified lead — both their competitive landscape
(what works in their niche/city) and their own business (who they are, what they
do, what they might need). This research feeds directly into the prompt that Igil
uses to build the site.

## Phase 1 — Niche Research

Run once per niche+city pair. Cache results for 7 days.

### Niche research queries

```python
async def research_niche(niche: str, city: str, state: str) -> dict:
    """
    Find top 3 competitor websites for this niche + city.
    Returns structured research data to store in niche_research table.
    """
    # Query 1: Find top competitor sites
    query = f"best {niche} in {city} {state}"
    results = await brave_web_search(query, count=10)
    
    EXCLUDE_DOMAINS = [
        "yelp.com", "facebook.com", "yellowpages.com", "bbb.org",
        "angi.com", "thumbtack.com", "google.com", "maps.app.goo.gl",
        "tripadvisor.com", "nextdoor.com", "houzz.com"
    ]
    
    # Filter to actual business websites
    top_sites = []
    for r in results:
        url = r.get("url", "")
        if any(d in url for d in EXCLUDE_DOMAINS):
            continue
        top_sites.append({
            "url": url,
            "title": r.get("title"),
            "snippet": r.get("description"),
        })
        if len(top_sites) == 3:
            break
    
    # Phase 1b: Fetch and analyse each top site
    analyses = []
    for site in top_sites:
        analysis = await analyse_competitor_site(site["url"], niche)
        analyses.append({**site, "analysis": analysis})
    
    return {
        "niche": niche,
        "city": city,
        "state": state,
        "top_sites": analyses,
        "brave_query": query,
    }
```

### Competitor site analysis

```python
async def analyse_competitor_site(url: str, niche: str) -> dict:
    """
    Fetch a competitor website and extract design/content signals.
    """
    try:
        # Use web_fetch (OpenClaw tool) or direct httpx
        content = await web_fetch(url, timeout=15)
        
        # Ask Claude to extract key signals (this runs as a sub-call in the skill)
        prompt = f"""
Analyse this {niche} business website and extract:
1. Main headline (verbatim)
2. Services listed (bullet points)
3. Any pricing shown
4. Primary CTA text
5. Design tone (1 sentence: e.g. "professional dark navy with bold CTAs")
6. Trust signals shown (reviews, certifications, years in business, etc.)
7. What makes this site effective or ineffective

Website content:
{content[:4000]}

Respond in JSON with keys: headline, services, pricing, cta, design_tone, 
trust_signals, effectiveness_notes
"""
        # Run this as a quick Claude API call or as part of Igil's main context
        return await ask_claude(prompt)
        
    except Exception as e:
        return {"error": str(e), "url": url}
```

### Store niche research in Supabase

```python
async def save_niche_research(data: dict):
    # Upsert — update if niche+city already exists
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/niche_research",
        headers={**HEADERS_SB, "Prefer": "resolution=merge-duplicates"},
        json={
            "niche": data["niche"],
            "city": data["city"],
            "state": data["state"],
            "top_sites": json.dumps(data["top_sites"]),
            "brave_query": data["brave_query"],
            "design_notes": summarise_design_signals(data["top_sites"]),
            "services": json.dumps(extract_common_services(data["top_sites"])),
        },
        timeout=10
    )
    return resp.status_code in (200, 201)
```

---

## Phase 2 — Business Research

Run for every qualified lead with score ≥ 60. Spawned as sub-agents for parallelism.

### Research sequence per business

```python
async def research_business(b: dict) -> dict:
    """
    Builds a comprehensive profile of a single business.
    Returns updated fields for businesses table.
    """
    name = b["name"]
    city = b["city"]
    state = b.get("state", "")
    niche = b["niche"]
    
    profile = {
        "social_media": {},
        "email": None,
        "photos": json.loads(b.get("photos") or "[]"),
        "notes": b.get("notes", "") or "",
    }
    
    # --- Search 1: General business search ---
    results = await brave_web_search(f'"{name}" {city} {state}', count=8)
    await asyncio.sleep(1)
    
    for r in results:
        url = r.get("url", "").lower()
        if "facebook.com" in url:
            profile["social_media"]["facebook"] = r["url"]
        if "instagram.com" in url:
            profile["social_media"]["instagram"] = r["url"]
        if "yelp.com" in url:
            profile["social_media"]["yelp"] = r["url"]
    
    # --- Search 2: Find owner name ---
    owner_results = await brave_web_search(f'"{name}" {city} owner OR founder OR "owned by"', count=5)
    await asyncio.sleep(1)
    owner_name = extract_owner_name(owner_results, name)
    if owner_name:
        profile["notes"] += f"\n[OWNER] {owner_name}"
    
    # --- Search 3: Find email ---
    email_results = await brave_web_search(f'"{name}" {city} email contact', count=5)
    await asyncio.sleep(1)
    email = extract_email_from_results(email_results)
    if email:
        profile["email"] = email
    
    # --- Fetch Facebook page for photos and info ---
    if profile["social_media"].get("facebook"):
        fb_data = await fetch_facebook_page(profile["social_media"]["facebook"])
        if fb_data.get("photos"):
            profile["photos"].extend(fb_data["photos"])
        if fb_data.get("about"):
            profile["notes"] += f"\n[FB ABOUT] {fb_data['about'][:200]}"
    
    # --- Upsell analysis ---
    upsell_hints = generate_upsell_hints(niche, profile, b)
    for hint in upsell_hints:
        profile["notes"] += f"\n[UPSELL HINT] {hint}"
    
    return profile
```

### Upsell hint generation

```python
def generate_upsell_hints(niche: str, profile: dict, b: dict) -> list:
    """
    Based on niche, review count, and business signals, guess what the owner
    might need beyond a website.
    """
    hints = []
    reviews = b.get("review_count", 0)
    
    NICHE_UPSELLS = {
        "plumber":       ["online booking system", "emergency call CTA widget",
                          "quote request form", "service area map"],
        "hvac":          ["seasonal maintenance reminder system",
                          "online quote calculator", "subscription maintenance plan page"],
        "salon":         ["online booking system (Calendly / Acuity integration)",
                          "loyalty card / points system", "gift card sales page"],
        "restaurant":    ["online ordering integration", "reservation system",
                          "loyalty rewards program", "SMS marketing opt-in"],
        "auto repair":   ["digital vehicle history / service records portal",
                          "online estimate request", "parts lookup"],
        "cleaning":      ["recurring booking portal", "client login area",
                          "subscription cleaning packages"],
        "landscaping":   ["seasonal service packages", "quote calculator",
                          "before/after gallery with client portal"],
        "electrician":   ["electrical permit tracking page", "quote request",
                          "emergency service CTA"],
    }
    
    niche_hints = NICHE_UPSELLS.get(niche.lower(), ["online booking", "contact form"])
    hints.extend(niche_hints[:2])
    
    # Volume-based hints
    if reviews > 100:
        hints.append("review management / reply-to-reviews dashboard")
    if reviews > 200:
        hints.append("referral program page / affiliate system")
    
    # Social hints
    if not profile["social_media"].get("facebook"):
        hints.append("Facebook Business page setup + management")
    
    return hints
```

### Helper: extract email from results

```python
import re

EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

def extract_email_from_results(results: list) -> str | None:
    EXCLUDED = ["yelp.com", "facebook.com", "bbb.org", "example.com",
                "noreply", "info@yelp", "support@"]
    for r in results:
        text = r.get("description", "") + r.get("url", "")
        matches = EMAIL_PATTERN.findall(text)
        for m in matches:
            if not any(e in m.lower() for e in EXCLUDED):
                return m
    return None
```

### Update Supabase with research results

```python
async def save_business_research(b_id: str, profile: dict):
    patch = {
        "status": "researched",
        "email": profile.get("email"),
        "social_media": json.dumps(profile["social_media"]),
        "photos": json.dumps(profile["photos"][:10]),  # cap at 10 photos
        "notes": profile["notes"].strip(),
    }
    httpx.patch(
        f"{SUPABASE_URL}/rest/v1/businesses?id=eq.{b_id}",
        headers=HEADERS_SB,
        json=patch,
        timeout=10
    )
```

## Parallelism via Sub-Agents

For large batches, spawn sub-agents (max 5 concurrent) to research businesses
in parallel. Each sub-agent handles a batch of 3–5 businesses.

```
/subagents spawn --count 5 --task "research_business_batch" --input batch.json
```

Each sub-agent runs `igil-research` on its assigned slice, writes results to
Supabase independently, and reports completion.

## Rate Limiting

Every Brave Search call must be preceded by `await asyncio.sleep(1)`.
Business research generates 3 searches per business (general + owner + email).
For 20 businesses: 60 Brave Search calls = 60 seconds minimum.
Niche research adds 10 calls per unique niche+city pair.

## Output

After research completes, log:
```
Research complete:
  Businesses researched: 34
  Emails found: 9
  Phone numbers already known: 28
  Social media found (FB/IG): 22
  Niche research runs: 3 (8 reused from cache)
  Upsell hints generated: 34
```

Businesses with status='researched' and score ≥ 60 are ready for Step 5 (Build Prompt).
