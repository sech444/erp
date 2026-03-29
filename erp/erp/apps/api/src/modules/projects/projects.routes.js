export default async function projectRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const read  = [...auth, fastify.require('inventory:read')]; // reuse broad read
  const write = [...auth, fastify.require('inventory:write')];

  // ─── Projects ────────────────────────────────────────────────────────────

  fastify.get('/projects', { preHandler: read }, async (req, reply) => {
    const { status, clientId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)   where.status = status;
    if (clientId) where.clientId = clientId;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { name: true } },
          _count: { select: { siteReports: true, workOrders: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.project.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/projects/:id', { preHandler: read }, async (req, reply) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        quotation: { select: { quotationNumber: true, totalAmount: true } },
        boqs: { include: { _count: { select: { items: true } } } },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        siteReports: { orderBy: { reportDate: 'desc' }, take: 5 },
        invoices: { orderBy: { createdAt: 'desc' } },
        retentions: true,
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!project) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return reply.send({ success: true, data: project });
  });

  fastify.post('/projects', { preHandler: write }, async (req, reply) => {
    const count = await prisma.project.count();
    const projectCode = `PROJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const { startDate, completionDate, ...rest } = req.body;

    const project = await prisma.project.create({
      data: {
        ...rest, projectCode,
        startDate:      startDate      ? new Date(startDate)      : null,
        completionDate: completionDate ? new Date(completionDate) : null,
      },
      include: { client: { select: { name: true } } },
    });
    return reply.status(201).send({ success: true, data: project });
  });

  fastify.patch('/projects/:id', { preHandler: write }, async (req, reply) => {
    const dateFields = ['startDate', 'completionDate', 'actualEndDate'];
    const data = { ...req.body };
    dateFields.forEach(f => { if (data[f]) data[f] = new Date(data[f]); });

    const project = await prisma.project.update({
      where: { id: req.params.id }, data,
      include: { client: { select: { name: true } } },
    });
    return reply.send({ success: true, data: project });
  });

  // PATCH /projects/:id/progress — update progress %
  fastify.patch('/projects/:id/progress', { preHandler: read }, async (req, reply) => {
    const { progressPct } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { progressPct },
    });
    return reply.send({ success: true, data: project });
  });

  // GET /projects/:id/budget — budget vs actual
  fastify.get('/projects/:id/budget', { preHandler: read }, async (req, reply) => {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: req.params.id } });

    const budgetTotal = Number(project.budgetMaterial) + Number(project.budgetLabour) + Number(project.budgetEquipment) + Number(project.budgetOther);
    const actualTotal = Number(project.actualMaterial) + Number(project.actualLabour) + Number(project.actualEquipment) + Number(project.actualOther);

    return reply.send({
      success: true,
      data: {
        projectId: project.id,
        projectValue: Number(project.projectValue),
        budget: { material: Number(project.budgetMaterial), labour: Number(project.budgetLabour), equipment: Number(project.budgetEquipment), other: Number(project.budgetOther), total: budgetTotal },
        actual: { material: Number(project.actualMaterial), labour: Number(project.actualLabour), equipment: Number(project.actualEquipment), other: Number(project.actualOther), total: actualTotal },
        variance: budgetTotal - actualTotal,
        variancePct: budgetTotal ? (((budgetTotal - actualTotal) / budgetTotal) * 100).toFixed(1) : 0,
        progressPct: Number(project.progressPct),
      },
    });
  });

  // ─── BOQ ─────────────────────────────────────────────────────────────────

  fastify.get('/projects/:id/boq', { preHandler: read }, async (req, reply) => {
    const boqs = await prisma.bOQ.findMany({
      where: { projectId: req.params.id },
      include: { items: { include: { material: { select: { name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
    return reply.send({ success: true, data: boqs });
  });

  fastify.post('/projects/:id/boq', { preHandler: write }, async (req, reply) => {
    const { title, description, items } = req.body;
    const existing = await prisma.bOQ.findFirst({ where: { projectId: req.params.id }, orderBy: { version: 'desc' } });

    const totalMaterial = items.filter(i => i.type !== 'LABOUR').reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const totalLabour   = items.filter(i => i.type === 'LABOUR').reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const boq = await prisma.bOQ.create({
      data: {
        projectId: req.params.id, title, description,
        version: (existing?.version || 0) + 1,
        totalMaterial, totalLabour, totalAmount: totalMaterial + totalLabour,
        items: {
          create: items.map((item, idx) => ({
            materialId: item.materialId || null,
            description: item.description, unit: item.unit,
            quantity: item.quantity, unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            type: item.type || 'MATERIAL', sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });
    return reply.status(201).send({ success: true, data: boq });
  });

  // ─── Work Orders ──────────────────────────────────────────────────────────

  fastify.get('/projects/:id/work-orders', { preHandler: read }, async (req, reply) => {
    const wos = await prisma.workOrder.findMany({
      where: { projectId: req.params.id },
      include: { subcontractor: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: wos });
  });

  fastify.post('/projects/:id/work-orders', { preHandler: write }, async (req, reply) => {
    const count = await prisma.workOrder.count();
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const { startDate, endDate, ...rest } = req.body;

    const wo = await prisma.workOrder.create({
      data: {
        ...rest, woNumber, projectId: req.params.id,
        createdById: req.user.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
      },
    });
    return reply.status(201).send({ success: true, data: wo });
  });

  fastify.patch('/projects/:projectId/work-orders/:id/status', { preHandler: write }, async (req, reply) => {
    const wo = await prisma.workOrder.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    return reply.send({ success: true, data: wo });
  });

  // ─── Site Progress Reports ────────────────────────────────────────────────

  fastify.get('/projects/:id/site-reports', { preHandler: read }, async (req, reply) => {
    const reports = await prisma.siteProgressReport.findMany({
      where: { projectId: req.params.id },
      include: {
        submittedBy: { select: { name: true } },
        photos: { select: { id: true, name: true, fileUrl: true } },
      },
      orderBy: { reportDate: 'desc' },
    });
    return reply.send({ success: true, data: reports });
  });

  fastify.post('/projects/:id/site-reports', { preHandler: auth }, async (req, reply) => {
    const { reportDate, workProgress, progressPct, manpowerCount, materialsUsed, issues, notes, weatherCondition } = req.body;

    const report = await prisma.siteProgressReport.create({
      data: {
        projectId: req.params.id,
        reportDate: new Date(reportDate),
        workProgress, progressPct, manpowerCount: manpowerCount || 0,
        materialsUsed: materialsUsed || null,
        issues, notes, weatherCondition,
        submittedById: req.user.id,
      },
    });

    // Update project progress
    await prisma.project.update({ where: { id: req.params.id }, data: { progressPct } });

    return reply.status(201).send({ success: true, data: report });
  });

  fastify.patch('/projects/:projectId/site-reports/:id/submit', { preHandler: auth }, async (req, reply) => {
    const report = await prisma.siteProgressReport.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    return reply.send({ success: true, data: report });
  });

  // ─── Drawing Analysis — Module 8 ──────────────────────────────────────────

  fastify.post('/projects/:id/drawings', { preHandler: write }, async (req, reply) => {
    const { fileName, fileUrl } = req.body;

    const analysis = await prisma.drawingAnalysis.create({
      data: { projectId: req.params.id, fileName, fileUrl, status: 'PROCESSING' },
    });

    // In production: queue AI processing job here
    // For now, simulate with placeholder result
    setTimeout(async () => {
      await prisma.drawingAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          identifiedAreas: [
            { type: 'WATERPROOFING', areaSqm: 0, description: 'Requires manual measurement from uploaded drawing' },
            { type: 'ROOF_AREA', areaSqm: 0 },
            { type: 'WET_AREA', areaSqm: 0 },
          ],
          totalAreaSqm: 0,
          materialSuggestions: [{ material: 'Waterproofing Membrane', qty: 0, unit: 'sqm', note: 'Based on identified areas' }],
        },
      });
    }, 2000);

    return reply.status(202).send({ success: true, data: analysis, message: 'Drawing queued for analysis' });
  });

  fastify.get('/projects/:id/drawings', { preHandler: read }, async (req, reply) => {
    const analyses = await prisma.drawingAnalysis.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: analyses });
  });
}
