// ─── Vehicle Management — Module 21 ──────────────────────────────────────────
export async function vehicleRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const read  = [...auth, fastify.require('inventory:read')];
  const write = [...auth, fastify.require('inventory:write')];

  fastify.get('/vehicles', { preHandler: read }, async (req, reply) => {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        _count: { select: { fuelLogs: true, maintenanceLogs: true } },
      },
      orderBy: { plateNumber: 'asc' },
    });
    return reply.send({ success: true, data: vehicles });
  });

  fastify.get('/vehicles/:id', { preHandler: read }, async (req, reply) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        fuelLogs:        { orderBy: { date: 'desc' }, take: 20 },
        maintenanceLogs: { orderBy: { date: 'desc' }, take: 10 },
        salikLogs:       { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    if (!vehicle) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
    return reply.send({ success: true, data: vehicle });
  });

  fastify.post('/vehicles', { preHandler: write }, async (req, reply) => {
    const v = await prisma.vehicle.create({
      data: {
        ...req.body,
        insuranceExpiry:    req.body.insuranceExpiry    ? new Date(req.body.insuranceExpiry)    : null,
        registrationExpiry: req.body.registrationExpiry ? new Date(req.body.registrationExpiry) : null,
        lastServiceDate:    req.body.lastServiceDate    ? new Date(req.body.lastServiceDate)    : null,
        nextServiceDate:    req.body.nextServiceDate    ? new Date(req.body.nextServiceDate)    : null,
      },
    });
    return reply.status(201).send({ success: true, data: v });
  });

  fastify.patch('/vehicles/:id', { preHandler: write }, async (req, reply) => {
    const dateFields = ['insuranceExpiry', 'registrationExpiry', 'lastServiceDate', 'nextServiceDate'];
    const data = { ...req.body };
    dateFields.forEach(f => { if (data[f]) data[f] = new Date(data[f]); });
    const v = await prisma.vehicle.update({ where: { id: req.params.id }, data });
    return reply.send({ success: true, data: v });
  });

  // Fuel logs
  fastify.post('/vehicles/:id/fuel', { preHandler: write }, async (req, reply) => {
    const log = await prisma.vehicleFuelLog.create({
      data: { ...req.body, vehicleId: req.params.id, date: new Date(req.body.date) },
    });
    return reply.status(201).send({ success: true, data: log });
  });

  // Maintenance logs
  fastify.post('/vehicles/:id/maintenance', { preHandler: write }, async (req, reply) => {
    const log = await prisma.vehicleMaintenanceLog.create({
      data: {
        ...req.body, vehicleId: req.params.id,
        date:        new Date(req.body.date),
        nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : null,
      },
    });
    return reply.status(201).send({ success: true, data: log });
  });

  // Salik logs
  fastify.post('/vehicles/:id/salik', { preHandler: write }, async (req, reply) => {
    const log = await prisma.vehicleSalikLog.create({
      data: { ...req.body, vehicleId: req.params.id, date: new Date(req.body.date) },
    });
    return reply.status(201).send({ success: true, data: log });
  });

  // Vehicle expense report
  fastify.get('/vehicles/:id/expenses', { preHandler: read }, async (req, reply) => {
    const { startDate, endDate } = req.query;
    const where = { vehicleId: req.params.id };
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate)   where.date = { ...(where.date || {}), lte: new Date(endDate) };

    const [fuelTotal, maintenanceTotal, salikTotal] = await Promise.all([
      prisma.vehicleFuelLog.aggregate({ where, _sum: { totalCost: true, litres: true } }),
      prisma.vehicleMaintenanceLog.aggregate({ where, _sum: { cost: true } }),
      prisma.vehicleSalikLog.aggregate({ where, _sum: { amount: true } }),
    ]);

    return reply.send({
      success: true,
      data: {
        fuel:        { total: Number(fuelTotal._sum.totalCost || 0), litres: Number(fuelTotal._sum.litres || 0) },
        maintenance: { total: Number(maintenanceTotal._sum.cost || 0) },
        salik:       { total: Number(salikTotal._sum.amount || 0) },
        grandTotal:  Number(fuelTotal._sum.totalCost || 0) + Number(maintenanceTotal._sum.cost || 0) + Number(salikTotal._sum.amount || 0),
      },
    });
  });
}

// ─── Petty Cash — Module 22 ──────────────────────────────────────────────────
export async function pettyCashRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const read  = [...auth, fastify.require('inventory:read')];
  const write = [...auth, fastify.require('inventory:write')];

  fastify.get('/petty-cash/funds', { preHandler: read }, async (_, reply) => {
    const funds = await prisma.pettyCashFund.findMany({
      where: { isActive: true },
      include: { _count: { select: { requests: true } } },
    });
    return reply.send({ success: true, data: funds });
  });

  fastify.post('/petty-cash/funds', { preHandler: write }, async (req, reply) => {
    const fund = await prisma.pettyCashFund.create({ data: req.body });
    return reply.status(201).send({ success: true, data: fund });
  });

  fastify.get('/petty-cash/requests', { preHandler: read }, async (req, reply) => {
    const { status, fundId, page = 1, limit = 30 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (fundId) where.fundId = fundId;

    // Non-admin users see only their own requests
    if (!['ADMIN', 'MANAGER', 'DIRECTOR', 'ACCOUNTANT'].includes(req.user.role)) {
      where.requestedById = req.user.id;
    }

    const [items, total] = await Promise.all([
      prisma.pettyCashRequest.findMany({
        where,
        include: {
          requestedBy: { select: { name: true } },
          approvedBy:  { select: { name: true } },
          fund:        { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.pettyCashRequest.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total } });
  });

  fastify.post('/petty-cash/requests', { preHandler: auth }, async (req, reply) => {
    const request = await prisma.pettyCashRequest.create({
      data: { ...req.body, requestedById: req.user.id, expenseDate: new Date(req.body.expenseDate) },
    });
    return reply.status(201).send({ success: true, data: request });
  });

  fastify.patch('/petty-cash/requests/:id/approve', { preHandler: write }, async (req, reply) => {
    const request = await prisma.$transaction(async (tx) => {
      const r = await tx.pettyCashRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedById: req.user.id, approvedAt: new Date() },
      });
      // Deduct from fund balance
      await tx.pettyCashFund.update({
        where: { id: r.fundId },
        data: { balance: { decrement: r.amount } },
      });
      return r;
    });
    return reply.send({ success: true, data: request });
  });

  fastify.patch('/petty-cash/requests/:id/reject', { preHandler: write }, async (req, reply) => {
    const request = await prisma.pettyCashRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', approvedById: req.user.id, rejectionReason: req.body.reason },
    });
    return reply.send({ success: true, data: request });
  });

  // Petty cash summary by category
  fastify.get('/petty-cash/summary', { preHandler: read }, async (req, reply) => {
    const { startDate, endDate, fundId } = req.query;
    const where = { status: 'APPROVED' };
    if (fundId) where.fundId = fundId;
    if (startDate) where.expenseDate = { gte: new Date(startDate) };
    if (endDate)   where.expenseDate = { ...(where.expenseDate || {}), lte: new Date(endDate) };

    const summary = await prisma.pettyCashRequest.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });
    return reply.send({ success: true, data: summary });
  });
}

// ─── Subcontractors — Module 16 ──────────────────────────────────────────────
export async function subcontractorRoutes(fastify) {
  const { prisma } = fastify;
  const read  = [fastify.authenticate, fastify.require('inventory:read')];
  const write = [fastify.authenticate, fastify.require('inventory:write')];

  fastify.get('/subcontractors', { preHandler: read }, async (req, reply) => {
    const subs = await prisma.subcontractor.findMany({
      where: { isActive: true },
      include: { _count: { select: { workOrders: true, payments: true } } },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: subs });
  });

  fastify.get('/subcontractors/:id', { preHandler: read }, async (req, reply) => {
    const sub = await prisma.subcontractor.findUnique({
      where: { id: req.params.id },
      include: { workOrders: { orderBy: { createdAt: 'desc' }, take: 10 }, payments: { orderBy: { paidAt: 'desc' } }, documents: true },
    });
    if (!sub) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Subcontractor not found' } });
    return reply.send({ success: true, data: sub });
  });

  fastify.post('/subcontractors', { preHandler: write }, async (req, reply) => {
    const sub = await prisma.subcontractor.create({ data: req.body });
    return reply.status(201).send({ success: true, data: sub });
  });

  fastify.patch('/subcontractors/:id', { preHandler: write }, async (req, reply) => {
    const sub = await prisma.subcontractor.update({ where: { id: req.params.id }, data: req.body });
    return reply.send({ success: true, data: sub });
  });

  fastify.post('/subcontractors/:id/payments', { preHandler: write }, async (req, reply) => {
    const payment = await prisma.subcontractorPayment.create({
      data: { ...req.body, subcontractorId: req.params.id, paidAt: new Date(req.body.paidAt || new Date()) },
    });
    return reply.status(201).send({ success: true, data: payment });
  });
}

// ─── Documents — Module 30 ───────────────────────────────────────────────────
export async function documentRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const read  = [...auth, fastify.require('inventory:read')];

  fastify.get('/documents', { preHandler: read }, async (req, reply) => {
    const { category, projectId, page = 1, limit = 30 } = req.query;
    const where = {};
    if (category)  where.category  = category;
    if (projectId) where.projectId = projectId;

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: { uploadedBy: { select: { name: true } }, project: { select: { name: true, projectCode: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.document.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total } });
  });

  fastify.post('/documents', { preHandler: auth }, async (req, reply) => {
    const doc = await prisma.document.create({
      data: {
        ...req.body,
        uploadedById: req.user.id,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
      },
    });
    return reply.status(201).send({ success: true, data: doc });
  });

  fastify.delete('/documents/:id', { preHandler: auth }, async (req, reply) => {
    await prisma.document.delete({ where: { id: req.params.id } });
    return reply.send({ success: true });
  });
}

// ─── Notifications — Module 31 ───────────────────────────────────────────────
export async function notificationRoutes(fastify) {
  const { prisma } = fastify;
  const auth = [fastify.authenticate];

  fastify.get('/notifications', { preHandler: auth }, async (req, reply) => {
    const { unread, page = 1, limit = 20 } = req.query;
    const where = { userId: req.user.id };
    if (unread === 'true') where.isRead = false;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total } });
  });

  fastify.patch('/notifications/:id/read', { preHandler: auth }, async (req, reply) => {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    return reply.send({ success: true });
  });

  fastify.patch('/notifications/read-all', { preHandler: auth }, async (req, reply) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    return reply.send({ success: true });
  });

  fastify.get('/notifications/unread-count', { preHandler: auth }, async (req, reply) => {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    return reply.send({ success: true, data: { count } });
  });
}

// ─── Warranty / Client Portal — Module 29 ────────────────────────────────────
export async function warrantyRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const write = [...auth, fastify.require('inventory:write')];

  fastify.get('/warranties', { preHandler: auth }, async (req, reply) => {
    const warranties = await prisma.warrantyCertificate.findMany({ orderBy: { issueDate: 'desc' } });
    return reply.send({ success: true, data: warranties });
  });

  fastify.post('/warranties', { preHandler: write }, async (req, reply) => {
    const count = await prisma.warrantyCertificate.count();
    const certNumber = `WC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const warranty = await prisma.warrantyCertificate.create({
      data: {
        ...req.body, certNumber,
        issueDate:  new Date(req.body.issueDate),
        expiryDate: new Date(req.body.expiryDate),
      },
    });
    return reply.status(201).send({ success: true, data: warranty });
  });

  // Client portal — GET /portal/me — client sees their own projects, invoices, quotations
  fastify.get('/portal/summary', { preHandler: auth }, async (req, reply) => {
    if (req.user.role !== 'CLIENT_PORTAL') {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Client portal access only' } });
    }
    // In production: link client record to user account
    return reply.send({ success: true, data: { message: 'Client portal coming — link clientId to this user in onboarding' } });
  });
}
