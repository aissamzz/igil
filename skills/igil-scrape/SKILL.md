---
name: igil-scrape
description: >
  Scrapes Google Maps for small businesses in a given niche and city using
  the gosom/google-maps-scraper binary. Filters for businesses with no website
  and writes raw results to Supabase with status='scraped'. Reads the next
  niche+city pair from the scrape queue file.
metadata:
  openclaw:
    requires:
      bins:
        - google-maps-scraper   # built from gosom/google-maps-scraper, in PATH
        - python3
        - jq
      env:
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
---

# Skill: igil-scrape

## Purpose

Run the Google Maps scraper against the next niche+city pair in the queue,
collect 100 business records, filter for no-website leads, and write them to
Supabase. This is Step 1 of the Igil pipeline.

## Files

- Queue file: `~/igil/queue/scrape-queue.jsonl` (one JSON object per line)
- Output dir: `~/igil/scrapes/` (one JSON file per run, named by timestamp)
- Log: `~/igil/logs/scrape.log`

## Queue Format

Each line in `scrape-queue.jsonl` is a JSON object:
```json
{"niche": "plumber", "city": "Phoenix", "state": "AZ", "country": "US", "status": "pending"}
```
Status values: `pending` | `running` | `done` | `failed`

## Execution Steps

### 1. Read the queue
```bash
# Get the first pending item
ITEM=$(grep '"status":"pending"' ~/igil/queue/scrape-queue.jsonl | head -1)
NICHE=$(echo $ITEM | jq -r '.niche')
CITY=$(echo $ITEM | jq -r '.city')
STATE=$(echo $ITEM | jq -r '.state')
```

### 2. Run the scraper
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE=~/igil/scrapes/${TIMESTAMP}_${NICHE}_${CITY}.json

google-maps-scraper \
  -input <(echo "${NICHE} in ${CITY} ${STATE}") \
  -results $OUTFILE \
  -json \
  -depth 10 \
  -c 4 \
  -lang en \
  -exit-on-inactivity 3m

echo "Scrape complete: $(jq length $OUTFILE) records"
```

### 3. Filter for no-website businesses
```python
#!/usr/bin/env python3
import json, os, sys

SOCIAL_DOMAINS = [
    "facebook.com", "instagram.com", "twitter.com", "yelp.com",
    "tripadvisor.com", "foursquare.com", "mapquest.com",
    "yellowpages.com", "bbb.org", "angi.com", "thumbtack.com",
    "homeadvisor.com", "angieslist.com", "nextdoor.com", "linktr.ee"
]

CHAIN_KEYWORDS = [
    "mcdonald", "subway", "dunkin", "starbucks", "7-eleven", "walmart",
    "cvs", "walgreens", "dollar general", "autozone", "jiffy lube",
    "h&r block", "state farm", "allstate", "planet fitness",
    "anytime fitness", "domino", "pizza hut", "taco bell", "kfc",
    "burger king", "wendy", "chick-fil", "five guys", "jersey mike"
]

def is_social_only(url):
    if not url:
        return True
    url_lower = url.lower()
    return any(d in url_lower for d in SOCIAL_DOMAINS)

def is_chain(name):
    name_lower = name.lower()
    return any(k in name_lower for k in CHAIN_KEYWORDS)

with open(sys.argv[1]) as f:
    records = json.load(f)

qualified = [
    r for r in records
    if is_social_only(r.get("web_site") or r.get("website", ""))
    and not is_chain(r.get("title", "") or r.get("name", ""))
    and (r.get("rating") or 0) >= 3.5
    and (r.get("reviews_count") or r.get("review_count") or 0) >= 10
]

print(json.dumps(qualified, indent=2))
```

### 4. Write to Supabase
```python
import os, json, httpx, sys

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates"  # skip on place_id conflict
}

def slugify(s):
    import re
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

records = json.load(open(sys.argv[1]))
inserted = 0

for r in records:
    place_id = r.get("place_id") or r.get("id")
    if not place_id:
        continue

    payload = {
        "place_id":      place_id,
        "name":          r.get("title") or r.get("name"),
        "niche":         NICHE,
        "city":          CITY,
        "state":         STATE,
        "country":       "US",
        "phone":         r.get("phone"),
        "address":       r.get("full_address") or r.get("address"),
        "rating":        r.get("rating"),
        "review_count":  r.get("reviews_count") or r.get("review_count", 0),
        "google_maps_url": r.get("url") or r.get("maps_url"),
        "photos":        json.dumps(r.get("photos", [])),
        "has_website":   False,
        "status":        "scraped",
    }

    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/businesses",
        headers=HEADERS,
        json=payload,
        timeout=10
    )
    if resp.status_code in (200, 201):
        inserted += 1

print(f"Inserted {inserted} businesses to Supabase")
```

## Rate Limiting

- The scraper uses Playwright/Chromium internally and has its own pacing.
- Do not run multiple scraper instances simultaneously.
- Use `-c 4` (4 concurrent tabs) maximum on KVM4.
- Add a minimum 60-second sleep between different niche+city runs to avoid
  pattern detection.

## Error Handling

If the scraper exits with a non-zero code or produces 0 results:
1. Log the failure with timestamp, niche, city to `~/igil/logs/scrape.log`
2. Mark the queue item `status = 'failed'`
3. Move to the next queue item
4. Do NOT notify Aissam for individual scrape failures — include in Monday digest

## After Success

- Mark queue item `status = 'done'`
- Log: `Scraped {N} businesses for {niche} in {city}, {filtered} passed initial filter`
- The `igil-qualify` skill (Step 2) will pick up `status = 'scraped'` records
