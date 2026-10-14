# RiskShield AI — AI-Powered Digital Risk Protection

**Detect potential threats. Understand risk. Protect your digital identity and brand.**

Live Demo: https://riskshield-ai-protect.vercel.app

GitHub Repository: https://github.com/Manukonda-Teja-Harsha/RiskShield-AI

## 1. Overview

RiskShield AI is a digital risk protection platform designed to help individuals assess suspicious URLs and help organizations identify, organize, and investigate potential brand-related threats.

Unlike a basic URL checker that primarily returns a verdict, RiskShield AI aims to provide a more transparent assessment by presenting available evidence, risk scores, confidence levels, threat intelligence coverage, and recommended next steps.

The platform combines personal security workflows with brand-focused threat monitoring and investigation capabilities in one application.

## 2. Problem Statement

Online users and organizations face several digital security challenges:

- Phishing websites designed to imitate legitimate services.
- Suspicious URLs that may lead to fraudulent pages.
- Brand impersonation and lookalike domains.
- Difficulty understanding why a URL has been flagged.
- Limited visibility into the evidence and intelligence sources behind a result.
- Challenges managing potential threats after their initial detection.

A risk assessment is also difficult to interpret when external intelligence sources are unavailable or return incomplete information.

## 3. Our Solution

RiskShield AI provides a unified interface for URL risk assessment and brand-focused threat management.

The platform is designed to:

- Analyze submitted URLs using available detection signals.
- Present risk scores alongside supporting evidence.
- Communicate confidence and intelligence coverage limitations.
- Provide a personal dashboard for reviewing security activity.
- Support brand workspaces and potential threat management.
- Connect threat findings to investigation workflows.
- Use a modular architecture that supports future threat intelligence integrations.

## 4. Key Features

### URL Risk Assessment

Users can submit a URL for analysis and review the assessment returned by the backend.

The analysis experience is designed to present:

- Risk score.
- Assessment or verdict.
- Confidence level.
- Available evidence and detection signals.
- Threat intelligence provider status.
- Coverage limitations.
- Recommended actions.

A missing threat match is not treated as proof that a website is safe.

### Main Intelligence Analysis

The Main Intelligence Analysis card brings important assessment information together in one place.

It is designed to help users understand the result rather than relying on a score alone. The information displayed depends on the actual backend response and the availability of supporting intelligence sources.

### Personal Security Dashboard

The personal dashboard provides a central place for users to access security-related functionality and review their activity.

### Brand Workspace

The brand-focused experience is designed for organizations that need to organize and investigate potential threats associated with their brands.

Depending on the implemented and configured functionality, brand workflows include:

- Brand workspace management.
- Brand-related assets.
- Threat findings.
- Investigation tracking.
- Activity and status updates.
- Intelligence and reporting views.

### Threat Monitoring

RiskShield AI includes a monitoring-oriented architecture for checking configured brand-related targets and managing resulting findings.

Automated monitoring depends on a functioning scheduler, correct environment configuration, available backend services, and configured intelligence integrations.

### Threat Investigation

The investigation workflow is designed to help users review potential threats, track their status, and organize investigation notes and related activity where supported.

### Authentication and Access Control

The application uses Supabase Auth for identity management and a PostgreSQL-backed data layer for application records.

Protected operations should enforce server-side authentication, role-based authorization, and workspace-level data isolation.

## 5. What Makes RiskShield AI Stand Out?

RiskShield AI focuses on connecting risk assessment with evidence, organizational workflows, and investigation.

### 1. Transparent Risk Analysis

Rather than relying on a verdict alone, the platform aims to show the available evidence, confidence, and coverage limitations associated with a result.

This helps users distinguish between a confirmed threat, an assessment with no matching result in the sources checked, and a result limited by unavailable intelligence sources.

### 2. Personal Security and Brand Protection

RiskShield AI brings individual URL assessment and brand-oriented security workflows into one platform.

This supports two related use cases:

- **Personal security:** Assess suspicious links and understand the available findings.
- **Brand protection:** Organize brand-related findings and manage potential threats through investigation workflows.

### 3. Detection Connected to Investigation

Identifying a potential threat is only the beginning. RiskShield AI aims to connect findings with investigation status, notes, and follow-up activity so users can manage the next steps.

### 4. Coverage-Aware Intelligence

External threat intelligence sources can be unavailable, unconfigured, or incomplete. RiskShield AI is designed to communicate those limitations rather than silently interpret missing data as evidence of safety.

### 5. Workspace-Oriented Brand Management

The brand workspace architecture is designed to support organizational data separation, role-aware access, and brand-related operations.

### 6. Modular Architecture

The separation between frontend components, API routes, analysis services, provider adapters, and database access makes the platform easier to maintain and extend.

### Comparison with Similar Tools

| Capability | Basic URL checker | RiskShield AI's design goal |
|---|---|---|
| URL risk assessment | Primary functionality | Risk assessment with supporting context |
| Evidence and confidence | Varies by tool | Explicitly presented where available |
| Intelligence coverage | Varies by tool | Coverage limitations made visible |
| Personal security workflows | Varies by tool | Personal security dashboard |
| Brand-focused workflows | Often separate or unavailable | Brand workspaces and threat management |
| Investigation lifecycle | Varies by tool | Findings connected to investigation workflows |
| Extensible integrations | Varies by tool | Modular provider architecture |

This comparison describes the project's intended focus, not a claim that competing platforms lack these capabilities.

## 6. Project Structure

The following is a logical overview of the application. Directory names should be checked against the actual repository before submission.

```text
RiskShield-AI/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Dashboard and application pages
│   │   ├── routes/           # Frontend routing
│   │   ├── services/         # API communication
│   │   ├── store/            # Shared application state
│   │   ├── hooks/            # Reusable React hooks
│   │   ├── types/            # TypeScript types
│   │   └── assets/           # Static assets
│   └── package.json
│
├── backend/
│   ├── app/
│   │   └── api/              # Next.js API Route Handlers
│   ├── lib/                  # Shared backend utilities
│   ├── services/             # Scanning and analysis logic
│   ├── providers/            # Threat intelligence adapters
│   ├── prisma/               # Schema and database migrations
│   └── package.json
│
├── .github/
│   └── workflows/            # Automated workflows
│
├── README.md
└── .gitignore
```

The actual repository may use different directory names or additional folders.

## 7. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Routing | React Router |
| State management | Zustand |
| Backend API | Next.js App Router and Route Handlers |
| Backend validation | TypeScript and Zod |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| Automation | GitHub Actions, where configured |
| Deployment | Vercel for the live frontend; backend deployment depends on the configured environment |

## 8. Architecture

RiskShield AI separates the user interface, API layer, analysis logic, external integrations, and persistent data.

```text
User
  |
  v
React + Vite Frontend
  |
  v
Next.js API Route Handlers
  |
  +-------------------------+
  |                         |
  v                         v
Authentication          Analysis Services
  |                         |
  v                         v
Supabase Auth          Provider Adapters
                            |
                            v
                    Configured Intelligence
                    Sources, if available

  API and application services
              |
              v
     Prisma / PostgreSQL
              |
              v
  Persistent application records
```

### Architecture Responsibilities

1. **Frontend:** Handles the user interface, navigation, dashboards, and API requests.
2. **API layer:** Validates requests and coordinates authentication, authorization, scanning, and brand operations.
3. **Analysis services:** Evaluate available detection signals and produce the assessment returned to the frontend.
4. **Provider adapters:** Integrate with supported external intelligence sources and communicate their operational status.
5. **Database:** Stores application data, subject to the configured schema and access controls.
6. **Automation:** Runs scheduled tasks only when the workflow, backend, credentials, and monitoring configuration are operational.

## 9. Threat Assessment Principles

RiskShield AI is designed around several important principles.

- **A missing match does not prove safety.**
- **Unavailable providers must not be reported as successfully checked.**
- **Confidence should reflect the available evidence and coverage.**
- **Risk score, confidence, verdict, and provider status are separate concepts.**
- **Findings should be traceable to the evidence actually available.**
- **Recommendations should not overstate what the system has established.**

For example, if every external intelligence provider is unavailable, the application should disclose that limitation rather than claim that no known threat exists across those sources.

## 10. Data and Security Considerations

The application uses Supabase Auth and a PostgreSQL-backed data layer.

Security controls should include:

- Server-side validation of submitted input.
- Authentication checks for protected endpoints.
- Role-based authorization for sensitive operations.
- Workspace-level data isolation.
- Appropriate PostgreSQL Row Level Security policies where applicable.
- Secure handling of environment variables and provider credentials.
- Safe error handling without exposing secrets.
- Rate limiting and abuse protection for public endpoints.
- Appropriate verification before treating a brand asset as trusted.

Email verification alone does not establish ownership of a brand.

## 11. Testing and Verification

Testing should cover both expected behavior and failure conditions.

| Area | What to verify |
|---|---|
| URL validation | Invalid input and unsupported URL formats |
| Risk assessment | Correct handling of backend assessment results |
| Intelligence coverage | Unavailable, unconfigured, and successfully checked providers |
| Confidence and verdict | No unsupported safe or malicious conclusions |
| Authentication | Registration, login, and protected routes |
| Authorization | Role and workspace access restrictions |
| Brand workflows | Findings, investigations, and status changes |
| API integration | Error handling and frontend/backend communication |
| Production readiness | Environment configuration, builds, logs, and scheduled jobs |

Only report tests as passing when they have actually been run and verified in the relevant environment.

## 12. Live Demo

**Application:** https://riskshield-ai-protect.vercel.app

### Evaluator Instructions

1. Open the live application.
2. Register or sign in using the authentication flow available on the site.
3. Navigate to the URL scanning section.
4. Submit a URL you are authorized to test.
5. Review the returned risk score, verdict, evidence, confidence, and coverage information.
6. Explore the personal dashboard and brand workspace if those features are available to your account.
7. Review any threat or investigation workflows exposed by the application.

No dedicated evaluator account is specified in this README. Do not assume that private credentials or preconfigured brand workspaces are available.

A successful page load does not, by itself, verify that every backend integration or scheduled monitoring task is operational.

## 13. Local Development Setup

The commands below are a general setup template. Confirm the actual package locations, scripts, and environment variable names in the repository before running them.

### Prerequisites

- Node.js and npm.
- Git.
- A configured Supabase project.
- PostgreSQL connection details.
- Environment variables required by the frontend and backend.

### Clone the Repository

```bash
git clone https://github.com/Manukonda-Teja-Harsha/RiskShield-AI.git
cd RiskShield-AI
```

### Install Dependencies

Install dependencies in the frontend and backend directories that contain their respective `package.json` files.

```bash
cd frontend
npm install
```

Then install the backend dependencies:

```bash
cd ../backend
npm install
```

If your repository uses a monorepo or different directory names, follow its actual package configuration.

### Configure Environment Variables

Create the required local environment files based on the variable names used in the source code and deployment configuration.

Configure the appropriate values for:

- Supabase project URL.
- Supabase public authentication key.
- Server-side Supabase credentials, where required.
- PostgreSQL database connection.
- Prisma configuration.
- Any enabled threat intelligence provider credentials.
- Backend API URL used by the frontend.

Never commit real credentials, access tokens, service-role keys, or database passwords to GitHub.

### Run the Application

Use the development scripts defined in the actual frontend and backend `package.json` files. Start each service using its configured command and confirm that the frontend points to the correct backend URL.

## 14. Deployment

The live frontend is available at:

https://riskshield-ai-protect.vercel.app

Deployment of the backend and supporting services depends on the configured hosting environment.

Before deploying or evaluating the application, verify:

- Frontend API URLs point to the intended backend.
- Production environment variables are configured.
- Database connectivity and migrations are correct.
- Authentication redirect URLs and allowed origins are configured.
- Protected API routes enforce authorization.
- Provider credentials and service permissions are valid.
- Scheduled monitoring workflows can reach the backend.
- Logs expose useful diagnostic information without revealing secrets.

A deployed frontend does not automatically mean that every backend integration or scheduled workflow is working.

## 15. Current Limitations

RiskShield AI's results depend on the detection logic and intelligence sources available to the application.

- External intelligence coverage may be limited.
- Some providers may require credentials, permissions, or additional configuration.
- An assessment may be inconclusive when sources are unavailable.
- Scheduled monitoring depends on successful deployment and configuration.
- Detection results should not be treated as a guarantee that a URL is safe or malicious.

The application should clearly distinguish an unavailable provider from a provider that was checked successfully and returned no match.

## 16. Future Improvements

Potential improvements include:

- Additional authorized threat intelligence integrations.
- Better historical risk tracking and comparison.
- More detailed evidence and investigation timelines.
- Improved alerting and notification workflows.
- Expanded monitoring coverage for brand impersonation.
- Stronger reporting and export capabilities.
- Enhanced observability, rate limiting, and operational monitoring.
- More automated tests for security boundaries and provider failures.

## 17. Responsible Use

RiskShield AI is intended to support security assessment and investigation.

- Only submit URLs and assets you are authorized to analyze.
- Treat results as security signals rather than absolute guarantees.
- Review the supporting evidence before taking action.
- Do not interpret missing data as confirmation of safety.
- Protect brand information, credentials, and investigation records.

## 18. License

Review the repository for its applicable license before redistributing or reusing this project. If no license has been added, the repository should not be assumed to grant general permission to reuse its code.

---

**RiskShield AI — Making digital risk assessment more transparent, actionable, and coverage-aware.**
