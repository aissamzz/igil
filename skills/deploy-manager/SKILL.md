---
name: deploy-manager
description: Push generated Next.js demo to GitHub and deploy via Coolify API to a {slug}.murusmare.com subdomain. Monitors deployment status and updates Supabase.
metadata.openclaw:
  emoji: 🚀
  required-binaries:
    - node
    - git
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 6** of the Igil pipeline: after demo generation is validated.

Do NOT use this skill to:
- Deploy demos that failed `next build` validation
- Deploy to subdomains outside `*.murusmare.com`
- Deploy without a valid GitHub repo first

## Setup

Set env vars in `.env`:
```
GITHUB_TOKEN=
GITHUB_USERNAME=
COOLIFY_BASE_URL=
COOLIFY_API_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

**Pre-requisites (set up by operator):**
- Wildcard DNS `*.murusmare.com` → Coolify server IP
- Coolify has a wildcard domain configured for `*.murusmare.com`
- SSL (Let's Encrypt) enabled in Coolify project settings

## Usage

Deploy a single demo:
```bash
node skills/deploy-manager/scripts/push-github.js --slug "dr-patel-dental" --path "demos/dr-patel-dental"
node skills/deploy-manager/scripts/deploy-coolify.js --slug "dr-patel-dental" --repo-url "https://github.com/..."
```

## Process

### push-github.js
1. Create new private repo: `igil-demo-{run_id}` (if not exists for this run)
2. Initialize git in `demos/{slug}/`
3. Commit all files
4. Push to GitHub under `GITHUB_USERNAME`
5. Return repo URL

### deploy-coolify.js
1. Create Coolify application via `POST /api/v1/applications`
   - Source: GitHub repo + branch `main`
   - Build command: `npx next build`
   - Output directory: `out/`
   - Domain: `{slug}.murusmare.com`
2. Trigger deployment: `POST /api/v1/deploy`
3. Poll `GET /api/v1/applications/{id}` every 10s for up to 3 minutes
4. On success: verify `https://{slug}.murusmare.com` returns HTTP 200
5. Update Supabase `demos` table: `deployment_status = live`, `demo_url`, `deployed_at`

## Subdomain Format

```
{business-name-slug}.murusmare.com
```

Examples:
- `dr-patel-dental.murusmare.com`
- `nashville-skin-clinic.murusmare.com`
- `the-birch-hotel.murusmare.com`

Slug rules:
- Lowercase
- Hyphens only (no underscores)
- Max 40 characters
- Strip: `the`, `llc`, `inc`, `co`

## Failure Handling

- Deployment timeout (>3min): mark `deployment_status = failed`, log error, continue
- HTTP check fails: retry once after 30s
- GitHub push fails: halt this demo, log auth error, continue to next lead
