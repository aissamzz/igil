# CRON.md — Igil's Scheduled Job Configuration

> All cron jobs for Igil. Register via `openclaw cron add` or import the JSON config.
> The OpenClaw Gateway must run continuously for jobs to fire.
> All times: Europe/Paris (CET) — Algerian time.

---

## Job Overview

| Job | Schedule | Purpose |
|---|---|---|
| `igil-scrape` | 02:00 nightly | Scrape 100 leads for the current niche/city |
| `igil-qualify` | 03:00 nightly | Qualify via Brave Search, score leads |
| `igil-research` | 04:00 nightly | Deep research on qualified leads (score ≥ 70) |
| `igil-build` | 05:00 nightly | Build websites with Codex |
| `igil-deploy` | 06:00 nightly | Push to GitHub, deploy to Coolify |
| `igil-notify` | 07:00 nightly | Generate outreach + send Telegram notifications |
| `igil-morning-digest` | 08:00 daily | Daily summary to Aissam |
| `igil-retry-failed` | 10:00 daily | Retry failed records |
| `igil-queue-advance` | Sunday 20:00 | Plan next week's niche/city targeting |

---

## CLI Registration Commands

```bash
# Job 1: Scrape
openclaw cron add \
  --name "igil-scrape" \
  --cron "0 2 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "SCRAPE: Read notes/queue.md for current niche/city.
Run google-maps-scraper for 100 results.
Filter: no website or social-only website.
Insert into Supabase businesses table with status='scraped'.
Deduplicate by place_id."

# Job 2: Qualify
openclaw cron add \
  --name "igil-qualify" \
  --cron "0 3 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "QUALIFY: Fetch businesses with status='scraped'.
For each: verify no real website via Brave Search (1 req/sec).
Skip franchises, chains, <10 reviews.
Calculate lead score 0-100.
Update status='qualified' or 'rejected'."

# Job 3: Research
openclaw cron add \
  --name "igil-research" \
  --cron "0 4 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "RESEARCH: Fetch up to 10 businesses with status='qualified' AND lead_score >= 70.
For each: find top 3 competitor sites in same niche/city via Brave Search + web_fetch.
Research specific business: owner name, social media, services.
Generate tech suggestions (booking, CRM, etc).
Update status='researched' with notes and competitor data."

# Job 4: Build
openclaw cron add \
  --name "igil-build" \
  --cron "0 5 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "BUILD: Fetch up to 5 businesses with status='researched'.
For each: copy /opt/murusmare/template-business-v1/ to /tmp/builds/<slug>/.
Select unique theme/font from THEMES.md.
Write site-config.ts with real business data.
Generate detailed Codex prompt using competitor analysis and business info.
Run Codex to build the site. Verify pnpm run build exits 0.
Update status='site_built'."

# Job 5: Deploy
openclaw cron add \
  --name "igil-deploy" \
  --cron "0 6 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "DEPLOY: Fetch up to 5 businesses with status='site_built'.
For each: create GitHub repo in murusmare-clients org, push code.
Call Coolify API to create app at <slug>.murusmare.com.
Set env vars via bulk API. Trigger deployment.
Wait up to 5 minutes for HTTP 200.
Update status='deployed' with URLs."

# Job 6: Notify
openclaw cron add \
  --name "igil-notify" \
  --cron "0 7 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "NOTIFY: Fetch businesses with status='deployed'.
For each: generate email outreach (if email found) and SMS/WhatsApp (if phone found).
Include upsell notes (booking system, CRM, etc).
Send Telegram notification to Aissam with full lead card.
Update status='notified'. Space messages 3 seconds apart."

# Job 7: Morning Digest
openclaw cron add \
  --name "igil-morning-digest" \
  --cron "0 8 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "DIGEST: Send daily summary to Aissam via Telegram.
Include: leads scraped/qualified/built/deployed/notified last night.
Any failures needing attention.
Current queue position.
Total pipeline counts by status.
Format as a clean table. Keep it short."

# Job 8: Retry Failed
openclaw cron add \
  --name "igil-retry-failed" \
  --cron "0 10 * * *" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "RETRY: Fetch businesses with status='failed' from last 48 hours.
For each: read build_log/notes to understand failure.
Retry one step back in pipeline.
Max 3 total retries. After 3: mark 'rejected', notify Aissam."

# Job 9: Queue Advance (weekly)
openclaw cron add \
  --name "igil-queue-advance" \
  --cron "0 20 * * 0" \
  --tz "Europe/Paris" \
  --session isolated \
  --agent igil \
  --message "QUEUE: Read notes/queue.md for current position.
Based on this week's results, decide: exhaust more cities in current niche, or advance.
Update notes/queue.md with next week's plan.
Niche order: plumbers, hvac, roofers, electricians, landscapers, auto-detailing, salons, cleaning, handymen, restaurants.
Cities: Phoenix, Tampa, Houston, Dallas, San Antonio, Las Vegas, Orlando, Jacksonville, Charlotte, Nashville, Atlanta, Tucson, Albuquerque, Louisville, Tulsa, Oklahoma City.
Notify Aissam with next week's plan."
```

---

## cron-jobs.json (importable)

```json
{
  "version": "1.0",
  "agent": "igil",
  "timezone": "Europe/Paris",
  "jobs": [
    {"name":"igil-scrape","cron":"0 2 * * *","session":"isolated","timeout_seconds":900},
    {"name":"igil-qualify","cron":"0 3 * * *","session":"isolated","timeout_seconds":900},
    {"name":"igil-research","cron":"0 4 * * *","session":"isolated","timeout_seconds":900},
    {"name":"igil-build","cron":"0 5 * * *","session":"isolated","timeout_seconds":900},
    {"name":"igil-deploy","cron":"0 6 * * *","session":"isolated","timeout_seconds":900},
    {"name":"igil-notify","cron":"0 7 * * *","session":"isolated","timeout_seconds":300},
    {"name":"igil-morning-digest","cron":"0 8 * * *","session":"isolated","timeout_seconds":120},
    {"name":"igil-retry-failed","cron":"0 10 * * *","session":"isolated","timeout_seconds":600},
    {"name":"igil-queue-advance","cron":"0 20 * * 0","session":"isolated","timeout_seconds":300}
  ]
}
```
