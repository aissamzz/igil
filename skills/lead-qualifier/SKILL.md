---
name: lead-qualifier
description: Score scraped leads using the Igil scoring matrix. Marks leads as qualified (score >= 60) and writes results to Supabase.
metadata.openclaw:
  emoji: 🎯
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 3** of the Igil pipeline: after scraping, before niche research.

Do NOT use this skill to:
- Re-qualify leads that already have a score
- Lower the score threshold below 60

## Setup

Set env vars in `.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SCORE_THRESHOLD=60
```

## Usage

Score all unscored leads from a run:
```bash
node skills/lead-qualifier/scripts/qualify.js --run-id "uuid"
```

Score a single lead:
```bash
node skills/lead-qualifier/scripts/qualify.js --lead-id "uuid"
```

## Scoring Matrix

| Signal | Points |
|---|---|
| No website | +25 |
| Dead/broken website | +20 |
| Gmail / public email | +10 |
| Reviews ≥ 20 | +20 |
| Rating ≥ 4.0 | +15 |
| Has phone number | +10 |
| Niche match (primary) | +15 |
| Has Instagram or Facebook | +5 |

**Max possible score:** 100
**Threshold:** 60

## Output

Updates `leads` table: sets `score` and `qualified` fields.

Returns JSON summary:
```json
{
  "scored": 71,
  "qualified": 24,
  "rejected": 47,
  "run_id": "..."
}
```
