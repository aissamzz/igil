---
name: niche-researcher
description: Research top competitor websites per niche using Brave Search API. Extracts layout patterns, services, tone, and CTAs. Caches results for 7 days in Supabase niche_insights table.
metadata.openclaw:
  emoji: 🔍
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 4** of the Igil pipeline: after qualification, before demo generation.

Runs once per niche+city combination per week. If `niche_insights` has a record for this niche+city with `researched_at` within 7 days, skip and reuse cached data.

Do NOT use this skill to:
- Research individual businesses (use for niches only)
- Call Brave API more than needed — check cache first

## Setup

Set env vars in `.env`:
```
BRAVE_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## Usage

```bash
# Research a niche (checks cache first)
node -e "require('./skills/niche-researcher/scripts/research.js').run({niche: 'dentist', city: 'Austin, TX'})"

# Force refresh (ignore cache)
node -e "require('./skills/niche-researcher/scripts/research.js').run({niche: 'dentist', city: 'Austin, TX', force: true})"
```

## Process

1. Check `niche_insights` table for cached entry (niche + city, within 7 days)
2. If cached: return cached data, skip API calls
3. If not cached:
   a. Brave Search: `"best {niche} website {city}"` → top 3 URLs
   b. Fetch each URL (skip if 4xx/5xx)
   c. Pass HTML to GPT-4o: extract layout, services, tone, colors, CTAs
   d. Write result to `niche_insights` table
4. Return structured insights object

## Output (niche_insights record)

```json
{
  "niche": "dentist",
  "city": "Austin, TX",
  "competitor_urls": ["https://...", "https://...", "https://..."],
  "layout_patterns": {
    "section_order": ["hero", "services", "about", "reviews", "contact"],
    "hero_style": "full-width image with overlay text"
  },
  "common_services": ["Teeth Whitening", "Invisalign", "Emergency Care"],
  "tone": "clean, clinical, trustworthy",
  "color_palette": ["#FFFFFF", "#1B4F8A", "#E8F4FD"],
  "ctas": ["Book an Appointment", "Call Us Today", "Schedule Online"]
}
```

## Niche Defaults

See `references/niche-patterns.md` for pre-defined fallback patterns per niche used when research fails.
