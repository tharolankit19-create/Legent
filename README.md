# Legent — Waitlist Landing Page

> **Your social media co-founder. Not another scheduler.**

One dashboard. All platforms. AI-powered post optimization built for SaaS founders and indie hackers.

**Launch: July 15, 2026** · Built by [@ankittharol](https://x.com/ankittharol)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Animations**: Framer Motion
- **Database**: Prisma + SQLite (dev) — swap to Postgres for production
- **Payments**: Dodo Payments (webhook-verified)
- **Email**: Resend
- **Runtime**: Bun

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/yourusername/legent-landing.git
cd legent-landing
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your values in .env
```

### 3. Set up database

```bash
mkdir -p db
bun run db:push
```

### 4. Run dev server

```bash
bun run dev
# → http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── waitlist/        # POST — email signup + referral code gen
│   │   ├── early-access-stats/ # GET — live counter for UI
│   │   ├── recent-signups/  # GET — live activity feed
│   │   ├── roadmap/vote/    # POST — roadmap voting
│   │   ├── newsletter/      # POST — newsletter subscribe
│   │   └── webhooks/dodo/   # POST — payment webhook handler
│   ├── page.tsx             # Landing page
│   └── layout.tsx
├── components/
│   ├── landing/             # All landing page sections
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── db.ts                # Prisma client
│   └── google-sheets.ts     # Optional leads backup
prisma/
└── schema.prisma            # Waitlist + EarlyAccess + RoadmapVote models
```

---

## Deployment

### Vercel (recommended for quick deploy)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set all env vars from `.env.example` in your Vercel project settings.  
For Vercel, change `DATABASE_URL` to a Postgres connection string (Vercel Postgres or Neon).

### Self-hosted (VPS with Bun)

```bash
bun run build
bun run start
# Runs on port 3000, use Caddy/Nginx to proxy
```

A `Caddyfile` is included for reverse proxy setup.

---

## Key Features

| Section | Description |
|---|---|
| Hero | Email waitlist form + animated platform pills |
| Stats Band | Live counter — waitlist count, early access spots |
| Features Grid | 6 feature cards (Day 1 vs Coming Soon) |
| How It Works | 4-step visual flow |
| Testimonials | Auto-scrolling marquee |
| Pricing | Free waitlist + $29 Early Access with Dodo payment link |
| Comparison | Legent vs Buffer vs Postiz table |
| Roadmap | Voteable items (stored in DB, no double-voting) |
| FAQ | Accordion |
| Live Activity Feed | Real-time "X just joined" notifications |

---

## Payment Flow (Dodo Payments)

1. User clicks "Get Early Access — $29"
2. Redirected to Dodo checkout with `?success_url=/api/webhooks/dodo`
3. Dodo fires webhook to `/api/webhooks/dodo` on payment success
4. Webhook verifies signature → creates `EarlyAccess` record → sends confirmation email via Resend
5. User lands on `/?payment=success` → success banner shown

---

## Environment Variables Reference

See `.env.example` for all required variables with descriptions.

---

## License

MIT — use freely, attribution appreciated.
