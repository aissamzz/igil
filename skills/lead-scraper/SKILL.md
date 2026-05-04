---
name: lead-scraper
description: Scrape Google Maps for local businesses using Barty-Bart google-maps-scraper. Outputs raw lead data to Supabase leads table with deduplication.
metadata.openclaw:
  emoji: 🗺️
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 2** of the Igil pipeline: after niche selection, before lead qualification.

Do NOT use this skill to:
- Re-scrape leads already in the `leads` table (check `place_id` first)
- Scrape more than 100 results per niche per run
- Scrape anything outside US cities

## Setup

Requires the Barty-Bart scraper installed locally:
```bash
git clone https://github.com/Barty-Bart/google-maps-scraper
cd google-maps-scraper && npm install
```

Set env vars in `.env`:
```
OUTSCRAPER_API_KEY=   # only needed for fallback
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## Usage

```bash
node skills/lead-scraper/scripts/scrape.js \
  --niche "dentist" \
  --city "Austin, TX" \
  --run-id "uuid-of-current-run" \
  --limit 100
```

## Output

Writes records to Supabase `leads` table. Returns JSON summary:
```json
{
  "scraped": 87,
  "inserted": 71,
  "skipped_duplicates": 16,
  "run_id": "..."
}
```

## Fallback

If Barty-Bart scraper fails or is rate-limited:
1. Log the error with run_id
2. Switch to Outscraper API (same output format)
3. Continue pipeline — do not halt on scraper failure

## Fields Extracted

See `references/google-maps-fields.md` for full field mapping.
