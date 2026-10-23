# JANITOU FOOD

[![Release](https://img.shields.io/badge/Release-v1.0.0--phase1-059669.svg?style=flat-square)](https://github.com/janitoufood/janitou-food-management/releases/tag/v1.0.0-phase1)
[![Automated Tests](https://img.shields.io/badge/Tests-17%20Passed%20(100%25)-10b981.svg?style=flat-square)](https://github.com/janitoufood/janitou-food-management)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2022-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/PostgreSQL-16%20Prisma-336791.svg?style=flat-square)](https://www.postgresql.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20%7C%20Bun-fbf0df.svg?style=flat-square)](https://bun.sh/)
[![Documentation](https://img.shields.io/badge/Documentation-ADR--001%20to%20ADR--006-8b5cf6.svg?style=flat-square)](./docs/TECHNICAL_DECISIONS.md)

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

## Key Platform Modules

1. **Executive Financial Dashboard:**
   - Real-time Revenue, Raw Food Cost, Gross Margin, and Food Cost % KPIs.
   - Dish-level profitability breakdown and contribution margins.
2. **Recipe Engineering Studio & Pricing Simulator:**
   - Technical dish creation with raw ingredient breakdown.
   - Unit food cost calculation and dynamic recommended selling price simulator based on target food cost % ratios.
3. **7-Day Weekly Menu Planning & Subscription Engine:**
   - Schedule Lunch and Dinner menus across a rolling 7-day calendar.
   - Automated conversion of recurring corporate & personal customer subscriptions into daily production orders.
4. **Kitchen Display System (KDS) Tablet Mode:**
   - Real-time touch screen for kitchen brigade stations (`CHAUD`, `FROID`, `PATISSERIE`, `CONDITIONNEMENT`).
   - Four-stage batch progression (`À Préparer` → `En Cuisson` → `En Barquette` → `Prêt au Départ`).
5. **Thermal Packaging Label Generator:**
   - Generates standard 76x51mm thermal labels for Kraft meal boxes with batch barcodes, allergen warnings, and heating instructions.
6. **Logistics & Driver Mobile Navigation:**
   - Driver manifest with one-click **Google Maps GPS Navigation** and **click-to-call** client buttons.

## Platform Architecture

```text
janitou-food-management/
├── apps/
│   ├── api/                   # REST API, domain store, production calculation engine & test suite
│   └── web/                   # Interactive dashboard, KDS screen, recipe studio & printable sheets
├── packages/
│   ├── common/                # Shared TypeScript types, enums, interfaces, and domain contracts
│   └── database/              # Prisma schema & PostgreSQL 16 relational models
├── docker-compose.yml         # Containerized PostgreSQL 16 environment
└── docs/
    └── TECHNICAL_DECISIONS.md # ADR log (ADR-001, ADR-002, ADR-003, ADR-004)
```

## Verification & Test Suite

```bash
# Build all workspaces cleanly
npm run build

# Strict TypeScript typecheck & lint
npm run lint

# Run full automated test suite (17 passed, 0 failed)
npm test
```

This README provides an initial project overview. Detailed functional requirements, technical specifications, and approved project decisions must be maintained in their designated project documents.
