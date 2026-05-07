---
name: igil-build
description: >
  Generates a complete Next.js + shadcn/ui website for a qualified, researched
  lead using Codex CLI. Forks the template-business-v1, injects business-specific
  content and config, then pushes to GitHub under the murusmare-clients org.
  Steps 5, 6, and 7 of the Igil pipeline.
metadata:
  openclaw:
    requires:
      bins:
        - codex        # Codex CLI installed globally
        - node
        - npm
        - git
        - gh           # GitHub CLI, authenticated with GH_TOKEN
        - python3
      env:
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
        - GITHUB_TOKEN
        - FORMSPREE_API_KEY
        - UNSPLASH_ACCESS_KEY
---

# Skill: igil-build

## Purpose

Turn a researched lead into a live-ready website. This is the creative core
of the pipeline. Every site must look unique despite sharing a base template.

## Step 5 — Build Prompt Generation

Before invoking Codex, Igil must produce a detailed, specific prompt. Vague
prompts produce generic sites. Specific prompts produce sites that feel custom.

### Prompt template

```python
def generate_site_prompt(business: dict, niche_research: dict) -> str:
    """
    Generate the full Codex prompt for this business's website.
    """
    b = business
    nr = niche_research
    
    # Determine visual theme based on niche
    theme = NICHE_THEMES.get(b["niche"].lower(), DEFAULT_THEME)
    
    # Extract top competitor insights
    competitor_insights = "\n".join([
        f"- {s.get('analysis', {}).get('design_tone', 'N/A')}: {s['url']}"
        for s in (nr.get("top_sites") or [])[:3]
    ])
    
    # Determine page structure
    section_order = NICHE_SECTION_ORDERS.get(b["niche"].lower(), DEFAULT_SECTIONS)
    
    # Photo strategy
    has_real_photos = len(json.loads(b.get("photos") or "[]")) > 0
    photo_strategy = (
        f"Use these real business photos from Google Maps/social: {b['photos']}"
        if has_real_photos else
        f"Use Unsplash stock photos. Search terms: '{b['niche']} {b['city']}', "
        f"'{b['niche']} professional', '{theme['photo_vibe']}'. "
        "Pick warm, authentic, non-cliché images."
    )
    
    prompt = f"""
You are building a professional business website for the following real business.
Base template: template-business-v1 (Next.js 15 + shadcn/ui + Tailwind v4)

=== BUSINESS INFO ===
Name: {b['name']}
Niche: {b['niche']}
City: {b['city']}, {b.get('state', '')}
Phone: {b.get('phone', '[PHONE NEEDED]')}
Email: {b.get('email', '[EMAIL NEEDED]')}
Address: {b.get('address', '')}
Rating: {b.get('rating', 'N/A')} ⭐ ({b.get('review_count', 0)} reviews)
About: {extract_about_text(b)}

=== VISUAL IDENTITY ===
Color theme: {theme['colors']} — {theme['color_description']}
Typography: {theme['fonts']} — {theme['font_description']}
Design tone: {theme['design_tone']}
Section order: {', '.join(section_order)}
Hero variant: {theme['hero_variant']}

=== COMPETITOR ANALYSIS ===
Top 3 sites in this niche/city for reference (do NOT copy, use as inspiration):
{competitor_insights}
Key patterns from competitors: {nr.get('design_notes', 'Professional, trust-first')}
Common services offered: {', '.join((nr.get('services') or ['General services'])[:6])}

=== COPY DIRECTION ===
Tone: {theme['copy_tone']}
Headline approach: Benefit-led, specific to {b['city']} and {b['niche']} customers
Services section: List their likely services based on niche research
Testimonials: Generate 3 realistic testimonials from {b['city']} residents
  (do NOT use real names — use first name + initial only)
About section: Warm, personal, emphasise local expertise and years of experience
  (use review count as proof of experience: "{b.get('review_count', 50)}+ happy customers")
CTA: Primary = "Call Us Now" or "Get a Free Quote" depending on niche
     Secondary = "Contact Us" (links to contact form)

=== PHOTOGRAPHY ===
{photo_strategy}

=== TECHNICAL REQUIREMENTS ===
- Fork from template-business-v1 exactly — do not change the component structure
- Update ONLY: lib/site-config.ts, public/ images, and globals.css theme tokens
- Contact form: uses Formspree via env var NEXT_PUBLIC_FORM (placeholder value ok)
- All business data (name, phone, address) injected from site-config.ts
- Mobile-first, fully responsive
- SEO: meta title = "{b['name']} — {b['niche'].title()} in {b['city']}, {b.get('state','')} | Expert Local Service"
- SEO: meta description = 60–155 chars, benefit-led, location-specific
- No animations that affect Core Web Vitals
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95

=== OUTPUT ===
Produce a complete, ready-to-deploy website. Every section must have real content —
no "Lorem ipsum", no [PLACEHOLDER] text in visible UI. Use the business data above
and niche research to fill every section with compelling, professional copy.

The owner of this business should open this site and immediately think:
"This is exactly my business. This looks like it cost thousands of dollars."
"""
    return prompt


NICHE_THEMES = {
    "plumber": {
        "colors": "slate-900, blue-600, white",
        "color_description": "Dark professional with strong blue accent",
        "fonts": "Inter (headings) + Inter (body)",
        "font_description": "Clean, technical, trustworthy",
        "design_tone": "Professional and reliable — this person will fix your emergency at 2am",
        "hero_variant": "hero-split",
        "copy_tone": "Direct and confident. No fluff. Homeowners want solutions.",
        "photo_vibe": "plumber fixing pipes professional",
        "sections": ["hero", "services", "why-us", "testimonials", "contact"],
    },
    "salon": {
        "colors": "rose-50, rose-900, gold-400",
        "color_description": "Warm luxury neutrals with gold accents",
        "fonts": "Playfair Display (headings) + Lato (body)",
        "font_description": "Elegant, feminine, high-end feel",
        "design_tone": "Warm luxury — like a boutique in a nice neighbourhood",
        "hero_variant": "hero-fullbleed-photo",
        "copy_tone": "Warm and aspirational. You deserve to feel beautiful.",
        "photo_vibe": "hair salon elegant styling professional",
        "sections": ["hero", "services", "gallery", "testimonials", "about", "contact"],
    },
    "restaurant": {
        "colors": "amber-900, cream, red-700",
        "color_description": "Warm and inviting, appetite-stimulating",
        "fonts": "Merriweather (headings) + Open Sans (body)",
        "font_description": "Traditional, warm, welcoming",
        "design_tone": "Cozy neighbourhood joint — come in, you belong here",
        "hero_variant": "hero-fullbleed-photo",
        "copy_tone": "Inviting and sensory. Make them taste it.",
        "photo_vibe": "restaurant food photography warm lighting",
        "sections": ["hero", "menu-preview", "about", "gallery", "testimonials", "contact"],
    },
    "auto repair": {
        "colors": "zinc-900, red-600, white",
        "color_description": "Dark industrial with bold red",
        "fonts": "Barlow Condensed (headings) + Barlow (body)",
        "font_description": "Strong, mechanical, no-nonsense",
        "design_tone": "Confident expertise — your car is in good hands",
        "hero_variant": "hero-centered-image",
        "copy_tone": "Straight-shooting. Car owners hate being talked down to.",
        "photo_vibe": "mechanic auto repair shop professional",
        "sections": ["hero", "services", "why-us", "testimonials", "contact"],
    },
    "landscaping": {
        "colors": "green-900, stone-100, amber-500",
        "color_description": "Natural greens with warm earth tones",
        "fonts": "Montserrat (headings) + Source Sans (body)",
        "font_description": "Outdoorsy and fresh",
        "design_tone": "Outdoor pride — we transform your space",
        "hero_variant": "hero-fullbleed-photo",
        "copy_tone": "Aspirational and seasonal. Show the transformation.",
        "photo_vibe": "landscaping garden beautiful lawn professional",
        "sections": ["hero", "services", "gallery", "testimonials", "about", "contact"],
    },
}

DEFAULT_THEME = NICHE_THEMES["plumber"]  # fallback
DEFAULT_SECTIONS = ["hero", "services", "testimonials", "about", "contact"]
NICHE_SECTION_ORDERS = {k: v["sections"] for k, v in NICHE_THEMES.items()}
```

### Save prompt to Supabase

```python
httpx.patch(
    f"{SUPABASE_URL}/rest/v1/businesses?id=eq.{b['id']}",
    headers=HEADERS_SB,
    json={"prompt_used": prompt},
    timeout=10
)
```

---

## Step 6 — Build Website with Codex

```bash
#!/bin/bash
set -e

BUSINESS_ID="$1"
BUSINESS_SLUG="$2"    # e.g. "phoenix-joes-plumbing"
PROMPT_FILE="$3"      # path to prompt saved to disk

BUILD_DIR=~/igil/builds/$BUSINESS_SLUG
TEMPLATE_DIR=~/igil/template-business-v1

# 1. Clone the template
cp -r $TEMPLATE_DIR $BUILD_DIR
cd $BUILD_DIR

# 2. Run Codex with the prompt
codex \
  --model "claude-sonnet-4-5" \
  --approval-mode full-auto \
  --quiet \
  "$(cat $PROMPT_FILE)"

# 3. Install dependencies and build to check for errors
npm install --silent
npm run build 2>&1 | tee ~/igil/logs/build_${BUSINESS_SLUG}.log

BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "BUILD_FAILED"
  exit 1
fi

echo "BUILD_SUCCESS"
```

### Handle build failure

If Codex build fails:
1. Mark `site_builds.build_status = 'failed'`
2. Save the build log
3. Notify Aissam via Telegram with the error
4. Do NOT push to GitHub or attempt deployment
5. Continue processing next lead

---

## Step 7 — Push to GitHub

```bash
#!/bin/bash
set -e

BUSINESS_SLUG="$1"   # e.g. "phoenix-joes-plumbing"
BUSINESS_NAME="$2"   # e.g. "Joe's Plumbing"
CITY="$3"            # e.g. "Phoenix"

BUILD_DIR=~/igil/builds/$BUSINESS_SLUG

cd $BUILD_DIR

# Initialise git
git init -b main
git add .
git commit -m "Igil: initial build — $BUSINESS_NAME ($CITY)"

# Create private repo under murusmare-clients org and push
gh repo create murusmare-clients/$BUSINESS_SLUG \
  --private \
  --source=. \
  --remote=origin \
  --push \
  --description "Auto-generated by Igil for $BUSINESS_NAME"

REPO_URL="https://github.com/murusmare-clients/$BUSINESS_SLUG"
echo $REPO_URL
```

If `gh repo create` fails:
1. Retry once after 10 seconds
2. If still fails, mark `build_status = 'github_push_failed'`, notify Aissam, continue

### Update Supabase after successful push

```python
# Create site_builds record
httpx.post(
    f"{SUPABASE_URL}/rest/v1/site_builds",
    headers=HEADERS_SB,
    json={
        "business_id": b["id"],
        "template_used": "template-business-v1",
        "prompt": prompt,
        "github_repo_url": repo_url,
        "build_status": "ready_to_deploy",
    },
    timeout=10
)

# Update businesses record
httpx.patch(
    f"{SUPABASE_URL}/rest/v1/businesses?id=eq.{b['id']}",
    headers=HEADERS_SB,
    json={
        "status": "site_built",
        "github_repo_url": repo_url,
    },
    timeout=10
)
```

## Processing Order

The `igil-build` cron processes the **top 5 priority leads** per run (sorted by
`lead_score DESC`) from businesses with `status = 'researched'`.

```sql
SELECT * FROM businesses
WHERE status = 'researched'
  AND lead_score >= 60
ORDER BY lead_score DESC
LIMIT 5;
```

Building 5 sites per night = 35 sites/week at sustainable Codex usage. Scale up
once Aissam confirms quality is consistent.

## Build Directory Cleanup

After successful GitHub push, the local build directory is archived:
```bash
tar -czf ~/igil/archives/$BUSINESS_SLUG.tar.gz -C ~/igil/builds $BUSINESS_SLUG
rm -rf ~/igil/builds/$BUSINESS_SLUG
```

This prevents the VPS disk from filling up over time.
