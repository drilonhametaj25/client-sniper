# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrovaMi is a SaaS for lead generation through automated technical analysis of business websites. The system scrapes business data from multiple sources (Google Maps, Yelp, Pagine Gialle), analyzes their websites for technical issues, assigns a 0-100 score, and distributes leads to users based on their subscription plan.

**Important**: The classification system uses static rules (regex, performance metrics, tag analysis) - no GPT or AI for scoring.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth
- **Payments**: Stripe (subscriptions, webhooks)
- **Scraping**: Node.js + Playwright + Cheerio
- **Monorepo**: Turborepo with npm workspaces
- **Deployment**: Vercel (frontend), Docker (scraping), GitHub Actions (CI/CD)

## Monorepo Structure

```
/apps/frontend-app      # Next.js 14 SaaS frontend
/services/scraping-engine   # Node.js scraping service
/libs/types             # Shared TypeScript types
/libs/utils             # Shared utility functions
/database               # SQL migration files
```

## Common Commands

### Root (Turborepo)
```bash
npm run dev          # Start all services in dev mode
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run type-check   # TypeScript validation
npm run clean        # Clean build artifacts
```

### Frontend (`apps/frontend-app`)
```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Build for production
npm run type-check   # TypeScript validation
```

### Scraping Engine (`services/scraping-engine`)
```bash
npm run dev          # Watch mode with tsx
npm run scrape       # Run scraper directly
npm run scrape:production  # Production scraper with safety checks
npm run build        # Compile TypeScript

# Database
npm run setup-db     # Initialize database schema
npm run seed         # Seed with test data
npm run migrate      # Run migrations

# Testing
npm run test:scraping    # Test scraping functionality
npm run test:google-maps # Google Maps integration test
npm run test:integration # Full integration test
```

## Architecture

### Lead Generation Flow
1. **Scrapers** (`/services/scraping-engine/src/scrapers/`) collect business data from sources
2. **Analyzers** (`/services/scraping-engine/src/analyzers/`) evaluate websites (78+ parameters: SEO, performance, security, tracking, mobile, social)
3. **Lead Scoring** (`/services/scraping-engine/src/utils/advanced-lead-scoring.ts`) assigns 0-100 score based on defects found
4. **Lead Generator** (`/services/scraping-engine/src/lead-generator.ts`) creates and assigns leads to users

### Key Frontend Directories
- `/app/api/` - 30+ API routes (leads, checkout, webhooks, CRM, gamification)
- `/app/dashboard/` - Main user dashboard
- `/app/admin/` - Admin panel (analytics, users, feedback)
- `/components/` - 40+ React components
- `/lib/services/` - Business logic (credits, leads, analytics, Klaviyo)

### Scraping Engine Key Files
- `orchestrator.ts` - Main orchestration logic
- `lead-generator.ts` - Lead creation and assignment
- `/analyzers/enhanced-website-analyzer.ts` - Main website analyzer
- `/scrapers/google-maps-improved.ts` - Primary scraper
- `/utils/unified-lead-manager.ts` - Lead management

### Zone-Based Scraping System
The scraping uses geographic zones with intelligent scheduling:
- `zones_to_scrape` table tracks zones, sources, categories
- Priority scoring based on last scrape time and lead quality
- Deduplication via `unique_key` and `content_hash`

## Database Schema (Core Tables)

- `users` - Accounts with plan, credits, Stripe info
- `leads` - Lead data with scores and JSONB analysis
- `plans` - Subscription tier definitions (free, starter, pro, agency - monthly & annual)
- `crm_entries` - CRM data linked to leads
- `zones_to_scrape` - Geographic scraping zones
- `scrape_logs` - Scraping execution history
- `feedback_reports` - User feedback system

## Lead Scoring (0-100)

Lower score = more technical issues = better opportunity for digital agencies:
- 0-20: Site absent or under construction
- -15: Missing SEO basics (title/description)
- -10: No tracking pixels (GTM, GA, Meta)
- -10: Broken images
- -15: Poor performance

## Subscription Plans

| Piano | Crediti | Prezzo Mensile | Prezzo Annuale |
|-------|---------|----------------|----------------|
| Free | 5 | €0 | - |
| Starter | 25/mese | €19 | €190 |
| Pro | 100/mese | €49 | €490 |
| Agency | 300/mese | €99 | €990 |

**Note**: I prezzi sono gestiti dinamicamente dal database nella tabella `plans`.

## Business Info

- **P.IVA**: 07327360488
- **Website**: https://trovami.pro
- **Support**: support@trovami.pro

## Public Tools (no authentication required)

Tutti i tool gratuiti hanno un limite di 3 analisi/giorno per IP.

| Tool | Path | Descrizione |
|------|------|-------------|
| Public Scan | `/tools/public-scan` | Analisi completa sito (2/giorno) |
| SEO Checker | `/tools/seo-checker` | Analisi SEO on-page (title, meta, heading, ecc.) |
| Tech Detector | `/tools/tech-detector` | Rileva CMS, framework, analytics, CDN |
| Security Check | `/tools/security-check` | Verifica HTTPS, header sicurezza, CSP, HSTS |
| Accessibility Audit | `/tools/accessibility-check` | Conformità WCAG 2.1 A/AA |

### Struttura Tool
Ogni tool ha:
- API route: `/app/api/tools/[tool-name]/route.ts`
- Page: `/app/tools/[tool-name]/page.tsx`
- Layout con SEO: `/app/tools/[tool-name]/layout.tsx`

## Key Conventions

1. **File Headers**: Each file should have a comment explaining purpose, location, and usage
2. **Italian Documentation**: Project docs are in Italian, code in English
3. **API Routes**: RESTful with Supabase auth middleware
4. **Stripe Webhooks**: Handle `invoice.payment_succeeded` for auto-reactivation of inactive plans
5. **Credit System**: Users consume credits to unlock lead details
6. **Free Credits**: Piano Free = 5 lead gratuiti (non 2)

## Environment Variables

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side operations
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SMTP_HOST` - SMTP server (e.g., smtp.gmail.com, smtp.sendgrid.net)
- `SMTP_PORT` - Usually 587 (TLS) or 465 (SSL)
- `SMTP_USER` - Email/username for SMTP auth
- `SMTP_PASS` - Password or app-specific password
- `SMTP_FROM` - Sender address (e.g., "TrovaMi <noreply@trovami.pro>")

**Scraping Engine** (`.env`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## GitHub Actions Workflows

- `scrape.yml` - Automated scraping on schedule
- `reset-credits.yml` - Daily credit reset at midnight UTC
- `email-automation.yml` - Klaviyo email campaigns (8:00 UTC daily)
- `frontend-build.yml` - Frontend deployment to Vercel

### Required GitHub Secrets

For workflows to function properly, configure these secrets in GitHub repository settings:
- `APP_URL` - Production URL (e.g., `https://trovami.pro`)
- `CRON_SECRET` - Secret for authenticating cron job requests
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Re-enabling Disabled Workflows

If workflows are disabled due to repository inactivity (60+ days):
1. Go to GitHub repository → Actions tab
2. Click on the disabled workflow
3. Click "Enable workflow" button
4. Optionally trigger a manual run to verify it works

## AuthContext Usage

The `useAuth()` hook provides:
- `user` - Current user profile (includes `plan`, `credits_remaining`, `role`)
- `session` - Supabase session
- `loading` - Loading state
- `signIn`, `signUp`, `signOut` - Auth functions
- `refreshProfile` - Force refresh user profile

Note: Use `user.plan` (not `subscription_tier`) to check user's subscription level.
