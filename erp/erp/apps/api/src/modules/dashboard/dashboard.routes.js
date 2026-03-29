export default async function dashboardRoutes(fastify) {
  const { prisma } = fastify;
  const auth  = [fastify.authenticate];
  const admin = [...auth, fastify.require('dashboard:read')];
  const basic = [...auth, fastify.require('dashboard:basic')];

  fastify.get('/', { preHandler: admin }, async (_, reply) => {
    const sixtyDaysOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const [
      totalLeads, wonLeads, activeQuotations, totalQuotationValue,
      totalMaterials, activeEmployees, expiringDocs, pendingLeave,
      unreadAlerts, recentLeads, recentMovements,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.quotation.count({ where: { status: { in: ['SENT', 'VIEWED'] } } }),
      prisma.quotation.aggregate({ where: { status: 'ACCEPTED' }, _sum: { totalAmount: true } }),
      prisma.material.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: 'ACTIVE', OR: [
        { visaExpiry:     { lte: sixtyDaysOut } },
        { passportExpiry: { lte: sixtyDaysOut } },
      ]}}),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { client: { select: { name: true } }, assignedTo: { select: { name: true } } } }),
      prisma.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { material: { select: { name: true, sku: true } } } }),
    ]);

    // Low stock count via Prisma (no raw SQL)
    const lowStockMaterials = await prisma.material.findMany({
      where: { isActive: true },
      select: { currentStock: true, minStockLevel: true },
    });
    const lowStockItems = lowStockMaterials.filter(m => Number(m.currentStock) <= Number(m.minStockLevel)).length;
    const totalStockValue = lowStockMaterials.reduce((s, m) => s, 0); // placeholder — real calc below

    // Stock value via aggregation
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      select: { currentStock: true, unitPrice: true },
    });
    const stockValue = materials.reduce((s, m) => s + Number(m.currentStock) * Number(m.unitPrice), 0);

    // Sales trend last 6 months — using Prisma groupBy
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const salesTrendRaw = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as leads,
        COALESCE(SUM("estimatedValue"), 0) as pipeline_value
      FROM leads
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY 1 ORDER BY 1
    `;

    return reply.send({
      success: true,
      data: {
        sales: {
          totalLeads,
          wonLeads,
          conversionRate: totalLeads ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0,
          activeQuotations,
          totalWonValue: Number(totalQuotationValue._sum.totalAmount || 0),
        },
        inventory: { totalMaterials, lowStockItems, totalStockValue: stockValue },
        hr: { activeEmployees, expiringDocs, pendingLeave },
        alerts: { unreadCount: unreadAlerts },
        recent: { leads: recentLeads, stockMovements: recentMovements },
        salesTrend: salesTrendRaw,
      },
    });
  });

  fastify.get('/me', { preHandler: basic }, async (request, reply) => {
    const user = request.user;
    const data = { role: user.role, name: user.name };

    if (['SALES_TEAM', 'MANAGER', 'ADMIN', 'DIRECTOR'].includes(user.role)) {
      const [myLeads, myPipeline] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: user.id, status: { notIn: ['WON', 'LOST'] } } }),
        prisma.lead.aggregate({ where: { assignedToId: user.id, status: { notIn: ['WON', 'LOST'] } }, _sum: { estimatedValue: true } }),
      ]);
      data.sales = { activeLeads: myLeads, pipelineValue: Number(myPipeline._sum.estimatedValue || 0) };
    }

    if (['STORE_KEEPER', 'MANAGER', 'ADMIN'].includes(user.role)) {
      const mats = await prisma.material.findMany({ where: { isActive: true }, select: { currentStock: true, minStockLevel: true } });
      data.inventory = { lowStockCount: mats.filter(m => Number(m.currentStock) <= Number(m.minStockLevel)).length };
    }

    const unreadAlerts = await prisma.alert.count({ where: { isRead: false } });
    data.alerts = { unreadCount: unreadAlerts };

    return reply.send({ success: true, data });
  });
}
