# CLAUDE.md - ExpenseFlow

## Project Overview

ExpenseFlow is a full-stack expense report management SaaS app. Users upload receipts, AI extracts data via Google Gemini, and polished reports are generated in PDF/Excel.

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS 4 via PostCSS
- **Database:** Firebase Firestore (client SDK + Admin SDK)
- **Auth:** Firebase Auth + next-firebase-auth-edge (cookie-based sessions)
- **AI:** Google Gemini 2.5 Flash (receipt analysis)
- **Payments:** Stripe (subscriptions, checkout, webhooks)
- **Exports:** jsPDF (PDF), ExcelJS (Excel)
- **Validation:** Zod

## Commands

- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run start` — Run production build
- `npm run lint` — Run ESLint

There is no test framework configured.

## Project Structure

```
src/
  app/
    (auth)/          # Auth pages (login, signup, forgot-password, accept-invite)
    (dashboard)/     # Dashboard pages (expenses, reports, billing, settings)
    api/             # API routes (auth, expenses, receipts, reports, stripe, organizations, settings)
  components/
    ui/              # Reusable primitives (Button, Input, Select, Textarea, Spinner)
    auth/            # Auth components
    billing/         # Billing/subscription UI
    expenses/        # Expense management UI
    organization/    # Org management
    reports/         # Report viewing/generation
    layout/          # Layout components (Sidebar)
  contexts/          # React contexts (AuthContext, BrandingContext)
  lib/
    firebase/        # Firebase client, admin, auth, config
    firestore/       # Firestore CRUD (expenses, reports, subscriptions, user-settings)
    gemini/          # Gemini AI client and receipt analysis
    stripe/          # Stripe server integration
    hooks/           # Custom React hooks
    utils/           # Utility functions
  types/             # TypeScript interfaces (expense, organization, subscription, user)
```

## Code Conventions

- Use `@/*` path aliases for all imports (maps to `src/*`)
- Use existing UI components from `src/components/ui/` — do not create new UI primitives
- Style with Tailwind utility classes; use `clsx` and `tailwind-merge` for conditional classes
- Validate API inputs with Zod schemas
- Use `getAuthenticatedUser()` for server-side auth checks in API routes
- Amounts are stored in cents (integers) in Firestore
- Expense categories are defined as an enum in `src/types/expense.ts`
- Use Lucide React for icons

## Architecture Patterns

- **API routes** live in `src/app/api/` and use Next.js route handlers (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
- **Server-side Firebase** uses the Admin SDK (`src/lib/firebase/admin.ts`)
- **Client-side Firebase** uses the client SDK (`src/lib/firebase/client.ts`)
- **Auth flow:** Firebase Auth → cookie session → edge middleware verification
- **Organization support:** multi-tenant with role-based access (owner, admin, member)
- **Subscription tiers:** starter ($10/mo), pro ($15/mo), enterprise ($20/mo) — limits enforced at report finalization; annual billing available with 15% discount (starter $102/yr, pro $153/yr, enterprise $204/yr); billing interval toggle on billing page; prices defined in `src/types/subscription.ts` (cents); Stripe price IDs mapped via env vars (monthly + annual variants)
- **Free trial:** 7-day no-credit-card trial auto-started on signup (Pro-tier access); `initTrialForNewUser()` in `src/lib/firestore/subscriptions.ts` writes the trial record; expiry checked via `isTrialExpired()` in the reports API and subscription API; trial status surfaces via `useSubscription` hook (`trialDaysRemaining`, `isTrialExpired`)
- **Report preview:** `PreviewReportModal` in `src/components/expenses/` shows an HTML preview of the expense summary (mirroring Excel layout) and receipt gallery (grouped by category) before finalization — purely client-side, no quota impact
- **Reimbursement tracking:** Reports have `reimbursed` (boolean) and `reimbursedAt` (timestamp) fields; toggled via `PATCH /api/reports/[id]`; Reports page shows a tally banner (Total Owed / Reimbursed / Total) that respects date filters; `useReports` hook uses optimistic updates for the toggle

## Do Not Modify Without Asking

- `.env` / `.env.local` files and environment variable configuration
- Firebase security rules or Admin SDK setup (`src/lib/firebase/admin.ts`)
- Stripe webhook handler (`src/app/api/stripe/webhook/`)
- Authentication middleware and session logic
- `next.config.ts` external packages or image domain configuration
