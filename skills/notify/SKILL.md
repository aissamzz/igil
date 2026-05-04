---
name: notify
description: Send Telegram notifications to the operator after each demo deployment (with outreach copy) and after run completion (summary). Uses Telegram Bot API.
metadata.openclaw:
  emoji: 📲
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 9** of the Igil pipeline:
- After each demo is deployed and outreach is generated
- After the full run completes

Do NOT use this skill to:
- Send messages before demo deployment is confirmed live
- Send bulk messages — one per demo, then one run summary

## Setup

Set env vars in `.env`:
```
TELEGRAM_BOT_TOKEN=   # from BotFather
TELEGRAM_CHAT_ID=     # Aissam's personal Telegram chat ID
```

How to get your chat ID: message `@userinfobot` on Telegram.

## Usage

Send per-demo notification:
```bash
node skills/notify/scripts/telegram.js --type demo --lead-id "uuid"
```

Send run summary:
```bash
node skills/notify/scripts/telegram.js --type summary --run-id "uuid"
```

## Per-Demo Message Format

```
✅ {Business Name}
{city} · {niche} · Score: {n}

🌐 {demo_url}

📱 WhatsApp:
{message or —}

📧 Email subject: {subject}
{email body or —}

📸 Instagram:
{message or —}

📘 Facebook:
{message or —}
```

## Run Summary Message Format

```
🏁 Run Complete · {date}

Niches: {list}
Scraped: {n} | Qualified: {n} | Deployed: {n} | Failed: {n}

Ready for outreach: {n} leads
```

## Failure Handling

- Retry up to 3 times on Telegram API failure (2s backoff)
- If all retries fail: log error to Supabase run record, do not halt pipeline
- Never drop a notification silently — always log the attempt
