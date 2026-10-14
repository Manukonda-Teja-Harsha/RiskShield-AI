🛡️ RiskShield AI — Digital Risk Intelligence & Brand Protection Platform

<p align="center">
  <strong>Detect suspicious links. Investigate digital threats. Protect brands.</strong>
</p><p align="center">
  <a href="https://riskshield-ai-protect.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Open%20RiskShield%20AI-00C853?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/Manukonda-Teja-Harsha/RiskShield-AI">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repository" />
  </a>
</p><p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Next.js-API%20Backend-000000?style=flat&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase" />
</p>---

🌐 Live Demo

Try RiskShield AI: "https://riskshield-ai-protect.vercel.app" (https://riskshield-ai-protect.vercel.app)

Source Code: "GitHub Repository" (https://github.com/Manukonda-Teja-Harsha/RiskShield-AI)

RiskShield AI is a digital risk intelligence and brand-protection platform designed to help users assess suspicious URLs, understand security findings, investigate potential threats, and monitor brand-related risks.

«Important: Risk assessments are decision-support information, not a guarantee of safety. A result with no known threat matches does not prove that a URL is safe, especially when external intelligence providers are unavailable or coverage is limited.»

📑 Table of Contents

- "Overview" (#-overview)
- "Key Features" (#-key-features)
- "Who Is It For?" (#-who-is-it-for)
- "How It Works" (#-how-it-works)
- "Main Intelligence Analysis" (#-main-intelligence-analysis)
- "Technology Stack" (#-technology-stack)
- "System Architecture" (#-system-architecture)
- "Project Structure" (#-project-structure)
- "Getting Started" (#-getting-started)
- "Environment Configuration" (#-environment-configuration)
- "Available Scripts" (#-available-scripts)
- "Security and Privacy" (#-security-and-privacy)
- "Threat Intelligence and Limitations" (#-threat-intelligence-and-limitations)
- "Testing and Verification" (#-testing-and-verification)
- "Deployment" (#-deployment)
- "Troubleshooting" (#-troubleshooting)
- "Roadmap" (#-roadmap)
- "Contributing" (#-contributing)
- "Responsible Use" (#-responsible-use)
- "License" (#-license)

---

🚀 Overview

Digital threats such as phishing websites, impersonation pages, suspicious domains, scam messages, and fraudulent brand accounts can put users and organizations at risk.

RiskShield AI aims to bring risk assessment, threat intelligence, evidence review, and investigation workflows together in one platform.

The platform is designed around two primary experiences:

- Personal Account: Submit suspicious links or supported inputs and review available risk assessments.
- Brand Workspace: Manage brand information, review potential threats, investigate findings, and monitor brand-related risks.

The system separates risk scores, confidence, verdicts, evidence, provider availability, and intelligence coverage to avoid presenting incomplete information as a definitive safety result.

✨ Key Features

🔎 1. Suspicious URL and Input Scanning

- Submit supported URLs and other implemented input types for assessment.
- Normalize URLs before analysis.
- Inspect available indicators and heuristic signals.
- Present the resulting risk score and assessment verdict.
- Display evidence and relevant findings when available.
- Communicate limitations when external intelligence sources cannot be reached.

📊 2. Main Intelligence Analysis Card

The Main Intelligence Analysis Card is designed to provide a consolidated view of an assessment, including:

- Risk score.
- Risk verdict.
- Confidence level.
- Security findings and supporting evidence.
- Intelligence provider status.
- Coverage limitations.
- Recommended next steps.

The card is intended to provide consistent assessment information across the personal and brand dashboards. Its displayed information should be derived from the backend assessment response rather than independently recalculated by the frontend.

🏢 3. Brand Workspace

The brand workspace supports brand-focused threat management and related workflows, including:

- Brand profile and asset management.
- Brand threat review.
- Investigation workflows.
- Threat evidence review.
- Monitoring configuration.
- Intelligence and report views.

Availability of individual workflows depends on the current backend implementation and deployment configuration.

🕵️ 4. Threat Investigation

The investigation workflow is designed to help authorized users review findings, record notes, and manage investigation status.

Potential workflow states include:

- "NEW"
- "UNDER_INVESTIGATION"
- "TAKEDOWN_REQUESTED"
- "RESOLVED"
- "FALSE_POSITIVE"

These values should match the enums and validation rules used by the deployed backend.

📡 5. Brand Threat Monitoring

The platform includes monitoring-related functionality intended to support scheduled reassessment of brand-related risks.

Monitoring results depend on configured schedules, working backend endpoints, available intelligence sources, and successful execution of scheduled jobs. A configuration screen alone does not establish that production monitoring is running.

📝 6. Abuse Report Preparation

The platform is designed to support preparation of abuse reports using available investigation information.

Reports should be reviewed before submission. Generating or downloading a report does not mean it has been submitted to a provider, registrar, hosting company, or other external party.

🔐 7. Authentication and Access Control

The application uses Supabase Auth as its authentication foundation, with application-side role and workspace access controls.

The intended access model distinguishes personal accounts, brand workspaces, workspace memberships, and authorized actions.

📈 8. Dashboard and Insights

Dashboard experiences are intended to provide visibility into assessment results, threat findings, investigation activity, and brand-related intelligence.

Displayed metrics and charts should reflect actual available application data rather than fabricated threat counts or placeholder security results.

---

👥 Who Is It For?

User| Purpose
Individual users| Assess suspicious links and review available security findings.
Brand owners| Manage brand information and review potential impersonation threats.
Security teams| Review evidence and investigate potential digital risks.
Investigation teams| Track findings and document investigation progress.

---

🔄 How It Works

The general assessment workflow is:

1. Submit: The user submits a supported URL or input.
2. Normalize: The backend normalizes the input for consistent processing.
3. Analyze: Available local heuristics and configured intelligence providers evaluate relevant indicators.
4. Calculate: The backend generates an assessment using the available signals and scoring logic.
5. Evaluate coverage: The system records whether intelligence providers were successfully checked or were unavailable or unconfigured.
6. Present results: The frontend displays the risk score, verdict, confidence, evidence, and limitations.
7. Investigate: Authorized users can review relevant findings and follow the available investigation workflow.

flowchart TD
    A[User submits supported input] --> B[Backend normalization]
    B --> C[Local heuristic analysis]
    B --> D[Configured threat intelligence providers]
    C --> E[Assessment and evidence aggregation]
    D --> E
    E --> F[Risk score, verdict and confidence]
    E --> G[Provider status and coverage]
    F --> H[Main Intelligence Analysis Card]
    G --> H
    H --> I[Review findings and recommended actions]
    I --> J[Investigation workflow when applicable]

The diagram describes the intended workflow. Actual provider execution and available features depend on the deployed configuration.

---

🧠 Main Intelligence Analysis

RiskShield AI should distinguish between several different assessment dimensions.

Dimension| Meaning
Risk score| The score produced by the implemented assessment logic.
Verdict| The backend's classification of the submitted input.
Confidence| The system's confidence in the assessment, based on its implemented methodology.
Evidence| Signals and observations supporting the assessment.
Provider status| Whether an intelligence source returned a usable result, found a match, or failed to respond.
Coverage| How much of the intended intelligence checking was actually completed.

Understanding results

- Threat detected: Available evidence supports a threat finding.
- No known threat detected: No matching threat was identified by the sources that were successfully checked. This does not establish that the input is safe.
- Limited coverage: The assessment could not use all intended intelligence sources.
- Provider unavailable: A configured provider could not return a usable result.
- Provider not configured: Required credentials, access, or configuration are missing.

A provider failure must not be treated as a successful lookup with no threat match. Similarly, missing evidence must not be presented as proof that a threat does not exist.

---

🛠️ Technology Stack

The following describes the project's intended technology architecture. Verify the exact installed versions against the repository's package files.

Frontend

- React — User interface.
- Vite — Frontend development server and build tooling.
- TypeScript — Static typing.
- Tailwind CSS — Utility-first styling.
- Framer Motion — Interface animations.
- Lucide React — Icons.
- React Router — Client-side navigation.
- Zustand — Client-side state management.

Backend

- Next.js App Router — API backend using Route Handlers.
- TypeScript — Backend implementation.
- Zod — Request and data validation.
- Prisma — Database ORM and schema management.

Next.js is used as an API backend in the intended architecture; the frontend remains a separate React and Vite application.

Database and Authentication

- Supabase PostgreSQL — Relational database.
- Supabase Auth — User authentication.
- Prisma — Database access and schema management.
- Row-Level Security (RLS) — Additional database access isolation where configured and correctly enforced.

Deployment

- Vercel — Frontend deployment.
- Render — Intended backend hosting.
- Supabase — Managed database and authentication services.

---

🏗️ System Architecture

flowchart LR
    U[User] --> F[React + Vite Frontend]
    F --> A[Next.js API Route Handlers]
    A --> V[Zod Validation]
    V --> S[Authentication and Authorization]
    S --> P[Prisma ORM]
    P --> DB[(Supabase PostgreSQL)]
    A --> H[Heuristic Analysis]
    A --> TI[Configured Threat Intelligence Providers]
    H --> R[Assessment Response]
    TI --> R
    DB --> R
    R --> F

Architecture principles

- Keep the React and Vite frontend separate from the API backend.
- Validate incoming API requests on the server.
- Enforce authentication and authorization on protected endpoints.
- Enforce workspace and tenant boundaries for brand-related data.
- Keep private credentials and provider API keys on the server.
- Return explicit provider status and assessment coverage information.
- Avoid representing incomplete checks as definitive safety results.

---

📁 Project Structure

The following is a conceptual structure. Use the actual paths in the repository when navigating the codebase.

RiskShield-AI/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── app/
│   │   ├── services/
│   │   ├── ...
│   │   └── ...
│   ├── prisma/
│   ├── tests/
│   └── package.json
│
├── .github/
│   └── workflows/
├── README.md
└── ...

Some directories shown above are illustrative. Confirm their existence and the actual source layout before relying on this tree.

---

🚀 Getting Started

Prerequisites

Install the tools required by the repository:

- Node.js compatible with the project's package and deployment configuration.
- npm, or the package manager specified by the repository.
- Git.
- Access to the configured Supabase project.
- Environment variables required by the frontend and backend.

1. Clone the repository

git clone https://github.com/Manukonda-Teja-Harsha/RiskShield-AI.git
cd RiskShield-AI

2. Install dependencies

If the repository contains separate frontend and backend packages:

cd frontend
npm install

Then install the backend dependencies:

cd ../backend
npm install

If the repository uses npm workspaces or a root-level package manager configuration, follow the root "package.json" and lockfile instead.

3. Configure environment variables

Create local environment files in the locations expected by the application. Use the environment-variable names already referenced by the source code and deployment settings.

Never commit real credentials, tokens, database passwords, or API keys.

4. Start the application

Use the development commands defined in the relevant package files. For a split frontend/backend application, the frontend and backend may need to run in separate terminals.

Example frontend command, if configured:

cd frontend
npm run dev

Example backend command, if configured:

cd backend
npm run dev

The exact backend command depends on the scripts defined in the backend "package.json". Check those scripts before running the examples.

---

⚙️ Environment Configuration

The application may require the following categories of configuration. These are examples, not a guarantee that every variable exists under exactly this name in the repository.

Frontend

VITE_API_BASE_URL=http://localhost:4000

Use the actual backend URL and the variable name referenced by the frontend source code. Vite-exposed variables are public to the browser bundle and must never contain secrets.

Backend

DATABASE_URL=your_database_connection_string
DIRECT_URL=your_direct_database_connection_string

Use these only if they match the Prisma schema and database configuration. Some deployments use a pooled connection for application traffic and a direct connection for migrations.

Configure Supabase Auth using the server-side and public environment variables required by the current implementation. Configure provider credentials and any scheduled-job secrets only when the corresponding integration is enabled.

Security requirements:

- Do not commit ".env" or ".env.local" files containing real secrets.
- Do not put private API keys in "VITE_*" variables.
- Do not expose database connection strings in frontend code.
- Use separate development and production credentials.
- Set required environment variables in the relevant hosting platform.
- Rotate any credential that has accidentally been committed or exposed.

---

📜 Available Scripts

Run commands from the directory containing the relevant "package.json".

Common script names may include:

Command| Purpose
"npm run dev"| Start a development server, if defined.
"npm run build"| Build the application, if defined.
"npm run typecheck"| Run TypeScript checks, if defined.
"npm run test"| Run the configured test suite, if defined.
"npm run start"| Start a production server, if defined.

Check the actual "scripts" section in each "package.json" before using these commands. The available scripts may differ between the frontend and backend.

---

🔐 Security and Privacy

Security is a core consideration for a platform that processes suspicious URLs, brand information, and investigation data.

Authentication and authorization

- Authenticate protected requests on the backend.
- Validate roles and workspace membership before granting access.
- Enforce authorization for every sensitive operation.
- Do not rely on frontend route protection alone.
- Verify that users can access only the records they are authorized to view or modify.

Tenant isolation

- Scope brand assets, findings, investigations, and reports to the correct workspace.
- Enforce database-level isolation where configured.
- Test attempts to access another workspace's records.
- Avoid exposing private brand information through public endpoints or logs.

URL scanning and SSRF protection

URL scanners can be abused to make requests to internal or sensitive network resources. A secure implementation should:

- Allow only supported URL schemes.
- Reject loopback, private, link-local, and restricted IP destinations where appropriate.
- Validate DNS resolution and the destination of outbound requests.
- Recheck destinations after redirects.
- Apply strict connection timeouts and response-size limits.
- Restrict access to cloud metadata endpoints and internal services.
- Avoid returning raw internal network errors to users.

Secrets and provider failures

- Store private credentials in server-side environment variables.
- Apply request limits and timeouts to external providers.
- Handle authentication errors, rate limits, and provider outages explicitly.
- Avoid logging secrets, access tokens, or sensitive user data.
- Never turn a failed provider lookup into a successful no-match result.

These are security objectives and implementation considerations, not a claim that every control has been independently audited.

---

🛰️ Threat Intelligence and Limitations

RiskShield AI's assessment quality depends on the available analysis logic, external data sources, provider permissions, credentials, and successful requests.

External integrations can be unavailable or unconfigured. For example, an integration that requires billing, an API key, or a separate license cannot be assumed to work without that prerequisite.

The platform should report the actual status of each source rather than claiming comprehensive real-time threat coverage.

Important limitations

- No intelligence match does not mean a URL is safe.
- Newly created threats may not appear in existing feeds.
- External providers may be unavailable, rate-limited, or misconfigured.
- Local heuristics can miss threats or flag legitimate content.
- A risk score is not a guarantee of a particular outcome.
- Monitoring depends on actual scheduler execution and successful scans.
- Brand ownership and asset verification require appropriate verification procedures.

Do not enable a data source in production until its access requirements, permitted usage, credentials, and operational behavior have been confirmed.

---

🧪 Testing and Verification

Testing should cover both expected behavior and failure conditions.

Recommended verification areas include:

- User registration, login, and session handling.
- Protected API endpoints and role enforcement.
- Workspace isolation and unauthorized access attempts.
- URL normalization and validation.
- Assessment score, verdict, confidence, and evidence consistency.
- Provider no-match, unavailable, and not-configured states.
- Investigation status transitions and note persistence.
- Abuse report generation and recipient validation.
- Monitoring configuration and actual scheduled execution.
- Frontend build and backend type checking.
- Production environment configuration and API connectivity.

Example commands, if the corresponding scripts exist:

npm run typecheck
npm run test
npm run build

Run e
