# RiskShield AI — Setup & Development Guide

## 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**: v9+ (supports npm workspaces)
- **PostgreSQL / Supabase**: Optional for standalone frontend/heuristic mode; required for full backend persistence.

## 2. Environment Configuration
1. Copy the root `.env.example`, `frontend/.env.example`, and `backend/.env.example` into `.env.local` in their respective directories when connecting live services.
2. **Frontend Variables (`frontend/.env.local`)**:
   - `VITE_API_BASE_URL`: Base URL of the deployed Next.js backend (leave empty to use relative `/api` routes or local heuristic fallback).
   - Never place database URLs, private API keys, or `SUPABASE_SERVICE_ROLE_KEY` in `frontend/`.
3. **Backend Variables (`backend/.env.local`)**:
   - `DATABASE_URL` & `DIRECT_URL`: Supabase PostgreSQL connection strings.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Commands

### From Repository Root
```bash
# Install dependencies across workspaces
npm install

# Start frontend Vite dev server (http://localhost:5173)
npm run dev:frontend

# Build frontend production bundle (generates frontend/dist)
npm run build:frontend

# Typecheck & build both frontend and backend
npm run build

# Run verification suites
npm test
```

### Inside `frontend/`
```bash
npm run dev
npm run build
npm run typecheck
```

### Inside `backend/`
```bash
npm run dev
npm run build
npm run typecheck
```
