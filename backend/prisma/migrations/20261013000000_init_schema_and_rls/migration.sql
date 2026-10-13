-- RiskShield AI — Initial PostgreSQL Migration & Row-Level Security (RLS)
-- Target Project: https://xsadxqhuefmvcuvpfoeh.supabase.co (ref: xsadxqhuefmvcuvpfoeh)
-- Enforces strict tenant isolation between Personal Users and Brand Workspaces.
-- SECURITY INVARIANT: Zero plaintext passwords or password hashes stored in application tables.
--
-- This migration is fully idempotent:
--   • CREATE TABLE IF NOT EXISTS — safe to re-run
--   • CREATE INDEX IF NOT EXISTS — safe to re-run
--   • ALTER TABLE ... ENABLE ROW LEVEL SECURITY — no-op if already enabled
--   • CREATE POLICY is wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$
--     which is the universally safe pattern for PostgreSQL 12+ (CREATE POLICY IF NOT EXISTS
--     does NOT exist in any PostgreSQL version including 17).

-- =============================================================================
-- 1. TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS "users" (
  "id"              UUID        PRIMARY KEY,
  "email"           TEXT        NOT NULL UNIQUE,
  "fullName"        TEXT,
  "displayName"     TEXT,
  "role"            TEXT        NOT NULL DEFAULT 'USER',
  "accountStatus"   TEXT        NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "isEmailVerified" BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "brands" (
  "id"                   UUID        PRIMARY KEY,
  "name"                 TEXT        NOT NULL,
  "slug"                 TEXT        NOT NULL UNIQUE,
  "brandType"            TEXT        NOT NULL DEFAULT 'COMPANY_PRODUCT',
  "category"             TEXT        NOT NULL,
  "country"              TEXT,
  "website"              TEXT,
  "description"          TEXT,
  "logoInitial"          TEXT        NOT NULL DEFAULT 'B',
  "accentColor"          TEXT        NOT NULL DEFAULT '#FF5500',
  "businessEmail"        TEXT,
  "supportEmail"         TEXT,
  "securityContactEmail" TEXT,
  "officialPhone"        TEXT,
  "status"               TEXT        NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "dnsTxtToken"          TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "brands_slug_idx"   ON "brands"("slug");
CREATE INDEX IF NOT EXISTS "brands_status_idx" ON "brands"("status");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "brand_memberships" (
  "id"        UUID        PRIMARY KEY,
  "userId"    UUID        NOT NULL REFERENCES "users"("id")  ON DELETE CASCADE,
  "brandId"   UUID        NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "role"      TEXT        NOT NULL DEFAULT 'MEMBER',
  "status"    TEXT        NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "brandId")
);

CREATE INDEX IF NOT EXISTS "brand_memberships_userId_idx"  ON "brand_memberships"("userId");
CREATE INDEX IF NOT EXISTS "brand_memberships_brandId_idx" ON "brand_memberships"("brandId");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "brand_assets" (
  "id"              UUID        PRIMARY KEY,
  "brandId"         UUID        NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "type"            TEXT        NOT NULL,
  "platform"        TEXT,
  "value"           TEXT        NOT NULL,
  "normalizedValue" TEXT        NOT NULL,
  "status"          TEXT        NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "dnsTxtRecord"    TEXT,
  "verifiedAt"      TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "brand_assets_brandId_idx"         ON "brand_assets"("brandId");
CREATE INDEX IF NOT EXISTS "brand_assets_normalizedValue_idx" ON "brand_assets"("normalizedValue");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "scan_records" (
  "id"              UUID        PRIMARY KEY,
  "userId"          UUID        REFERENCES "users"("id")  ON DELETE SET NULL,
  "brandId"         UUID        REFERENCES "brands"("id") ON DELETE CASCADE,
  "target"          TEXT        NOT NULL,
  "normalizedTarget" TEXT       NOT NULL,
  "category"        TEXT        NOT NULL,
  "mode"            TEXT        NOT NULL,
  "status"          TEXT        NOT NULL,
  "score"           INTEGER     NOT NULL,
  "explanation"     TEXT        NOT NULL,
  "contextPayload"  JSONB,
  "evidence"        JSONB       NOT NULL,
  "sourcesChecked"  TEXT[]      NOT NULL DEFAULT '{}',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "scan_records_userId_idx"          ON "scan_records"("userId");
CREATE INDEX IF NOT EXISTS "scan_records_brandId_idx"         ON "scan_records"("brandId");
CREATE INDEX IF NOT EXISTS "scan_records_normalizedTarget_idx" ON "scan_records"("normalizedTarget");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "brand_threat_findings" (
  "id"                   UUID        PRIMARY KEY,
  "brandId"              UUID        NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "target"               TEXT        NOT NULL,
  "platform"             TEXT        NOT NULL,
  "severity"             TEXT        NOT NULL,
  "riskScore"            INTEGER     NOT NULL,
  "status"               TEXT        NOT NULL DEFAULT 'NEW',
  "detectionReason"      TEXT        NOT NULL,
  "officialAssetCompared" TEXT,
  "evidence"             JSONB       NOT NULL,
  "repeatScanCount"      INTEGER     NOT NULL DEFAULT 1,
  "detectedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "brand_threat_findings_brandId_idx" ON "brand_threat_findings"("brandId");
CREATE INDEX IF NOT EXISTS "brand_threat_findings_status_idx"  ON "brand_threat_findings"("status");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "threat_investigations" (
  "id"          UUID        PRIMARY KEY,
  "findingId"   UUID        NOT NULL REFERENCES "brand_threat_findings"("id") ON DELETE CASCADE,
  "authorEmail" TEXT        NOT NULL,
  "note"        TEXT        NOT NULL,
  "actionTaken" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "threat_investigations_findingId_idx" ON "threat_investigations"("findingId");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "threat_watch_items" (
  "id"                   UUID        PRIMARY KEY,
  "userId"               UUID        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target"               TEXT        NOT NULL,
  "targetType"           TEXT        NOT NULL,
  "assessment"           TEXT        NOT NULL,
  "monitoringStatus"     TEXT        NOT NULL DEFAULT 'Monitoring',
  "notificationsEnabled" BOOLEAN     NOT NULL DEFAULT TRUE,
  "notes"                TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "threat_watch_items_userId_idx" ON "threat_watch_items"("userId");

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id"        UUID        PRIMARY KEY,
  "userId"    UUID        REFERENCES "users"("id")  ON DELETE SET NULL,
  "brandId"   UUID        REFERENCES "brands"("id") ON DELETE CASCADE,
  "action"    TEXT        NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "audit_events_userId_idx"  ON "audit_events"("userId");
CREATE INDEX IF NOT EXISTS "audit_events_brandId_idx" ON "audit_events"("brandId");

-- =============================================================================
-- 2. ROW-LEVEL SECURITY — Enable on all tables
-- =============================================================================
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent (no-op if already enabled).

ALTER TABLE "users"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brands"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_memberships"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_assets"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scan_records"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_threat_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "threat_investigations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "threat_watch_items"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events"          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. RLS POLICIES (idempotent via DO $$ EXCEPTION WHEN duplicate_object)
-- =============================================================================
--
-- NOTE: auth.uid() is a Supabase built-in PostgreSQL function that returns the
-- UUID of the authenticated JWT principal (i.e., auth.users.id).
-- The users.id column is set to the Supabase Auth UUID at registration time
-- so that auth.uid() = users.id is always true for the authenticated user.
--
-- Brand-scoped policies always check bm."status" = 'ACTIVE' to ensure
-- revoked or invited (pending) members cannot access brand resources.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Policy 1: Users — self-access only
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "users_self_access" ON "users"
    FOR ALL
    USING (auth.uid() = "id")
    WITH CHECK (auth.uid() = "id");
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "users_self_access" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 2: Brand Memberships — users see only their own memberships
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brand_memberships_member_read" ON "brand_memberships"
    FOR SELECT
    USING (auth.uid() = "userId");
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brand_memberships_member_read" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 3a: Brands — members with ACTIVE membership can read
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brands_member_access" ON "brands"
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM "brand_memberships" bm
        WHERE bm."brandId" = "brands"."id"
          AND bm."userId"  = auth.uid()
          AND bm."status"  = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brands_member_access" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 3b: Brands — only OWNER or ADMIN with ACTIVE membership can update
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brands_owner_admin_update" ON "brands"
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM "brand_memberships" bm
        WHERE bm."brandId" = "brands"."id"
          AND bm."userId"  = auth.uid()
          AND bm."status"  = 'ACTIVE'
          AND bm."role"   IN ('OWNER', 'ADMIN')
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brands_owner_admin_update" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 4: Brand Assets — ACTIVE brand members can read/write
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brand_assets_member_access" ON "brand_assets"
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM "brand_memberships" bm
        WHERE bm."brandId" = "brand_assets"."brandId"
          AND bm."userId"  = auth.uid()
          AND bm."status"  = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brand_assets_member_access" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 5a: Scan Records — personal scans isolated to owning user
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "personal_scan_isolation" ON "scan_records"
    FOR ALL
    USING ("brandId" IS NULL AND auth.uid() = "userId");
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "personal_scan_isolation" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 5b: Scan Records — brand scans isolated to ACTIVE brand members
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brand_scan_member_isolation" ON "scan_records"
    FOR ALL
    USING (
      "brandId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "brand_memberships" bm
        WHERE bm."brandId" = "scan_records"."brandId"
          AND bm."userId"  = auth.uid()
          AND bm."status"  = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brand_scan_member_isolation" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 6: Brand Threat Findings — isolated to ACTIVE brand members
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "brand_findings_member_isolation" ON "brand_threat_findings"
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM "brand_memberships" bm
        WHERE bm."brandId" = "brand_threat_findings"."brandId"
          AND bm."userId"  = auth.uid()
          AND bm."status"  = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "brand_findings_member_isolation" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 7: Threat Investigations — isolated to ACTIVE members of finding's brand
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "threat_investigations_member_isolation" ON "threat_investigations"
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM "brand_threat_findings" btf
        JOIN "brand_memberships" bm ON bm."brandId" = btf."brandId"
        WHERE btf."id"      = "threat_investigations"."findingId"
          AND bm."userId"   = auth.uid()
          AND bm."status"   = 'ACTIVE'
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "threat_investigations_member_isolation" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 8: Threat Watch Items — strictly isolated to owning personal user
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "threat_watch_self_isolation" ON "threat_watch_items"
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "threat_watch_self_isolation" already exists, skipping.';
END $$;

-- ---------------------------------------------------------------------------
-- Policy 9: Audit Events — user reads own events, or ACTIVE brand member reads brand events
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "audit_events_isolation" ON "audit_events"
    FOR SELECT
    USING (
      auth.uid() = "userId"
      OR (
        "brandId" IS NOT NULL AND EXISTS (
          SELECT 1 FROM "brand_memberships" bm
          WHERE bm."brandId" = "audit_events"."brandId"
            AND bm."userId"  = auth.uid()
            AND bm."status"  = 'ACTIVE'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy "audit_events_isolation" already exists, skipping.';
END $$;
