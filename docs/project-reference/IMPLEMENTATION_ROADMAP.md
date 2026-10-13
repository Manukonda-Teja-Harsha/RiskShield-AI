# RiskShield AI — 10-Phase Implementation Roadmap

**Document Version:** 1.0.0  
**Status:** Canonical Project Specification  
**Classification:** Engineering Roadmap & Execution Plan  

---

## 1. Roadmap Overview & Governance Rules

The implementation of RiskShield AI is governed by a **strict phased lifecycle**. No phase may begin until its prerequisites are verified, and **no application code may be written without explicit user authorization for that specific phase**.

### Implementation Verification Standard
- Features are categorized strictly as **VERIFIED EXISTING**, **INCOMPLETE / IN-PROGRESS**, or **PLANNED**.
- A phase is considered complete **only when verified by automated tests and manual inspection**. It is never assumed complete simply because it appears in this document.

---

## 2. Current Implementation Status Audit

| Phase | Description | Status | Verification Notes |
| :---: | :--- | :---: | :--- |
| **Phase 0** | Workspace Knowledge & Reference Docs | **VERIFIED COMPLETE** | Reference specifications created in `docs/project-reference/`. |
| **Phase 1** | Foundation Scaffolding (Frontend & API) | **PLANNED** | Not started. Awaiting explicit user authorization. |
| **Phase 2** | Frontend Design System & Dashboards UI | **PLANNED** | Not started. |
| **Phase 3** | Supabase, Prisma, Auth & RLS Tier | **PLANNED** | Not started. |
| **Phase 4** | Brand Intelligence Registry & Verification | **PLANNED** | Not started. |
| **Phase 5** | External Threat Feed Adapters | **PLANNED** | Not started. |
| **Phase 6** | Core Scam Detection & Risk Engine | **PLANNED** | Not started. |
| **Phase 7** | Message, Profile & Product Analyzers | **PLANNED** | Not started. |
| **Phase 8** | Shared Threat Intel & Review Workflow | **PLANNED** | Not started. |
| **Phase 9** | End-to-End Frontend/Backend Integration | **PLANNED** | Not started. |
| **Phase 10** | Security Audit, QA & Production Deploy | **PLANNED** | Not started. |

---

## 3. Detailed Phase Breakdown

---

### Phase 1: Project Scaffolding & Foundation
* **Objective:** Establish the clean decoupled workspace structure for the React + Vite frontend and the Next.js API backend.
* **Dependencies:** None.
* **Planned Deliverables:**
  - `package.json` with locked dependencies.
  - `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`.
  - Next.js API directory structure (`app/api/health/route.ts`).
  - Base TypeScript interfaces and Zod schemas.
* **Acceptance Criteria:**
  - `npm run dev` starts Vite cleanly.
  - Baseline health check API endpoint responds with `200 OK` JSON.
  - Zero TypeScript compilation errors.

---

### Phase 2: Frontend UI, Design System & Dashboard Layouts
* **Objective:** Construct the complete, polished client-side user experience adhering to Wama/Cerebrium design inspiration with full light/dark theme support.
* **Dependencies:** Phase 1.
* **Planned Deliverables:**
  - **Shared Design System:** Typography tokens, theme toggle, buttons, inputs, modals, status chips.
  - **Public Pages:** Landing page with Minimal Navbar (Logo, Theme Toggle, Login), Hero, Unified Quick-Scanner, Capabilities, How it Works, FAQ, and Footer.
  - **Authentication Screens:** Login, Registration, Password Reset modals.
  - **User Dashboard UI:** Unified scanner interface, scan history table, evidence detail view, recommended actions card.
  - **Brand Owner Dashboard UI:** Registered assets table, impersonation radar, takedown dossier preview.
* **Acceptance Criteria:**
  - Fully responsive across mobile, tablet, and desktop viewports.
  - Framer Motion animations run smoothly without layout shift.
  - Accessible keyboard navigation and WCAG AA contrast compliance.
  - Clean empty states and loading skeletons for all data views.

---

### Phase 3: Supabase PostgreSQL, Prisma ORM, Auth & RLS
* **Objective:** Establish the persistent data layer, user session management, and database-level security policies.
* **Dependencies:** Phase 1, Phase 2.
* **Planned Deliverables:**
  - Complete `prisma/schema.prisma` model definitions (`User`, `ScanHistory`, `BrandAsset`, `ThreatReport`, `AuditLog`).
  - Prisma migration scripts executed against Supabase PostgreSQL.
  - Supabase Auth integration (email/password signup/login, session tokens).
  - PostgreSQL Row Level Security (RLS) policies enforcing multi-tenant isolation.
  - Protected Next.js Route Handlers verifying Supabase JWT authorization headers.
* **Acceptance Criteria:**
  - Authenticated users can only read and mutate their own scan records.
  - Unauthenticated requests to protected endpoints return `401 Unauthorized`.
  - Prisma client queries succeed with 100% type safety.

---

### Phase 4: Brand Intelligence Registry & Verification Workflow
* **Objective:** Implement data structures and business logic for registering and validating official brand digital assets.
* **Dependencies:** Phase 3.
* **Planned Deliverables:**
  - Asset registration API: submit official domains, subdomains, social handles, and trademark numbers.
  - Verification challenge engine: DNS TXT record challenge generation and corporate email domain validation.
  - Brand profile status tracking (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `DISPUTED`).
* **Acceptance Criteria:**
  - Only authenticated Brand Owners can create asset entries.
  - DNS TXT record lookup verifies domain ownership accurately.
  - Verified assets populate the authoritative platform whitelist.

---

### Phase 5: External Threat Intelligence Integrations
* **Objective:** Construct modular, resilient adapters to ingest external threat feeds without tight coupling.
* **Dependencies:** Phase 1, Phase 3.
* **Planned Deliverables:**
  - Abstract `ThreatFeedAdapter` interface with timeout, retry, and rate-limit guardrails.
  - PhishTank feed adapter (initial candidate).
  - URLhaus feed adapter (optional secondary source).
  - Local caching layer in PostgreSQL/Redis with configurable TTL to avoid duplicate external queries.
* **Acceptance Criteria:**
  - Network timeouts fail gracefully and emit `INCONCLUSIVE` (never `CLEAN`).
  - Ingested records are tagged with provider provenance and timestamp.

---

### Phase 6: Core Scam Detection & Risk Engine
* **Objective:** Build the deterministic and heuristic decision engine that synthesizes all technical evidence into an explainable verdict.
* **Dependencies:** Phase 4, Phase 5.
* **Planned Deliverables:**
  - Lexical URL parser: Homoglyph/punycode detection, Levenshtein distance against verified brand domains.
  - Infrastructure triage: Domain registration age (WHOIS), SSL certificate transparency check, redirect chain unravelling.
  - Rule-based evidence aggregator computing weighted confidence scores.
  - Standardized verdict generator emitting one of the 5 canonical statuses:
    `KNOWN_THREAT`, `HIGH_RISK`, `SUSPICIOUS`, `INCONCLUSIVE`, `NO_KNOWN_THREAT_DETECTED`.
* **Acceptance Criteria:**
  - Known phishing URL yields `KNOWN_THREAT` with explicit provider citation.
  - Lookalike brand domain yields `HIGH_RISK` citing brand impersonation Levenshtein match.
  - Clean, aged domain with no threat feed hit yields `NO_KNOWN_THREAT_DETECTED` with explicit disclaimer.
  - Failed feed yields `INCONCLUSIVE`.

---

### Phase 7: Message, Public Profile & Product Listing Analyzers
* **Objective:** Extend the core engine to evaluate unstructured text snippets, public social profile URLs, and e-commerce listing links.
* **Dependencies:** Phase 6.
* **Planned Deliverables:**
  - Message Analyzer: PII stripping, urgency heuristic detection (coercive timelines, banking threats), embedded URL extraction.
  - Profile Analyzer: Account age heuristics, follower ratio anomaly flags, cloned avatar / handle signals on public URLs.
  - Product Listing Analyzer: Deep price discount anomalies, domain reputation of marketplace store, unauthorized seller flags.
* **Acceptance Criteria:**
  - PII (names, phone numbers) is purged before persistence or analysis.
  - Analyzers output structured evidence breakdowns and tailored safe action steps.

---

### Phase 8: Shared Threat Intel, Community Reports & Review Workflow
* **Objective:** Enable everyday users to report emerging scams into a quarantine queue, with a structured review process.
* **Dependencies:** Phase 6, Phase 7.
* **Planned Deliverables:**
  - Report submission endpoint with rate limiting and CAPTCHA / bot protection.
  - Quarantine review queue preventing unvalidated user submissions from immediately blacklisting domains.
  - False-positive dispute submission and correction mechanism.
  - Future Admin/Reviewer API hooks prepared for Phase 8+ operational rollout.
* **Acceptance Criteria:**
  - Unreviewed user reports never independently generate a `KNOWN_THREAT` status.
  - Community reports require multi-source corroboration or reviewer approval.

---

### Phase 9: End-to-End Frontend & Backend Integration
* **Objective:** Connect the React + Vite frontend to the live Next.js API backend, replacing all client-side mocks with genuine data pipelines.
* **Dependencies:** All previous phases.
* **Planned Deliverables:**
  - Type-safe API client utilizing Fetch + Zustand stores.
  - Full scanner integration: real-time submission, progress states, and live evidence rendering.
  - Live User Dashboard: populated personal scan history, detail drawers, PDF evidence export.
  - Live Brand Dashboard: live impersonation radar, takedown dossier generation and download.
* **Acceptance Criteria:**
  - Zero mock data in production builds.
  - Error boundaries gracefully handle backend disconnections.
  - Real scan requests execute and render in under 2 seconds.

---

### Phase 10: Security Audit, End-to-End QA & Production Deployment
* **Objective:** Comprehensive security hardening, automated test verification, and production release on Vercel and Supabase.
* **Dependencies:** Phase 9.
* **Planned Deliverables:**
  - Comprehensive end-to-end test suite (Playwright / Cypress) covering scan flows and auth.
  - OWASP Top 10 security review (XSS sanitization, CSRF, rate-limiting, SQLi prevention via Prisma).
  - Vercel production deployment configuration.
  - Post-deployment smoke tests.
* **Acceptance Criteria:**
  - All automated tests pass with 100% green status.
  - Zero critical security vulnerabilities in dependency audit.
  - SSL, CSP headers, and CORS policies strictly enforced.
