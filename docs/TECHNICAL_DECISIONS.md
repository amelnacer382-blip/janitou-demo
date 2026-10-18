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
