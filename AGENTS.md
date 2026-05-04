# AGENTS.md

## System Overview

Igil is a fully autonomous lead-to-demo pipeline. A single run produces qualified leads, deployed demo websites, and ready-to-send outreach messages.

Runs are triggered manually by the operator via Telegram.

**Pipeline:**
1. Niche Selection
2. Lead Scraping (Google Maps via Barty-Bart scraper)
3. Lead Qualification (scoring)
4. Niche Research (competitor analysis)
5. Demo Generation (Next.js)
6. Demo Deployment (Coolify → `{slug}.murusmare.com`)
7. Outreach Preparation (multi-channel)
8. Notes Generation
9. Operator Notification (Telegram)

---

## Step 1 — Niche Selection

**Goal:** Choose what types of businesses to target this run.

**Default niches (rotate each run):**
- Dentists
- Aesthetic clinics (med spas, skin clinics, cosmetic surgery)
- Boutique hotels (independent, non-chain)
- Local services (plumbers, electricians, HVAC)

**Rules:**
- Select 3 niches per run
- Select 1 US city or metro area per niche
- Prefer cities with population 50k–500k (less competitive, more opportunity)
- Avoid niches or locations processed in the last 3 runs

**Example:**
```
Run #7:
- Dentists → Austin, TX
- Aesthetic Clinics → Nashville, TN
- Boutique Hotels → Savannah, GA
```

---

## Step 2 — Lead Scraping

**Tool:** Barty-Bart google-maps-scraper
**Fallback:** Outscraper API (if scraper fails or is rate-limited)

**Per niche:**
- Query Google Maps with niche keyword + city
- Scrape up to 100 results
- Extract per business:
  - name
  - address
  - phone number
  - website URL (or null)
  - email (if visible)
  - Google rating
  - Review count
  - Business category
  - Social media links (Instagram, Facebook — if visible)

**Filters during scraping:**
- Skip franchises and national chains
- Skip businesses already in the leads table
- Flag businesses with:
  - no website → `has_website = false`
  - Gmail / Yahoo / Hotmail email → `has_professional_email = false`
  - Website that returns 4xx/5xx → `website_status = dead`

---

## Step 3 — Lead Qualification

**Goal:** Score each scraped lead and keep only the best ones.

### Scoring Matrix

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

**Threshold:** Keep leads with `score ≥ 60`

**Storage:**
- Store all scraped leads (with score) in the `leads` table
- Mark qualified leads: `qualified = true`
- Mark unqualified leads: `qualified = false` (do not delete — useful for analysis)

---

## Step 4 — Niche Research

**Goal:** Understand what a great website looks like for this niche before building demos.

**Per niche (not per lead):**
- Find the top 3 competitor websites in the niche + city
- Analyze:
  - Page structure and section order
  - Services listed
  - Tone and copywriting style
  - Color palette / visual feel
  - CTAs used (book now, call us, etc.)
- Store research as a `niche_insights` record for use during demo generation
- Cache insights: skip re-research if niche was analyzed in the last 7 days

---

## Step 5 — Demo Generation

**Goal:** Build a real, deployable website for each qualified lead.

**Tech stack:** Next.js (static export)
**Output:** A GitHub repository per batch, containing one folder per demo

### Page Structure (single page)

| Section | Content |
|---|---|
| Hero | Business name, tagline, CTA ("Book Now" / "Call Us") |
| About | 2–3 sentence business description (generated from niche + data) |
| Services | 3–6 services based on niche research |
| Reviews | Top 3 Google reviews (real data) |
| Contact | Phone, address, email, Google Maps embed |
| Footer | Business name, social links |

**Rules:**
- Max 30 demos per run
- Use real business data — no fabrication
- Apply niche-specific design patterns from Step 4 research
- Each demo must pass a basic visual check before deployment
- Use the business's actual colors/branding if detectable from any existing web presence

**Demo naming:** `{business-slug}` → folder name and subdomain

---

## Step 6 — Deployment

**Platform:** Coolify (self-hosted, API-connected)
**Domain:** `{business-slug}.murusmare.com`

**Process per demo:**
1. Push Next.js project to GitHub (batch repo or individual repo)
2. Trigger Coolify deployment via API
3. Assign subdomain `{business-slug}.murusmare.com`
4. Verify SSL is provisioned
5. Confirm site returns HTTP 200
6. Store `demo_url` in the `demos` table
7. Update `deployment_status = live`

**Failure handling:**
- If deployment fails: retry once after 30s
- If retry fails: mark `deployment_status = failed`, log error, skip to next lead
- Never block the pipeline on a single deployment failure

---

## Step 7 — Outreach Preparation

**Goal:** Generate a personalized message for every channel the business actively uses.

**Channels detected per lead:**
- WhatsApp (if phone number is present)
- Email (if email address is present)
- Instagram DM (if Instagram handle is present)
- Facebook Messenger (if Facebook page is present)

**Rules per message:**
- Reference the business by name
- Include the live demo link
- Keep it short: 3–5 sentences max
- No generic phrases ("I noticed your website...")
- Tone: direct, professional, agency-level — not salesy
- Mention 1 specific thing about their business (niche, location, or missing feature)

**Example (WhatsApp):**
```
Hi Dr. Patel — we built a demo site for your practice in Austin:
https://dr-patel-dental.murusmare.com

It's live and ready to use. Happy to customize it fully if you're interested.
— Aissam, Murus Mare
```

---

## Step 8 — Notes Generation

**Goal:** Identify upsell and improvement opportunities per lead.

**Per qualified lead, generate:**
- Missing features (e.g., online booking, CRM integration, SEO, multilingual)
- Design improvement notes (if existing website was found)
- Potential monthly retainer value estimate
- Priority tag: `quick-win` / `upsell-potential` / `rebuild-candidate`

**Storage:** `notes` table, linked to `lead_id`

---

## Step 9 — Operator Notification

**Channel:** Telegram Bot

### After each demo deployment:

Send a Telegram message containing:
```
✅ Demo Ready

Business: {name}
Niche: {niche}
Location: {city}
Demo: {demo_url}
Score: {score}

--- Outreach ---
WhatsApp: {message or "N/A"}
Email: {message or "N/A"}
Instagram: {message or "N/A"}
```

### After full run completion:

Send a summary message:
```
🏁 Run Complete

Niches: {list}
Leads scraped: {n}
Leads qualified: {n}
Demos deployed: {n}
Failed deployments: {n}

Ready for outreach: {n} leads
```

---

## Error Handling

| Failure | Behavior |
|---|---|
| Scraper rate-limited | Switch to Outscraper fallback |
| Lead data incomplete | Skip lead, log reason |
| Demo generation error | Log, skip to next lead |
| Coolify deployment error | Retry once, then mark failed |
| Telegram send failure | Retry 3 times with backoff |

**Max retries per step:** 2
**Pipeline behavior on failure:** continue with remaining leads, log all failures in run summary

---

## Constraints

| Limit | Value |
|---|---|
| Max leads scraped per niche | 100 |
| Max demos per run | 30 |
| Max retries per failed step | 2 |
| Demo reuse window | Never re-demo a processed lead |
| Niche research cache | 7 days |

---

## Prioritization

Within a run, process leads in this order:
1. Highest `score` first
2. Among equal scores: leads with no website before leads with broken website
3. New leads (never seen before) before leads from previous incomplete runs
