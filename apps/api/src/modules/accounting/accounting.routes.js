export default async function accountingRoutes(fastify) {
  const { prisma } = fastify;
  const auth    = [fastify.authenticate];
  const read    = [...auth, fastify.require('inventory:read')];
  const write   = [...auth, fastify.require('inventory:write')];
  const finance = [...auth, fastify.require('hr:payroll')];

  // ─── Chart of Accounts ───────────────────────────────────────────────────

  fastify.get('/accounts', { preHandler: finance }, async (_, reply) => {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      include: { parent: { select: { name: true, code: true } }, _count: { select: { children: true } } },
      orderBy: { code: 'asc' },
    });
    return reply.send({ success: true, data: accounts });
  });

  fastify.post('/accounts', { preHandler: finance }, async (req, reply) => {
    const account = await prisma.account.create({ data: req.body });
    return reply.status(201).send({ success: true, data: account });
  });

  // ─── Journal Entries ──────────────────────────────────────────────────────

  fastify.get('/journal-entries', { preHandler: finance }, async (req, reply) => {
    const { status, startDate, endDate, page = 1, limit = 30 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (startDate || endDate) where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);

    const [items, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: { createdBy: { select: { name: true } }, lines: { include: { debitAcc: { select: { name: true, code: true } }, creditAcc: { select: { name: true, code: true } } } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.journalEntry.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.post('/journal-entries', { preHandler: finance }, async (req, reply) => {
    const count = await prisma.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const entry = await prisma.journalEntry.create({
      data: {
        ...req.body,
        entryNumber,
        date: new Date(req.body.date),
        createdById: req.user.id,
        lines: { create: req.body.lines },
      },
      include: { lines: { include: { debitAcc: true, creditAcc: true } } },
    });
    return reply.status(201).send({ success: true, data: entry });
  });

  fastify.patch('/journal-entries/:id/post', { preHandler: finance }, async (req, reply) => {
    const entry = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: { status: 'POSTED', postedAt: new Date() },
    });
    return reply.send({ success: true, data: entry });
  });

  // ─── Invoices ─────────────────────────────────────────────────────────────

  fastify.get('/invoices', { preHandler: finance }, async (req, reply) => {
    const { status, clientId, projectId, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)    where.status = status;
    if (clientId)  where.clientId = clientId;
    if (projectId) where.projectId = projectId;
    if (type)      where.type = type;

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { select: { name: true } }, project: { select: { name: true, projectCode: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.invoice.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/invoices/:id', { preHandler: finance }, async (req, reply) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        project: { select: { name: true, projectCode: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!invoice) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return reply.send({ success: true, data: invoice });
  });

  fastify.post('/invoices', { preHandler: finance }, async (req, reply) => {
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const { items, issueDate, dueDate, ...rest } = req.body;

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const vatPct   = rest.vatPct || 5;
    const vatAmount = subtotal * (vatPct / 100);
    const retentionAmt = rest.retentionAmt || 0;

    const invoice = await prisma.invoice.create({
      data: {
        ...rest, invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate:   new Date(dueDate),
        subtotal, vatPct, vatAmount,
        retentionAmt,
        totalAmount: subtotal + vatAmount - retentionAmt,
        items: { create: items.map((item, idx) => ({ ...item, sortOrder: idx })) },
      },
      include: { client: true, items: true },
    });

    // Auto-create retention record if applicable
    if (retentionAmt > 0 && invoice.clientId && invoice.projectId) {
      await prisma.retention.create({
        data: {
          projectId: invoice.projectId,
          clientId: invoice.clientId,
          invoiceValue: subtotal,
          retentionPct: rest.retentionPct || 10,
          retentionAmt,
        },
      });
    }

    return reply.status(201).send({ success: true, data: invoice });
  });

  fastify.patch('/invoices/:id/send', { preHandler: finance }, async (req, reply) => {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    return reply.send({ success: true, data: invoice });
  });

  // POST /accounting/invoices/:id/payments — record payment
  fastify.post('/invoices/:id/payments', { preHandler: finance }, async (req, reply) => {
    const { amount, method, reference, notes, paidAt, bankAccountId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: req.params.id } });

      const payment = await tx.payment.create({
        data: {
          invoiceId: req.params.id, amount, method, reference, notes,
          paidAt: new Date(paidAt || new Date()),
          bankAccountId: bankAccountId || null,
        },
      });

      const newPaid = Number(invoice.paidAmount) + Number(amount);
      const newStatus = newPaid >= Number(invoice.totalAmount) ? 'PAID'
        : newPaid > 0 ? 'PARTIAL'
        : invoice.status;

      await tx.invoice.update({
        where: { id: req.params.id },
        data: { paidAmount: newPaid, status: newStatus },
      });

      return payment;
    });

    return reply.status(201).send({ success: true, data: result });
  });

  // ─── Retention — Module 25 ────────────────────────────────────────────────

  fastify.get('/retentions', { preHandler: finance }, async (req, reply) => {
    const { projectId, released } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (released !== undefined) where.released = released === 'true';

    const retentions = await prisma.retention.findMany({
      where,
      include: { project: { select: { name: true, projectCode: true } }, client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: retentions });
  });

  fastify.patch('/retentions/:id/release', { preHandler: finance }, async (req, reply) => {
    const { releasedAmt, notes } = req.body;
    const retention = await prisma.retention.update({
      where: { id: req.params.id },
      data: { released: true, releasedAt: new Date(), releasedAmt, notes },
    });
    return reply.send({ success: true, data: retention });
  });

  // ─── VAT — Module 24 ─────────────────────────────────────────────────────

  fastify.get('/vat-returns', { preHandler: finance }, async (_, reply) => {
    const returns = await prisma.vATReturn.findMany({ orderBy: { startDate: 'desc' } });
    return reply.send({ success: true, data: returns });
  });

  fastify.post('/vat-returns/calculate', { preHandler: finance }, async (req, reply) => {
    const { startDate, endDate, period } = req.body;
    const start = new Date(startDate);
    const end   = new Date(endDate);

    // Output VAT: VAT on all sent/paid invoices
    const outputResult = await prisma.invoice.aggregate({
      where: { issueDate: { gte: start, lte: end }, status: { in: ['SENT', 'PARTIAL', 'PAID'] } },
      _sum: { vatAmount: true },
    });

    // Input VAT: VAT on received purchase orders
    const inputResult = await prisma.purchaseOrder.aggregate({
      where: { receivedAt: { gte: start, lte: end }, status: 'RECEIVED' },
      _sum: { vatAmount: true },
    });

    const outputVAT = Number(outputResult._sum.vatAmount || 0);
    const inputVAT  = Number(inputResult._sum.vatAmount || 0);
    const netVAT    = outputVAT - inputVAT;

    const vatReturn = await prisma.vATReturn.create({
      data: { period, startDate: start, endDate: end, outputVAT, inputVAT, netVAT },
    });

    return reply.status(201).send({ success: true, data: vatReturn });
  });

  fastify.patch('/vat-returns/:id/submit', { preHandler: finance }, async (req, reply) => {
    const r = await prisma.vATReturn.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    return reply.send({ success: true, data: r });
  });

  // ─── Bank Accounts & Reconciliation — Module 27 ───────────────────────────

  fastify.get('/bank-accounts', { preHandler: finance }, async (_, reply) => {
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      include: { _count: { select: { transactions: true } } },
    });
    return reply.send({ success: true, data: accounts });
  });

  fastify.post('/bank-accounts', { preHandler: finance }, async (req, reply) => {
    const account = await prisma.bankAccount.create({ data: req.body });
    return reply.status(201).send({ success: true, data: account });
  });

  fastify.get('/bank-accounts/:id/transactions', { preHandler: finance }, async (req, reply) => {
    const { page = 1, limit = 50, reconciled } = req.query;
    const where = { bankAccountId: req.params.id };
    if (reconciled !== undefined) where.isReconciled = reconciled === 'true';

    const [items, total] = await Promise.all([
      prisma.bankTransaction.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
      prisma.bankTransaction.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total } });
  });

  fastify.post('/bank-accounts/:id/transactions', { preHandler: finance }, async (req, reply) => {
    const tx = await prisma.bankTransaction.create({
      data: { ...req.body, bankAccountId: req.params.id, date: new Date(req.body.date) },
    });
    // Update balance
    await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: { currentBalance: { increment: req.body.amount } },
    });
    return reply.status(201).send({ success: true, data: tx });
  });

  fastify.patch('/bank-accounts/transactions/:id/reconcile', { preHandler: finance }, async (req, reply) => {
    const tx = await prisma.bankTransaction.update({
      where: { id: req.params.id },
      data: { isReconciled: true, reconciledAt: new Date() },
    });
    return reply.send({ success: true, data: tx });
  });

  // ─── Financial Reports — Module 28 ───────────────────────────────────────

  fastify.get('/reports/profit-loss', { preHandler: finance }, async (req, reply) => {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate || new Date().getFullYear() + '-01-01');
    const end   = new Date(endDate   || new Date());

    const [revenue, pending] = await Promise.all([
      prisma.invoice.aggregate({
        where: { issueDate: { gte: start, lte: end }, status: 'PAID' },
        _sum: { subtotal: true, vatAmount: true, totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { issueDate: { gte: start, lte: end }, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const payrollCost = await prisma.payroll.aggregate({
      where: { status: 'PAID', createdAt: { gte: start, lte: end } },
      _sum: { totalNet: true },
    });

    const materialCost = await prisma.stockMovement.aggregate({
      where: { type: 'OUT', createdAt: { gte: start, lte: end } },
      _sum: { totalValue: true },
    });

    const totalRevenue = Number(revenue._sum.totalAmount || 0);
    const totalCosts   = Number(payrollCost._sum.totalNet || 0) + Number(materialCost._sum.totalValue || 0);

    return reply.send({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          invoiced:  Number(revenue._sum.subtotal || 0),
          vatCollected: Number(revenue._sum.vatAmount || 0),
          total: totalRevenue,
          pending: Number(pending._sum.totalAmount || 0) - Number(pending._sum.paidAmount || 0),
        },
        expenses: {
          payroll:   Number(payrollCost._sum.totalNet || 0),
          materials: Number(materialCost._sum.totalValue || 0),
          total: totalCosts,
        },
        grossProfit: totalRevenue - totalCosts,
        grossMarginPct: totalRevenue ? (((totalRevenue - totalCosts) / totalRevenue) * 100).toFixed(1) : 0,
      },
    });
  });

  fastify.get('/reports/ar-aging', { preHandler: finance }, async (_, reply) => {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      include: { client: { select: { name: true } } },
    });

    const now = Date.now();
    const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };

    invoices.forEach(inv => {
      const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
      const daysPast = Math.floor((now - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const entry = { invoiceNumber: inv.invoiceNumber, client: inv.client.name, outstanding, dueDate: inv.dueDate, daysPast };

      if (daysPast <= 0)       buckets.current.push(entry);
      else if (daysPast <= 30) buckets.days30.push(entry);
      else if (daysPast <= 60) buckets.days60.push(entry);
      else if (daysPast <= 90) buckets.days90.push(entry);
      else                     buckets.over90.push(entry);
    });

    return reply.send({ success: true, data: buckets });
  });

  fastify.get('/reports/project-profit', { preHandler: finance }, async (_, reply) => {
    const projects = await prisma.project.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { client: { select: { name: true } } },
    });

    const report = projects.map(p => {
      const budget = Number(p.budgetMaterial) + Number(p.budgetLabour) + Number(p.budgetEquipment) + Number(p.budgetOther);
      const actual = Number(p.actualMaterial) + Number(p.actualLabour) + Number(p.actualEquipment) + Number(p.actualOther);
      return {
        projectCode: p.projectCode, name: p.name, client: p.client.name,
        projectValue: Number(p.projectValue), budget, actual,
        variance: budget - actual,
        estimatedProfit: Number(p.projectValue) - actual,
        profitMarginPct: Number(p.projectValue) ? (((Number(p.projectValue) - actual) / Number(p.projectValue)) * 100).toFixed(1) : 0,
        progressPct: Number(p.progressPct),
        status: p.status,
      };
    });

    return reply.send({ success: true, data: report });
  });
}
