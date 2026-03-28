# TechServ ERP
### Construction · Waterproofing · Technical Services — UAE

Full ERP system covering all 34 modules from the requirements spec. Built with Fastify, Next.js 14, PostgreSQL, Redis, and Flutter.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Fastify 4 + Prisma ORM |
| Database | PostgreSQL 16 + Redis 7 |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Mobile | Flutter (GPS attendance, site photos, progress) |
| Auth | JWT (15min access + 7d refresh rotation) + 12-role RBAC |
| PDF | PDFKit — quotations, invoices, payslips |
| Email | Nodemailer + SendGrid — quotations, LPOs, payslips |
| Storage | Local → AWS S3 / DigitalOcean Spaces |
| Deploy | Docker Compose (dev) → AWS / DigitalOcean (prod) |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### 1. Environment setup
```bash
cp .env.example .env
cp .env.example apps/api/.env

# If port 5432 is already in use (existing local Postgres),
# the .env.example already uses port 5433 for the Docker container.
```

### 2. Start infrastructure
```bash
docker-compose up -d postgres redis
# Wait ~10 seconds for postgres to become healthy
docker-compose ps   # confirm STATUS = healthy
```

### 3. Install & migrate
```bash
npm install                         # install all workspaces
npm run db:migrate                  # type "initial_setup" when prompted
npm run db:seed                     # loads sample data
```

### 4. Start API
```bash
npm run dev:api
```
- API: http://localhost:3001
- Swagger UI: http://localhost:3001/docs
- Health: http://localhost:3001/health

### 5. Start web frontend
```bash
cd apps/web && npm run dev
# or from root:
npm run dev:web
```
- Web: http://localhost:3000

### 6. Login credentials

| Role    | Email                 | Password      |
|---------|-----------------------|---------------|
| Admin   | admin@erp.local       | Admin@1234    |
| Sales   | sales@erp.local       | Password@1234 |
| Store   | store@erp.local       | Password@1234 |
| HR      | hr@erp.local          | Password@1234 |
| Manager | manager@erp.local     | Password@1234 |

---

## Common Issues & Fixes

### `DATABASE_URL` not found
Prisma looks for `.env` next to `schema.prisma`. Always run:
```bash
cp .env.example apps/api/.env
```

### Port 5432 already in use
Your machine has a local Postgres running. The docker-compose binds to `5433` instead. Both `.env` files must use port `5433`:
```
DATABASE_URL=postgresql://erp:erp_secret@localhost:5433/erp_db
```

### Authentication failed against database
The Docker volume has stale data from a previous run with different credentials. Wipe and restart:
```bash
docker-compose down -v
docker-compose up -d postgres redis
# wait for healthy, then:
npm run db:migrate
npm run db:seed
```

### `@/lib/api` module not found
Missing `jsconfig.json`. Create it in `apps/web/`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### `column "is_active" does not exist`
Raw SQL was using snake_case on Prisma camelCase columns. Fixed in v2 — replace `dashboard.routes.js` and `inventory.routes.js` from the latest zip.

---

## All 34 Modules

| # | Module | Backend | Frontend | Notes |
|---|--------|---------|----------|-------|
| 1 | System Architecture | ✅ | ✅ | Web + Mobile + Cloud |
| 2 | User Roles (12 roles) | ✅ | ✅ | Full RBAC permission matrix |
| 3 | Dashboard | ✅ | ✅ | KPIs, charts, alerts |
| 4 | CRM | ✅ | ✅ | Leads, pipeline, activities |
| 5 | Sales & Quotation | ✅ | ✅ | BOQ items, VAT, retention, PDF |
| 6 | BOQ Management | ✅ | ✅ | Excel/PDF upload hook |
| 7 | AI BOQ Estimation | ✅ hook | ✅ | OpenAI integration point |
| 8 | Drawing Analysis AI | ✅ hook | ✅ | Upload → AI area extraction |
| 9 | Project Management | ✅ | ✅ | Progress, budget vs actual |
| 10 | Budget Planning | ✅ | ✅ | Estimated vs actual cost |
| 11 | Work Orders | ✅ | ✅ | Internal + subcontractor |
| 12 | Site Progress Reporting | ✅ | ✅ | Daily updates, photos |
| 13 | Store & Inventory | ✅ | ✅ | SKU, stock in/out/transfer |
| 14 | Purchase Management | ✅ | ✅ | PR → LPO → delivery |
| 15 | Supplier Management | ✅ | ✅ | Database + payment history |
| 16 | Subcontractor Management | ✅ | ✅ | Work orders + payments |
| 17 | HR Management | ✅ | ✅ | UAE docs, passport, visa, EID |
| 18 | Attendance System | ✅ | ✅ | Manual + mobile GPS |
| 19 | Payroll System | ✅ | ✅ | WPS-ready, payslip PDF |
| 20 | Employee Cost Tracking | ✅ | ✅ | Visa, medical, insurance |
| 21 | Vehicle Management | ✅ | ✅ | Fuel, maintenance, Salik |
| 22 | Petty Cash | ✅ | ✅ | Approval workflow |
| 23 | Accounting | ✅ | ✅ | CoA, GL, Journal, AR/AP |
| 24 | VAT System (UAE 5%) | ✅ | ✅ | FTA return calculation |
| 25 | Retention Management | ✅ | ✅ | Track + release |
| 26 | Payment Management | ✅ | ✅ | Cash, transfer, cheque |
| 27 | Bank Integration | ✅ | ✅ | Import + reconciliation |
| 28 | Financial Reports | ✅ | ✅ | P&L, AR aging, project profit |
| 29 | Client Portal | ✅ | ✅ | Quotations, invoices, warranty |
| 30 | Document Management | ✅ | ✅ | Contracts, drawings, photos |
| 31 | Notifications | ✅ | ✅ | Alerts + in-app feed |
| 32 | Security & Audit | ✅ | ✅ | Activity log, audit trail |
| 33 | Mobile App | ✅ Flutter | ✅ | GPS attendance, site photos |
| 34 | Tech Stack | ✅ | ✅ | Node/Next/Flutter/PG/Redis |

---

## Project Structure

```
erp/
├── apps/
│   ├── api/                         # Fastify backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 40+ models, all 34 modules
│   │   │   └── seed.js              # Sample users, materials, employees
│   │   └── src/
│   │       ├── config/index.js
│   │       ├── plugins/             # Prisma, Redis, JWT, RBAC
│   │       ├── lib/                 # Generators, PDF, Email
│   │       └── modules/
│   │           ├── auth/
│   │           ├── dashboard/
│   │           ├── sales/           # CRM + quotations
│   │           ├── inventory/       # Materials, stock, suppliers
│   │           ├── hr/              # Employees, payroll, attendance
│   │           ├── projects/        # Projects, BOQ, work orders
│   │           ├── accounting/      # Invoices, VAT, bank, reports
│   │           └── misc.routes.js   # Vehicles, petty cash, docs, notifications
│   ├── web/                         # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/                 # All pages (App Router)
│   │       └── components/          # AppShell, shared UI
│   └── mobile/                      # Flutter app
│       └── lib/
│           ├── main.dart
│           ├── screens/             # Attendance, site reports, dashboard
│           └── services/            # API client, GPS, camera
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## API Reference

Full interactive Swagger UI at **http://localhost:3001/docs**

Quick test:
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@erp.local","password":"Admin@1234"}' | jq -r '.data.accessToken')

# Dashboard
curl -s http://localhost:3001/api/v1/dashboard -H "Authorization: Bearer $TOKEN" | jq .

# Materials
curl -s http://localhost:3001/api/v1/inventory/materials -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Low stock alerts
curl -s http://localhost:3001/api/v1/inventory/alerts -H "Authorization: Bearer $TOKEN" | jq '.data[].title'
```

---

## Development Scripts

```bash
# From erp/ root
npm run dev:api          # Start API (port 3001)
npm run dev:web          # Start web frontend (port 3000) — from apps/web/
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio (visual DB browser)

# Docker
docker-compose up -d               # Start all services
docker-compose up -d postgres redis # Start DB only
docker-compose down -v             # Wipe volumes (fresh start)
docker-compose ps                  # Check health
docker-compose logs postgres       # Debug DB issues
```

---

## Production Deployment

1. Set secure secrets in `.env`:
   ```
   JWT_SECRET=<256-bit random hex>
   JWT_REFRESH_SECRET=<different 256-bit random hex>
   NODE_ENV=production
   ```
2. Set `DATABASE_URL` to your managed Postgres (e.g. RDS, DigitalOcean Managed DB)
3. Set `STORAGE_PROVIDER=s3` and fill in S3/Spaces credentials
4. Set `SMTP_PASS` to your SendGrid API key
5. Build and deploy API behind nginx/Caddy
6. Deploy web with `next build && next start`

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```