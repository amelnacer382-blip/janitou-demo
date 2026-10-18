# JANITOU FOOD

## Project Overview

JANITOU FOOD is a meal management platform designed to organize customer orders, meal planning, production, packaging, and distribution.

## Project Goals

- Centralize customer and order management.
- Organize lunch and dinner schedules.
- Support recipes, meal components, and alternatives.
- Plan production and monitor actual quantities.
- Manage suppliers and purchasing requirements.
- Organize packaging and delivery distribution.
- Improve operational control and reduce manual work.

## Project Ownership

This repository is the official development repository for JANITOU FOOD.

All project development should be carried out in this repository, under the repository owner's control.

## Development

The application source code and technical documentation will be added progressively as the project develops.

## Important Note

## Platform Quickstart

### 1. Installation
```bash
bun install
# or
npm install
```

### 2. Run Automated Tests
```bash
bun test
```

### 3. Launch Platform & Dashboard
```bash
bun apps/api/src/server.ts
```
Once started, access the interactive management dashboard at:
- **Web Dashboard:** [http://localhost:4000/dashboard](http://localhost:4000/dashboard) (or [http://localhost:4000/](http://localhost:4000/))
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **API Discovery:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

## Platform Architecture

```text
janitou-food-management/
├── apps/
│   ├── api/                   # REST API router, domain services, production engine & tests
│   └── web/                   # Operational dashboard (Orders, Kitchen, Inventory, Logistics)
├── packages/
│   ├── common/                # Shared TypeScript contracts, roles, enums, interfaces
│   └── database/              # Prisma schema & PostgreSQL configuration
├── docker-compose.yml         # Containerized PostgreSQL 16 environment
└── docs/
    └── TECHNICAL_DECISIONS.md # ADR log (ADR-001, ADR-002)
```


This README provides an initial project overview. Detailed functional requirements, technical specifications, and approved project decisions must be maintained in their designated project documents.
