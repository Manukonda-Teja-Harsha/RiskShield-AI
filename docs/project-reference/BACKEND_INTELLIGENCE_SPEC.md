# RiskShield AI — Backend & Threat Intelligence Specification

**Document Version:** 1.0.0  
**Status:** Canonical Project Specification  
**Classification:** Core Threat Intelligence & Risk Engine Architecture  

---

## 1. Intelligence Architecture Overview

RiskShield AI operates a multi-layered, deterministic, and heuristic threat intelligence pipeline. The backend is implemented as a headless Next.js API service interacting with Supabase PostgreSQL via Prisma ORM.

```
Incoming Request (URL / SMS / Profile / Product)
                       │
                       ▼
         [ Stage 1: Zod Input Validation ]
                       │
                       ▼
        [ Stage 2: PII Purge & Tokenization ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ Technical Domain Triage ]   [ External Threat Feeds ]
 • DNS Zone & MX Records       • PhishTank Adapter
 • WHOIS Registration Age      • URLhaus Adapter
 • SSL Cert Transparency       • RiskShield Reviewed DB
 • Homoglyph / Levenshtein     • Safe Browsing (Optional)
         │                           │
         └─────────────┬─────────────┘
                       ▼
      [ Stage 3: Brand Asset Whitelist Check ]
                       │
                       ▼
      [ Stage 4: Rule-Based Evidence Aggregator ]
                       │
                       ▼
      [ Stage 5: Optional Server-Side LLM Triage ]
                       │
                       ▼
    [ Canonical Verdict & Actionable Guidance ]
```

---

## 2. Threat Classification Status Standard

The platform standardizes on **5 mutually exclusive canonical risk statuses**. The engine must never emit arbitrary percentages without mapping to one of these statuses:

| Status Code | Description | Trigger Criteria | User Recommendation |
| :--- | :--- | :--- | :--- |
| **`KNOWN_THREAT`** | Confirmed Malicious | Positive match on verified threat feed (PhishTank, URLhaus, or internal confirmed database). | **Critical Warning:** Do not access or submit data. Block and quarantine immediately. |
| **`HIGH_RISK`** | Severe Risk Profile | Strong brand impersonation match (Levenshtein <= 2 against verified brand) + newly registered domain (< 14 days) + disposable hosting. | **Severe Hazard:** Highly likely credential harvesting or scam lure. Avoid completely. |
| **`SUSPICIOUS`** | Elevated Risk Indicators | Multiple anomalous signals (coercive urgency in text, masked WHOIS, recent registration, redirect hops). | **Exercise Caution:** Verify via independent search. Do not provide passwords or banking details. |
| **`INCONCLUSIVE`** | Insufficient or Failed Evidence | One or more upstream threat APIs failed, or target payload cannot be resolved/reached. | **Indeterminate:** Verification could not be completed. Maintain healthy digital skepticism. |
| **`NO_KNOWN_THREAT_DETECTED`** | No Active Threats Cataloged | Domain established > 180 days, valid EV/OV SSL, zero feed matches, authentic brand alignment. | **No Detected Threats:** Aligns with standard criteria. Does NOT guarantee complete safety. |

---

## 3. Threat Intelligence Sources & Adapter Architecture

All external integrations utilize an abstract adapter contract to ensure loose coupling, timeouts, and graceful degradation:

```typescript
export interface ThreatFeedAdapter {
  readonly providerId: string;
  readonly isEnabled: boolean;
  queryUrl(targetUrl: string): Promise<FeedQueryResult>;
}

export interface FeedQueryResult {
  matched: boolean;
  threatType?: 'PHISHING' | 'MALWARE' | 'SCAM' | 'UNKNOWN';
  confidence: number; // 0.0 to 1.0
  providerReference?: string;
  error?: string;
}
```

### 3.1 Candidate Feeds Status Matrix

> [!IMPORTANT]  
> All external feed integrations below are currently **PLANNED** (Phase 5). None are currently verified as working in the empty workspace.

| Source | Role | Status | Failure Policy |
| :--- | :--- | :--- | :--- |
| **PhishTank** | Phishing URL matching | Planned (Initial candidate) | Timeout (3s) -> Fallback to internal DB. |
| **URLhaus** | Malware distribution URLs | Planned (Optional) | Timeout (3s) -> Continue pipeline. |
| **Google Safe Browsing / Web Risk** | Comprehensive web threats | Planned (Permitted) | Rate-limit guardrails -> Skip if quota exhausted. |
| **RiskShield Reviewed DB** | High-fidelity internal signatures | Planned (Phase 3/4) | Authoritative local PostgreSQL query via Prisma. |

---

## 4. Brand Intelligence Registry & Matching Engine

### 4.1 Asset Whitelisting
The platform maintains an authoritative registry of verified brand assets:
- Top-Level Domains (`domain`, e.g. `chase.com`).
- Official subdomains (`subdomain`, e.g. `secure.chase.com`).
- Official social handles (`@chase` on verified platforms).
- Authorized merchant IDs.

### 4.2 Impersonation Detection Algorithms
When an uncatalogued domain or profile is inspected:
1. **Punycode / Unicode Homoglyph Normalization:** Convert Cyrillic and Greek lookalikes (e.g., Cyrillic `а` -> Latin `a`).
2. **Levenshtein Distance Calculation:** Compute edit distance against all registered brand trademarks. An edit distance of 1 or 2 with identical keyword targets triggers immediate `HIGH_RISK` scoring.
3. **Keyword Combos:** Identify high-risk prefixes/suffixes combined with brand names (`brand-login.com`, `verify-brand.net`, `brand-support.org`).

---

## 5. Risk Detection Pipeline Stages

### Stage 1: Lexical & Syntax Parsing
- Normalize protocol, strip tracking query parameters (`utm_*`, `fbclid`).
- Extract base TLD, subdomain depth, and character set entropy.

### Stage 2: Infrastructure & Provenance Evaluation
- **WHOIS Query:** Calculate domain age in days. Domains under 14 days carry heavy risk weighting; domains under 60 days carry moderate weighting.
- **DNS Records:** Verify valid MX records and authoritative nameservers.
- **SSL / TLS Certificate:** Check certificate issuance date, CA root trustworthiness, and Certificate Transparency (CT) logs.

### Stage 3: External Intelligence Querying
- Concurrently query enabled `ThreatFeedAdapter` instances with a strict 3000ms timeout per adapter.
- Cache query results in Supabase PostgreSQL with a 4-hour TTL to prevent redundant external calls.

### Stage 4: Rule-Based Evidence Synthesis
- Aggregate individual evidence vectors into an explainable audit trail:
  ```typescript
  export interface EvidenceFactor {
    factorId: string;
    label: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    detail: string;
    providerCitation?: string;
  }
  ```
- Sum weighted confidence scores to derive the final canonical status.

### Stage 5: Optional Server-Side LLM Contextualizer
- If configured and enabled, a server-side LLM receives the structured JSON evidence factors and synthesizes:
  1. Plain-English risk explanation (avoiding cybersecurity jargon).
  2. Targeted, sequential user defense steps (e.g., "1. Do not enter credentials; 2. Forward message to carrier 7726; 3. Check bank transactions").
- LLM is strictly used for synthesis and explanation; it is **never** permitted to override deterministic threat-feed hits.

---

## 6. Privacy, Failure & False-Positive Handling

### 6.1 Source Failure Policy (Fail Inconclusive)
If an external API experiences an outage, network timeout, or HTTP 5xx error:
- The system logs an internal adapter error.
- The pipeline **MUST NOT** interpret the lack of a threat hit as safety.
- If no other definitive evidence exists, the status is set to `INCONCLUSIVE` with an honest disclosure: *"External threat registry unreachable; manual caution required."*

### 6.2 Privacy & PII Handling
- SMS and message text submissions are pre-processed to scrub credit card numbers (Luhn regex), phone numbers, email addresses, and full names before persisting or analyzing.
- Personal scan records are encrypted and protected by PostgreSQL Row Level Security (RLS).

### 6.3 False-Positive Correction Workflow
- Users and brand owners may submit a dispute request on any scan result.
- Disputed items are marked `UNDER_REVIEW` and routed to the administrative quarantine queue.
- Verified corrections update the platform baseline within 60 seconds.
