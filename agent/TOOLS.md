# TOOLS.md — Igil's Tool Reference

> Complete reference for every tool and integration Igil uses.
> Read this when you need the exact syntax, format, or pattern for a given tool.

---

## 1. Google Maps Scraper (gosom/google-maps-scraper)

**Binary location:** /usr/local/bin/google-maps-scraper

### Run a scrape job

```bash
cat > /tmp/queries.txt << 'EOF'
plumbers in Phoenix AZ
plumbers in Scottsdale AZ
EOF

google-maps-scraper \
  -input /tmp/queries.txt \
  -results /tmp/scrape_$(date +%Y%m%d_%H%M%S).json \
  -json -depth 10 -c 4 -lang en -exit-on-inactivity 3m
```

### Filter for no-website leads

```python
SOCIAL_DOMAINS = ["facebook.com","instagram.com","yelp.com","yellowpages.com",
                  "bbb.org","mapquest.com","tripadvisor.com","linktr.ee"]

def has_real_website(record):
    url = (record.get("website") or "").strip().lower()
    if not url: return False
    return not any(domain in url for domain in SOCIAL_DOMAINS)

no_site_leads = [r for r in results if not has_real_website(r)]
```

---

## 2. Brave Search API

**Base URL:** https://api.search.brave.com
**Auth:** X-Subscription-Token: $BRAVE_API_KEY
**Rate:** 1 req/sec on entry tier

### Verify no website exists

```python
import httpx, os

def verify_no_website(name, city, state):
    r = httpx.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"X-Subscription-Token": os.environ["BRAVE_API_KEY"],
                 "Accept": "application/json"},
        params={"q": f'"{name}" {city} {state} official website', "count": 5, "country": "us"},
        timeout=10
    )
    results = r.json().get("web", {}).get("results", [])
    NON_SITES = ["facebook","yelp","yellowpages","bbb.org","instagram","tripadvisor"]
    for hit in results:
        url = hit.get("url","").lower()
        title = hit.get("title","").lower()
        if name.lower().split()[0] in title and not any(n in url for n in NON_SITES):
            return False  # Has a website
    return True  # No website
```

### Research competitor sites

```python
def get_competitor_sites(niche, city):
    r = httpx.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"X-Subscription-Token": os.environ["BRAVE_API_KEY"],
                 "Accept": "application/json"},
        params={"q": f"best {niche} in {city}", "count": 10, "country": "us"},
        timeout=10
    )
    SKIP = ["yelp","yellowpages","angi","google","facebook","homeadvisor"]
    sites = []
    for hit in r.json().get("web",{}).get("results",[]):
        url = hit.get("url","")
        if not any(s in url for s in SKIP):
            sites.append({"url": url, "title": hit.get("title","")})
        if len(sites) == 3: break
    return sites
```

---

## 3. Supabase

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # Always use service role
)

# Insert a lead
def insert_lead(record, niche, city, state):
    try:
        result = supabase.table("businesses").insert({
            "place_id": record["id"],
            "name": record["title"],
            "niche": niche, "city": city, "state": state,
            "phone": record.get("phone"),
            "email": (record.get("emails") or [None])[0],
            "address": record.get("address"),
            "rating": record.get("rating"),
            "review_count": record.get("review_count", 0),
            "google_maps_url": record.get("url"),
            "photos": record.get("images", []),
            "has_website": False, "status": "scraped",
        }).execute()
        return result.data[0]["id"]
    except Exception as e:
        if "unique" in str(e).lower(): return None
        raise

# Update pipeline status
def update_status(business_id, status, **kwargs):
    supabase.table("businesses").update(
        {"status": status, **kwargs}
    ).eq("id", business_id).execute()

# Get build queue
def get_build_queue(limit=10):
    return supabase.table("businesses")\
        .select("*").eq("status","qualified")\
        .gte("lead_score",70).order("lead_score",desc=True)\
        .limit(limit).execute().data
```

---

## 4. Lead Scoring

```python
NICHE_WEIGHTS = {
    "plumber":15,"hvac":15,"electrician":15,"roofer":14,
    "contractor":13,"dentist":13,"auto repair":12,
    "landscaper":10,"cleaner":9,"salon":8,"restaurant":7,
    "default":8
}

def score_lead(b, niche, city):
    s = 0
    s += min(b.get("review_count",0), 50) / 50 * 25
    rating = b.get("rating", 0)
    if rating >= 3.5: s += (rating - 3.5) / 1.5 * 20
    s += NICHE_WEIGHTS.get(niche.lower(), NICHE_WEIGHTS["default"])
    s += 10 if b.get("phone") else 0
    s += 10  # city tier (adjust per city population)
    s += min(len(b.get("images",[])), 5)
    if b.get("emails"): s += 5
    return round(min(s, 100))
```

---

## 5. Coolify API

```python
import httpx, os

HEADERS = {"Authorization": f"Bearer {os.environ['COOLIFY_API_TOKEN']}",
           "Content-Type": "application/json"}
BASE = os.environ["COOLIFY_BASE_URL"]

def deploy_site(business, repo_url):
    slug = re.sub(r'[^a-z0-9]+', '-', business["name"].lower()).strip('-')
    fqdn = f"https://{slug}.murusmare.com"

    # Create application
    r = httpx.post(f"{BASE}/api/v1/applications/public", headers=HEADERS, json={
        "project_uuid": os.environ["COOLIFY_PROJECT_UUID"],
        "server_uuid":  os.environ["COOLIFY_SERVER_UUID"],
        "environment_name": "production",
        "git_repository": repo_url,
        "git_branch": "main",
        "build_pack": "nixpacks",
        "ports_exposes": "3000",
        "name": slug, "fqdn": fqdn,
        "instant_deploy": False,
    }, timeout=30)
    r.raise_for_status()
    app_uuid = r.json()["uuid"]

    # Set env vars
    httpx.post(f"{BASE}/api/v1/applications/{app_uuid}/envs/bulk",
        headers=HEADERS,
        json={"data": [
            {"key":"NEXT_PUBLIC_BUSINESS_NAME","value":business["name"],
             "is_preview":False,"is_build_time":True},
            {"key":"NEXT_PUBLIC_FORM","value":business.get("formspree_id",""),
             "is_preview":False,"is_build_time":True},
        ]}, timeout=15).raise_for_status()

    # Deploy
    httpx.get(f"{BASE}/api/v1/deploy", headers=HEADERS,
        params={"uuid": app_uuid, "force": "false"}, timeout=15).raise_for_status()

    return {"app_uuid": app_uuid, "fqdn": fqdn}
```

---

## 6. GitHub (gh CLI)

```bash
SLUG="joes-plumbing"
cd /tmp/builds/$SLUG

git init -b main
echo ".env.local" >> .gitignore
echo ".next/" >> .gitignore
echo "node_modules/" >> .gitignore
git add . && git commit -m "Igil: initial build — $SLUG"

gh repo create murusmare-clients/$SLUG \
    --private --source=. --remote=origin --push \
    --description "Auto-built by Igil"
```

---

## 7. Telegram Notifications

```python
import httpx, os, time

TG_URL = f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage"

def escape(text):
    for ch in r'_*[]()~`>#+-=|{}.!\\':
        text = text.replace(ch, f'\\{ch}')
    return text

def notify_lead(business, deployed_url, repo_url, outreach_email=None, outreach_sms=None):
    msg = f"""🦅 *New lead deployed by Igil*

*{escape(business['name'])}*
{escape(business['niche'])} · {escape(business['city'])}, {escape(business.get('state',''))}
⭐ {business.get('rating','?')} \\({business.get('review_count',0)} reviews\\) · Score: *{business['lead_score']}/100*

📞 {escape(business.get('phone') or '—')}
📧 {escape(business.get('email') or '—')}
🌐 [{escape(deployed_url)}]({deployed_url})
📦 [GitHub]({repo_url})"""

    if outreach_email:
        msg += f"\n\n*📧 Email:*\n```\n{outreach_email}\n```"
    if outreach_sms:
        msg += f"\n\n*💬 SMS:*\n```\n{outreach_sms}\n```"

    try:
        r = httpx.post(TG_URL, json={
            "chat_id": os.environ["TELEGRAM_CHAT_ID"],
            "text": msg, "parse_mode": "MarkdownV2",
            "disable_web_page_preview": True,
        }, timeout=15)
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            retry = e.response.json().get("parameters",{}).get("retry_after", 5)
            time.sleep(retry + 1)
            notify_lead(business, deployed_url, repo_url, outreach_email, outreach_sms)

def notify_failure(job_name, error, business_id=None):
    msg = f"❌ *Igil error: {escape(job_name)}*\n\n`{escape(error[:500])}`"
    if business_id:
        msg += f"\n\nBusiness ID: `{business_id}`"
    httpx.post(TG_URL, json={
        "chat_id": os.environ["TELEGRAM_CHAT_ID"],
        "text": msg, "parse_mode": "MarkdownV2",
    }, timeout=15)
```

---

## 8. Environment Variables Reference

Store in `~/.openclaw/agents/igil/.env`:

```env
BRAVE_API_KEY=your_brave_api_key
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GH_TOKEN=ghp_your_github_token
GH_ORG=murusmare-clients
COOLIFY_BASE_URL=https://coolify.murusmare.com
COOLIFY_API_TOKEN=your_coolify_token
COOLIFY_PROJECT_UUID=your_project_uuid
COOLIFY_SERVER_UUID=your_server_uuid
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
FORMSPREE_ACCOUNT_TOKEN=your_formspree_token
ANTHROPIC_API_KEY=your_anthropic_key
```
