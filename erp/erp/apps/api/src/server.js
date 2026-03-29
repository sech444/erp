import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { authPlugin } from './plugins/auth.js';
import { rbacPlugin } from './plugins/rbac.js';

// ── Core routes
import authRoutes      from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

// ── CRM & Sales (Modules 4, 5)
import salesRoutes from './modules/sales/sales.routes.js';

// ── Inventory, Purchase (Modules 13, 14, 15)
import inventoryRoutes from './modules/inventory/inventory.routes.js';

// ── HR, Payroll (Modules 17–20)
import hrRoutes from './modules/hr/hr.routes.js';

// ── Projects, BOQ, Work Orders, Site Reports (Modules 6–12)
import projectRoutes from './modules/projects/projects.routes.js';

// ── Accounting, VAT, Retention, Payments, Bank (Modules 23–27)
import accountingRoutes from './modules/accounting/accounting.routes.js';

// ── Vehicles, Petty Cash, Subcontractors, Documents, Notifications, Warranty (Modules 16, 21, 22, 29–31)
import {
  vehicleRoutes,
  pettyCashRoutes,
  subcontractorRoutes,
  documentRoutes,
  notificationRoutes,
  warrantyRoutes,
} from './modules/misc.routes.js';

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// ── Security ──────────────────────────────────────────────────────────────────
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

// ── API Docs ──────────────────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    info: {
      title: 'ERP API — Construction / Waterproofing / Technical Services',
      version: '1.0.0',
      description: 'Full ERP system: CRM, Sales, Inventory, Projects, BOQ, HR, Payroll, Accounting, VAT, Vehicles, Petty Cash, Subcontractors, Documents, Notifications — UAE compliant',
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ bearerAuth: [] }],
  },
});
await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } });

// ── Plugins ───────────────────────────────────────────────────────────────────
await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(authPlugin);
await app.register(rbacPlugin);

// ── Routes ────────────────────────────────────────────────────────────────────
const p = config.API_PREFIX; // /api/v1

// Auth & Users
await app.register(authRoutes,         { prefix: `${p}/auth` });
await app.register(dashboardRoutes,    { prefix: `${p}/dashboard` });

// CRM, Sales, Quotations (Modules 4, 5)
await app.register(salesRoutes,        { prefix: `${p}/sales` });

// Inventory, Suppliers, Purchase Orders (Modules 13–15)
await app.register(inventoryRoutes,    { prefix: `${p}/inventory` });

// HR, Attendance, Payroll, Performance (Modules 17–20)
await app.register(hrRoutes,           { prefix: `${p}/hr` });

// Projects, BOQ, Work Orders, Site Reports, Drawing Analysis (Modules 6–12)
await app.register(projectRoutes,      { prefix: `${p}` });

// Accounting, Invoices, VAT, Retention, Payments, Bank (Modules 23–27)
await app.register(accountingRoutes,   { prefix: `${p}/accounting` });

// Vehicles (Module 21)
await app.register(vehicleRoutes,      { prefix: `${p}` });

// Petty Cash (Module 22)
await app.register(pettyCashRoutes,    { prefix: `${p}` });

// Subcontractors (Module 16)
await app.register(subcontractorRoutes, { prefix: `${p}` });

// Document Management (Module 30)
await app.register(documentRoutes,    { prefix: `${p}` });

// Notifications (Module 31)
await app.register(notificationRoutes, { prefix: `${p}` });

// Warranty / Client Portal (Modules 29)
await app.register(warrantyRoutes,    { prefix: `${p}` });

// ── PDF Generation & Email Dispatch (B, D)
import pdfRoutes from './modules/pdf/pdf.routes.js';
await app.register(pdfRoutes, { prefix: `${p}/pdf` });

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  modules: 34,
}));

// ── Error Handler ─────────────────────────────────────────────────────────────
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    success: false,
    error: {
      code:    error.code    || 'INTERNAL_ERROR',
      message: statusCode < 500 ? error.message : 'Internal server error',
    },
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`\n🚀  ERP API  →  http://localhost:${config.PORT}`);
  console.log(`📖  Swagger  →  http://localhost:${config.PORT}/docs`);
  console.log(`🏥  Health   →  http://localhost:${config.PORT}/health`);
  console.log(`\n📋  All 34 modules registered:\n`);
  console.log(`   Module 2  ─ Auth & 12 User Roles (RBAC)`);
  console.log(`   Module 3  ─ Dashboard`);
  console.log(`   Module 4  ─ CRM (Leads, Pipeline, Activities)`);
  console.log(`   Module 5  ─ Sales & Quotation (BOQ items, VAT, Payment Terms, Retention)`);
  console.log(`   Module 6  ─ BOQ Management (Excel/PDF upload ready)`);
  console.log(`   Module 7  ─ AI BOQ Cost Estimation (hook ready)`);
  console.log(`   Module 8  ─ Drawing Analysis AI (hook ready)`);
  console.log(`   Module 9  ─ Project Management`);
  console.log(`   Module 10 ─ Budget Planning (budget vs actual)`);
  console.log(`   Module 11 ─ Work Orders (internal + subcontractor)`);
  console.log(`   Module 12 ─ Site Progress Reporting`);
  console.log(`   Module 13 ─ Inventory (SKU, stock in/out/transfer, alerts)`);
  console.log(`   Module 14 ─ Purchase Management (PR → LPO)`);
  console.log(`   Module 15 ─ Supplier Management`);
  console.log(`   Module 16 ─ Subcontractor Management`);
  console.log(`   Module 17 ─ HR (Employee DB, UAE docs)`);
  console.log(`   Module 18 ─ Attendance (manual, mobile, GPS)`);
  console.log(`   Module 19 ─ Payroll (basic, OT, allowances, payslips)`);
  console.log(`   Module 20 ─ Employee Cost Tracking (visa, medical, insurance)`);
  console.log(`   Module 21 ─ Vehicle Management (fuel, maintenance, Salik)`);
  console.log(`   Module 22 ─ Petty Cash Management`);
  console.log(`   Module 23 ─ Accounting (CoA, GL, Journal Entries, AR/AP)`);
  console.log(`   Module 24 ─ VAT System (UAE 5%, FTA return)`);
  console.log(`   Module 25 ─ Retention Management`);
  console.log(`   Module 26 ─ Payment Management`);
  console.log(`   Module 27 ─ Bank Integration & Reconciliation`);
  console.log(`   Module 28 ─ Financial Reports (P&L, AR aging, Project Profit)`);
  console.log(`   Module 29 ─ Client Portal & Warranty Certificates`);
  console.log(`   Module 30 ─ Document Management`);
  console.log(`   Module 31 ─ Notifications System`);
  console.log(`   Module 32 ─ Security & Audit Trail`);
  console.log(`   Module 33 ─ Mobile Application (Flutter — attendance, photos, progress)\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
