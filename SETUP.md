# SETUP.md — Igil VPS Installation Guide

> Complete step-by-step setup for the Igil stack on Hostinger KVM4
> (Ubuntu 24.04 with Coolify pre-installed via Hostinger template).
> Run these commands as root unless stated otherwise.

---

## Prerequisites

- Hostinger KVM4 VPS with Ubuntu 24.04 + Coolify template
- Domain: `murusmare.com` pointed at your VPS IP (A record)
- Wildcard DNS: `*.murusmare.com` → VPS IP (A record)
- Cloudflare as DNS provider (recommended for wildcard SSL)
- GitHub account with access to `murusmare-clients` org
- Supabase project created (URL + service role key ready)
- Brave Search API key
- Telegram bot token + chat ID (already set up per your note)
- Anthropic API key

---

## Step 1 — Initial VPS Configuration

```bash
# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y \
    curl git wget unzip jq \
    python3 python3-pip python3-venv \
    build-essential \
    ufw

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp   # Coolify dashboard
ufw --force enable
ufw status

# Set timezone
timedatectl set-timezone Europe/Paris
```

---

## Step 2 — Node.js 24 (for OpenClaw)

```bash
# Install Node.js 24 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node --version   # should be 24.x
npm --version

# Install pnpm globally (for building client sites)
npm install -g pnpm
pnpm --version
```

---

## Step 3 — OpenClaw Installation

```bash
# Install OpenClaw globally
npm install -g @openclaw/cli

# Verify
openclaw --version

# Run initial setup (interactive — configure Anthropic provider)
openclaw onboarding

# Start the gateway as a background daemon
openclaw gateway start --daemon

# Verify gateway is running
openclaw gateway status
```

---

## Step 4 — Google Maps Scraper

```bash
# Install Go (required to build the scraper)
wget https://go.dev/dl/go1.22.3.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.22.3.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# Clone and build gosom/google-maps-scraper
git clone https://github.com/gosom/google-maps-scraper.git /opt/google-maps-scraper
cd /opt/google-maps-scraper
go build -o /usr/local/bin/google-maps-scraper .

# Verify
google-maps-scraper --help

# Install Playwright dependencies (required for browser automation)
npx playwright install chromium
npx playwright install-deps

# Test run (quick)
echo "plumbers in Tucson AZ" > /tmp/test-query.txt
google-maps-scraper \
    -input /tmp/test-query.txt \
    -results /tmp/test-result.json \
    -json \
    -depth 2 \
    -c 2 \
    -exit-on-inactivity 1m

echo "Scraper test complete. Results:"
cat /tmp/test-result.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Found {len(d)} results')"
```

---

## Step 5 — Python Environment for Igil's Scripts

```bash
# Create a dedicated Python venv for Igil
python3 -m venv /opt/igil-venv

# Activate and install dependencies
source /opt/igil-venv/bin/activate

pip install \
    supabase \
    httpx \
    anthropic \
    python-dotenv \
    tenacity

# Verify
python3 -c "import supabase, httpx, anthropic; print('All packages OK')"

# Make igil-venv the default python3 for exec tool
echo 'alias python3="/opt/igil-venv/bin/python3"' >> ~/.bashrc
source ~/.bashrc
```

---

## Step 6 — GitHub CLI

```bash
# Install gh CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt update && apt install -y gh

# Authenticate (use your GitHub token with repo scope)
gh auth login --with-token <<< "ghp_YOUR_GITHUB_TOKEN"

# Verify
gh auth status
```

---

## Step 7 — Codex CLI

```bash
# Install Codex (Anthropic's coding agent)
npm install -g @anthropic-ai/codex

# Configure with Anthropic API key
export ANTHROPIC_API_KEY=your_key_here
codex --version

# Test
echo 'console.log("hello from codex")' > /tmp/test.js
codex "Look at /tmp/test.js and add a function that returns 42" --no-interactive
```

---

## Step 8 — Website Template

```bash
# Clone the base template (you'll create this repo first)
git clone https://github.com/murusmare-clients/template-business-v1.git \
    /opt/murusmare/template-business-v1

# Install template dependencies
cd /opt/murusmare/template-business-v1
pnpm install

# Test that the template builds
pnpm run build
echo "Template build: $?"

# Create builds directory
mkdir -p /tmp/builds
```

**To create the template repo if it doesn't exist yet:**

```bash
mkdir -p /opt/murusmare/template-business-v1
cd /opt/murusmare/template-business-v1

# Initialize Next.js 15 + shadcn/ui
npx create-next-app@latest . \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --no-src-dir \
    --import-alias "@/*"

# Initialize shadcn
npx shadcn@latest init

# Add the components Igil uses
npx shadcn@latest add button card sheet accordion avatar badge tabs \
    input textarea label form separator carousel navigation-menu sonner dialog

# Push to GitHub
git init -b main
git add .
git commit -m "Initial template"
gh repo create murusmare-clients/template-business-v1 --private --source=. --push
```

---

## Step 9 — Igil Agent Configuration

```bash
# Create Igil agent workspace
mkdir -p ~/.openclaw/agents/igil/workspace/notes
mkdir -p ~/.openclaw/agents/igil/workspace/skills

# Copy all AGENTS.md, SOUL.md, USER.md, TOOLS.md, THEMES.md
cp /path/to/igil-docs/agent/AGENTS.md   ~/.openclaw/agents/igil/workspace/AGENTS.md
cp /path/to/igil-docs/agent/SOUL.md     ~/.openclaw/agents/igil/workspace/SOUL.md
cp /path/to/igil-docs/agent/USER.md     ~/.openclaw/agents/igil/workspace/USER.md
cp /path/to/igil-docs/agent/TOOLS.md    ~/.openclaw/agents/igil/workspace/TOOLS.md
cp /path/to/igil-docs/agent/THEMES.md   ~/.openclaw/agents/igil/workspace/THEMES.md

# Copy queue and daily log starter files
cp /path/to/igil-docs/agent/notes/queue.md     ~/.openclaw/agents/igil/workspace/notes/queue.md
cp /path/to/igil-docs/agent/notes/daily-log.md ~/.openclaw/agents/igil/workspace/notes/daily-log.md

# Copy skills
mkdir -p ~/.openclaw/agents/igil/workspace/skills
cp -r /path/to/igil-docs/skills/* ~/.openclaw/agents/igil/workspace/skills/

# Set up .env file
cat > ~/.openclaw/agents/igil/.env << 'EOF'
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
FORMSPREE_FALLBACK_ID=xdefault000
EOF

chmod 600 ~/.openclaw/agents/igil/.env

# Apply openclaw config
cp /path/to/igil-docs/agent/openclaw-config.json ~/.openclaw/openclaw.json
```

---

## Step 10 — Supabase Schema

```bash
# Apply the schema via Supabase SQL Editor
# 1. Go to your Supabase project → SQL Editor
# 2. Paste the contents of igil-docs/supabase/schema.sql
# 3. Click Run

# Or via supabase CLI:
# npm install -g supabase
# supabase login
# supabase db push --db-url "postgresql://postgres:password@db.xyz.supabase.co:5432/postgres"
```

---

## Step 11 — Coolify Wildcard SSL Setup

```bash
# 1. In Cloudflare: verify *.murusmare.com A record → VPS IP

# 2. In Coolify dashboard → Proxy → Traefik → Dynamic Configuration
#    Add the following to your Traefik config:

cat >> /data/coolify/proxy/dynamic/murusmare-wildcard.yaml << 'EOF'
http:
  routers: {}
  middlewares: {}
  services: {}

tls:
  certificates:
    - certFile: /etc/traefik/certs/murusmare.crt
      keyFile: /etc/traefik/certs/murusmare.key

certificatesResolvers:
  letsencrypt:
    acme:
      email: aissam@murusmare.com
      storage: /etc/traefik/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - 1.1.1.1:53
          - 8.8.8.8:53
EOF

# 3. Set Cloudflare credentials in the Traefik environment
#    In Coolify: Settings → Server → Traefik → Environment Variables
#    CF_API_EMAIL=your@email.com
#    CF_API_KEY=your_cloudflare_global_api_key

# 4. In Coolify Server settings → Wildcard Domain: https://murusmare.com
```

---

## Step 12 — Register Cron Jobs

```bash
# Register all Igil cron jobs
# Replace $TELEGRAM_CHAT_ID with your actual chat ID first

source ~/.openclaw/agents/igil/.env

# Register all jobs (copy from CRON.md and run)
# Or import the JSON file if OpenClaw supports it:
openclaw cron import ~/.openclaw/agents/igil/workspace/../../../igil-docs/cron/cron-jobs.json

# Verify all jobs are registered
openclaw cron list
```

---

## Step 13 — First Run Test

```bash
# Send a test Telegram message to verify the bot works
python3 << 'EOF'
import httpx, os
from dotenv import load_dotenv
load_dotenv("/root/.openclaw/agents/igil/.env")

r = httpx.post(
    f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
    json={
        "chat_id": os.environ["TELEGRAM_CHAT_ID"],
        "text": "🦅 Igil is online. Ready to find leads for Murus Mare.",
        "parse_mode": "Markdown",
    }
)
print("Telegram:", r.status_code, r.json().get("ok"))
EOF

# Test Brave Search API
python3 << 'EOF'
import httpx, os
from dotenv import load_dotenv
load_dotenv("/root/.openclaw/agents/igil/.env")

r = httpx.get(
    "https://api.search.brave.com/res/v1/web/search",
    headers={"X-Subscription-Token": os.environ["BRAVE_API_KEY"],
             "Accept": "application/json"},
    params={"q": "plumbers in Phoenix AZ", "count": 3, "country": "us"}
)
print("Brave:", r.status_code, len(r.json().get("web",{}).get("results",[])), "results")
EOF

# Test Supabase connection
python3 << 'EOF'
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv("/root/.openclaw/agents/igil/.env")

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
result = sb.table("businesses").select("count", count="exact").execute()
print("Supabase:", "OK — businesses table has", result.count, "rows")
EOF

echo "All integration tests passed. Igil is ready."
```

---

## Step 14 — Trigger First Manual Run

```bash
# Trigger the scrape job manually (don't wait for 02:00)
openclaw run \
    --agent igil \
    --session isolated \
    --message "SCRAPE: Read notes/queue.md and run the Google Maps scraper for the
    current niche and city. This is a manual test run — scrape only 10 results
    to verify the pipeline end-to-end. Report back what you found."

# Watch the output in Telegram
```

---

## Ongoing Maintenance

```bash
# Check gateway is running (set up as systemd service)
openclaw gateway status

# View cron job status
openclaw cron list
openclaw cron status igil-scrape

# View recent logs
tail -100 ~/.openclaw/agents/igil/workspace/notes/daily-log.md

# Manually trigger a specific job
openclaw cron trigger igil-qualify

# Update OpenClaw
npm update -g @openclaw/cli
openclaw gateway restart
```

---

## Disk Space Management

The `/tmp/builds/` directory accumulates build artifacts. The deploy skill cleans
up after each deployment, but if it fails:

```bash
# Clean up old build directories (older than 1 day)
find /tmp/builds/ -maxdepth 1 -type d -mtime +1 -exec rm -rf {} +

# Check disk usage
df -h /
du -sh /tmp/builds/ ~/.openclaw/ /opt/murusmare/
```

---

## Monitoring Checklist (daily)

- [ ] Telegram morning digest received at 08:00?
- [ ] Any `status='failed'` rows in Supabase?
- [ ] Gateway process running? (`openclaw gateway status`)
- [ ] Disk space healthy? (`df -h /`)
- [ ] Any Coolify deployments stuck?
