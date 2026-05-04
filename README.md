# Igil — OpenClaw Agent for Murus Mare

Igil is an autonomous lead-to-demo pipeline. It scrapes US businesses from Google Maps, qualifies them by score, generates Next.js demo websites via ChatGPT Codex, deploys them to Coolify, and sends personalized outreach via Telegram — ready for the operator to copy and send.

---

## What Igil Does Per Run

1. Selects 3 niches and 3 US cities
2. Scrapes up to 100 businesses per niche (Google Maps)
3. Scores and qualifies leads (threshold: 60+)
4. Researches top 3 competitor sites per niche (Brave API)
5. Generates a Next.js + Tailwind demo per qualified lead (Codex)
6. Deploys each demo to `{slug}.murusmare.com` via Coolify
7. Writes personalized outreach per channel (WhatsApp, email, Instagram, Facebook)
8. Notifies operator via Telegram after each demo

**Limits:** 100 leads/niche · 30 demos/run · daily cadence

---

## Setup

### 1. Prerequisites

- Node 22.14+ or Node 24
- OpenClaw installed: `npm install -g openclaw@latest`
- Supabase project created (schema: `supabase/schema.sql`)
- Coolify self-hosted with wildcard `*.murusmare.com` DNS pointing to it
- Telegram bot created via BotFather
- GitHub personal access token (repo scope)

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### 3. Apply Supabase Schema

In the Supabase dashboard → SQL Editor, run:

```sql
-- paste contents of supabase/schema.sql
```

### 4. Place This Workspace

This folder should be set as your OpenClaw workspace:

```bash
openclaw config set workspace /path/to/igil
```

---

## Triggering a Run

Send via Telegram to Igil:

```
/run
```

Override niche or city:
```
/run niche=dentist city="Austin, TX"
```

Check status of current run:
```
/status
```

---

## Skills

| Skill | Purpose |
|---|---|
| `lead-scraper` | Scrape Google Maps via Barty-Bart scraper |
| `lead-qualifier` | Score leads and write qualified ones to Supabase |
| `niche-researcher` | Research competitor sites via Brave API |
| `demo-builder` | Generate Next.js + Tailwind demos via Codex |
| `deploy-manager` | Push to GitHub and deploy via Coolify API |
| `outreach-writer` | Generate personalized multi-channel messages |
| `notify` | Send Telegram notifications to operator |

---

## Key Files

| File | Purpose |
|---|---|
| `SOUL.md` | Identity, mission, core principles |
| `AGENTS.md` | Full pipeline specification (9 steps) |
| `TOOLS.md` | Tool configuration and usage rules |
| `MEMORY.md` | Supabase storage schema and anti-duplication rules |
| `USER.md` | Operator profile and preferences |
| `IDENTITY.md` | Agent identity card |
| `STYLE.md` | Output, code, and design conventions |
| `supabase/schema.sql` | Full PostgreSQL schema |
| `openclaw.json` | OpenClaw agent configuration |
| `.env.example` | All required environment variables |

---

## Architecture

```
Telegram /run command
        │
        ▼
  Niche Selection
        │
        ▼
  Lead Scraping ──────────── Barty-Bart google-maps-scraper
        │
        ▼
  Lead Qualification ──────── Supabase (leads table)
        │
        ▼
  Niche Research ─────────── Brave API + Claude
        │
        ▼
  Demo Generation ────────── coding-agent skill (Codex)
        │
        ▼
  Deployment ─────────────── GitHub + Coolify
        │
        ▼
  Outreach Writing ────────── Claude (per channel)
        │
        ▼
  Telegram Notification ───── Operator (Aissam)
```
