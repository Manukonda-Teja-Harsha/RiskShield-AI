# RiskShield AI — PostgreSQL Row-Level Security (RLS) Specification

## 1. Security Model Overview
RiskShield AI enforces defense-in-depth tenant isolation at two layers:
1. **Application Layer**: Next.js API Route Handlers verify Supabase JWT tokens (`verifyRequestSession`) and check `BrandMembership` records via Prisma before returning or mutating brand data.
2. **Database Layer**: Supabase PostgreSQL Row-Level Security (RLS) policies guarantee that even direct PostgREST queries cannot cross personal or brand tenant boundaries.

## 2. Core RLS Policies

### 2.1 Personal Scan Isolation (`scan_records`)
- Personal users can only read, insert, or delete scan records where `brandId IS NULL` and `userId = auth.uid()`.
- Personal users can never query records belonging to another user or any Brand Workspace (`brandId IS NOT NULL`).

### 2.2 Brand Workspace Membership Isolation (`brand_threat_findings`, `brand_assets`)
- Access to a brand's private threat findings, investigations, and scan history requires an active row in `brand_memberships` matching `userId = auth.uid()` and the target `brandId`.
- Public users may view verified brand directory metadata (`brands` where `status IN ('VERIFIED', 'FEATURED_PARTNER')`), but never private threat queues or internal investigation notes.
