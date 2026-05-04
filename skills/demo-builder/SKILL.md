---
name: demo-builder
description: Generate a Next.js + Tailwind CSS single-page demo website for a qualified lead using ChatGPT Codex via the coding-agent skill. Uses real business data and niche insights.
metadata.openclaw:
  emoji: 🏗️
  required-binaries:
    - node
    - npx
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 5** of the Igil pipeline: after niche research, before deployment.

Do NOT use this skill to:
- Generate demos for unqualified leads (score < 60)
- Fabricate business data — all content must come from scraped + researched sources
- Generate more than 30 demos per run

## Setup

Set env vars in `.env`:
```
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

Requires coding-agent skill installed in OpenClaw:
```bash
clawhub install coding-agent
```

## Usage

Generate a demo for one lead:
```bash
node skills/demo-builder/scripts/generate.js --lead-id "uuid" --niche "dentist"
```

## Process

1. Load lead data from Supabase `leads` table
2. Load niche insights from `niche_insights` table
3. Select template from `assets/templates/{niche}.jsx`
4. Build Codex prompt (see generate.js for full prompt format)
5. Invoke `coding-agent` skill with `background: true`
6. Wait for completion — validate output compiles (`npx next build`)
7. If build fails: retry once with simplified prompt
8. Output: complete Next.js project directory at `demos/{business-slug}/`

## Demo Structure

Output is a minimal Next.js static site:
```
demos/{business-slug}/
├── package.json
├── next.config.js          # output: 'export'
├── tailwind.config.js
├── postcss.config.js
├── pages/
│   └── index.jsx           # full single-page site
└── public/
    └── (no external images — use placeholder colors)
```

## Templates

Pre-built starter templates in `assets/templates/`:
- `dentist.jsx`
- `aesthetic-clinic.jsx`
- `boutique-hotel.jsx`
- `local-service.jsx`

Codex uses these as structural scaffolding and replaces all content with real business data.

## Murus Mare Watermark

Every generated demo must include in the footer:
```jsx
<p className="text-xs text-gray-300 opacity-40 mt-4">
  Site by <a href="https://murusmare.com" className="underline">Murus Mare</a>
</p>
```

## Validation

Before passing to deploy-manager, verify:
- `npx next build` exits with code 0
- `pages/index.jsx` exists and is non-empty
- Business name appears in the rendered output
- No placeholder text like "Lorem ipsum" or "[INSERT]"
