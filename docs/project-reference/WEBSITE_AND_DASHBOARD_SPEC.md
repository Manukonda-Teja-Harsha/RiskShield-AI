# RiskShield AI — Website & Dashboard UI Specification

**Document Version:** 1.0.0  
**Status:** Canonical Project Specification  
**Classification:** Product UI/UX & Design System Reference  

---

## 1. Design Philosophy & Inspiration

RiskShield AI derives its design language from modern, high-craft developer and enterprise security platforms (taking design inspiration from **Wama** and **Cerebrium** without copying their content).

### Core Aesthetic Pillars
- **Polished High-Contrast Minimal:** Deep obsidian dark mode (`#070707` / `#0a0a0a`) paired with a clean, high-contrast light mode (`#f8fafc` / `#ffffff`).
- **Signature Accent:** Solar Sunset Flame Orange (`#FF5500` / `#FF7A00`) utilized intentionally for key actions, warnings, and active states.
- **Brutalist-Refined Typography:** 
  - Display/Headings: `Lexend` (bold, geometric, authoritative).
  - Body Copy: `Inter` (neutral, readable, comfortable leading).
  - Data & Telemetry: `JetBrains Mono` (for domain strings, hashes, timestamps, and status chips).
- **Purposeful Micro-Interactions:** Fluid spring physics via Framer Motion, subtle borders (`border-white/10` / `border-slate-200`), and zero decorative bloat.
- **Honest Feedback:** No fabricated live visitor counters, no fake animated tickers claiming fake millions of scans, and no simulated verification seals.

---

## 2. Navigation Architecture

### 2.1 Public Navigation Bar
The public header maintains a clean, distraction-free layout:
```
┌────────────────────────────────────────────────────────────────────────┐
│  [🛡️ RiskShield AI Logo]               [☀️/🌙 Theme Toggle]  [Log In]  │
└────────────────────────────────────────────────────────────────────────┘
```
- **Company Logo:** RiskShield AI shield icon + wordmark. Clicking navigates smoothly to Home (`/`).
- **Theme Toggle:** Interactive button toggling between Dark Mode (`.dark`) and Light Mode (`:root`), persisting state to `localStorage`.
- **Log In Action:** Opens the unified authentication modal / page.

### 2.2 Authenticated Dashboard Navigation
Authenticated sessions employ role-appropriate top and side navigation:
- **User Dashboard Navigation:** Scanner, Personal Scan History, Saved Findings, Account Settings.
- **Brand Owner Dashboard Navigation:** Brand Assets, Impersonation Radar, Reported Threats, Takedown Dossiers, Brand Profile.

---

## 3. Public Website Structure

The public landing page (`/`) introduces the platform's dual mission:

### Section 1: Hero & Unified Quick-Scanner
- High-impact headline: *Detect Scam Links, Fake Profiles & Brand Impersonation Before Harm Occurs.*
- Subheadline explaining evidence-backed digital risk protection.
- **Unified Quick-Scanner Box:** A prominent 4-tab input console:
  1. `URL Scanner`: Input field for URLs (e.g. `paypa1-security.xyz`).
  2. `Scam Message`: Multi-line text area for SMS, WhatsApp, or email snippets.
  3. `Public Profile`: Input field for public social media handles or URLs.
  4. `Product Listing`: Input field for marketplace or e-commerce listing URLs.
- Action CTA: *"Run Heuristic Scan"* triggering the interactive analysis engine.
- Dual entry links: *"For Everyday Users"* (Personal Link Check) and *"For Brands"* (Brand Impersonation Defense).

### Section 2: How RiskShield AI Works (4-Step Pipeline)
- **Step 01: Submit Indicator:** Ingest URL, text snippet, profile handle, or product listing.
- **Step 02: Ingest Threat Intel:** Cross-reference known feeds, registrar logs, and DNS records.
- **Step 03: Evaluate Evidence:** Run rule-based heuristics and brand lookalike algorithms.
- **Step 04: Actionable Verdict:** Receive an explainable status, supporting evidence, and concrete next steps.
- Clear disclaimer: *A clean result does not guarantee 100% safety. Results reflect evidence available at scan time.*

### Section 3: Dual-Pillar Ecosystem
- Comparative view demonstrating how the platform serves:
  - **Everyday Consumers:** One-click link triage, SMS scam decoding, personal scan history.
  - **Brand Owners:** Lookalike domain hunting, impersonation discovery, takedown dossier assembly.
- Reciprocal immunity callout: Explaining how user-flagged threats feed brand protection alerts and vice versa.

### Section 4: Protection Capabilities Grid
- 8 core functional capability cards with consumer / brand filtering:
  1. Phishing & Malicious URL Detection.
  2. Scam Message & Text Deconstruction.
  3. Suspicious Public Profile & Handle Checks.
  4. Fake Product Listings & Store Scams.
  5. Brand Identity Registration & Attestation.
  6. Domain Typosquat & Lookalike Radar.
  7. Automated Abuse Takedown Dossiers.
  8. Private Scan History & Telemetry Vault.

### Section 5: Trust, Privacy & Ethical Governance
- Zero-telemetry log guarantee: Scan queries are processed ephemerally and never sold to ad brokers.
- PII stripping: Personal details are purged from message snippets.
- Open standards: STIX/TAXII interoperability and 72-hour responsible disclosure coordination.

### Section 6: Frequently Asked Questions (Accordion)
- Expandable FAQ addressing detection boundaries, zero-day realities, brand verification steps, and privacy safeguards.

### Section 7: Final Conversion Hub & Operational Footer
- Action triggers to start a free scan or register brand assets.
- Live operational cluster status (`24ms SLA`), legal notices, and navigation sitemap.

---

## 4. User Dashboard Specification

Accessible at `/dashboard` for authenticated everyday users:

### 4.1 Unified Full Scanner Tab
- Expanded scanning console supporting raw URL input, screenshot uploads (future OCR), and multi-paragraph message text.
- Live multi-stage analysis progress indicator.
- Verdict card displaying one of the 5 canonical statuses:
  - `KNOWN_THREAT` (Red badge + block recommendation).
  - `HIGH_RISK` (Orange badge + severe warning).
  - `SUSPICIOUS` (Amber badge + caution advice).
  - `INCONCLUSIVE` (Slate badge + insufficient evidence disclaimer).
  - `NO_KNOWN_THREAT_DETECTED` (Emerald badge + healthy skepticism notice).
- Detailed evidence drawer itemizing:
  - Domain age, registrar, and country of registration.
  - SSL certificate issuer and validity window.
  - Homoglyph / Levenshtein distance metrics.
  - Threat feed cross-reference results.
- Actionable Next Steps: Plain-English instructions (e.g., "Do not enter passwords", "Report to your IT department", "Clear browser cache").

### 4.2 Scan History & Findings Vault
- Searchable and filterable data table of past user scans.
- Columns: Target Indicator, Analysis Date, Verdict Status, Threat Factors, Actions.
- Option to export a timestamped PDF / JSON evidence receipt.
- Individual record deletion and "Purge All History" privacy controls.

---

## 5. Brand Owner Dashboard Specification

Accessible at `/brand-dashboard` for authenticated business/brand accounts:

### 5.1 Registered Digital Assets Inventory
- Management table of registered brand assets:
  - Official Domains (e.g., `acmefinancial.com`, `acme.io`).
  - Official Social Handles (e.g., `@acmefinancial` on X, Instagram).
  - Authorized E-Commerce Storefronts & Authorized Resellers.
  - Registered Trademark Registration Identifiers.
- Verification status chips: `VERIFIED` (green), `PENDING_DNS` (amber), `REJECTED` (red).
- Step-by-step DNS TXT verification wizard.

### 5.2 Brand Impersonation Radar
- Real-time threat detection feed targeting the registered brand:
  - Newly registered lookalike domains (e.g., `acme-security-login.top`).
  - Cloned executive and support social profiles.
  - Counterfeit marketplace listings.
- Heuristic threat score and similarity index for each detected item.

### 5.3 Abuse Takedown Dossier Generator
- One-click tool compiling an RFC-compliant Abuse Evidence Package:
  - Timestamped HAR logs and DNS zone records.
  - Full-page DOM screenshot capture.
  - Identified registrar abuse email and hosting provider NOC contacts.
  - Pre-drafted DMCA / Trademark infringement formal notice ready for email dispatch.

---

## 6. Future Admin / Reviewer Dashboard *(Later Phase)*

> [!NOTE]  
> The Admin / Reviewer Dashboard is explicitly designated for **Phase 8+** and is **NOT** part of the initial frontend or dashboard delivery.

- Queue for auditing disputed threat classifications.
- Brand ownership dispute resolution interface.
- False-positive appeal adjudication tools.
- Threat feed health monitoring and rate-limit dashboards.

---

## 7. Accessibility & UI Quality Requirements

1. **Responsive Design:** Fluid layouts supporting viewports from 360px mobile to 4K ultra-wide monitors.
2. **Reduced Motion:** Respect `prefers-reduced-motion` media queries by disabling non-essential Framer Motion animations.
3. **Contrast Compliance:** All text and critical UI elements must pass WCAG 2.1 AA contrast standards (minimum 4.5:1 ratio).
4. **Keyboard Accessibility:** All interactive controls (buttons, tabs, inputs, accordion headers) must be operable via standard Tab and Enter/Space keys with visible focus rings.
5. **Stateful Completeness:** Every dynamic UI component must provide explicit implementations for:
   - Initial / Idle State
   - Loading / Skeleton State
   - Success / Active State
   - Error / Fallback State
   - Empty Data State
