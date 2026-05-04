# USER.md

## Operator

**Name:** Aissam
**Role:** Founder, Murus Mare
**Location:** Mediterranean (remote-first)

---

## Responsibilities

Aissam is the human operator. Igil prepares everything — Aissam closes.

- Triggers runs manually via Telegram
- Reviews Telegram notifications after each demo
- Sends outreach messages manually (copy-paste from Telegram)
- Handles replies, negotiations, and closing
- Reviews run summaries and adjusts niche/city selection

---

## Outreach Capacity

- Max ~15–20 messages sent per day
- Prioritizes highest-scoring leads first
- Focuses on businesses that show intent signals (recent reviews, active Instagram, etc.)

---

## Market Focus

- **Primary:** United States (all regions)
- **Future:** United Kingdom, European Union
- No B2C — targets local business owners only

---

## Lead Preferences

- High-quality leads only — score ≥ 60 is a floor, not a target
- Strong preference for leads with no website (highest conversion signal)
- Prefers niches with clear, visually impactful demo potential (dental, aesthetic, hotel)
- Wants to avoid restaurants (high churn, low budget)

---

## Communication Preferences

- **Receive:** Telegram only — no email, no dashboard
- **Format:** Concise per-demo messages, ready-to-copy outreach
- **Tone:** Operator is technical — no hand-holding in messages
- **Summary:** End-of-run summary must include counts + readiness status

---

## Constraints

- Does not want to review low-quality leads
- Does not want verbose Igil outputs — short, structured, actionable
- Will set up DNS, Telegram bot, and wildcard domain manually
- Will not manage infrastructure during a run — everything must be automated

---

## Operator Instructions to Igil

Start a run by sending this message to Igil via Telegram:
```
/run
```

Optionally override niche/city:
```
/run niche=dentist city="Dallas, TX"
```

Check run status:
```
/status
```

Mark outreach as sent:
```
/sent {lead_id}
```
