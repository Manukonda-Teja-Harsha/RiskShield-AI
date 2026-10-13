# RiskShield AI — Database Schema Reference

## 1. Single Source of Truth
The authoritative database schema is managed by Prisma ORM at `backend/prisma/schema.prisma`, with SQL migrations stored in `backend/prisma/migrations/`.

## 2. Core Models
- **`User` (`users`)**: Stores personal users and brand workspace members, linked with Supabase Auth UUIDs.
- **`Brand` (`brands`)**: Registered enterprise brands with verification status (`PENDING_VERIFICATION`, `VERIFIED`, `FEATURED_PARTNER`) and DNS TXT token metadata.
- **`BrandMembership` (`brand_memberships`)**: Joins `User` and `Brand` with granular roles (`OWNER`, `ADMIN`, `MEMBER`).
- **`BrandAsset` (`brand_assets`)**: Official domains, subdomains, social handles, trademarks, and mobile app package IDs belonging to a brand.
- **`ScanRecord` (`scan_records`)**: Immutable log of personal scans (`userId`, `brandId = null`) and brand scans (`brandId != null`), including `contextPayload` and itemized `evidence`.
- **`BrandThreatFinding` (`brand_threat_findings`)**: Impersonation and threat findings scoped to a specific `brandId`, tracking severity, `repeatScanCount`, and workflow status (`NEW`, `UNDER_REVIEW`, `CONFIRMED_THREAT`, `FALSE_POSITIVE`, `RESOLVED`).
- **`ThreatInvestigation` (`threat_investigations`)**: Analyst notes and remediation actions attached to a `BrandThreatFinding`.
- **`ThreatWatchItem` (`threat_watch_items`)**: Indicators monitored by personal users.
