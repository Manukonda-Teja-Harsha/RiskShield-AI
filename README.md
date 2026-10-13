# RiskShield AI — Digital Risk & Brand Protection Platform

RiskShield AI is an enterprise-grade digital risk protection and scam detection platform safeguarding personal users against phishing/impersonation lures while empowering brands to monitor their official identity and manage evidence-backed threat findings.

---

## 1. Repository Structure

```text
riskshield-ai/
├── frontend/               # React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion + Zustand SPA
│   ├── src/
│   │   ├── components/     # UI components (Auth, Brand, Dashboard, Home, Common)
│   │   ├── pages/          # Route views (Home, Login, UserDashboard, BrandDashboard)
│   │   ├── routes/         # Route exports
│   │   ├── features/       # Feature modules (auth, dashboard, scanner, insights, threat-watch, activity, brand-workspace)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Shared Scanner Engine, input classifier, privacy/SSRF guard, adapters
│   │   ├── services/       # Frontend API & Auth service layer
│   │   ├── stores/         # Zustand store exports
│   │   ├── types/          # TypeScript domain contracts
│   │   ├── styles/         # Theme CSS & Tailwind tokens
│   │   └── assets/         # Static asset references
│   ├── public/             # Static public files & SPA _redirects
│   ├── vercel.json         # Vercel SPA routing and security headers
│   └── tests/              # Scanner & tenant isolation verification suite
├── backend/                # Next.js App Router (API-Only Backend) + Zod + Prisma ORM
│   ├── src/
│   │   ├── app/api/        # Headless JSON Route Handlers (18 routes)
│   │   ├── middleware.ts   # CORS preflight & security headers middleware
│   │   ├── lib/            # Prisma DB client, Auth session verifier, Env validator, SSRF guard
│   │   ├── modules/        # Domain modules (users, brands, brand-memberships)
│   │   ├── services/       # Business logic services (scanner, brand, brandMonitor, threatInvestigation)
│   │   ├── repositories/   # Database access repositories
│   │   ├── schemas/        # Zod validation schemas
│   │   └── types/          # Backend TypeScript types
│   ├── prisma/             # Canonical schema.prisma & SQL migrations with PostgreSQL RLS
│   └── tests/              # Backend API contract, intelligence card, & regression tests
├── database/               # PostgreSQL RLS documentation & safe development seeds
├── docs/                   # Architecture, Setup, Database Schema, Auth Flow, and API Contracts
├── render.yaml             # Render Blueprint for headless backend web service
├── vercel.json             # Root Vercel configuration for SPA deployment
└── .github/workflows/      # Automated Brand Monitoring cron runner
```

---

## 2. Quick Start Commands

### From Repository Root
```bash
# Start frontend development server (http://localhost:5173)
npm run dev

# Build both frontend (frontend/dist) and backend (backend/.next)
npm run build

# Run TypeScript checks across both workspaces
npm run typecheck
```

---

## 3. Production Deployment

- **Frontend (Vercel):** Connect repository to Vercel. Set framework to Vite. Build command: `npm --prefix frontend run build`, Output directory: `frontend/dist`. Set `VITE_API_BASE_URL` to your Render backend URL.
- **Backend (Render):** Deploy using `render.yaml` or create a Web Service pointing to `backend/`. Build command: `npm install && npm run build`, Start command: `npm run start`.
