import { generatePoNumber } from '../../lib/generators.js';

export default async function inventoryRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const read  = [...auth, fastify.require('inventory:read')];
  const write = [...auth, fastify.require('inventory:write')];
  const del   = [...auth, fastify.require('inventory:delete')];
  const move  = [...auth, fastify.require('inventory:stock-move')];
  const po    = [...auth, fastify.require('inventory:purchase')];

  // ── Materials ──────────────────────────────────────────────────────────────

  fastify.get('/materials', { preHandler: read }, async (request, reply) => {
    const { search, categoryId, supplierId, lowStock, page = 1, limit = 20 } = request.query;
    const where = { isActive: true };
    if (search)     where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;

    const [allItems, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: { category: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: { name: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.material.count({ where }),
    ]);

    const items = lowStock === 'true'
      ? allItems.filter(m => Number(m.currentStock) <= Number(m.minStockLevel))
      : allItems;

    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  });

  fastify.get('/materials/:id', { preHandler: read }, async (request, reply) => {
    const material = await prisma.material.findUnique({
      where: { id: request.params.id },
      include: {
        category: true, supplier: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20, include: { performedBy: { select: { name: true } } } },
      },
    });
    if (!material) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Material not found' } });
    return reply.send({ success: true, data: material });
  });

  fastify.post('/materials', { preHandler: write }, async (request, reply) => {
    const material = await prisma.material.create({ data: request.body, include: { category: true, supplier: true } });
    await log(prisma, request.user.id, 'CREATE', 'Material', material.id);
    return reply.status(201).send({ success: true, data: material });
  });

  fastify.patch('/materials/:id', { preHandler: write }, async (request, reply) => {
    const material = await prisma.material.update({ where: { id: request.params.id }, data: request.body, include: { category: true, supplier: true } });
    await log(prisma, request.user.id, 'UPDATE', 'Material', material.id);
    return reply.send({ success: true, data: material });
  });

  fastify.delete('/materials/:id', { preHandler: del }, async (request, reply) => {
    await prisma.material.update({ where: { id: request.params.id }, data: { isActive: false } });
    return reply.send({ success: true, message: 'Material deactivated' });
  });

  // ── Stock Movements ────────────────────────────────────────────────────────

  fastify.post('/stock/in', { preHandler: move }, async (request, reply) => {
    const { materialId, quantity, unitPrice, reference, notes, purchaseOrderId } = request.body;

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          materialId, type: 'IN', quantity, unitPrice,
          totalValue: unitPrice ? Number(quantity) * Number(unitPrice) : null,
          reference, notes, purchaseOrderId: purchaseOrderId || null,
          performedById: request.user.id,
        },
      });
      const updated = await tx.material.update({
        where: { id: materialId },
        data: { currentStock: { increment: Number(quantity) } },
      });
      // Clear low-stock alert if resolved
      if (Number(updated.currentStock) > Number(updated.minStockLevel)) {
        await tx.alert.updateMany({ where: { type: 'LOW_STOCK', entityId: materialId, isRead: false }, data: { isRead: true } });
      }
      return { movement, material: updated };
    });

    await log(prisma, request.user.id, 'STOCK_IN', 'Material', materialId, { quantity });
    return reply.status(201).send({ success: true, data: result });
  });

  fastify.post('/stock/out', { preHandler: move }, async (request, reply) => {
    const { materialId, quantity, reference, notes, projectId } = request.body;

    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUniqueOrThrow({ where: { id: materialId } });
      if (Number(material.currentStock) < Number(quantity)) {
        throw Object.assign(new Error(`Insufficient stock. Available: ${material.currentStock} ${material.unit}`), { statusCode: 400 });
      }
      const movement = await tx.stockMovement.create({
        data: { materialId, type: 'OUT', quantity, reference, notes, projectId: projectId || null, performedById: request.user.id },
      });
      const updated = await tx.material.update({ where: { id: materialId }, data: { currentStock: { decrement: Number(quantity) } } });

      // Create low-stock alert if threshold crossed
      if (Number(updated.currentStock) <= Number(updated.minStockLevel)) {
        await tx.alert.upsert({
          where:  { id: `low-stock-${materialId}` },
          create: { id: `low-stock-${materialId}`, type: 'LOW_STOCK', title: `Low Stock: ${material.name}`, message: `${material.name} (${material.sku}) has ${updated.currentStock} ${material.unit} remaining.`, entityId: materialId, materialId },
          update: { isRead: false, message: `${material.name} (${material.sku}) has ${updated.currentStock} ${material.unit} remaining.` },
        });
      }
      return { movement, material: updated };
    });

    await log(prisma, request.user.id, 'STOCK_OUT', 'Material', materialId, { quantity });
    return reply.status(201).send({ success: true, data: result });
  });

  fastify.post('/stock/transfer', { preHandler: move }, async (request, reply) => {
    const { materialId, quantity, fromLocation, toLocation, notes } = request.body;
    const movement = await prisma.stockMovement.create({
      data: { materialId, type: 'TRANSFER', quantity, fromLocation, toLocation, notes, performedById: request.user.id },
    });
    return reply.status(201).send({ success: true, data: movement });
  });

  fastify.get('/stock/movements', { preHandler: read }, async (request, reply) => {
    const { materialId, type, projectId, startDate, endDate, page = 1, limit = 50 } = request.query;
    const where = {};
    if (materialId) where.materialId = materialId;
    if (projectId)  where.projectId  = projectId;
    if (type)       where.type = type;
    if (startDate || endDate) where.createdAt = {};
    if (startDate)  where.createdAt.gte = new Date(startDate);
    if (endDate)    where.createdAt.lte = new Date(endDate);

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          material:    { select: { name: true, sku: true, unit: true } },
          performedBy: { select: { name: true } },
          project:     { select: { name: true, projectCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  // ── Suppliers ──────────────────────────────────────────────────────────────

  fastify.get('/suppliers', { preHandler: read }, async (request, reply) => {
    const { search } = request.query;
    const where = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const suppliers = await prisma.supplier.findMany({
      where,
      include: { _count: { select: { materials: true, purchaseOrders: true } } },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: suppliers });
  });

  fastify.get('/suppliers/:id', { preHandler: read }, async (request, reply) => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: request.params.id },
      include: {
        materials: { where: { isActive: true } },
        purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        supplierPayments: { orderBy: { paidAt: 'desc' }, take: 10 },
      },
    });
    if (!supplier) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } });
    return reply.send({ success: true, data: supplier });
  });

  fastify.post('/suppliers', { preHandler: po }, async (request, reply) => {
    const supplier = await prisma.supplier.create({ data: request.body });
    return reply.status(201).send({ success: true, data: supplier });
  });

  fastify.patch('/suppliers/:id', { preHandler: po }, async (request, reply) => {
    const supplier = await prisma.supplier.update({ where: { id: request.params.id }, data: request.body });
    return reply.send({ success: true, data: supplier });
  });

  // ── Purchase Orders ────────────────────────────────────────────────────────

  fastify.get('/purchase-orders', { preHandler: po }, async (request, reply) => {
    const { status, supplierId, page = 1, limit = 20 } = request.query;
    const where = {};
    if (status)     where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/purchase-orders/:id', { preHandler: po }, async (request, reply) => {
    const po2 = await prisma.purchaseOrder.findUnique({
      where: { id: request.params.id },
      include: { supplier: true, items: { include: { material: { select: { name: true, sku: true, unit: true } } } }, createdBy: { select: { name: true } } },
    });
    if (!po2) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    return reply.send({ success: true, data: po2 });
  });

  fastify.post('/purchase-orders', { preHandler: po }, async (request, reply) => {
    const { supplierId, deliveryDate, notes, items } = request.body;
    const subtotal  = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const vatAmount = subtotal * 0.05;

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: await generatePoNumber(prisma), supplierId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null, notes,
        subtotal, vatAmount, totalAmount: subtotal + vatAmount, createdById: request.user.id,
        items: { create: items.map(i => ({ materialId: i.materialId || null, description: i.description || '', quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: Number(i.quantity) * Number(i.unitPrice), receivedQty: 0 })) },
      },
      include: { supplier: true, items: { include: { material: { select: { name: true, sku: true, unit: true } } } } },
    });
    await log(prisma, request.user.id, 'CREATE', 'PurchaseOrder', order.id);
    return reply.status(201).send({ success: true, data: order });
  });

  fastify.patch('/purchase-orders/:id/status', { preHandler: po }, async (request, reply) => {
    const { status } = request.body;
    const order = await prisma.purchaseOrder.update({
      where: { id: request.params.id },
      data: {
        status,
        ...(status === 'SENT'     ? { sentAt: new Date() }     : {}),
        ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
    });
    return reply.send({ success: true, data: order });
  });

  // ── Categories ─────────────────────────────────────────────────────────────

  fastify.get('/categories', { preHandler: read }, async (_, reply) => {
    const cats = await prisma.materialCategory.findMany({ include: { _count: { select: { materials: true } } }, orderBy: { name: 'asc' } });
    return reply.send({ success: true, data: cats });
  });

  fastify.post('/categories', { preHandler: write }, async (request, reply) => {
    const cat = await prisma.materialCategory.create({ data: request.body });
    return reply.status(201).send({ success: true, data: cat });
  });

  // ── Alerts ─────────────────────────────────────────────────────────────────

  fastify.get('/alerts', { preHandler: read }, async (_, reply) => {
    const alerts = await prisma.alert.findMany({
      where: { isRead: false },
      include: { material: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: alerts });
  });

  fastify.patch('/alerts/:id/read', { preHandler: read }, async (request, reply) => {
    await prisma.alert.update({ where: { id: request.params.id }, data: { isRead: true } });
    return reply.send({ success: true });
  });

  fastify.patch('/alerts/read-all', { preHandler: read }, async (_, reply) => {
    await prisma.alert.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return reply.send({ success: true });
  });

  // ── Reports ────────────────────────────────────────────────────────────────

  fastify.get('/reports/summary', { preHandler: [...auth, fastify.require('inventory:reports')] }, async (_, reply) => {
    const [totalMaterials, materials, recentMovements] = await Promise.all([
      prisma.material.count({ where: { isActive: true } }),
      prisma.material.findMany({ where: { isActive: true }, select: { currentStock: true, minStockLevel: true, unitPrice: true } }),
      prisma.stockMovement.groupBy({ by: ['type'], _count: { id: true }, where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    const lowStockCount = materials.filter(m => Number(m.currentStock) <= Number(m.minStockLevel)).length;
    const totalStockValue = materials.reduce((s, m) => s + Number(m.currentStock) * Number(m.unitPrice), 0);

    return reply.send({ success: true, data: { totalMaterials, lowStockCount, totalStockValue, last30DaysMovements: recentMovements } });
  });

  fastify.get('/reports/consumption', { preHandler: [...auth, fastify.require('inventory:reports')] }, async (request, reply) => {
    const { startDate, endDate, materialId } = request.query;
    const where = { type: 'OUT' };
    if (materialId) where.materialId = materialId;
    if (startDate)  where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
    if (endDate)    where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) };

    const consumption = await prisma.stockMovement.groupBy({ by: ['materialId'], where, _sum: { quantity: true }, _count: { id: true } });
    const materialIds = consumption.map(c => c.materialId);
    const mats = await prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true, sku: true, unit: true, unitPrice: true } });
    const matMap = Object.fromEntries(mats.map(m => [m.id, m]));

    const report = consumption.map(c => ({
      material: matMap[c.materialId],
      totalConsumed: Number(c._sum.quantity),
      transactions: c._count.id,
      estimatedValue: Number(c._sum.quantity) * Number(matMap[c.materialId]?.unitPrice || 0),
    })).sort((a, b) => b.totalConsumed - a.totalConsumed);

    return reply.send({ success: true, data: report });
  });
}

async function log(prisma, userId, action, entity, entityId, metadata = {}) {
  await prisma.activityLog.create({ data: { userId, action, entity, entityId, metadata } }).catch(() => {});
}