# MEMORY.md

## Storage Backend

All persistent state lives in **Supabase (PostgreSQL)**.
Full schema: `supabase/schema.sql`

Igil never holds state in memory between runs. Every pipeline step reads from and writes to Supabase.

---

## Tables

### `runs`
One record per pipeline execution.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| started_at | timestamptz | Run start time |
| completed_at | timestamptz | Run end time (null if in-progress) |
| niches | text[] | Niches selected for this run |
| cities | text[] | Cities selected (parallel to niches) |
| leads_scraped | int | Total raw leads collected |
| leads_qualified | int | Leads that passed score threshold |
| demos_created | int | Successfully deployed demos |
| demos_failed | int | Failed deployment attempts |
| status | text | `running` / `completed` / `failed` |

---

### `leads`
All scraped businesses — qualified and unqualified.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| run_id | uuid | FK → runs.id |
| place_id | text | **Unique** Google Maps place ID (dedup key) |
| name | text | Business name |
| niche | text | Niche category |
| city | text | City scraped from |
| address | text | Full address |
| phone | text | Phone number |
| website | text | Website URL (null if none) |
| has_website | bool | False if no website found |
| website_status | text | `live` / `dead` / null |
| email | text | Email if visible |
| has_professional_email | bool | False if Gmail/Yahoo/Hotmail |
| rating | numeric | Google rating |
| reviews_count | int | Number of Google reviews |
| instagram_url | text | Instagram page URL |
| facebook_url | text | Facebook page URL |
| score | int | Qualification score (0–100) |
| qualified | bool | True if score ≥ 60 |
| processed_at | timestamptz | When this lead was first seen |

**Anti-duplication:** Upsert on `place_id`. Never insert a lead that already exists — update the existing record's score and run_id if rescraped.

---

### `demos`
One record per deployed demo site.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| lead_id | uuid | FK → leads.id |
| run_id | uuid | FK → runs.id |
| demo_url | text | Live URL (e.g. `dr-patel.murusmare.com`) |
| repo_url | text | GitHub repo URL |
| deployment_status | text | `pending` / `live` / `failed` |
| deployed_at | timestamptz | When deployment succeeded |
| error_message | text | Error detail if failed |

**Anti-duplication:** A lead can only have one demo. Check `demos` for existing `lead_id` before generating.

---

### `outreach`
Generated messages per lead per channel.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| lead_id | uuid | FK → leads.id |
| demo_id | uuid | FK → demos.id |
| channel | text | `whatsapp` / `email` / `instagram` / `facebook` |
| message | text | Full personalized message |
| generated_at | timestamptz | When message was created |
| sent_at | timestamptz | When operator sent it (null until marked) |

Multiple rows per lead (one per available channel).

---

### `notes`
Upsell and improvement notes per lead.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| lead_id | uuid | FK → leads.id |
| missing_features | text[] | e.g. `['booking', 'SEO', 'CRM']` |
| improvement_notes | text | Free-text design/content suggestions |
| retainer_estimate | text | e.g. `$500–800/mo` |
| priority_tag | text | `quick-win` / `upsell-potential` / `rebuild-candidate` |
| created_at | timestamptz | |

---

### `niche_insights`
Cached competitor research per niche.

| Field | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| niche | text | **Unique** niche name |
| city | text | City researched |
| competitor_urls | text[] | Top 3 competitor site URLs |
| layout_patterns | jsonb | Extracted structural patterns |
| common_services | text[] | Services commonly listed |
| tone | text | Copywriting tone description |
| color_palette | text[] | Common hex codes |
| ctas | text[] | Common call-to-action phrases |
| researched_at | timestamptz | When this was last refreshed |

**Cache rule:** If `researched_at` is within 7 days, skip re-research and reuse this record.

---

## Rules

- **No duplicates:** Every table has dedup logic. Use upsert, not insert.
- **No deletes:** Mark records with status flags. Keep full history.
- **Every run is logged:** A `runs` record must be created before any scraping begins.
- **Failures are recorded:** Every failed step sets `status = failed` and populates `error_message`.
- **Leads are never re-demoed:** Check `demos.lead_id` before generating a new demo.

---

## Learning (Future)

Track per niche:
- Average score of qualified leads
- Demo → reply rate (when operator marks `outreach.sent_at`)
- Which cities produce the most qualified leads

This data will inform niche and city selection in future runs.
