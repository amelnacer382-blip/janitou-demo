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
