# RiskShield AI — Database & Supabase Auth Foundation (`database/`)

This directory documents the PostgreSQL schema, Row-Level Security (RLS) policies, and Prisma migrations for **RiskShield AI**.

## 1. Target Supabase Project

- **Project URL:** `https://xsadxqhuefmvcuvpfoeh.supabase.co`
- **Project Reference:** `xsadxqhuefmvcuvpfoeh`

## 2. Schema & Migration Files

- **Prisma Schema:** [`backend/prisma/schema.prisma`](file:///c:/Z-Code/Risk%20Management/backend/prisma/schema.prisma)
- **Prepared Initial SQL Migration & RLS Policies:** [`backend/prisma/migrations/20261013000000_init_schema_and_rls/migration.sql`](file:///c:/Z-Code/Risk%20Management/backend/prisma/migrations/20261013000000_init_schema_and_rls/migration.sql)

## 3. Core Tables & Security Invariants

1. **`users` (`User`)**
   - Mapped 1:1 with Supabase Auth `auth.users.id` (UUID).
   - Stores `email` (unique), `fullName`, `displayName`, `role` (`USER`, `BRAND_OWNER`, `ADMIN`), `accountStatus` (`PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`), `isEmailVerified`, `createdAt`, `updatedAt`.
   - **Security Invariant:** Zero plaintext passwords or password hashes are stored in application tables.
2. **`brands` (`Brand`)**
   - Stores brand workspace metadata (`name`, `slug` unique, `brandType`, `category`, `country`, `website`, `description`, `businessEmail`, `supportEmail`, `securityContactEmail`, `officialPhone`, `status`, `dnsTxtToken`).
   - **Security Invariant:** Always created with `status = 'PENDING_VERIFICATION'`. Never auto-verified on user submission.
3. **`brand_memberships` (`BrandMembership`)**
   - Explicit authorization join table between `users.id` and `brands.id` with `role` (`OWNER`, `ADMIN`, `MEMBER`) and `status` (`ACTIVE`, `INVITED`, `REVOKED`).
   - Enforces `UNIQUE("userId", "brandId")` and indexes on `userId` and `brandId`.
4. **`brand_assets` (`BrandAsset`)**
   - Stores official brand reference assets (`DOMAIN`, `SUBDOMAIN`, `SOCIAL_HANDLE`, `TRADEMARK`, `MERCHANT`, `MOBILE_APP`, `CONTACT_CHANNEL`) with `value` and `normalizedValue`.
   - **Security Invariant:** Defaults to `status = 'PENDING_VERIFICATION'`. Never auto-verified upon user submission.
5. **Supporting Tables**
   - `scan_records` (`ScanRecord`)
   - `brand_threat_findings` (`BrandThreatFinding`)
   - `threat_investigations` (`ThreatInvestigation`)
   - `threat_watch_items` (`ThreatWatchItem`)
   - `audit_events` (`AuditEvent`)

## 4. Applying Migrations to Supabase PostgreSQL

Once `DATABASE_URL` and `DIRECT_URL` are set in `backend/.env`:

```bash
npm run db:generate --workspace=backend
npm run db:migrate --workspace=backend
```
