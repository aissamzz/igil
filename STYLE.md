# STYLE.md

## Output Style

- Short and structured — no paragraphs in operational output
- Use bullet points and tables over prose
- No filler phrases ("Great!", "Sure!", "Of course!")
- No generic AI phrases ("As an AI...", "I'd be happy to...")
- Every message is actionable — operator should know exactly what to do next

---

## Telegram Message Style

**Per-demo notification format:**
```
✅ {Business Name}
{city} · {niche} · Score: {n}

🌐 {demo_url}

📱 WhatsApp:
{message or —}

📧 Email:
{message or —}

📸 Instagram:
{message or —}

📘 Facebook:
{message or —}
```

**Run summary format:**
```
🏁 Run Complete · {date}

Niches: {list}
Scraped: {n} | Qualified: {n} | Deployed: {n} | Failed: {n}

Ready for outreach: {n} leads
```

---

## Outreach Message Style

Rules for generated outreach:
- 3–5 sentences maximum
- Mention business name in the first line
- Include demo URL in the second line
- Reference 1 specific detail about the business (niche, city, or missing feature)
- End with operator name: "— Aissam, Murus Mare"
- No generic openers ("I came across your business...")
- No pressure language ("limited time", "act now")
- Channel-appropriate tone:
  - WhatsApp: conversational, brief
  - Email: slightly more formal, subject line included
  - Instagram DM: casual, one paragraph max
  - Facebook: same as Instagram DM

---

## Code Style (generated demos)

- Next.js with `output: 'export'` (static site, no server needed)
- Tailwind CSS — utility classes only, no custom CSS files
- Single `pages/index.jsx` (or `app/page.jsx`) — no routing needed
- Components inline in the page file for portability
- No unnecessary dependencies — only `next`, `react`, `react-dom`, `tailwindcss`
- No TypeScript (faster generation, easier for Codex)
- Mobile-first layout
- No animations or JS interactions — static HTML output must look complete

### Section order (demo page):
1. Hero (name, tagline, CTA button)
2. About (2–3 sentences)
3. Services (3–6 cards)
4. Reviews (3 Google review cards with star rating)
5. Contact (phone, address, map embed)
6. Footer (social links + Murus Mare watermark)

---

## Demo Design Rules

### Murus Mare Watermark
Every demo footer includes:
```html
<p class="text-xs text-gray-300 opacity-40 mt-4">
  Site by <a href="https://murusmare.com" class="underline">Murus Mare</a>
</p>
```
- Visible but unobtrusive (low opacity)
- Does not interfere with the business's content

### Niche-Specific Design Conventions

**Dentists:**
- Colors: white, navy, light blue
- CTA: "Book an Appointment"
- Tone: clean, clinical, trustworthy

**Aesthetic Clinics:**
- Colors: white, blush, gold
- CTA: "Book a Consultation"
- Tone: premium, aspirational, modern

**Boutique Hotels:**
- Colors: warm beige, dark green, cream
- CTA: "Check Availability"
- Tone: editorial, atmospheric, refined

**Local Services:**
- Colors: blue, white, orange
- CTA: "Get a Free Quote"
- Tone: direct, reliable, local

---

## Internal Logging Style

Logs written to Supabase runs/leads tables, not to stdout.

When logging errors:
- Include step name
- Include lead or run ID
- Include error message
- Never include API keys or tokens in logs
