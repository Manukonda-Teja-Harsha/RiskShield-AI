# RiskShield AI — System Architecture

## 1. Overview
RiskShield AI is structured as a decoupled multi-tier monorepo with strict architectural boundaries between the client SPA, the headless API backend, and the PostgreSQL persistence layer:

- **`frontend/`**: Pure React 18 + Vite + TypeScript Single Page Application styled with Tailwind CSS, animated with Framer Motion, routed via React Router v6, and managed with Zustand.
- **`backend/`**: Next.js App Router configured strictly as a headless JSON API backend (`src/app/api/**/route.ts`) with Zod schema validation, modular services, repositories, and Prisma ORM.
- **`database/`**: PostgreSQL Row-Level Security (RLS) documentation and development seed data. Prisma schema and migrations reside in `backend/prisma/` where the Prisma CLI executes.

## 2. Directory Responsibilities

```
riskshield-ai/
├── frontend/               # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/     # Reusable UI, Auth, Dashboard, Brand, and Home components
│   │   ├── pages/          # Route page views (Home, Login, User Dashboard, Brand Dashboard)
│   │   ├── routes/         # Centralized route exports
│   │   ├── features/       # Domain feature modules (auth, dashboard, scanner, insights, threat-watch, activity, brand-workspace)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Unified Scanner Engine, classifiers, adapters, API client
│   │   ├── services/       # Frontend service facades
│   │   ├── stores/         # Zustand state store exports
│   │   ├── types/          # Shared TypeScript interfaces
│   │   ├── styles/         # Design system CSS & Tailwind tokens
│   │   └── assets/         # Static asset references
│   ├── public/             # Static public files & Netlify _redirects
│   └── tests/              # Scanner & tenant isolation verification suite
├── backend/                # Next.js App Router Headless API Backend
│   ├── src/
│   │   ├── app/api/        # Route Handlers (/api/health, /api/auth/login, /api/scan, /api/brand/*)
│   │   ├── lib/            # Shared infrastructure (db, auth, env, security/SSRF guard)
│   │   ├── modules/        # Domain modules (users, brands, brand-memberships)
│   │   ├── services/       # Core business logic (scanner.service, brand.service)
│   │   ├── repositories/   # Prisma data access layer
│   │   ├── schemas/        # Zod request/response validation schemas
│   │   └── types/          # Backend TypeScript definitions
│   ├── prisma/             # Authoritative Prisma schema & SQL migrations
│   └── tests/              # API contract & SSRF verification suite
├── database/               # Database RLS docs & development seeds
└── docs/                   # Comprehensive architecture, setup, schema, auth, and API docs
```
