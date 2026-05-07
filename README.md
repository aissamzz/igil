# Igil — Autonomous Agent of Murus Mare

> *"The eagle does not rush. It circles high, sees everything, and when it moves,
> it moves with complete commitment."*

Igil is the autonomous AI agent that powers Murus Mare's lead generation, website
building, and outreach pipeline. He runs on OpenClaw, deployed on a Hostinger KVM4 VPS,
and works while Aissam sleeps.

---

## What Igil Does

```
Every night, automatically:

02:00  SCRAPE   → Google Maps → 100 businesses with no website
03:00  QUALIFY  → Brave Search verification + lead scoring (0–100)
04:00  RESEARCH → Competitor analysis + business profile + tech opportunities
05:00  BUILD    → Codex builds a unique Next.js + shadcn website per business
06:00  DEPLOY   → GitHub push → Coolify → businessname.murusmare.com
07:00  NOTIFY   → Telegram: live URL + outreach messages → Aissam
08:00  DIGEST   → Daily summary of pipeline stats

Aissam reviews notifications, picks the best leads, sends the outreach.
```

---

## Documentation Index

### Agent Identity
| File | Contents |
|---|---|
| `agent/AGENTS.md` | Igil's operating rules, mission, tools, constraints |
| `agent/SOUL.md` | Character, values, what Igil is and is not |
| `agent/USER.md` | Facts about Aissam: background, preferences, goals |
| `agent/TOOLS.md` | Complete tool reference with code patterns |
| `agent/THEMES.md` | Visual identity system — themes, fonts, hero variants |
| `agent/openclaw-config.json` | OpenClaw agent configuration |

### Operational Notes (live files, updated by Igil)
| File | Contents |
|---|---|
| `agent/notes/queue.md` | Current niche/city targeting position |
| `agent/notes/daily-log.md` | Operational log, one entry per cron run |

### Scheduling
| File | Contents |
|---|---|
| `cron/CRON.md` | All 9 cron jobs: CLI commands + JSON config |

### Skills (Igil's capabilities)
| File | Contents |
|---|---|
| `skills/igil-scrape/SKILL.md` | Google Maps scraping logic |
| `skills/igil-qualify/SKILL.md` | Lead qualification + scoring |
| `skills/igil-research/SKILL.md` | Competitor + business research |
| `skills/igil-build/SKILL.md` | Codex prompt generation + website building |
| `skills/igil-deploy/SKILL.md` | GitHub push + Coolify deployment |
| `skills/igil-notify/SKILL.md` | Outreach generation + Telegram notifications |

### Database
| File | Contents |
|---|---|
| `supabase/schema.sql` | Complete PostgreSQL schema with RLS |

### Legal
| File | Contents |
|---|---|
| `legal/LEGAL.md` | Terms of Service + Privacy Policy drafts |

### Setup
| File | Contents |
|---|---|
| `SETUP.md` | Complete VPS installation guide, step by step |

---

## The Stack

| Layer | Technology |
|---|---|
| Agent runtime | OpenClaw (Node.js, self-hosted) |
| Lead scraping | gosom/google-maps-scraper (Go + Playwright) |
| Web research | Brave Search API |
| Database | Supabase (PostgreSQL + RLS) |
| Website building | Codex CLI + Next.js 15 + shadcn/ui |
| Code hosting | GitHub (murusmare-clients org, private repos) |
| Deployment | Coolify v4 API (self-hosted on KVM4) |
| SSL | Traefik + Let's Encrypt DNS challenge (Cloudflare) |
| Domain | *.murusmare.com wildcard |
| Notifications | Telegram Bot API |
| Billing | Creem.io (Merchant of Record) |
| Infrastructure | Hostinger KVM4 (Ubuntu 24.04) |

---

## Pipeline Status Reference

| Status | Meaning |
|---|---|
| `scraped` | Found on Google Maps, no website detected |
| `qualified` | Verified by Brave Search, scored, not a franchise |
| `researched` | Competitor analysis done, business profile complete |
| `site_built` | Website built by Codex, pnpm build passed |
| `deployed` | Live at slug.murusmare.com, HTTP 200 confirmed |
| `notified` | Telegram sent to Aissam, outreach messages stored |
| `outreach_sent` | Aissam sent the outreach message |
| `responded` | Prospect replied |
| `won` | Client signed up ($249/month) |
| `lost` | Prospect declined |
| `rejected` | Failed qualification (franchise, has website, etc.) |
| `failed` | Technical error — see rejection_reason or build_log |

---

## Key Numbers to Hit

| Metric | Target |
|---|---|
| Leads scraped/week | ~700 |
| Leads qualified/week | ~200 |
| Sites built/week | ~30 |
| Sites deployed/week | ~25 |
| Outreach sent/week | ~20 (Aissam reviews, selects best) |
| Conversion rate | ~5% |
| Clients by year end | 50 |

---

## About

Murus Mare — from the ancient Phoenician walls of the Algerian coast.
Built offshore. Delivered internationally.

Founded by Aissam Chibah, Jijel, Algeria. Powered by Igil.
