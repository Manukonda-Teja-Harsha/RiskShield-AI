# RiskShield AI — Authentication & Workspace Access Flow

## 1. Dual Account Architecture
RiskShield AI supports two distinct workspaces from a unified authentication gateway (`/login`):
1. **Personal Protection Account (`/dashboard`)**:
   - Individual users register with full name, email, and password.
   - Requires email verification before workspace activation.
   - Provides access to Personal Overview, Context-Aware Adaptive Scanner, Insights, Threat Watch, and Activity.
2. **Brand Protection Workspace (`/brand-dashboard`)**:
   - Brand owners/analysts authenticate and onboard official brand identity metadata and DNS TXT verification tokens.
   - Multi-brand users can select or switch their active brand workspace.

## 2. Security & Redirection Rules
- **Pending Scan Preservation**: If an unauthenticated visitor submits a link on the public homepage (`/`), the indicator is preserved across `/login` and automatically hydrated into the scanner upon authentication.
- **Role & Tenant Isolation**: `ProtectedRoute` on the client and `verifyRequestSession` + PostgreSQL RLS on the backend ensure personal users cannot access `/brand-dashboard` or private brand findings, and brand workspaces cannot view other brands' private investigations.
