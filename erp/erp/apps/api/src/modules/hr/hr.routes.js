export default async function hrRoutes(fastify) {
  const { prisma } = fastify;
  const auth     = [fastify.authenticate];
  const read     = [...auth, fastify.require('hr:read')];
  const write    = [...auth, fastify.require('hr:write')];
  const del      = [...auth, fastify.require('hr:delete')];
  const payroll  = [...auth, fastify.require('hr:payroll')];
  const payApprove = [...auth, fastify.require('hr:payroll-approve')];
  const attend   = [...auth, fastify.require('hr:attendance')];

  // ════════════════════════════════════════════════════════
  //  EMPLOYEES
  // ════════════════════════════════════════════════════════

  fastify.get('/employees', { preHandler: read }, async (request, reply) => {
    const { search, departmentId, status, page = 1, limit = 20 } = request.query;
    const where = {};
    if (status)       where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
    ];

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { department: { select: { name: true } }, user: { select: { email: true, role: true } } },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.employee.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  fastify.get('/employees/:id', { preHandler: read }, async (request, reply) => {
    const employee = await prisma.employee.findUnique({
      where: { id: request.params.id },
      include: {
        department: true, user: { select: { email: true, role: true } },
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        performanceReviews: { orderBy: { reviewDate: 'desc' }, take: 3 },
        payrollItems: { include: { payroll: { select: { periodMonth: true, periodYear: true, status: true } } }, orderBy: { payroll: { periodYear: 'desc' } }, take: 6 },
      },
    });
    if (!employee) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return reply.send({ success: true, data: employee });
  });

  fastify.post('/employees', { preHandler: write }, async (request, reply) => {
    const { joinDate, passportExpiry, visaExpiry, emiratesIdExpiry, laborCardExpiry, insuranceExpiry, medicalExpiry, ...rest } = request.body;

    // Generate employee code
    const count = await prisma.employee.count();
    const employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        ...rest, employeeCode,
        joinDate: new Date(joinDate),
        passportExpiry:   passportExpiry   ? new Date(passportExpiry)   : null,
        visaExpiry:       visaExpiry       ? new Date(visaExpiry)       : null,
        emiratesIdExpiry: emiratesIdExpiry ? new Date(emiratesIdExpiry) : null,
        laborCardExpiry:  laborCardExpiry  ? new Date(laborCardExpiry)  : null,
        insuranceExpiry:  insuranceExpiry  ? new Date(insuranceExpiry)  : null,
        medicalExpiry:    medicalExpiry    ? new Date(medicalExpiry)    : null,
      },
      include: { department: true },
    });

    // Check and create expiry alerts
    await createExpiryAlerts(prisma, employee);

    return reply.status(201).send({ success: true, data: employee });
  });

  fastify.patch('/employees/:id', { preHandler: write }, async (request, reply) => {
    const dateFields = ['joinDate', 'passportExpiry', 'visaExpiry', 'emiratesIdExpiry', 'laborCardExpiry', 'insuranceExpiry', 'medicalExpiry', 'terminationDate'];
    const data = { ...request.body };
    dateFields.forEach(f => { if (data[f]) data[f] = new Date(data[f]); });

    const employee = await prisma.employee.update({ where: { id: request.params.id }, data, include: { department: true } });
    await createExpiryAlerts(prisma, employee);
    return reply.send({ success: true, data: employee });
  });

  // GET /hr/employees/:id/cost — total cost per employee
  fastify.get('/employees/:id/cost', { preHandler: read }, async (request, reply) => {
    const emp = await prisma.employee.findUniqueOrThrow({ where: { id: request.params.id } });
    const monthlyCTC = Number(emp.basicSalary) + Number(emp.housingAllowance) + Number(emp.transportAllowance) + Number(emp.otherAllowances);
    const annualCTC  = monthlyCTC * 12;

    return reply.send({
      success: true,
      data: {
        employeeId: emp.id,
        monthlySalary: monthlyCTC,
        annualSalary: annualCTC,
        visaCost: Number(emp.visaCost || 0),
        medicalCost: Number(emp.medicalCost || 0),
        insuranceCost: Number(emp.insuranceCost || 0),
        totalAnnualCost: annualCTC + Number(emp.visaCost || 0) + Number(emp.medicalCost || 0) + Number(emp.insuranceCost || 0),
      },
    });
  });

  // ════════════════════════════════════════════════════════
  //  DEPARTMENTS
  // ════════════════════════════════════════════════════════

  fastify.get('/departments', { preHandler: read }, async (_, reply) => {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: departments });
  });

  fastify.post('/departments', { preHandler: write }, async (request, reply) => {
    const dept = await prisma.department.create({ data: request.body });
    return reply.status(201).send({ success: true, data: dept });
  });

  // ════════════════════════════════════════════════════════
  //  ATTENDANCE
  // ════════════════════════════════════════════════════════

  fastify.get('/attendance', { preHandler: attend }, async (request, reply) => {
    const { employeeId, date, startDate, endDate, page = 1, limit = 50 } = request.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (date)       where.date = new Date(date);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate)   where.date.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        orderBy: [{ date: 'desc' }, { employee: { firstName: 'asc' } }],
        skip: (page - 1) * limit, take: parseInt(limit),
      }),
      prisma.attendance.count({ where }),
    ]);
    return reply.send({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  });

  // POST /hr/attendance — manual entry
  fastify.post('/attendance', { preHandler: attend }, async (request, reply) => {
    const { employeeId, date, status, checkIn, checkOut, overtimeHours, notes } = request.body;

    // Calculate overtime if not provided
    let overtime = overtimeHours || 0;
    if (checkIn && checkOut && !overtimeHours) {
      const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
      overtime = Math.max(0, hours - 8); // Standard 8h day
    }

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: new Date(date) } },
      create: {
        employeeId, date: new Date(date), status: status || 'PRESENT',
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        overtimeHours: overtime, notes,
      },
      update: {
        status: status || 'PRESENT',
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        overtimeHours: overtime, notes,
      },
    });
    return reply.status(201).send({ success: true, data: attendance });
  });

  // POST /hr/attendance/checkin — mobile GPS check-in
  fastify.post('/attendance/checkin', { preHandler: auth }, async (request, reply) => {
    const { latitude, longitude } = request.body;
    const user = await prisma.user.findUnique({ where: { id: request.user.id }, include: { employee: true } });

    if (!user?.employee) {
      return reply.status(400).send({ success: false, error: { code: 'NO_EMPLOYEE', message: 'No employee record linked to your account' } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: user.employee.id, date: today } },
      create: { employeeId: user.employee.id, date: today, status: 'PRESENT', checkIn: new Date(), latitude, longitude },
      update: { checkIn: new Date(), latitude, longitude },
    });
    return reply.send({ success: true, data: attendance });
  });

  // POST /hr/attendance/checkout — mobile GPS check-out
  fastify.post('/attendance/checkout', { preHandler: auth }, async (request, reply) => {
    const { latitude, longitude } = request.body;
    const user = await prisma.user.findUnique({ where: { id: request.user.id }, include: { employee: true } });
    if (!user?.employee) return reply.status(400).send({ success: false, error: { code: 'NO_EMPLOYEE', message: 'No employee record linked' } });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: user.employee.id, date: today } } });
    if (!existing) return reply.status(400).send({ success: false, error: { code: 'NO_CHECKIN', message: 'No check-in found for today' } });

    const checkOut = new Date();
    const hours = existing.checkIn ? (checkOut - existing.checkIn) / (1000 * 60 * 60) : 0;
    const overtime = Math.max(0, hours - 8);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut, overtimeHours: overtime, latitude, longitude },
    });
    return reply.send({ success: true, data: attendance });
  });

  // GET /hr/attendance/summary — attendance summary for a period
  fastify.get('/attendance/summary', { preHandler: attend }, async (request, reply) => {
    const { month, year } = request.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate   = new Date(y, m, 0);

    const summary = await prisma.attendance.groupBy({
      by: ['employeeId', 'status'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: { id: true },
      _sum: { overtimeHours: true },
    });

    return reply.send({ success: true, data: { month: m, year: y, summary } });
  });

  // ════════════════════════════════════════════════════════
  //  LEAVE REQUESTS
  // ════════════════════════════════════════════════════════

  fastify.get('/leave', { preHandler: attend }, async (request, reply) => {
    const { employeeId, status } = request.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status)     where.status = status;
    // Employees see only their own leave requests
    if (!fastify.hasPermission(request.user, 'hr:attendance')) {
      const user = await prisma.user.findUnique({ where: { id: request.user.id }, include: { employee: { select: { id: true } } } });
      if (user?.employee) where.employeeId = user.employee.id;
    }

    const items = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: items });
  });

  fastify.post('/leave', { preHandler: [...auth, fastify.require('hr:self')] }, async (request, reply) => {
    const { employeeId, type, startDate, endDate, reason } = request.body;
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leaveRequest.create({
      data: { employeeId, type, startDate: start, endDate: end, totalDays, reason },
    });
    return reply.status(201).send({ success: true, data: leave });
  });

  fastify.patch('/leave/:id/approve', { preHandler: attend }, async (request, reply) => {
    const leave = await prisma.leaveRequest.update({
      where: { id: request.params.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    return reply.send({ success: true, data: leave });
  });

  fastify.patch('/leave/:id/reject', { preHandler: attend }, async (request, reply) => {
    const leave = await prisma.leaveRequest.update({
      where: { id: request.params.id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: request.body.reason },
    });
    return reply.send({ success: true, data: leave });
  });

  // ════════════════════════════════════════════════════════
  //  PAYROLL
  // ════════════════════════════════════════════════════════

  fastify.get('/payroll', { preHandler: payroll }, async (_, reply) => {
    const payrolls = await prisma.payroll.findMany({
      include: { approvedBy: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    return reply.send({ success: true, data: payrolls });
  });

  fastify.get('/payroll/:id', { preHandler: payroll }, async (request, reply) => {
    const payroll = await prisma.payroll.findUnique({
      where: { id: request.params.id },
      include: {
        items: {
          include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, position: true } } },
          orderBy: { employee: { firstName: 'asc' } },
        },
        approvedBy: { select: { name: true } },
      },
    });
    if (!payroll) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll not found' } });
    return reply.send({ success: true, data: payroll });
  });

  // POST /hr/payroll/generate — generate payroll for a month
  fastify.post('/payroll/generate', { preHandler: payroll }, async (request, reply) => {
    const { month, year } = request.body;

    const existing = await prisma.payroll.findUnique({ where: { periodMonth_periodYear: { periodMonth: month, periodYear: year } } });
    if (existing) return reply.status(400).send({ success: false, error: { code: 'ALREADY_EXISTS', message: `Payroll for ${month}/${year} already exists` } });

    // Fetch all active employees
    const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });

    // Fetch attendance for the month to calculate overtime
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0);

    const attendanceSummary = await prisma.attendance.groupBy({
      by: ['employeeId'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { overtimeHours: true },
      _count: { id: true },
    });
    const attendanceMap = Object.fromEntries(attendanceSummary.map(a => [a.employeeId, a]));

    // Build payroll items
    const items = employees.map(emp => {
      const att = attendanceMap[emp.id];
      const overtimeHours = Number(att?._sum?.overtimeHours || 0);
      const overtimePay   = overtimeHours * Number(emp.overtimeRate || 0);
      const grossSalary   = Number(emp.basicSalary) + Number(emp.housingAllowance) + Number(emp.transportAllowance) + Number(emp.otherAllowances) + overtimePay;
      const deductions    = 0; // Extend for loan deductions, etc.
      const netSalary     = grossSalary - deductions;

      return { employeeId: emp.id, basicSalary: emp.basicSalary, housingAllowance: emp.housingAllowance, transportAllowance: emp.transportAllowance, otherAllowances: emp.otherAllowances, overtimeHours, overtimePay, deductions, netSalary };
    });

    const totals = items.reduce((acc, i) => ({
      basic: acc.basic + Number(i.basicSalary),
      allowances: acc.allowances + Number(i.housingAllowance) + Number(i.transportAllowance) + Number(i.otherAllowances),
      overtime: acc.overtime + Number(i.overtimePay),
      deductions: acc.deductions + Number(i.deductions),
      net: acc.net + Number(i.netSalary),
    }), { basic: 0, allowances: 0, overtime: 0, deductions: 0, net: 0 });

    const payroll = await prisma.payroll.create({
      data: {
        periodMonth: month, periodYear: year,
        totalBasic: totals.basic, totalAllowances: totals.allowances,
        totalOvertime: totals.overtime, totalDeductions: totals.deductions, totalNet: totals.net,
        items: { create: items },
      },
      include: { _count: { select: { items: true } } },
    });

    return reply.status(201).send({ success: true, data: payroll, message: `Payroll generated for ${employees.length} employees` });
  });

  fastify.patch('/payroll/:id/approve', { preHandler: payApprove }, async (request, reply) => {
    const payroll = await prisma.payroll.update({
      where: { id: request.params.id },
      data: { status: 'APPROVED', approvedById: request.user.id, approvedAt: new Date() },
    });
    return reply.send({ success: true, data: payroll });
  });

  fastify.patch('/payroll/:id/mark-paid', { preHandler: payApprove }, async (request, reply) => {
    const payroll = await prisma.payroll.update({
      where: { id: request.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return reply.send({ success: true, data: payroll });
  });

  // ════════════════════════════════════════════════════════
  //  PERFORMANCE REVIEWS
  // ════════════════════════════════════════════════════════

  fastify.get('/performance', { preHandler: read }, async (request, reply) => {
    const { employeeId } = request.query;
    const reviews = await prisma.performanceReview.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: { select: { firstName: true, lastName: true, position: true } } },
      orderBy: { reviewDate: 'desc' },
    });
    return reply.send({ success: true, data: reviews });
  });

  fastify.post('/performance', { preHandler: write }, async (request, reply) => {
    const review = await prisma.performanceReview.create({ data: { ...request.body, reviewDate: new Date(request.body.reviewDate) } });
    return reply.status(201).send({ success: true, data: review });
  });

  // ════════════════════════════════════════════════════════
  //  EXPIRY ALERTS
  // ════════════════════════════════════════════════════════

  fastify.get('/expiry-alerts', { preHandler: read }, async (_, reply) => {
    const sixtyDaysOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { visaExpiry:       { lte: sixtyDaysOut } },
          { passportExpiry:   { lte: sixtyDaysOut } },
          { emiratesIdExpiry: { lte: sixtyDaysOut } },
          { insuranceExpiry:  { lte: sixtyDaysOut } },
          { medicalExpiry:    { lte: sixtyDaysOut } },
        ],
      },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, position: true, visaExpiry: true, passportExpiry: true, emiratesIdExpiry: true, insuranceExpiry: true, medicalExpiry: true },
    });
    return reply.send({ success: true, data: employees });
  });
}

async function createExpiryAlerts(prisma, employee) {
  const sixtyDays = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const name = `${employee.firstName} ${employee.lastName}`;
  const alerts = [];

  const checks = [
    { field: 'visaExpiry', type: 'VISA_EXPIRY', label: 'Visa' },
    { field: 'passportExpiry', type: 'DOCUMENT_EXPIRY', label: 'Passport' },
    { field: 'insuranceExpiry', type: 'DOCUMENT_EXPIRY', label: 'Insurance' },
    { field: 'medicalExpiry', type: 'DOCUMENT_EXPIRY', label: 'Medical Certificate' },
  ];

  for (const check of checks) {
    if (employee[check.field] && new Date(employee[check.field]) <= sixtyDays) {
      alerts.push(prisma.alert.create({
        data: {
          type: check.type,
          title: `${check.label} Expiring: ${name}`,
          message: `${check.label} for ${name} (${employee.employeeCode}) expires on ${new Date(employee[check.field]).toDateString()}.`,
          entityId: employee.id,
        },
      }).catch(() => {}));
    }
  }
  await Promise.all(alerts);
}
