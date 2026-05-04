---
name: notes-writer
description: Generate upsell and improvement notes for each qualified lead. Identifies missing features, estimates retainer value, and tags priority level. Stores in Supabase notes table.
metadata.openclaw:
  emoji: 📋
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 8** of the Igil pipeline: after outreach preparation, before notification.

Do NOT use this skill to:
- Generate notes for unqualified leads
- Fabricate business capabilities — base notes on real scraped data only

## Setup

Set env vars in `.env`:
```
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## Usage

```bash
node skills/notes-writer/scripts/notes.js --lead-id "uuid"
```

## Process

1. Load lead data from Supabase
2. Identify missing features based on niche + current web presence
3. Estimate monthly retainer value based on services needed
4. Assign priority tag
5. Write to `notes` table

## Missing Features Matrix

| Niche | Common Missing Features |
|---|---|
| Dentists | Online booking, patient portal, before/after gallery, multilingual |
| Aesthetic Clinics | Booking system, treatment menu, before/after, loyalty program page |
| Boutique Hotels | Booking engine, room gallery, local guide, event/wedding page |
| Local Services | Quote form, service area map, emergency contact CTA, review generation |

## Priority Tag Logic

| Condition | Tag |
|---|---|
| No website + score ≥ 80 | `quick-win` |
| Has broken/basic site + many reviews | `rebuild-candidate` |
| Live site + potential for booking/CRM | `upsell-potential` |

## Retainer Estimate Heuristic

| Features Needed | Range |
|---|---|
| Basic site only | $300–500/mo |
| Site + SEO | $500–800/mo |
| Site + booking + CRM | $800–1,500/mo |
| Full stack (site + booking + CRM + SEO + maintenance) | $1,500–3,000/mo |

## Output

Writes to Supabase `notes` table — one row per lead.
