---
name: leadgen
description: Pull 100+ high-intent leads for Legent (SaaS founders, indie hackers, AI founders) from Product Hunt launches + website email enrichment (free sources), score them by intent, output a ranked CSV plus cold email drafts. Trigger on "/leadgen", "pull leads", "get me leads".
---

# Legent Lead Gen

## ICP (never deviate)
Titles: Founder, Co-Founder, CEO, Solo Founder, Indie Hacker, Head of Growth
Company size: 1-20 employees
Industries: Computer Software, Internet, Information Technology, Marketing & Advertising
Keywords: saas, ai, indie, bootstrapped, micro-saas, developer tools
Geo: US, UK, Canada, India, Germany, Australia

## Workflow
1. Pull + enrich (free sources — no paid API):
   a. Run `python scripts/ph_pull.py --limit 60` → queries Product Hunt (last 90 days, ICP topics), dedupes by resolved website domain, writes `data/raw_leads.json`.
   b. Run `python scripts/enrich_email.py` → visits each site (/, /about, /contact, /team), robots-respecting, ~1 req/sec, adds a personal `email` field in place. Leads with no personal email get `email: null`.
   Requires `PRODUCT_HUNT_TOKEN` in the environment (free developer token from https://www.producthunt.com/v2/oauth/applications).
2. Read `data/raw_leads.json` yourself. Score EVERY lead 0-100 using the rubric below. Do NOT call any external API for scoring — you are the scorer.
3. Write scored output to `data/scored_leads.csv` with columns:
   name,title,company,employees,email,linkedin,website,intent_score,reason,hook
4. Keep only score >= 40. If fewer than 100 survive, re-run ph_pull.py with a larger `--limit` (e.g. 120) then enrich_email.py again, and repeat.
5. Run `python scripts/report.py` → prints top 20 to terminal.
6. Draft cold emails for the top 25 using the template below. Save to `data/emails.md`.
7. Report: total pulled, total qualified, avg score, top 5 names.

## Intent Rubric (100 pts)
- +30 Title is Founder/Co-Founder/CEO of a company with 1-20 employees
- +20 Company is SaaS/AI/dev-tools (check website + industry + keywords)
- +15 Company founded within last 3 years (early = still doing own marketing)
- +15 Has a personal LinkedIn AND company Twitter/X presence (they already post → they feel the pain)
- +10 Email is a personal work email (ankit@company.com), NOT info@/support@/hello@
- +10 Company has no marketing hire in Apollo data (founder does social themselves)
- -20 Company > 50 employees (they buy Sprout Social, not us)
- -30 Agency, consultancy, or social-media-marketing company (competitor/reseller)
- -40 Email is missing or catch-all

Threshold: 40+. Anything below, drop silently.

`reason` = one line, max 12 words, why this score.
`hook` = one specific personalized detail from their data (their product name, their niche).

## Cold Email Template (Roman "blueprint not demo" mechanic)
NEVER ask for a meeting. NEVER pitch Legent in email 1. Offer a resource. Ask for a one-word reply.

Subject: quick thing for {company}

{first_name} —

Saw {hook}. You're doing the thing where you build and post and it eats the day.

I pulled apart 549 of my own posts and found the 3 formats that actually got reach for a solo founder. Wrote it up as a 1-page teardown — no signup, no call.

Want it? Just reply "yes" and I'll send it.

— Ankit
building Legent

## Rules
- Never fabricate an email address. If missing, drop the lead.
- Never write more than 90 words in a cold email.
- Never mention Legent's pricing or features in email 1.
