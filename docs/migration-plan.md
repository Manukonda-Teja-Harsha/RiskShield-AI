# RiskShield AI — Repository Migration Plan & File Map

## 1. Restructuring Summary
The repository was reorganized from a single-root frontend structure into a modular multi-tier architecture separating `frontend/`, `backend/`, `database/`, and `docs/`.

## 2. File Migration Map

| Original Location | New Destination | Purpose |
| :--- | :--- | :--- |
| `src/**` | `frontend/src/**` | React + Vite + TypeScript source code, pages, components, scanner engine, and Zustand store |
| `public/**` | `frontend/public/**` | Static assets (`shield.svg`) and Netlify SPA `_redirects` |
| `index.html` | `frontend/index.html` | Vite SPA entry HTML |
| `vite.config.ts` | `frontend/vite.config.ts` | Vite bundler configuration and `@/` path alias |
| `tailwind.config.js` | `frontend/tailwind.config.js` | Tailwind CSS design tokens |
| `postcss.config.js` | `frontend/postcss.config.js` | PostCSS plugins configuration |
| `tsconfig.json` | `frontend/tsconfig.json` | Frontend TypeScript compiler configuration |
| `tsconfig.node.json` | `frontend/tsconfig.node.json` | Vite node TypeScript configuration |
| `test_verification.ts` | `frontend/tests/scanner.verification.ts` | 16-point Unified Scanner & tenant isolation test suite |
| *(New)* | `backend/src/app/api/**` | Next.js App Router headless API Route Handlers |
| *(New)* | `backend/src/lib/**` | Prisma DB client, env validator, auth session helper, SSRF guard |
| *(New)* | `backend/src/schemas/**` | Zod validation schemas (`auth`, `scan`, `brand`) |
| *(New)* | `backend/src/services/**` | Scanner & brand domain services |
| *(New)* | `backend/src/repositories/**` | Prisma database repositories |
| *(New)* | `backend/prisma/**` | Canonical `schema.prisma` and SQL migration with RLS policies |
| `docs/project-reference/**` | `docs/project-reference/**` | Preserved canonical specifications |
