import { generateQuotationNumber } from '../../lib/generators.js';

export default async function salesRoutes(fastify) {
  const { prisma } = fastify;
  const auth   = [fastify.authenticate];
  const read   = [...auth, fastify.require('sales:read')];
  const write  = [...auth, fastify.require('sales:write')];
  const del    = [...auth, fastify.require('sales:delete')];
  const quote  = [...auth, fastify.require('sales:quotation')];

  // ════════════════════════════════════════════════════════
  //  CLIENTS
  // ════════════════════════════════════════════════════════

  fastify.get('/clients', { preHandler: read }, async (request, reply) => {
    const { search, page = 1, limit = 20 } = request.query;
    const where = { isActive: true };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
    ];

    const [items, total] = await Promise.all([
      prisma.client.findMany({ where, include: { _count: { select: { leads: true, quotations: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
      prisma.client.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/clients/:id', { preHandler: read }, async (request, reply) => {
    const client = await prisma.client.findUnique({
      where: { id: request.params.id },
      include: { leads: { orderBy: { createdAt: 'desc' } }, quotations: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!client) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });
    return reply.send({ success: true, data: client });
  });

  fastify.post('/clients', { preHandler: write }, async (request, reply) => {
    const client = await prisma.client.create({ data: request.body });
    return reply.status(201).send({ success: true, data: client });
  });

  fastify.patch('/clients/:id', { preHandler: write }, async (request, reply) => {
    const client = await prisma.client.update({ where: { id: request.params.id }, data: request.body });
    return reply.send({ success: true, data: client });
  });

  // ════════════════════════════════════════════════════════
  //  LEADS
  // ════════════════════════════════════════════════════════

  fastify.get('/leads', { preHandler: read }, async (request, reply) => {
    const { status, assignedToId, search, page = 1, limit = 20 } = request.query;
    const where = {};
    if (status)       where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];

    // Sales team only sees their own leads
    if (request.user.role === 'SALES_TEAM') {
      where.assignedToId = request.user.id;
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          client: { select: { name: true } },
          assignedTo: { select: { name: true } },
          _count: { select: { activities: true, quotations: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.lead.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/leads/:id', { preHandler: read }, async (request, reply) => {
    const lead = await prisma.lead.findUnique({
      where: { id: request.params.id },
      include: {
        client: true, assignedTo: { select: { name: true, email: true } }, createdBy: { select: { name: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        quotations: { orderBy: { createdAt: 'desc' }, select: { id: true, quotationNumber: true, status: true, totalAmount: true, createdAt: true } },
      },
    });
    if (!lead) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    return reply.send({ success: true, data: lead });
  });

  fastify.post('/leads', { preHandler: write }, async (request, reply) => {
    const lead = await prisma.lead.create({
      data: { ...request.body, createdById: request.user.id },
      include: { client: { select: { name: true } }, assignedTo: { select: { name: true } } },
    });
    return reply.status(201).send({ success: true, data: lead });
  });

  fastify.patch('/leads/:id', { preHandler: write }, async (request, reply) => {
    const current = await prisma.lead.findUniqueOrThrow({ where: { id: request.params.id } });
    const { status, ...rest } = request.body;

    const data = { ...rest };
    if (status) {
      data.status = status;
      if (status === 'WON')  data.wonAt  = new Date();
      if (status === 'LOST') data.lostAt = new Date();

      // Auto-log status change activity
      if (status !== current.status) {
        await prisma.leadActivity.create({
          data: { leadId: current.id, type: 'STATUS_CHANGE', notes: `Status changed from ${current.status} to ${status}` },
        });
      }
    }

    const lead = await prisma.lead.update({ where: { id: request.params.id }, data });
    return reply.send({ success: true, data: lead });
  });

  // POST /sales/leads/:id/activities — log a call, email, meeting, note
  fastify.post('/leads/:id/activities', { preHandler: write }, async (request, reply) => {
    const activity = await prisma.leadActivity.create({
      data: { leadId: request.params.id, ...request.body },
    });
    return reply.status(201).send({ success: true, data: activity });
  });

  // ════════════════════════════════════════════════════════
  //  PIPELINE SUMMARY
  // ════════════════════════════════════════════════════════

  fastify.get('/pipeline', { preHandler: read }, async (request, reply) => {
    const stages = ['NEW', 'CONTACTED', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST'];
    const where = request.user.role === 'SALES_TEAM' ? { assignedToId: request.user.id } : {};

    const grouped = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { estimatedValue: true },
    });

    const pipeline = stages.map(stage => {
      const found = grouped.find(g => g.status === stage);
      return { stage, count: found?._count.id || 0, value: Number(found?._sum.estimatedValue || 0) };
    });

    return reply.send({ success: true, data: pipeline });
  });

  // ════════════════════════════════════════════════════════
  //  QUOTATIONS
  // ════════════════════════════════════════════════════════

  fastify.get('/quotations', { preHandler: read }, async (request, reply) => {
    const { status, clientId, page = 1, limit = 20 } = request.query;
    const where = {};
    if (status)   where.status = status;
    if (clientId) where.clientId = clientId;

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: { client: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.quotation.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/quotations/:id', { preHandler: read }, async (request, reply) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: request.params.id },
      include: {
        client: true, lead: { select: { title: true } }, createdBy: { select: { name: true } },
        items: { include: { material: { select: { name: true, sku: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quotation) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    return reply.send({ success: true, data: quotation });
  });

  fastify.post('/quotations', { preHandler: quote }, async (request, reply) => {
    const { clientId, leadId, scopeOfWork, validUntil, paymentTerms, retentionPct, vatPct = 5, notes, items } = request.body;

    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const vatAmount = subtotal * (vatPct / 100);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: await generateQuotationNumber(prisma),
        clientId, leadId, scopeOfWork, notes, retentionPct,
        validUntil: validUntil ? new Date(validUntil) : null,
        paymentTerms: paymentTerms ? JSON.stringify(paymentTerms) : null,
        vatPct, subtotal, vatAmount, totalAmount: subtotal + vatAmount,
        createdById: request.user.id,
        items: {
          create: items.map((item, idx) => ({
            materialId: item.materialId || null,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            type: item.type || 'MATERIAL',
            sortOrder: idx,
          })),
        },
      },
      include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
    });

    // Update lead status if linked
    if (leadId) {
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'QUOTATION_SENT' } }).catch(() => {});
    }

    return reply.status(201).send({ success: true, data: quotation });
  });

  fastify.patch('/quotations/:id', { preHandler: quote }, async (request, reply) => {
    const { items, ...data } = request.body;

    // Recalculate totals if items changed
    if (items) {
      const existing = await prisma.quotation.findUniqueOrThrow({ where: { id: request.params.id } });
      const vatPct = data.vatPct || existing.vatPct;
      data.subtotal  = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      data.vatAmount = data.subtotal * (Number(vatPct) / 100);
      data.totalAmount = data.subtotal + data.vatAmount;

      await prisma.quotationItem.deleteMany({ where: { quotationId: request.params.id } });
      await prisma.quotationItem.createMany({
        data: items.map((item, idx) => ({
          quotationId: request.params.id,
          materialId: item.materialId || null,
          description: item.description, unit: item.unit,
          quantity: item.quantity, unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          type: item.type || 'MATERIAL', sortOrder: idx,
        })),
      });
    }

    const quotation = await prisma.quotation.update({ where: { id: request.params.id }, data });
    return reply.send({ success: true, data: quotation });
  });

  // PATCH /sales/quotations/:id/send
  fastify.patch('/quotations/:id/send', { preHandler: quote }, async (request, reply) => {
    const quotation = await prisma.quotation.update({
      where: { id: request.params.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    // TODO: trigger email via email service
    return reply.send({ success: true, data: quotation, message: 'Quotation marked as sent' });
  });

  // PATCH /sales/quotations/:id/status
  fastify.patch('/quotations/:id/status', { preHandler: [...auth, fastify.require('sales:approve-quotation')] }, async (request, reply) => {
    const { status } = request.body;
    const quotation = await prisma.quotation.update({ where: { id: request.params.id }, data: { status } });
    return reply.send({ success: true, data: quotation });
  });

  // ════════════════════════════════════════════════════════
  //  ANALYTICS
  // ════════════════════════════════════════════════════════

  fastify.get('/analytics/summary', { preHandler: read }, async (_, reply) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLeads, wonLeads, totalQuotationValue, activeClients, conversionData] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.quotation.aggregate({ where: { status: 'ACCEPTED' }, _sum: { totalAmount: true } }),
      prisma.client.count({ where: { isActive: true } }),
      prisma.lead.groupBy({ by: ['source'], _count: { id: true }, _sum: { estimatedValue: true } }),
    ]);

    return reply.send({
      success: true,
      data: {
        totalLeads,
        wonLeads,
        conversionRate: totalLeads ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
        totalWonValue: Number(totalQuotationValue._sum.totalAmount || 0),
        activeClients,
        leadsBySource: conversionData,
      },
    });
  });
}
