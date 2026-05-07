---
name: igil-notify
description: >
  Generates outreach messages (email + SMS/WhatsApp) for deployed leads and sends
  formatted Telegram notifications to Aissam. Steps 9 and 10 of the pipeline.
metadata:
  openclaw:
    requires:
      bins:
        - python3
      env:
        - TG_BOT_TOKEN
        - TG_CHAT_ID
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
---

# Skill: igil-notify

## Purpose

Write compelling, personalised outreach messages for each deployed site, then
notify Aissam via Telegram with everything he needs to take action.

Aissam sends outreach personally. Igil writes the messages. This is intentional:
the human touch in the final send is part of the Murus Mare brand.

---

## Step 9 — Generate Outreach Messages

### Email template engine

```python
import os, httpx, json, re

def generate_email(b: dict) -> dict:
    """
    Generate a cold email for this business.
    Returns {"subject": str, "body": str}
    """
    name = b["name"]
    city = b["city"]
    niche = b["niche"]
    rating = b.get("rating", "")
    reviews = b.get("review_count", 0)
    deployed_url = b["deployed_url"]
    phone = b.get("phone", "")
    
    # Try to extract owner first name from notes
    owner_first = extract_owner_first_name(b.get("notes", ""))
    greeting = f"Hey {owner_first}," if owner_first else "Hey there,"
    
    # Personalisation hooks
    social_hook = ""
    if b.get("social_media"):
        sm = json.loads(b["social_media"]) if isinstance(b["social_media"], str) else b["social_media"]
        if sm.get("instagram"):
            social_hook = f"(love what you've been posting on Instagram, by the way)"
        elif sm.get("facebook"):
            social_hook = f"(saw your Facebook page)"
    
    review_hook = ""
    if reviews and rating:
        review_hook = f"with {reviews} Google reviews and a {rating}⭐ rating, "
    elif reviews:
        review_hook = f"with {reviews} Google reviews, "
    
    subject_options = [
        f"I built {name} a website — take a look",
        f"Quick one: I made something for {name}",
        f"Hey — we built your {city} {niche} business a site",
    ]
    
    body = f"""{greeting}

I was browsing local {niche}s in {city} and came across {name} {social_hook}.

{review_hook.capitalize() if review_hook else f"{name} is "}clearly doing great work — but I noticed you don't have a website yet. So I built you one.

Check it out: {deployed_url}

It's fully done — I'm Aissam, I run a small web agency called Murus Mare. I work in web hosting for a living, so I know exactly what makes a {niche} website actually get you calls.

If you like it and want to keep it running (with your real domain, your logo, SEO, everything), we do it all for $249/month — no contracts, cancel whenever. We'd just love to work with you.

Worth a quick chat?

Best,
Aissam
Murus Mare
aissam@murusmare.com
"""
    
    return {
        "subject": subject_options[hash(name) % len(subject_options)],
        "body": body.strip()
    }


def generate_sms(b: dict) -> str:
    """
    Generate a WhatsApp/SMS message. Max 60 words.
    """
    name = b["name"]
    city = b["city"]
    niche = b["niche"]
    deployed_url = b["deployed_url"]
    reviews = b.get("review_count", 0)
    
    if reviews >= 50:
        hook = f"with {reviews} Google reviews"
    else:
        hook = f"in {city}"
    
    return f"""Hey! I saw {name} {hook} — you don't have a website yet so I built you one: {deployed_url}

It's done and live. If you want to keep it (your domain, logo, SEO, etc.) it's $249/month — all included. Cancel anytime.

Interested? — Aissam, Murus Mare"""


def extract_owner_first_name(notes: str) -> str | None:
    if not notes:
        return None
    match = re.search(r'\[OWNER\]\s+([A-Z][a-z]+)', notes)
    if match:
        return match.group(1)
    return None
```

### Save outreach to Supabase

```python
def save_outreach(b: dict, email_data: dict, sms_text: str | None):
    SB_URL = os.environ["SUPABASE_URL"]
    SB_KEY = os.environ["SUPABASE_SERVICE_KEY"]
    HEADERS = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json"
    }
    
    # Update businesses table
    patch = {
        "outreach_email": f"Subject: {email_data['subject']}\n\n{email_data['body']}",
    }
    if sms_text:
        patch["outreach_sms"] = sms_text
    
    httpx.patch(
        f"{SB_URL}/rest/v1/businesses?id=eq.{b['id']}",
        headers=HEADERS, json=patch, timeout=10
    )
    
    # Insert outreach_messages rows
    if email_data:
        httpx.post(
            f"{SB_URL}/rest/v1/outreach_messages",
            headers=HEADERS,
            json={
                "business_id": b["id"],
                "channel": "email",
                "direction": "outbound",
                "subject": email_data["subject"],
                "body": email_data["body"],
            },
            timeout=10
        )
    
    if sms_text:
        httpx.post(
            f"{SB_URL}/rest/v1/outreach_messages",
            headers=HEADERS,
            json={
                "business_id": b["id"],
                "channel": "whatsapp",
                "direction": "outbound",
                "body": sms_text,
            },
            timeout=10
        )
```

---

## Step 10 — Telegram Notification

### Format notification message

```python
def format_notification(b: dict, email_data: dict, sms_text: str | None) -> str:
    """
    Format a rich Telegram notification for Aissam.
    Uses HTML parse mode for cleaner formatting.
    """
    score = b.get("lead_score", 0)
    score_bar = "🟢" if score >= 70 else "🟡" if score >= 50 else "🔴"
    
    # Extract upsell hints
    notes = b.get("notes", "") or ""
    upsell_lines = [
        line.replace("[UPSELL HINT] ", "").strip()
        for line in notes.split("\n")
        if "[UPSELL HINT]" in line
    ]
    upsell_section = ""
    if upsell_lines:
        upsell_items = "\n".join(f"  • {h}" for h in upsell_lines[:3])
        upsell_section = f"\n💡 <b>Upsell opportunities:</b>\n{upsell_items}"
    
    # Contact info section
    contact_lines = []
    if b.get("phone"):
        contact_lines.append(f"📞 {b['phone']}")
    if b.get("email"):
        contact_lines.append(f"📧 {b['email']}")
    
    sm = {}
    if b.get("social_media"):
        sm = json.loads(b["social_media"]) if isinstance(b["social_media"], str) else b["social_media"]
    if sm.get("facebook"):
        contact_lines.append(f"📘 <a href='{sm['facebook']}'>Facebook</a>")
    if sm.get("instagram"):
        contact_lines.append(f"📸 <a href='{sm['instagram']}'>Instagram</a>")
    
    contact_section = "\n".join(contact_lines) if contact_lines else "⚠️ No contact info found — manual lookup needed"
    
    # Outreach section
    outreach_section = f"""
📧 <b>EMAIL (copy to send):</b>
<i>Subject: {email_data['subject']}</i>

{email_data['body'][:600]}{'...' if len(email_data['body']) > 600 else ''}"""
    
    if sms_text:
        outreach_section += f"""

📱 <b>WHATSAPP/SMS (copy to send):</b>
{sms_text}"""
    else:
        outreach_section += "\n\n📱 <i>No phone found — email only</i>"
    
    msg = f"""🦞 <b>New lead deployed by Igil</b>

<b>{b['name']}</b>
📍 {b['niche'].title()} · {b['city']}, {b.get('state', '')}
{score_bar} Lead score: <b>{score}/100</b>
⭐ {b.get('rating', 'N/A')} ({b.get('review_count', 0):,} reviews)

<b>Contact:</b>
{contact_section}

🌐 <b>Live site:</b> <a href="{b['deployed_url']}">{b['deployed_url']}</a>
💾 <b>GitHub:</b> <a href="{b.get('github_repo_url', '#')}">{b.get('github_repo_url', 'N/A')}</a>
{upsell_section}

{'—' * 30}
{outreach_section}
{'—' * 30}

<i>Status will update when you send outreach. Reply to this message if you need changes to the site.</i>"""
    
    return msg
```

### Send via Telegram Bot API

```python
import asyncio

TG_TOKEN = os.environ["TG_BOT_TOKEN"]
TG_CHAT  = os.environ["TG_CHAT_ID"]
TG_URL   = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"

async def send_telegram(text: str, retries: int = 3) -> bool:
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(retries):
            resp = await client.post(TG_URL, json={
                "chat_id": TG_CHAT,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            })
            
            if resp.status_code == 200:
                return True
            
            if resp.status_code == 429:
                retry_after = resp.json().get("parameters", {}).get("retry_after", 30)
                print(f"Telegram rate limited — waiting {retry_after}s")
                await asyncio.sleep(retry_after + 2)
                continue
            
            if resp.status_code in (400, 403):
                print(f"Telegram error (non-retryable): {resp.text}")
                return False
            
            await asyncio.sleep(3)
    
    return False


async def notify_batch(businesses: list):
    """
    Notify Aissam of all newly deployed sites.
    Space messages 3 seconds apart to respect rate limits.
    """
    success_count = 0
    
    for b in businesses:
        # Generate outreach
        email_data = generate_email(b)
        sms_text = generate_sms(b) if b.get("phone") else None
        
        # Save to Supabase
        save_outreach(b, email_data, sms_text)
        
        # Format and send Telegram notification
        msg = format_notification(b, email_data, sms_text)
        sent = await send_telegram(msg)
        
        if sent:
            # Update status
            httpx.patch(
                f"{os.environ['SUPABASE_URL']}/rest/v1/businesses?id=eq.{b['id']}",
                headers={"apikey": os.environ["SUPABASE_SERVICE_KEY"],
                         "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_KEY']}",
                         "Content-Type": "application/json"},
                json={"status": "notified"},
                timeout=10
            )
            success_count += 1
        
        await asyncio.sleep(3)  # 3 second gap between messages
    
    print(f"Notified Aissam of {success_count}/{len(businesses)} deployed sites")
```

---

## Monday Morning Status Digest

Sent by `igil-status` cron every Monday at 09:00 UTC.

```python
async def send_weekly_digest(stats: dict):
    msg = f"""🗓️ <b>Igil Weekly Digest — {stats['week']}</b>

<b>Pipeline this week:</b>
  🔍 Scraped: {stats['scraped']}
  ✅ Qualified: {stats['qualified']}
  🔬 Researched: {stats['researched']}
  🏗️ Sites built: {stats['built']}
  🚀 Deployed: {stats['deployed']}
  📬 Notified: {stats['notified']}

<b>Total pipeline (all time):</b>
  💰 Won clients: {stats['won']}
  📊 Active outreach: {stats['outreach_sent']}
  📁 Total leads: {stats['total']}

<b>Progress to goal:</b>
  🎯 {stats['won']}/50 clients ({stats['won']*2}% of 2026 goal)
  💵 Est. MRR: ${stats['won'] * 249:,}/month

<b>Pipeline health:</b>
  🟢 Ready to deploy: {stats['ready']}
  🔴 Build failures this week: {stats['failures']}
  ⚠️ Sites needing attention: {stats['needs_attention']}

<i>Next scrape: tonight at 02:00 UTC</i>"""
    
    await send_telegram(msg)
```

---

## Outreach Message Quality Rules

Every generated outreach message must:
1. ✅ Lead with the live site URL in the first 2 sentences
2. ✅ Mention something specific about their business (rating, reviews, city, niche)
3. ✅ Be under 150 words for email body
4. ✅ Be under 60 words for SMS/WhatsApp
5. ✅ Never use the word "affordable", "cheap", "cheap prices", or "budget"
6. ✅ Never say "I hope this email finds you well"
7. ✅ Never use the phrase "we are a leading provider"
8. ✅ Sound like it was written by a real person who genuinely noticed their business
9. ✅ Include Aissam's name and email at the bottom
10. ✅ Make the offer clear but not desperate

If the AI-generated email fails any of these checks, regenerate with a stricter
prompt before saving.
