# RiskShield AI — Locked Technology Stack & Architecture Boundaries

**Document Version:** 1.0.0  
**Status:** Canonical Project Specification  
**Classification:** Engineering Architecture Reference  

---

## 1. Architectural Philosophy

RiskShield AI follows a strict **Decoupled Client-API Architecture**:
1. **Frontend:** High-performance, single-page application (SPA) built with React and Vite.
2. **Backend:** Headless, API-only backend built with Next.js App Router (Route Handlers strictly serving JSON).
3. **Database & Identity:** Managed PostgreSQL with Supabase Auth, accessed through Prisma ORM with strict Row Level Security (RLS).

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND APPLICATION                     │
│  React 18 + Vite + TypeScript + Tailwind + Framer      │
│  (Hosted on Vercel as Static/SPA Deployment)           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS (REST JSON APIs)
                           ▼
┌────────────────────────────────────────────────────────┐
│             HEADLESS API BACKEND                       │
│  Next.js App Router (Strictly API Route Handlers)      │
│  TypeScript + Zod Request/Response Validation          │
│  (Hosted on Vercel as Serverless Functions)            │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
      Prisma ORM Client          External Threat Adapters
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────┐
│      SUPABASE DATABASE       │ │ EXTERNAL THREAT MESH │
│  PostgreSQL + Row-Level      │ │ • PhishTank (Adapter)│
│  Security (RLS) + Auth JWTs  │ │ • URLhaus (Optional) │
│  (Hosted on Supabase Cloud)  │ │ • Google Safe Brows. │
└──────────────────────────────┘ └──────────────────────┘
```

---

## 2. Locked Component Stack

### 2.1 Frontend Tier (Client Application)
The frontend must remain a pure **React + Vite** application. It must **never** be migrated to Next.js or converted into a full-stack Next.js project.

| Technology | Version / Target | Responsibility |
| :--- | :--- | :--- |
| **React** | 18.x | Component lifecycle, declarative UI hierarchy, user state rendering. |
| **Vite** | 5.x | Ultra-fast local dev server, ES modules bundling, production asset compilation. |
| **TypeScript** | 5.x | Full type safety across component props, API contracts, and domain models. |
| **Tailwind CSS** | 3.4.x | Utility-first responsive styling, design system tokens, dark/light theme classes. |
| **Framer Motion** | 11.x | Micro-interactions, spring physics, section transitions, modal animations. |
| **Lucide React** | Latest | High-fidelity, lightweight SVG iconography across all states and badges. |
| **React Router** | 6.x | Client-side routing (`/`, `/dashboard`, `/brand-dashboard`, `/auth/*`). |
| **Zustand** | 4.x | Lightweight shared state management (auth state, scan modal triggers, theme). |

### 2.2 Backend Tier (Headless API Only)
Next.js is utilized **strictly and exclusively as a headless API service**. Server components, JSX rendering, and client pages inside Next.js are prohibited.

| Technology | Responsibility |
| :--- | :--- |
| **Next.js App Router** | Host serverless Route Handlers (`app/api/**/route.ts`) serving structured JSON. |
| **Next.js Route Handlers** | HTTP method handling (`GET`, `POST`, `PATCH`, `DELETE`) with standard `NextRequest` and `NextResponse`. |
| **TypeScript** | Strict backend typing, interface declarations, and error handling. |
| **Zod** | Runtime schema parsing and input sanitization for all request bodies and query params. |

### 2.3 Persistence & Identity Tier
The project enforces **one consistent database access strategy**: Prisma ORM targeting Supabase PostgreSQL.

| Technology | Responsibility |
| :--- | :--- |
| **Supabase PostgreSQL** | Hosted relational database storing threat records, brand registries, user scans, and audit logs. |
| **Supabase Auth** | User authentication (email/password, OAuth), JWT issuance, and session verification. |
| **Prisma ORM** | Declarative schema definitions (`prisma/schema.prisma`), migrations, and type-safe database queries. |
| **PostgreSQL RLS** | Row Level Security policies ensuring tenants and users only access authorized records. |

### 2.4 Threat Intelligence Tier
Modular, isolated adapter interfaces that query upstream feeds without tight coupling.

| Component | Status | Responsibility |
| :--- | :--- | :--- |
| **Modular Feed Adapters** | Locked Architecture | Abstract interface (`ThreatFeedAdapter`) supporting multi-source querying and timeout handling. |
| **PhishTank Adapter** | Initial Candidate | Ingest confirmed active phishing URLs (subject to API access terms and rate limits). |
| **URLhaus Adapter** | Optional Additional | Ingest malware and malicious payload URLs. |
| **Google Safe Browsing / Web Risk** | Optional / Permitted | Cross-reference verified malicious web threats where API quotas permit. |
| **RiskShield Verified DB** | Core Database | Internal database of curated indicators, verified brand domains, and reviewed reports. |
| **Rule & Heuristic Engine** | Core Service | TypeScript-based lexical parsing, homoglyph distance, DNS age analysis, and risk scoring. |
| **Optional Server-Side LLM** | Optional / Auxiliary | Generate explainable, natural language summaries of collected technical evidence. |

### 2.5 Deployment & Infrastructure
| Service | Responsibility |
| :--- | :--- |
| **Vercel** | Hosting for the React + Vite static build and the Next.js API serverless functions. |
| **Supabase Cloud** | Managed PostgreSQL database hosting, database migrations target, and Auth endpoints. |

---

## 3. Architecture Boundaries & Constraints

1. **No Next.js Migration for Frontend:**  
   The frontend is and must remain a React + Vite application. Next.js is reserved solely for the backend API.
2. **Single Database Strategy:**  
   Prisma ORM is the single, authoritative data access tool. Do not introduce raw SQL drivers, TypeORM, or Drizzle alongside Prisma.
3. **No Chrome Extension:**  
   Browser extension manifests, background service workers, and extension popup scripts are strictly forbidden from the codebase.
4. **Decoupled API Contracts:**  
   Communication between frontend and backend occurs strictly over JSON REST endpoints validated by shared TypeScript/Zod models.
5. **Fail-Safe Intelligence:**  
   API adapters must fail closed or emit `INCONCLUSIVE`. A failed upstream network call must never be masked as a clean scan result.
