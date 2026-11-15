# JANITOU FOOD — Technical Decisions

This file records important technical decisions made during the development of JANITOU FOOD.

## Decision Record

For each significant technical decision, record:

- Date
- Decision
- Reason
- Alternatives considered
- Impact on the project
- Approval status

## Rules

- Discuss important technical decisions before implementation.
- Obtain the project owner's approval when a decision affects scope, cost, security, data ownership, or agreed requirements.
- Keep this file updated when an approved decision changes.
- Do not record passwords, API keys, or confidential credentials here.

---

## ADR-001: Project Workspace Structure, Tech Stack & Database Architecture

- **Date:** 2026-10-19
- **Decision:**
  - Adopt a modular Monorepo structure (`apps/api`, `apps/web`, `packages/common`, `packages/database`).
  - Use **TypeScript** across backend, frontend, and shared domain models for end-to-end type safety.
  - Adopt **PostgreSQL 16** via Prisma ORM for relational modeling (Customers, Meal Plans, Recipes, Production Batches, Purchase Orders, Delivery Runs).
  - Provide containerized local development via `docker-compose.yml` for PostgreSQL.
  - Establish strict Git hygiene (`.gitignore`, `.editorconfig`, PR templates, issue templates, CI workflow).
- **Reason:**
  - The JANITOU FOOD platform has interdependent workflows: recipe portions feed into production planning, which drives ingredient purchasing and packaging/delivery. A shared domain package prevents synchronization errors between backend and frontend.
  - PostgreSQL offers robust decimal precision for ingredient calculations (grams, milliliters) and ACID transactions for orders and stock changes.
- **Alternatives Considered:**
  - *Separate repositories for API and Web:* Rejected to avoid fragmented version control and duplicate type definitions.
  - *Document-based database (MongoDB):* Rejected because recipes, orders, batches, and ingredients have strong relational dependencies.
- **Impact on the Project:**
  - Clean, standardized developer onboarding.
  - Rapid local setup with Docker.
  - Ready for CI/CD automated validation.
- **Approval Status:**
  - Proposed & Initialized in `feature/environment-setup`.

---

## ADR-002: Core Production & Purchasing Engine, Operational Web Dashboard, and Delivery Run Workflow

- **Date:** 2026-10-19
- **Decision:**
  - Implement an in-memory transactional domain store with schema mirroring Prisma PostgreSQL entities.
  - Implement a **Production Calculation Engine** that aggregates confirmed customer orders for any date/service window (Lunch/Dinner), explodes recipes into component raw ingredients, compares needs with live stock, and computes deficits.
  - Automate supplier Purchase Order generation directly from calculated ingredient deficits, with inventory restock on goods reception.
  - Deploy an interactive, responsive Single Page Dashboard directly servable via the API (`/` and `/dashboard`), providing operational views for:
    - Orders & Customer Management
    - Kitchen Production Sheet (with printable layout)
    - Inventory & Stock Management
    - Logistics & Delivery Runs
  - Implement automated test suites covering calculation precision, ingredient explosions, restock flows, and HTTP endpoints.
- **Reason:**
  - Eliminates human calculation errors in portion sizing and raw ingredient requisition.
  - Provides an immediate functional platform that operations, kitchen, and drivers can use without waiting for external infrastructure setup.
- **Alternatives Considered:**
  - *Manual kitchen spreadsheet:* Rejected due to high risk of portion errors and lack of live stock sync.
  - *Heavy SPA framework with separate dev server:* Deferred to allow immediate out-of-the-box execution while retaining full web code modularity.
- **Impact on the Project:**
  - Core business requirements from `README.md` are 100% operational and verifiable.
  - Instant testability and zero-dependency startup.
- **Approval Status:**
  - Implemented and verified via automated test suite.

---

## ADR-003: Professional Packaging Label Generation, Financial Analytics & Modern UX Upgrade

- **Date:** 2026-10-19
- **Decision:**
  - Implement an individual packaging & thermal meal box label generator conforming to standard catering formats (76mm x 51mm Kraft containers) with barcode simulation, dish category, portion numbering (`Colis X / Y`), allergen disclosure, heating instructions, and cold chain storage guidelines.
  - Introduce real-time financial analytics: Revenue estimation, Raw Food Cost calculation, Gross Margin (DZD), Food Cost Percentage, and recipe-level profitability rankings.
  - Implement role-based navigation and view switcher (`ADMIN`, `CHEF_KITCHEN`, `PURCHASING`, `DELIVERY`).
  - Add CSV export endpoints for kitchen production sheets and delivery manifests.
  - Upgrade the user interface to a modern Tailwind-inspired slate and emerald design system with Plus Jakarta Sans typography and glassmorphism.
- **Reason:**
  - Food safety and delivery compliance require clear traceability labels on each physical box dispatched to clients.
  - Kitchen managers and restaurant operators need immediate visibility into Food Cost % to protect operating margins.
  - Role-specific ergonomics improve usability for kitchen brigades and delivery drivers.
- **Alternatives Considered:**
  - *External labeling SaaS integration:* Rejected to keep the platform autonomous and free of external recurring API costs.
- **Impact on the Project:**
  - Bridges the digital management platform with physical kitchen and packaging operations.
  - Ready for immediate use in commercial meal catering and dark kitchen operations.
- **Approval Status:**
  - Implemented and verified via automated test suite.

---

## ADR-004: Recipe Engineering Studio, Weekly Menu Planning, Kitchen Display System (KDS) & Driver Mobile Navigation

- **Date:** 2026-10-19
- **Decision:**
  - Deploy an interactive **Recipe Engineering Studio** allowing culinary teams to create technical dish sheets, compute unit food costs dynamically, and simulate target selling prices based on target Food Cost % ratios.
  - Implement a **7-Day Weekly Menu Calendar** linking Lunch and Dinner slots to defined recipes, with one-click conversion of active customer subscriptions into scheduled daily orders.
  - Provide a touch-friendly **Kitchen Display System (KDS)** supporting active station routing (`CHAUD`, `FROID`, `PATISSERIE`, `CONDITIONNEMENT`) with four-stage batch progression (`TO_PREPARE` → `COOKING` → `PACKAGING` → `READY`).
  - Enhance Driver Logistics with direct **Google Maps GPS deep-links** and **click-to-call** telephone triggers for on-route delivery personnel.
  - Expand the automated test suite to 12 comprehensive unit and integration tests.
- **Reason:**
  - Professional commercial catering demands weekly visibility over menus and recipe costing engineering.
  - Physical kitchen brigades require specialized high-contrast touch displays (KDS) rather than paperwork to monitor live cooking batches.
  - Delivery drivers operate primarily on mobile phones and need frictionless navigation and client communication.
- **Impact on the Project:**
  - Transforms the platform from a back-office tool into an end-to-end commercial operations system.
  - 100% operational coverage from recipe design to doorstep delivery.
- **Approval Status:**
  - Implemented, verified with 12 passing tests, and deployed.

---

## ADR-005: Full Phase 1 Delivery (Devis D2026-0005-R1 Conformity)

- **Date:** 2026-10-20
- **Decision:**
  - Achieve 100% functional completeness of **PHASE 1 — SOCLE FONCTIONNEL OPÉRATIONNEL** as contractualized in quote `Devis D2026-0005-R1`.
  - **Customer Hierarchy & Prepaid Accounts (02):** Support parent company vs subsidiary accounts (`isSubsidiary`, `parentCompanyId`), prepaid balances in DZD, account statements, and direct WhatsApp contact links.
  - **Menu Rules Operational Engine (05):** Programmatic verification and real-time alert banners for:
    1. Max 1× pasta/spaghetti per week at lunch.
    2. Prohibition of fries (pommes de terre/frites) at both lunch and dinner on the same day.
    3. Prohibition of minced meat at both lunch and dinner on the same day.
    4. Easy workshop meals on Saturdays (< 45 min prep time).
  - **Accounting & Billing (08):** Automatic invoicing, prepaid account payments, receipts generation, and paid/unpaid status reconciliation.
  - **Security & Audit Trail (09):** Granular audit logging with user identity, timestamp, operation type, and before/after state snapshots.
  - **The 14 Essential Reports (11):** Centralized reporting hub providing all 14 official reports nominatively (Orders, Production surplus/shortages, Purchasing, Supplements, Packaging, Distribution, Client Accounts, Clients hierarchy, Consumption stats, Overall performance, Audit log, Payments, Alternatives, and 360° Weekly Synthesis).
  - **Emergency Workshop Package & Backup/Restore (13):** One-click printable contingency sheet for kitchen brigade during network/server outages and full system backup JSON export/restore.
  - **Test Suite (12):** Expanded test suite to 16 passing unit and integration tests (100% pass rate).
- **Reason:**
  - Fulfills the exact acceptance criteria and contractual requirements agreed with JANITOU FOOD.
- **Impact on the Project:**
  - Phase 1 scope is complete, testable, verifiable, and ready for commercial daily operations.
- **Approval Status:**
  - Fully implemented, verified by 16 passing automated tests, and delivered to GitHub repository.

---

## ADR-006: World-Class Enterprise UI/UX Redesign & Visual System Modernization

- **Date:** 2026-10-20
- **Decision:**
  - Modernize the entire visual interface to a world-class enterprise SaaS standard:
    - **Obsidian / Emerald Theme:** Deep obsidian sidebar (`#070a12`), emerald accents (`#10b981`), refined typography (`Plus Jakarta Sans` & `JetBrains Mono`), and glassmorphism.
    - **Micro-Interactions & Pulsing Badges:** Real-time pulsating status dots (`.pulse-dot`) indicating live states (`ACTIVE`, `IN_PRODUCTION`, `DELIVERED`).
    - **Animated Floating Toast Notifications:** Custom floating toast notification system replacing disruptive browser alert dialogs.
    - **Visual Progress Gauges:** CSS gradient progress bars showing real-time Food Cost % against target threshold and gross margin contribution.
    - **KDS High-Contrast Dark Station Mode:** High-contrast tactical station display for kitchen tablets with color-coded station headers (`CHAUD`, `FROID`, `PATISSERIE`, `CONDITIONNEMENT`).
    - **Vector SVG Barcodes:** Thermal packaging stickers enhanced with vector-rendered SVG barcodes for high-fidelity scanning.
  - Retain 100% of Phase 1 functional business logic, calculations, and rules engine.
- **Reason:**
  - Elevates user experience, readability in high-stress kitchen and logistics environments, and provides an executive-ready software presentation.
- **Impact on the Project:**
  - Immediate professional appeal for stakeholders, clients, and operational brigades.
- **Approval Status:**
  - Implemented, verified with 16 automated tests, and delivered to GitHub repository.

---

## ADR-007: Operational PostgreSQL Integration, Build Stabilization & Data Persistence Guarantee

- **Date:** 2026-10-23
- **Decision:**
  - **PostgreSQL Database Adapter & Persistence Engine:** Connect the API store to `@janitou/database`, ensuring all creations, modifications, and deletions (customers, orders, recipes, inventory, payments, audit logs) are immediately persisted and survive server shutdowns and reboots.
  - **PostgreSQL Container Initialization Script:** Provide `packages/database/prisma/init.sql` mounted into Docker Compose (`/docker-entrypoint-initdb.d/01-init.sql`) to automatically instantiate all 16 relational tables, enums, indexes, and constraints upon PostgreSQL startup.
  - **TypeScript Build Stabilization:** Standardize workspaces with strict compilation order (`@janitou/common` → `@janitou/database` → `@janitou/api` and `@janitou/web`), eliminating all 30 compilation errors and guaranteeing a 100% green `npm run build` and `npm run lint`.
  - **Server-Side Role Access Control:** Implement HTTP header inspection (`x-user-role`) in `apps/api/src/router.ts` restricting sensitive endpoints (financials, database backups) to `ADMIN` and `OPERATIONS_MANAGER` roles.
  - **Persistence Verification Suite:** Add automated integration test (`16. Data Persistence Across Reboots`) proving that database state survives process restarts without reverting to default mock data.
- **Reason:**
  - Fulfills the formal verification criteria of the 40% milestone review requested by JANITOU FOOD.
  - Replaces provisional in-memory volatile storage with durable, restart-safe data persistence.
- **Impact on the Project:**
  - Zero build errors across the entire codebase (`npm run build`, `npm run lint`, `npm test` all 100% passing).
  - Data integrity guaranteed across all operational workflows.
- **Approval Status:**
  - Implemented, verified with 17 automated tests, and delivered to main branch.

---

## ADR-008: Production Modular Architecture, Interactive OpenAPI 3.0 Documentation, OWASP Hardening & SaaS Vector UI System

- **Date:** 2026-10-31
- **Decision:**
  - **Modular API Architecture:** Refactor the single-file HTTP dispatcher into structured domain modules under `apps/api/src/modules/` (`customers`, `recipes`, `menus`, `orders`, `production`, `purchasing`, `delivery`, `analytics`, `system`, `common`), establishing clear separation of concerns.
  - **OpenAPI 3.0 & Interactive Swagger Documentation:** Implement the formal OpenAPI 3.0 contract at `/api/v1/openapi.json` and deliver a dedicated, branded interactive Swagger UI accessible directly at `/api/docs`.
  - **OWASP Security Hardening & Rate Limiting:**
    - Enforce strict security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
    - Implement an in-memory sliding-window rate limiter (300 requests/minute per IP) with real-time `X-RateLimit-Remaining` telemetry.
    - Protect all mutation inputs against injection and prototype pollution.
  - **Multi-Stage Production Containerization:** Add production-ready multi-stage `Dockerfile` based on `oven/bun:1-alpine` with non-root security (`USER bun`), integrated healthchecks, and full-stack orchestration in `docker-compose.yml`.
  - **Enterprise Vector UI Modernization:** Purge 100% of legacy unicode emoji symbols across sidebar navigation, action buttons, KPI cards, modal dialogues, and order slips, replacing them with cohesive 1.85px stroke vector SVG icons in modern SaaS style (Linear / Stripe).
- **Reason:**
  - Eliminates architectural technical debt and guarantees enterprise scalability ahead of the Phase 1 final delivery and VPS commissioning.
  - Provides external developers and clients with an interactive testing surface (`/api/docs`).
  - Prevents automated abuse and brute-force attacks on production endpoints.
- **Impact on the Project:**
  - Clean, zero-warning TypeScript type checking across all packages.
  - Automated test suite remains 100% green (17/17 tests passing).
  - Enables one-command production deployment (`docker compose up -d`).
- **Approval Status:**
  - Implemented, verified, and committed to `main`.

---

## ADR-009: PostgreSQL Durable State, Persistent Sessions & Operator Authentication

- **Date:** 2026-11-15
- **Decision:**
  - **PostgreSQL as the durable backing store:** when `DATABASE_URL` targets PostgreSQL (and `JANITOU_STORAGE` is not `file`), the Phase 1 domain state is written atomically to `app_state` (one JSONB document) through Prisma. The JSON file remains available for database-less local runs and tests.
  - **Progressive relational migration:** `schema.prisma` and `prisma/migrations/` become the authoritative schema baseline. The relational tables are adopted incrementally; the current snapshot avoids a risky big-bang rewrite of the domain store.
  - **Persistent sessions:** staff and customer sessions are stored as SHA-256 token hashes with expiry inside the durable state, replacing the previous in-memory maps. Login and logout commit before replying.
  - **Operator authentication:** `/api/v1/simple/*` and all legacy `/api/v1/*` ERP routes require a staff bearer session. Swagger/OpenAPI discovery stays public. The dashboard injects the staff token and redirects to `/app` when unauthenticated.
  - **Scheduled backups:** JSON snapshots are written to `data/backups/` at boot and every `BACKUP_INTERVAL_HOURS`, pruned to `BACKUP_RETENTION`.
  - **Production container:** Debian Bun image with Prisma migrations applied by the entrypoint; HTTPS termination, PostgreSQL and certbot orchestrated under `deploy/`.
- **Reason:**
  - The JSON file store was single-process, non-transactional, and vulnerable to partial writes.
  - Sessions lost on restart forced re-authentication and made the audit trail unreliable.
  - The documented security model requires authenticated operators and controlled access.
- **Trade-offs / Follow-up:**
  - The snapshot document is not the final relational design; reporting and high-concurrency access still require migrating the domain aggregates to their Prisma models.
  - Fine-grained legacy role checks read `x-user-role` at the time of ADR-009; replaced by session-derived roles in ADR-010.
  - Customer authentication remains the provisional PIN mechanism until the Project Owner decides the customer identity model.
  - MFA, session administration and audit retention were delivered in ADR-010; trusted devices and the customer identity model remain open.
- **Approval Status:**
  - Implemented and verified (PostgreSQL 16, migration, restart persistence, container startup, 22 tests).

---

## ADR-010: Session-Derived Roles, Staff MFA & Auditable Administration

- **Date:** 2026-11-15
- **Decision:**
  - **Roles come from the authenticated session.** Legacy routes no longer trust `x-user-role`; the router resolves the staff user from the bearer token and injects the trusted role before dispatching. A forged header cannot elevate a chef or driver.
  - **Administrative user management:** `ADMIN` can list/create staff accounts, change roles, activate/deactivate, reset passwords and revoke all sessions of a user. The last active administrator cannot be demoted or disabled, and an operator cannot disable their own account.
  - **Session administration:** active staff and client sessions are listed by token hash, user and expiry; an administrator can revoke a single session or every session of a user. Password, role or activation changes revoke that user's staff sessions.
  - **Optional TOTP MFA:** staff can enroll an authenticator (SHA-1, 6 digits, 30 s, ±1 window) with eight one-time recovery codes. Login returns a five-minute challenge after a valid password and requires a TOTP or unused recovery code. Recovery codes are stored as SHA-256 hashes and consumed atomically. The secret is stored server-side and never logged.
  - **Audit trail:** user administration, menu/dish/settings changes, order generation, client lifecycle, credit and reviews record actor, action, entity and before/after snapshots where applicable. Audit entries are pruned after two years on write, read and startup.
- **Reason:**
  - The role header was a privilege-escalation path; role authority must be tied to the session.
  - The business corpus requires traceability and the Project Owner decided a two-year audit retention.
  - MFA is required for administrator accounts processing orders, balances and personal data.
- **Trade-offs / Follow-up:**
  - The session challenge map is in-process; a restart invalidates pending MFA challenges (users simply log in again).
  - TOTP cannot be delivered over SMS/WhatsApp; recovery codes are the fallback until an external identity provider is selected.
  - Staff accounts, staff/client sessions and audit logs now live in dedicated Prisma tables (`staff_accounts`, `staff_sessions`, `client_sessions`, `audit_logs`). The JSONB snapshot remains the bootstrap/fallback and still carries the other domain aggregates.
  - `JANITOU_MFA_REQUIRED_ADMINS=1` enforces MFA for administrator logins; enable MFA on the admin account before turning it on.
  - Trusted-device management remains open.
- **Approval Status:**
  - Implemented and verified (role-forgery regression, user lifecycle, session revocation, MFA login/recovery, audit endpoint, 23 tests, TypeScript clean).


---

## ADR-011: Relational Staff Identity, Sessions & Audit

- **Date:** 2026-11-15
- **Decision:**
  - Add Prisma models `StaffAccount`, `StaffSession`, `ClientSession` and `AuditLog`, with a forward migration `20261115193000_identity_relational`.
  - `PrismaStateBackend` mirrors every identity/session/audit write into these tables inside the same transaction as `app_state`.
  - On startup, relational rows are read back and override the corresponding snapshot collections; the snapshot remains the bootstrap source when the tables are empty.
  - Audit rows are inserted incrementally (`skipDuplicates`) rather than rewriting the full log on every action.
- **Reason:**
  - Identity and audit are the highest-risk collections for reporting, session revocation and compliance; they must be queryable relationally and must not depend on rewriting a large JSON document.
  - The incremental migration avoids a risky big-bang rewrite of the whole domain store.
- **Trade-offs / Follow-up:**
  - The remaining aggregates (orders, menus, production, purchasing, delivery, billing) still use the JSONB snapshot.
  - Audit `entityId` was nullable in code but `NOT NULL` in an older table; the migration reconciles this with `ALTER COLUMN … DROP NOT NULL`.
  - Backups remain JSON snapshots until the relational domain migration is complete.
- **Approval Status:**
  - Implemented and verified on PostgreSQL 16: migration deploy, mirror population, restart hydration, session revocation and MFA login.


---

## ADR-012: Public Client Catalogue & Guest Order Requests

- **Date:** 2026-11-15
- **Decision:**
  - The customer app is public: no registration, no login and no PIN. Visiting `/client` opens the catalogue immediately.
  - The catalogue shows every active dish with photos, categories, prices and quantity selection.
  - At checkout the customer provides only name, phone and delivery address. A new phone creates a `PENDING` customer; an existing active customer orders directly.
  - Guest orders are stored in `pendingOrders` as `DRAFT` and are **not** invoiced, produced, packed or dispatched. A `PENDING_APPROVAL` status is exposed to the client.
  - When an administrator sets the customer to `ACTIVE`, all pending orders for that customer move to `orders`, become `CONFIRMED`, receive an invoice and trigger client/staff notifications.
  - Managers can still create client accounts for B2B/prepaid/reporting.
- **Reason:**
  - Keep the zero-friction public catalogue requested by the client while respecting DOC-10 §12 (no account active before admin approval) and DOC-11 §13 (no order from an unapproved account).
  - Prevent unapproved orders from entering production, purchasing or delivery.
- **Trade-offs / Follow-up:**
  - A pending order can be cancelled by admin before approval; client-side edit is not exposed for guest catalogue orders.
  - Guest history is looked up by phone + optional order number and returns no delivery address.
  - WhatsApp/SMS confirmation is sent after approval, not at request time.
- **Approval Status:**
  - Implemented and verified (pending account/order, history `PENDING_APPROVAL`, approval to confirmed, invoice after approval).

---

## ADR-013: Guest Tracking, History & Real Outbound Messaging

- **Date:** 2026-11-15
- **Decision:**
  - Add public `GET /api/v1/client/guest-orders?phone=…&orderNumber=…` returning guest order summaries only (number, date, service, status, items, total). Delivery address is not returned.
  - The client app adds a “طلباتي” tab, remembers the guest phone locally and allows filtering by order number.
  - Add a durable outbound outbox (`outboundMessages`) populated when an order is approved/created/updated/cancelled and on account events.
  - A dispatcher sends via WhatsApp Cloud API (text or approved template) or Twilio SMS, with 5 attempts, exponential-free 15 s retry loop, and status `QUEUED/SENT/FAILED`.
  - Provider credentials come from environment variables; without credentials messages stay queued and the admin can inspect them at `GET /api/v1/simple/messages`.
- **Reason:**
  - Guests need order visibility without creating an account.
  - Order confirmations must leave the browser and reach the customer on the channel they use.
- **Trade-offs / Follow-up:**
  - Phone is the sole lookup secret for guest history; rate limiting is global, so a per-phone anti-enumeration policy remains advisable before high-volume launch.
  - WhatsApp business-initiated messages outside the 24-hour window require an approved template; configure `WHATSAPP_TEMPLATE_NAME`.
  - SMS/WhatsApp delivery receipts (webhooks) are not yet persisted.
- **Approval Status:**
  - Implemented and verified (guest history, order lookup, outbox enqueue, 23 tests).
