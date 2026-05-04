---
name: outreach-writer
description: Generate personalized outreach messages for every channel a lead has (WhatsApp, email, Instagram DM, Facebook). Uses Claude to write short, direct, agency-quality messages.
metadata.openclaw:
  emoji: ✉️
  required-binaries:
    - node
  platforms:
    - linux
    - darwin
---

## When to Use

Use this skill at **Step 7** of the Igil pipeline: after demo deployment, before notification.

Do NOT use this skill to:
- Generate messages for leads without a deployed demo
- Generate messages for channels the business doesn't have
- Write generic messages — every message must reference the business by name

## Setup

Set env vars in `.env`:
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## Usage

Generate outreach for a lead (all available channels):
```bash
node -e "
  const {write} = require('./skills/outreach-writer/scripts/write.js');
  write({ leadId: 'uuid', demoUrl: 'https://slug.murusmare.com' });
"
```

## Channel Detection

For each lead, check which channels are available:
- `phone` is set → generate WhatsApp message
- `email` is set → generate email (subject + body)
- `instagram_url` is set → generate Instagram DM
- `facebook_url` is set → generate Facebook message

Generate only for detected channels. Store each message in the `outreach` table.

## Message Rules

- 3–5 sentences maximum per message
- Line 1: Address business by name
- Line 2: Include the demo URL
- Line 3: One specific observation about their situation (no website, dead site, etc.)
- Line 4: Clear next step
- Sign-off: `— Aissam, Murus Mare`
- No pressure language, no generic openers, no AI filler

## Claude Prompt Pattern

```
Write a {channel} outreach message for {business_name}, a {niche} in {city}.
They {situation: "have no website" / "have a broken website"}.
We built them a free demo: {demo_url}
Tone: direct, professional, brief. Under 5 sentences.
Sign off as: — Aissam, Murus Mare
Do NOT use openers like "I came across" or "I noticed".
```

## Channel Tone Guide

See `assets/message-templates.md` for tone guidelines and examples per niche and channel.

## Output

Writes to Supabase `outreach` table — one row per channel.
Returns array of generated messages for the `notify` skill.
