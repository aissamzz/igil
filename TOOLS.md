# TOOLS.md

## Available Tools

---

### 1. Lead Scraper — Barty-Bart google-maps-scraper

**Skill:** `lead-scraper`
**Source:** https://github.com/Barty-Bart/google-maps-scraper
**Fallback:** Outscraper API

**Env vars:**
```
OUTSCRAPER_API_KEY=   # fallback only
```

**Usage:**
```bash
node skills/lead-scraper/scripts/scrape.js --niche "dentist" --city "Austin, TX" --limit 100
```

**Output:** Array of business objects written to Supabase `leads` table.

**Fields extracted per business:**
- name, address, phone, website, email
- rating, reviews_count
- category, place_id (Google Maps ID)
- instagram_url, facebook_url (if visible on Maps listing)
- has_website (bool), website_status (live/dead/null)

**Rules:**
- Skip national chains and franchises
- Dedup against existing `leads` by `place_id`
- Flag `has_professional_email = false` if email is Gmail/Yahoo/Hotmail

---

### 2. Research — Brave Search API

**Skill:** `niche-researcher`
**Endpoint:** `https://api.search.brave.com/res/v1/web/search`

**Env vars:**
```
BRAVE_API_KEY=
```

**Usage:**
```bash
# Called internally by niche-researcher skill
# Searches: "best {niche} website {city}" to find competitor examples
```

**Output:** Top 3 competitor URLs per niche → passed to Claude for structural analysis → stored in `niche_insights`.

---

### 3. AI Generation — ChatGPT Codex via coding-agent skill

**Skill:** `demo-builder` (invokes OpenClaw `coding-agent` skill internally)

**Env vars:**
```
OPENAI_API_KEY=       # for Codex / GPT-4o
```

**Usage pattern:**
```
invoke coding-agent with prompt:
  "Generate a Next.js + Tailwind single-page website for {business_name}, a {niche} in {city}.
   Use this data: {lead_data}. Follow this structure: {niche_insights}.
   Use the template in skills/demo-builder/assets/templates/{niche}.jsx as a base."
```

**Output:** Complete Next.js project in `demos/{business-slug}/`

**Rules:**
- Always run with `background: true`
- Validate output: `next build` must succeed before deployment
- No fabricated data — all copy from scraped + researched sources

---

### 4. Deployment — Coolify API

**Skill:** `deploy-manager`

**Env vars:**
```
COOLIFY_BASE_URL=     # e.g. https://coolify.yourdomain.com
COOLIFY_API_TOKEN=    # from Coolify → Settings → API Tokens
```

**Endpoints used:**
- `POST /api/v1/applications` — create new app
- `POST /api/v1/deploy` — trigger deployment
- `GET /api/v1/applications/{id}` — poll for live status

**Subdomain format:** `{business-slug}.murusmare.com`

**Requirements:**
- Wildcard DNS `*.murusmare.com` → Coolify server IP (set up by operator)
- SSL auto-provisioned by Coolify via Let's Encrypt
- Verify `HTTP 200` before marking `deployment_status = live`

---

### 5. Version Control — GitHub API

**Skill:** `deploy-manager`

**Env vars:**
```
GITHUB_TOKEN=         # personal access token, repo scope
GITHUB_USERNAME=      # Aissam's GitHub username
```

**Operations:**
- `POST /user/repos` — create new repo per demo batch
- Push generated Next.js code via git (scripts/push-github.js)

**Repo naming:** `igil-demo-{run_id}`
**Visibility:** Private by default

---

### 6. Storage — Supabase (PostgreSQL)

**Env vars:**
```
SUPABASE_URL=         # https://your-project.supabase.co
SUPABASE_ANON_KEY=    # public anon key
SUPABASE_SERVICE_KEY= # service role key (for server-side writes)
```

**Tables:**
- `runs` — one record per pipeline run
- `leads` — all scraped businesses (qualified + unqualified)
- `demos` — deployed demo sites
- `outreach` — generated messages per channel
- `notes` — upsell notes per lead
- `niche_insights` — cached competitor research per niche

Full schema: `supabase/schema.sql`

**Rules:**
- Always use `SUPABASE_SERVICE_KEY` for server-side inserts/updates
- Use `upsert` on `place_id` to avoid duplicate leads
- Never delete records — use status flags instead

---

### 7. Notifications — Telegram Bot API

**Skill:** `notify`
**Endpoint:** `https://api.telegram.org/bot{TOKEN}/sendMessage`

**Env vars:**
```
TELEGRAM_BOT_TOKEN=   # from BotFather
TELEGRAM_CHAT_ID=     # Aissam's personal chat ID
```

**Messages sent:**
- After each demo: business name, demo URL, outreach messages per channel
- After run completion: summary with counts

---

## Tool Usage Rules

- Always validate scraped data before passing to the next step
- Never log API keys or tokens
- Handle all API failures gracefully — log and continue, never crash the pipeline
- Retry failed API calls max 2 times with 2s backoff
- Mark failed steps in Supabase with `status = failed` and an error message field

---

## Tool Failure Fallbacks

| Tool | Failure | Fallback |
|---|---|---|
| Barty-Bart scraper | Rate-limited / error | Outscraper API |
| Coolify deploy | 5xx / timeout | Retry once after 30s |
| Telegram notify | Send failure | Retry 3x with backoff |
| Brave API | 429 / error | Log, skip research, use cached niche_insights |
| GitHub push | Auth error | Log error, halt deploy step |
