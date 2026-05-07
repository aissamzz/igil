---
name: igil-deploy
description: >
  Deploys a built client website to Coolify via REST API. Creates the application,
  sets the subdomain (businessname.murusmare.com), injects environment variables,
  triggers deployment, and polls until live. Step 8 of the Igil pipeline.
metadata:
  openclaw:
    requires:
      bins:
        - python3
        - curl
      env:
        - COOLIFY_API_URL
        - COOLIFY_API_KEY
        - COOLIFY_SERVER_UUID
        - COOLIFY_PROJECT_UUID
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
        - FORMSPREE_API_KEY
---

# Skill: igil-deploy

## Purpose

Take a site that has been pushed to GitHub and deploy it to Coolify under a
`{slug}.murusmare.com` subdomain. SSL is handled automatically by Coolify's
Traefik reverse proxy (wildcard cert for *.murusmare.com must be pre-configured).

## Prerequisites

Before this skill runs for the first time, ensure:
1. `*.murusmare.com` wildcard DNS A record → KVM4 IP
2. Coolify Traefik configured with wildcard SSL via DNS-01 challenge (Cloudflare)
3. Coolify Server, Project already created — UUIDs stored in env vars
4. GitHub token stored in Coolify's Git settings (or passed via deploy key)

## Execution

### 1. Prepare deployment data

```python
import os, httpx, json, time, re

COOLIFY_URL  = os.environ["COOLIFY_API_URL"].rstrip("/")
COOLIFY_KEY  = os.environ["COOLIFY_API_KEY"]
SERVER_UUID  = os.environ["COOLIFY_SERVER_UUID"]
PROJECT_UUID = os.environ["COOLIFY_PROJECT_UUID"]
SB_URL       = os.environ["SUPABASE_URL"]
SB_KEY       = os.environ["SUPABASE_SERVICE_KEY"]

COOLIFY_HEADERS = {
    "Authorization": f"Bearer {COOLIFY_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[''`]", "", s)          # remove apostrophes
    s = re.sub(r"[^a-z0-9]+", "-", s)   # replace non-alphanumeric with dash
    s = s.strip("-")
    return s[:50]                          # max 50 chars

def make_slug(business: dict) -> str:
    city_slug = slugify(business["city"])
    name_slug = slugify(business["name"])
    return f"{city_slug}-{name_slug}"
```

### 2. Check for subdomain collision

```python
def check_fqdn_available(slug: str) -> bool:
    """
    Check if the subdomain is already in use on this Coolify server.
    """
    resp = httpx.get(
        f"{COOLIFY_URL}/api/v1/servers/{SERVER_UUID}/domains",
        headers=COOLIFY_HEADERS,
        timeout=10
    )
    if resp.status_code != 200:
        return True  # Assume available if check fails
    
    existing = [d.lower() for d in (resp.json() or [])]
    fqdn = f"{slug}.murusmare.com"
    
    if fqdn in existing:
        # Add a numeric suffix to avoid collision
        return False
    return True

def resolve_slug(business: dict) -> str:
    base_slug = make_slug(business)
    slug = base_slug
    suffix = 2
    while not check_fqdn_available(slug):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug
```

### 3. Create Formspree form for this business

```python
def create_formspree_form(business_name: str) -> str:
    """
    Create a Formspree form for this client and return the form ID.
    Falls back to a generic form ID if Formspree API is unavailable.
    """
    FORMSPREE_KEY = os.environ.get("FORMSPREE_API_KEY")
    
    if not FORMSPREE_KEY:
        return os.environ.get("FORMSPREE_DEFAULT_FORM_ID", "xpwzjkqv")
    
    resp = httpx.post(
        "https://formspree.io/api/0/forms",
        headers={
            "Authorization": f"Bearer {FORMSPREE_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "name": business_name,
            "email": "aissam@murusmare.com",
        },
        timeout=10
    )
    
    if resp.status_code in (200, 201):
        return resp.json().get("hashid", "xpwzjkqv")
    
    return "xpwzjkqv"  # fallback generic form
```

### 4. Create Coolify application

```python
def create_coolify_app(business: dict, slug: str, repo_url: str) -> str | None:
    """
    Create a new application in Coolify from the GitHub repo.
    Returns the Coolify app UUID on success, None on failure.
    """
    fqdn = f"https://{slug}.murusmare.com"
    
    payload = {
        "project_uuid":      PROJECT_UUID,
        "server_uuid":       SERVER_UUID,
        "environment_name":  "production",
        "git_repository":    repo_url,
        "git_branch":        "main",
        "build_pack":        "nixpacks",
        "ports_exposes":     "3000",
        "name":              slug,
        "fqdn":              fqdn,
        "instant_deploy":    False,  # We'll trigger separately after env vars
        "description":       f"Auto-deployed by Igil — {business['name']}",
    }
    
    resp = httpx.post(
        f"{COOLIFY_URL}/api/v1/applications/public",
        headers=COOLIFY_HEADERS,
        json=payload,
        timeout=30
    )
    
    if resp.status_code not in (200, 201):
        print(f"Coolify app creation failed: {resp.status_code} — {resp.text}")
        return None
    
    app_uuid = resp.json().get("uuid")
    print(f"Created Coolify app: {app_uuid} → {fqdn}")
    return app_uuid
```

### 5. Set environment variables

```python
def set_env_vars(app_uuid: str, business: dict, form_id: str):
    """
    Inject all environment variables for the Next.js site.
    Uses the bulk endpoint to avoid the is_build_time bug.
    """
    env_data = [
        {
            "key": "NEXT_PUBLIC_BUSINESS_NAME",
            "value": business["name"],
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_BUSINESS_PHONE",
            "value": business.get("phone", ""),
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_BUSINESS_EMAIL",
            "value": business.get("email", ""),
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_BUSINESS_ADDRESS",
            "value": business.get("address", ""),
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_BUSINESS_CITY",
            "value": business.get("city", ""),
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_FORM",
            "value": form_id,
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_GOOGLE_MAPS_RATING",
            "value": str(business.get("rating", "")),
            "is_preview": False,
            "is_build_time": True,
        },
        {
            "key": "NEXT_PUBLIC_REVIEW_COUNT",
            "value": str(business.get("review_count", "")),
            "is_preview": False,
            "is_build_time": True,
        },
    ]
    
    resp = httpx.post(
        f"{COOLIFY_URL}/api/v1/applications/{app_uuid}/envs/bulk",
        headers=COOLIFY_HEADERS,
        json={"data": env_data},
        timeout=15
    )
    
    if resp.status_code not in (200, 201):
        print(f"Env var set failed: {resp.status_code} — {resp.text}")
        return False
    
    print(f"Set {len(env_data)} env vars for {app_uuid}")
    return True
```

### 6. Trigger deployment

```python
def trigger_deployment(app_uuid: str) -> bool:
    resp = httpx.get(
        f"{COOLIFY_URL}/api/v1/deploy",
        headers=COOLIFY_HEADERS,
        params={"uuid": app_uuid, "force": "false"},
        timeout=30
    )
    
    if resp.status_code not in (200, 201):
        print(f"Deploy trigger failed: {resp.status_code} — {resp.text}")
        return False
    
    print(f"Deployment triggered for {app_uuid}")
    return True
```

### 7. Poll until deployment is live

```python
def wait_for_deployment(app_uuid: str, timeout_seconds: int = 300) -> bool:
    """
    Poll the Coolify API every 10 seconds until the app is running or timeout.
    Returns True if deployment succeeded, False if timeout or failure.
    """
    start = time.time()
    
    TERMINAL_STATES = {
        "running": True,
        "stopped": False,
        "error": False,
        "degraded": False,
    }
    
    while time.time() - start < timeout_seconds:
        time.sleep(10)
        
        try:
            resp = httpx.get(
                f"{COOLIFY_URL}/api/v1/applications/{app_uuid}",
                headers=COOLIFY_HEADERS,
                timeout=15
            )
            
            if resp.status_code == 200:
                status = resp.json().get("status", "unknown").lower()
                print(f"  App status: {status} ({int(time.time()-start)}s elapsed)")
                
                if status in TERMINAL_STATES:
                    return TERMINAL_STATES[status]
                    
        except Exception as e:
            print(f"  Poll error (will retry): {e}")
    
    print(f"Deployment timed out after {timeout_seconds}s")
    return False
```

### 8. Update Supabase

```python
def finalize_deployment(b_id: str, app_uuid: str, slug: str,
                        build_id: str, success: bool):
    deployed_url = f"https://{slug}.murusmare.com"
    
    if success:
        # Update businesses
        httpx.patch(
            f"{SB_URL}/rest/v1/businesses?id=eq.{b_id}",
            headers=HEADERS_SB,
            json={
                "status": "deployed",
                "coolify_app_uuid": app_uuid,
                "deployed_url": deployed_url,
            },
            timeout=10
        )
        # Update site_builds
        httpx.patch(
            f"{SB_URL}/rest/v1/site_builds?id=eq.{build_id}",
            headers=HEADERS_SB,
            json={
                "build_status": "live",
                "coolify_app_uuid": app_uuid,
                "deployed_url": deployed_url,
            },
            timeout=10
        )
        print(f"✅ Deployed: {deployed_url}")
    else:
        httpx.patch(
            f"{SB_URL}/rest/v1/site_builds?id=eq.{build_id}",
            headers=HEADERS_SB,
            json={"build_status": "failed"},
            timeout=10
        )
        print(f"❌ Deployment failed for {b_id}")
```

## Full Deploy Flow

```python
async def deploy_business(b: dict, build: dict):
    """
    Orchestrate the full deployment for one business.
    """
    try:
        # Resolve unique slug
        slug = resolve_slug(b)
        
        # Create Formspree form
        form_id = create_formspree_form(b["name"])
        
        # Create Coolify app
        app_uuid = create_coolify_app(b, slug, b["github_repo_url"])
        if not app_uuid:
            raise Exception("Failed to create Coolify application")
        
        # Set env vars
        if not set_env_vars(app_uuid, b, form_id):
            raise Exception("Failed to set environment variables")
        
        # Trigger deploy
        if not trigger_deployment(app_uuid):
            raise Exception("Failed to trigger deployment")
        
        # Wait for it to go live
        success = wait_for_deployment(app_uuid, timeout_seconds=300)
        
        # Update Supabase
        finalize_deployment(b["id"], app_uuid, slug, build["id"], success)
        
        return success, f"https://{slug}.murusmare.com"
        
    except Exception as e:
        print(f"Deploy error for {b['name']}: {e}")
        finalize_deployment(b["id"], None, None, build.get("id"), False)
        return False, None
```

## Error Recovery

If a deployment fails:
1. The Coolify app remains in Coolify (do not auto-delete)
2. Aissam can investigate via the Coolify dashboard
3. On Aissam's instruction, re-trigger via: `GET /api/v1/deploy?uuid={app_uuid}&force=true`
4. Once resolved, manually update `businesses.status = 'deployed'` in Supabase

## Monitoring Deployed Sites

The Monday `igil-status` digest includes a count of:
- Sites deployed this week
- Sites currently `running` in Coolify
- Any sites showing `error` or `degraded` status
