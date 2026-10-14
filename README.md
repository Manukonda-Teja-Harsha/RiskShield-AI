
🛡️ RiskShield AI
Digital Risk Intelligence & Brand Protection Platform
Assess suspicious digital targets. Monitor brand identity. Investigate threats with structured evidence.
� � � � � �
Overview • Features • Architecture • Setup • Deployment • Security

📌 Overview
RiskShield AI is a digital risk and brand-protection platform designed to help individuals assess potentially unsafe online targets and help organizations protect their official digital identity. It brings risk assessments, personal threat tracking, brand asset registration, structured threat findings, investigation notes, and scheduled brand monitoring into one workflow.
The problem
People encounter suspicious links, phishing lures, and impersonation attempts without enough context to assess them.
Brand teams need ways to track lookalike domains, fake social accounts, and suspected misuse of a brand identity.
Evidence and investigation notes can become fragmented across dashboards, messages, and spreadsheets.
Periodic monitoring needs execution status and failure visibility—not just a list of assets.
The approach
RiskShield AI combines individual risk assessment with brand-focused monitoring and investigation workflows. Its domain model records risk results, evidence, official brand assets, threat findings, investigation notes, and monitoring-job state so users and teams can review activity over time.
[!IMPORTANT] Risk results are assessments, not guarantees. “No known threat detected” does not prove a target is safe, and a suspicious result may require human review. Detection quality depends on implemented scanning logic, available sources, and their freshness.
🧭 Table of Contents
Overview
Key Features
Who Is It For?
User Workflows
System Architecture
Technology Stack
Repository Structure
Getting Started
Environment Configuration
Available Commands
Data Model
Security and Privacy
Testing and Quality Checks
Deployment
Troubleshooting
Roadmap
Contributing
Responsible Use
Documentation and References
License
✨ Key Features
1. Suspicious-target scanning and risk assessment
The scanning workflow is designed to assess supported digital targets and present a structured result rather than a bare warning.
Input classification and normalization.
Risk status and numeric score.
Human-readable explanation.
Structured evidence and sources checked, where available.
Scan records associated with a user or brand workspace.
The domain model defines these risk states:
Status
Meaning
KNOWN_THREAT
The assessment identifies a known threat.
HIGH_RISK
The target has indicators associated with elevated risk.
SUSPICIOUS
The target requires additional scrutiny.
INCONCLUSIVE
Available information is insufficient for a confident assessment.
NO_KNOWN_THREAT_DETECTED
No known threat was identified; this is not a safety guarantee.
2. Personal dashboard and scan history
Review previous scans and their recorded outcomes.
Inspect explanations and evidence captured with a scan.
Keep personal scanning and tracked threats in one experience.
3. Threat Watch
Threat Watch is intended for keeping suspicious or important targets on a personal watchlist.
Save a target for continued attention.
Record its target type and current assessment.
Maintain monitoring status and optional notes.
Store a notification preference for each item.
Notification delivery and actual re-check frequency depend on the implementation and deployment configuration. A stored preference alone does not confirm that a notification was sent.
4. Brand workspaces
A brand workspace gives an organization a central place to define its legitimate digital identity and review suspected misuse.
Brand profile, category, and website.
Business and security contact information.
Brand status and workspace membership.
Related official assets, scans, findings, and monitoring schedules.
Brand types represented in the data model include company/product, creator/public figure, government institution, and marketplace seller.
5. Official brand asset registry
Reference assets help define a brand’s legitimate online presence. Supported asset categories include:
Domains and subdomains.
Social-media handles.
Trademarks.
Merchant or marketplace identities.
Mobile applications.
Official contact channels.
Assets are not automatically trusted just because they are submitted. The model includes PENDING_VERIFICATION, PENDING_DNS, VERIFIED, DISPUTED, and REJECTED states.
6. Team membership and role-aware access
Brand membership is modeled separately from a user's global account role.
Workspace roles: OWNER, ADMIN, and MEMBER.
Membership states: ACTIVE, INVITED, and REVOKED.
Explicit user-to-brand relationships.
A uniqueness constraint for each user/brand membership pair.
Verify the current authorization implementation to confirm the exact permissions of each role.
7. Threat findings and investigation workflow
Suspected brand threats can be stored as structured findings with:
Target and platform.
Severity and risk score.
Detection reason.
Official asset used for comparison, where applicable.
Evidence and repeat-scan count.
Detection and update timestamps.
The schema supports the following finding states:
NEW → UNDER_INVESTIGATION → UNDER_REVIEW → an outcome such as CONFIRMED_THREAT, FALSE_POSITIVE, TAKEDOWN_REQUESTED, or RESOLVED.
This is the available status vocabulary, not a requirement that every finding follow one fixed linear path. Investigation records can preserve a note, author identifier, action taken, and timestamp.
8. Scheduled brand monitoring
The project includes a brand-monitoring schedule model and a GitHub Actions workflow for automated monitoring. Monitoring records can track:
Whether monitoring is enabled and its frequency in hours.
Last and next run times.
Execution status and worker-lock information.
Consecutive failures and the latest error.
Number of assets scanned and findings found in the latest run.
[!NOTE] A workflow file and schedule model do not independently prove that a production job is running. Confirm workflow permissions, secrets, scheduling, logs, and successful execution in the deployment environment.
9. Audit events and traceability
The audit-event model provides a foundation for recording an action, metadata, timestamp, and optional user or brand association. Actual audit coverage depends on which application operations emit events.
10. Security-oriented application structure
The repository documents security-related controls and verification work including session verification, environment validation, Zod request validation, SSRF guard utilities, PostgreSQL row-level security (RLS) documentation, and scanner/tenant-isolation tests. These controls should be tested continuously and reviewed before production use.
👥 Who Is It For?
Audience
Main value
Individuals
Assess suspicious targets and track items needing attention.
Brand owners
Register official assets and organize brand-protection work.
Brand security/support teams
Review findings, document investigations, and track outcomes.
Developers and maintainers
Work with a modular frontend, API backend, validation schemas, and relational data model.
Evaluators and stakeholders
Understand the use case, architecture, security considerations, and workflows.
🔄 User Workflows
Personal risk assessment
Open RiskShield AI and sign in if the feature requires authentication.
Submit a supported target through the scanner.
The application validates and classifies the input.
The scanning service produces a risk assessment.
Review the status, score, explanation, and available evidence.
Keep the result in the available history and, where supported, add the target to Threat Watch.
Brand threat response
Create or access a brand workspace.
Register official assets and complete the required verification process.
Run or enable the available brand-monitoring workflow.
Review generated threat findings.
Investigate a finding, record notes, and document actions taken.
Update the finding status as the review progresses and close it when appropriate.
🏗️ System Architecture
RiskShield AI separates the frontend, API backend, business logic, and persistence layer.
flowchart TD
    U[User / Brand Team] --> FE[React + Vite SPA]
    FE --> API[Next.js API Routes]
    API --> VAL[Zod Validation]
    API --> AUTH[Session / Authorization Checks]
    VAL --> SVC[Domain Services]
    AUTH --> SVC
    SVC --> SCAN[Scanner Service]
    SVC --> BRAND[Brand & Membership Services]
    SVC --> INV[Threat Investigation Service]
    SVC --> MON[Brand Monitoring Service]
    SCAN --> REPO[Repository / Prisma]
    BRAND --> REPO
    INV --> REPO
    MON --> REPO
    REPO --> DB[(PostgreSQL)]
    CRON[Scheduled GitHub Actions Workflow] --> MON
Layer
Responsibility
Frontend SPA
UI, navigation, feature views, client state, and API interaction.
API routes
JSON request handling and application entry points.
Validation/authentication
Validate data and verify identity/session before protected operations.
Domain services
Coordinate scanning, brand management, monitoring, and investigation rules.
Repository / Prisma
Encapsulate database access and map domain models to PostgreSQL.
PostgreSQL
Persist users, brands, assets, scans, findings, watch items, audit events, and schedules.
Scheduled workflow
Trigger automated monitoring according to configured workflow settings.
🧰 Technology Stack
Technology
Role
React 18
Component-based frontend UI.
Vite
Frontend development server and build tooling.
TypeScript
Static typing across application code.
Tailwind CSS
Utility-first styling.
Framer Motion
UI animation and transitions.
React Router
Client-side routing.
Zustand
Shared client-side state management.
Next.js App Router
Headless API backend and route handlers.
Zod
Runtime request validation and schema contracts.
Prisma ORM
Typed database access and schema/migration management.
PostgreSQL
Relational persistence.
GitHub Actions
Workflow automation for scheduled brand monitoring.
Vercel / Render
Documented frontend and backend deployment targets.
📁 Repository Structure
riskshield-ai/
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── pages/            # Route-level pages
│   │   ├── routes/           # Route exports/configuration
│   │   ├── features/         # Auth, scanner, dashboard, Threat Watch, brand workspace
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Scanner engine, classifier, guards, adapters
│   │   ├── services/         # API and authentication service layer
│   │   ├── stores/            # Zustand stores
│   │   ├── types/             # Frontend domain contracts
│   │   ├── styles/            # Theme and Tailwind tokens
│   │   └── assets/            # Static assets
│   ├── public/                # Public assets and SPA routing files
│   ├── tests/                 # Frontend/security-related tests
│   └── vercel.json            # Frontend deployment configuration
├── backend/
│   ├── src/
│   │   ├── app/api/            # JSON API route handlers
│   │   ├── lib/                # Prisma, auth/session, env and SSRF utilities
│   │   ├── modules/             # Domain modules
│   │   ├── services/            # Business logic services
│   │   ├── repositories/        # Data-access layer
│   │   ├── schemas/             # Zod validation schemas
│   │   └── types/               # Backend types
│   ├── prisma/
│   │   ├── schema.prisma        # Canonical Prisma schema
│   │   └── migrations/          # Database migrations
│   └── tests/                   # API contracts and regression tests
├── database/                    # RLS guidance and development seed resources
├── docs/                        # Architecture, setup, schema, auth and API docs
├── .github/workflows/           # Scheduled brand-monitoring workflow
├── render.yaml                  # Render backend deployment blueprint
├── vercel.json                  # Root deployment configuration
├── package.json                 # Root workspace scripts
└── README.md
🚀 Getting Started
Prerequisites
Node.js and npm compatible with the repository dependencies.
Git.
PostgreSQL database access.
Authentication-provider configuration required by the project (the schema references Supabase Auth).
Environment variables for the frontend, backend, database, and authentication integration.
1. Clone the repository
git clone https://github.com/Manukonda-Teja-Harsha/RiskShield-AI.git
cd RiskShield-AI
2. Install dependencies
From the repository root:
npm install
The root package defines frontend and backend as npm workspaces. If your checkout or lockfile requires a different install procedure, follow the current setup documentation.
3. Configure environment variables
Inspect the environment examples and setup guides in the checkout, such as .env.example, workspace-specific examples, and files under docs/. File names can differ between branches. Use the files actually present in your checkout as the source of truth. Never commit real credentials or secret keys.
4. Configure the database
The canonical Prisma schema is:
backend/prisma/schema.prisma
Configure the database variables and follow the repository's migration instructions. From the backend workspace, the general validation/generation workflow is:
cd backend
npx prisma validate
npx prisma generate
Apply migrations using the project's documented migration workflow and the correct target database. Review migrations before applying them to production.
5. Start the frontend
From the repository root:
npm run dev
The README lists the Vite development URL as http://localhost:5173.
6. Start the backend separately
In a second terminal, from the repository root:
npm run dev:backend
Make sure backend environment variables are configured and PostgreSQL is reachable before testing API-backed features.
7. Verify the project
npm run typecheck
npm run build
A successful build is important, but it does not replace integration tests or manual verification of authentication, database access, scanner behavior, and scheduled jobs.
⚙️ Environment Configuration
Environment names may vary by branch and deployment. Check the environment example files and setup documentation before configuring the application.
Variable
Used by
Purpose
VITE_API_BASE_URL
Frontend
Base URL of the deployed or local backend API.
DATABASE_URL
Backend / Prisma
PostgreSQL connection string used by Prisma.
DIRECT_URL
Backend / Prisma
Direct PostgreSQL connection string declared by the Prisma datasource.
Authentication provider variables
Backend and/or frontend
Configure the authentication integration; use the exact names from the checked-in examples.
Configuration guidelines
Keep secrets out of source control and client-side bundles.
Only expose VITE_ variables that are intended to be public frontend configuration.
Set the production API base URL to the deployed backend.
Use separate databases and credentials for development, testing, and production.
Restrict CORS to approved frontend origins.
Rotate credentials immediately if they are accidentally exposed.
🧪 Available Commands
Run these from the repository root unless otherwise specified.
Command
Purpose
npm run dev
Start the frontend development server.
npm run dev:frontend
Start the frontend explicitly.
npm run dev:backend
Start the backend development server.
npm run build
Build frontend and backend.
npm run build:frontend
Build only the frontend.
npm run build:backend
Build only the backend.
npm run typecheck
Run TypeScript checks across both workspaces.
npm run preview
Preview the built frontend.
Check each workspace's package.json for exact test, lint, and database scripts. Do not assume a generic npm test script exists.
🗃️ Data Model
The canonical Prisma schema defines these core entities:
Entity
Responsibility
User
User profile, role, account state, and verification state.
Brand
Brand identity, category, contacts, website, and verification state.
BrandMembership
User-to-brand relationship, workspace role, and membership state.
BrandAsset
Official domain, social handle, trademark, merchant identity, app, or contact channel.
ScanRecord
Target, normalized target, risk status, score, explanation, evidence, and checked sources.
BrandThreatFinding
Suspected threat, severity, risk score, status, detection reason, and evidence.
ThreatInvestigation
Investigation notes and actions linked to a finding.
ThreatWatchItem
Personal watchlist target, assessment, monitoring state, preferences, and notes.
AuditEvent
Action record, optional metadata, timestamp, and optional user/brand association.
BrandMonitorSchedule
Monitoring frequency, run state, timestamps, lock information, and run summaries.
Data integrity principles
Brand assets start in a pending-verification state.
User-to-brand membership pairs are constrained to be unique.
Related records use database relationships to maintain referential integrity.
Indexes support common lookups such as user, brand, normalized target, finding status, and monitoring schedule.
RLS is documented as part of the database security approach; policy coverage must be verified against migrations and the deployed database.
🔐 Security and Privacy
Security is a core requirement for a platform that handles potentially harmful URLs and brand investigations.
Security elements documented in the repository
Session verification and environment validation utilities.
Request validation through Zod schemas.
SSRF guard utilities and related tests.
PostgreSQL RLS documentation and migrations.
Separate global user roles and brand-workspace membership roles.
Structured scan and finding evidence for review.
A User schema mapped to an external authentication identity that does not store plaintext passwords or password hashes.
Production security checklist
[ ]
Confirm authentication and session validation on every protected API route.
[ ]
Test authorization for every brand-owned read and write operation.
[ ]
Verify RLS policies for all tenant-owned tables.
[ ]
Test SSRF protections for private IPs, internal hostnames, redirects, DNS rebinding, and unsupported URL schemes.
[ ]
Apply request-size limits, timeouts, rate limits, and safe error responses.
[ ]
Store secrets in hosting-provider secret settings, not source control.
[ ]
Review CORS, security headers, dependency advisories, and database permissions.
[ ]
Define retention, deletion, and access policies for evidence and investigation notes.
[ ]
Monitor repeated scan failures, scheduled-job failures, and suspicious usage.
✅ Testing and Quality Checks
The repository includes frontend and backend test areas, including scanner, tenant-isolation, API-contract, and regression verification.
Recommended release checks:
Static checks: TypeScript typecheck and production build.
Scanner checks: valid inputs, malformed inputs, known test fixtures, inconclusive results, and unreachable targets.
Security checks: SSRF scenarios and unauthorized/cross-tenant access attempts.
Data checks: migrations, relationship constraints, and RLS behavior.
Workflow checks: create a brand, register assets, create/review findings, add investigation notes, and close a finding.
Automation checks: confirm scheduled jobs record results, handle errors, and avoid overlapping execution.
Deployment checks: API connectivity, environment configuration, logs, health behavior, and frontend route refreshes.
Use test commands actually defined in the workspace package files.
☁️ Deployment
The repository documents a split deployment model: Vercel for the frontend and Render for the backend.
Frontend — Vercel
Import the repository into Vercel.
Configure the project to build the Vite frontend.
Use the documented build command:
npm --prefix frontend run build
Set the output directory to frontend/dist.
Set VITE_API_BASE_URL to the deployed backend URL.
Verify SPA route fallback and security headers.
Backend — Render
Deploy using render.yaml or configure a web service pointing to backend/.
Follow the repository README's documented buil
