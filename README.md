# JANITOU FOOD

[![Release](https://img.shields.io/badge/Release-v1.0.0--phase1-059669.svg?style=flat-square)](https://github.com/janitoufood/janitou-food-management/releases/tag/v1.0.0-phase1)
[![Automated Tests](https://img.shields.io/badge/Tests-23%20Passed%20(100%25)-10b981.svg?style=flat-square)](https://github.com/janitoufood/janitou-food-management)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2022-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/PostgreSQL-16%20Prisma-336791.svg?style=flat-square)](https://www.postgresql.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20%7C%20Bun-fbf0df.svg?style=flat-square)](https://bun.sh/)
[![Documentation](https://img.shields.io/badge/Documentation-ADR--001%20to%20ADR--008-8b5cf6.svg?style=flat-square)](./docs/TECHNICAL_DECISIONS.md)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/janitoufood/janitou-food-management)

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
Once started, access the platform interfaces at:
- **Web Dashboard:** [http://localhost:4000/dashboard](http://localhost:4000/dashboard) (or [http://localhost:4000/](http://localhost:4000/))
- **Interactive API Documentation (Swagger UI):** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **OpenAPI 3.0 Specification:** [http://localhost:4000/api/v1/openapi.json](http://localhost:4000/api/v1/openapi.json)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **API Discovery:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

### 4. Full-Stack Production Deployment (Docker Compose)
```bash
docker compose up -d
```

### 5. Simple Mobile Mode (Arabic RTL PWA)

Two lightweight surfaces sit next to the ERP dashboard and use the same API:

| Surface | URL | Purpose |
| :--- | :--- | :--- |
| Manager app | `/app` | daily menu (lunch/dinner + photos), dish catalog, today's orders, client approvals, pricing/packaging/extras/timing |
| Customer app | `/client` | public access with no account or code, full dish catalogue with photos, à-la-carte ordering, guest order request pending admin approval, order tracking and guest history by phone, WhatsApp/SMS confirmation when providers are configured |

Both apps have an **AR/FR switch** (persisted in `janitou_lang`); French dates/amounts and LTR layout switch automatically.

The UI follows the Janitou logo palette — espresso `#241a10`, deep gold `#8c6420`, bright gold `#c99a2e`, cream `#faf6ee` — and the logo is used in the headers, login screens and generated PWA icons (`/app/icon-192.png`, `/app/icon-512.png`).

Outbound confirmations use a durable outbox: set `WHATSAPP_CLOUD_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (optionally `WHATSAPP_TEMPLATE_NAME`) or the `TWILIO_*` variables. `MESSAGING_CHANNEL` selects the preferred channel; without credentials the messages stay queued and are visible to admins at `GET /api/v1/simple/messages`.

Staff administration is enforced server-side: roles come from the authenticated session (never from `x-user-role`), admins can create/disable users, change roles, reset passwords, inspect and revoke active staff/client sessions, and read the audit trail. Staff accounts, sessions and audit logs are stored in dedicated PostgreSQL tables and mirrored from the bootstrap snapshot; `JANITOU_MFA_REQUIRED_ADMINS=1` enforces TOTP for administrators. TOTP MFA (Google Authenticator/Authy) is optional per user, with one-time recovery codes. Audit records keep before/after snapshots and are pruned after 2 years.

Demo accounts (seeded on first boot):

```text
Customer phone: 0555 44 33 22
PIN:            1234

The customer app is public: no registration, no login and no PIN. At checkout the customer enters name, phone and delivery address. A new phone creates a `PENDING` customer and a `DRAFT` order request; an admin approves the client account, which confirms the pending order(s), issues the invoice and releases them to production. Approved repeat customers order directly. Managers can still create client accounts from the admin app (`+ عميل`).
```

Customer accounts created from `/client` start as `PENDING` and can only order after approval in the manager app (`العملاء`).

Manager app accounts (seeded, password hashed with scrypt):

| Email | Password | Role |
| :--- | :--- | :--- |
| `admin@janitou.dz` | `Admin@2026` | ADMIN |
| `ops@janitou.dz` | `Ops@2026` | OPERATIONS_MANAGER |
| `chef@janitou.dz` | `Chef@2026` | CHEF_KITCHEN |

Manager routes require a staff session; only ADMIN/OPERATIONS_MANAGER can access settings, client administration and weekly generation. The chef account is limited to menu, dishes, orders and uploads.

Simple-mode endpoints:

```text
GET   /api/v1/simple/home?date=            daily stats, menu and orders
GET   /api/v1/simple/dishes                dish catalog
POST  /api/v1/simple/dishes                create a dish (photo URL)
GET   /api/v1/simple/menu?scope=…          current/archived menu days
POST  /api/v1/simple/menu                  create lunch + dinner
PATCH /api/v1/simple/menu/:date/dish       replace one dish
PATCH /api/v1/simple/menu/:date/archive    archive/restore a day
GET/PUT /api/v1/simple/settings            prices, extras, hours, order cutoff
GET   /api/v1/simple/clients               customer accounts
PATCH /api/v1/simple/clients/:id/status    approve/suspend/freeze/cancel
POST  /api/v1/simple/weekly/generate       generate program orders (one date or 7 days)
POST  /api/v1/simple/uploads               JPEG/PNG/WebP upload (5 MB)

GET   /api/v1/client/catalogue              all active dishes with prices
GET   /api/v1/client/menu?from=&to=         daily menu with prices
POST  /api/v1/client/guest-orders           public order request (name, phone, address, items; pending approval)
GET   /api/v1/client/guest-orders           guest history/tracking by phone (+ orderNumber)
GET   /api/v1/client/config                 packaging, delivery, extras
DELETE /api/v1/client/orders/:id            cancel before the cutoff (B2B session)

PATCH /api/v1/simple/clients/:id           edit client profile and distribution
POST  /api/v1/simple/clients/:id/credit    credit the prepaid balance
POST  /api/v1/simple/clients/:id/review    clear the 10-day inactivity review
GET   /api/v1/simple/notifications         staff notifications
PATCH /api/v1/simple/notifications/read    mark staff notifications as read

POST  /api/v1/auth/login                   staff login (email + password)
POST  /api/v1/auth/logout                  staff logout
GET   /api/v1/auth/me                      current staff session
GET   /api/v1/simple/menu/rules            weekly menu rule alerts
PATCH /api/v1/simple/menu/:date/deadline   per-date deadline extension/removal
GET/POST /api/v1/simple/users              list/create staff users (ADMIN)
PATCH /api/v1/simple/users/:id             role, activation, password reset (ADMIN)
POST  /api/v1/simple/users/:id/logout      revoke all sessions of a user (ADMIN)
GET   /api/v1/simple/sessions              active staff/client sessions (ADMIN)
DELETE /api/v1/simple/sessions/:kind/:hash revoke one session (ADMIN)
GET   /api/v1/simple/audit                 audit trail with before/after snapshots (ADMIN)
GET   /api/v1/simple/messages              outbound WhatsApp/SMS delivery status (ADMIN)
GET   /api/v1/auth/mfa                     MFA status for the current user
POST  /api/v1/auth/mfa/setup|enable|disable TOTP enrollment and recovery codes
```

Provisional choices to confirm with the client before production:

- **Customer authentication:** 4-digit PIN; sessions are persisted as hashed tokens and survive restarts — the project documents do not yet define the customer authentication mechanism.
- **Staff authentication:** password + role implemented; MFA, trusted devices, active-session management and the 2-year audit retention policy are not implemented yet.
- **Legacy dashboard:** now requires a staff session, but its fine-grained role checks still read the spoofable `x-user-role` header; the UI locks the role selector to ADMIN until that matrix is migrated.
- **Order cutoff:** configurable in the manager app; default closes orders at 18:00 one day before delivery, with per-date extension (BR-011) and closed dates (BR-012).
- **Extras:** each extra has a per-meal ratio and optional dish families; the suggestion combines lunch, dinner and alternatives, and the customer can only reduce it (BR-016→018). Per-customer extra overrides (BR-019) and limited-quantity alternatives/preorders (BR-034→036) are not implemented yet.
- **Menu rules:** fries/minced meat same day, pasta once per week, Saturday preparation, same main ingredient — returned as alerts; the manager decides (BR-020→027).
- **Zero-quantity orders:** archived as cancelled and excluded from production/distribution (BR-013).
- **Alternatives:** any active dish except the day's lunch/dinner, priced by its reference price.
- **Weekly recurring program:** saving the program (or the manager button) generates orders for the next 7 days; there is no background scheduler yet.
- **Order changes:** the customer can edit or cancel until the cutoff; a cancelled program day is never regenerated automatically.
- **Billing:** each client order creates an invoice (`INV-…`) and a receipt (`REC-…`) when the prepaid balance covers it; edits adjust the wallet and refunds are issued on cancellation. Unpaid orders stay `ISSUED` for the administration.
- **Distribution:** each client is bound to one method (standard/express/pickup) with an optional driver/tour label (BR-002).
- **Inactivity review:** after 10 days without an order, the account must be reviewed by the administration before ordering again (BR-003).
- **Notifications:** in-app notification feed for customers (order created/updated/cancelled, credit, review) and staff (new client, new order). WhatsApp/SMS delivery is not wired yet.
- **Offline:** a failed order submission is stored locally and retried when the network returns (DOC-25→27, draft mode).
- **Persistence:** PostgreSQL 16 + Prisma is the runtime store when `DATABASE_URL` is set; the domain state is persisted atomically as a JSONB snapshot while the relational aggregate migration continues (ADR-009).
- **Store distribution:** the documents target Google Play/App Store; the current customer surface is a PWA.

### 6. PostgreSQL, Backups & Production Deployment

Development with PostgreSQL:

```bash
docker compose up -d postgres
bun install
bun run --cwd packages/database db:generate
bun run --cwd packages/database db:migrate
DATABASE_URL='postgresql://janitou_user:janitou_dev_password@localhost:5432/janitou_food_db?schema=public' \
JANITOU_STORAGE=postgres \
bun apps/api/src/server.ts
```

Without `DATABASE_URL` (or with `JANITOU_STORAGE=file`) the historical JSON backend is used for local, database-less runs. With PostgreSQL the domain state is stored atomically in `app_state` (JSONB); the relational models in `schema.prisma` are migrated incrementally.

- Staff and customer sessions are persisted (hashed tokens) and survive restarts.
- Legacy `/api/v1/*` ERP routes now require a staff bearer session; the dashboard redirects to `/app` for login.
- Backups are written to `data/backups/` on boot and every `BACKUP_INTERVAL_HOURS` (default 24 h), keeping `BACKUP_RETENTION` files (default 14). `BACKUP_ENABLED=0` disables the scheduler.
- `GET /api/v1/openapi.json` and `/api/docs` remain public; protected calls need a bearer token.

Production stack (HTTPS, PostgreSQL, nginx, certbot):

```bash
cp .env.production.example .env.production   # set domain and secrets
docker compose --env-file .env.production -f deploy/docker-compose.prod.yml config

# initial certificate (port 80 must be free)
docker run --rm -p 80:80 \
  -v janitou-food-management_letsencrypt:/etc/letsencrypt \
  -v janitou-food-management_certbot_webroot:/var/www/certbot \
  certbot/certbot certonly --standalone -d your.domain \
  --email admin@your.domain --agree-tos --non-interactive

docker compose --env-file .env.production -f deploy/docker-compose.prod.yml up -d --build
```

The container entrypoint applies `prisma migrate deploy` before starting the API. CI (`.github/workflows/ci.yml`) runs the tests against PostgreSQL 16, then verifies auth, dashboard protection, persistence across a restart, and session survival over HTTP.

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

# Run full automated test suite (23 passed, 0 failed)
npm test
```

This README provides an initial project overview. Detailed functional requirements, technical specifications, and approved project decisions must be maintained in their designated project documents.
