import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Departments ──────────────────────────────────────────
  const departments = await Promise.all([
    prisma.department.upsert({ where: { name: 'Management' }, update: {}, create: { name: 'Management', code: 'MGMT' } }),
    prisma.department.upsert({ where: { name: 'Sales' }, update: {}, create: { name: 'Sales', code: 'SALES' } }),
    prisma.department.upsert({ where: { name: 'Operations' }, update: {}, create: { name: 'Operations', code: 'OPS' } }),
    prisma.department.upsert({ where: { name: 'Finance' }, update: {}, create: { name: 'Finance', code: 'FIN' } }),
    prisma.department.upsert({ where: { name: 'HR' }, update: {}, create: { name: 'HR', code: 'HR' } }),
    prisma.department.upsert({ where: { name: 'Warehouse' }, update: {}, create: { name: 'Warehouse', code: 'WH' } }),
  ]);
  console.log(`✓ ${departments.length} departments`);

  // ── Admin User ───────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      email: 'admin@erp.local',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✓ Admin user: admin@erp.local / Admin@1234`);

  // ── Sample Users ─────────────────────────────────────────
  const pass = await bcrypt.hash('Password@1234', 12);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'sales@erp.local' },
      update: {},
      create: { email: 'sales@erp.local', passwordHash: pass, name: 'Sarah Sales', role: 'SALES_TEAM' },
    }),
    prisma.user.upsert({
      where: { email: 'store@erp.local' },
      update: {},
      create: { email: 'store@erp.local', passwordHash: pass, name: 'Kevin Store', role: 'STORE_KEEPER' },
    }),
    prisma.user.upsert({
      where: { email: 'hr@erp.local' },
      update: {},
      create: { email: 'hr@erp.local', passwordHash: pass, name: 'Hannah HR', role: 'HR_DEPT' },
    }),
    prisma.user.upsert({
      where: { email: 'manager@erp.local' },
      update: {},
      create: { email: 'manager@erp.local', passwordHash: pass, name: 'Mike Manager', role: 'MANAGER' },
    }),
  ]);
  console.log(`✓ ${users.length + 1} users`);

  // ── Material Categories ──────────────────────────────────
  const cats = await Promise.all([
    prisma.materialCategory.upsert({ where: { name: 'Waterproofing Membranes' }, update: {}, create: { name: 'Waterproofing Membranes', code: 'WPM' } }),
    prisma.materialCategory.upsert({ where: { name: 'Crack Injection Materials' }, update: {}, create: { name: 'Crack Injection Materials', code: 'CIM' } }),
    prisma.materialCategory.upsert({ where: { name: 'Primers & Adhesives' }, update: {}, create: { name: 'Primers & Adhesives', code: 'PA' } }),
    prisma.materialCategory.upsert({ where: { name: 'Tools & Equipment' }, update: {}, create: { name: 'Tools & Equipment', code: 'TE' } }),
    prisma.materialCategory.upsert({ where: { name: 'Safety Equipment' }, update: {}, create: { name: 'Safety Equipment', code: 'SE' } }),
  ]);
  console.log(`✓ ${cats.length} material categories`);

  // ── Suppliers ────────────────────────────────────────────
  const [supplier1, supplier2] = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Sika UAE LLC',
        contactPerson: 'Ahmed Al Rashid',
        email: 'ahmed@sika-uae.com',
        phone: '+971 4 123 4567',
        address: 'Dubai Industrial City, Dubai, UAE',
        paymentTerms: 'Net 30',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Mapei Middle East',
        contactPerson: 'Sara Hassan',
        email: 'sara@mapei-me.com',
        phone: '+971 4 987 6543',
        address: 'Jebel Ali Free Zone, Dubai, UAE',
        paymentTerms: 'Net 45',
      },
    }),
  ]);
  console.log(`✓ 2 suppliers`);

  // ── Materials ────────────────────────────────────────────
  const materialData = [
    { sku: 'WPM-001', name: 'Sika Waterproofing Membrane 2mm', unit: 'sqm', unitPrice: 45.00, currentStock: 500, minStockLevel: 100, categoryId: cats[0].id, supplierId: supplier1.id },
    { sku: 'WPM-002', name: 'Bituminous Sheet Membrane 3mm', unit: 'sqm', unitPrice: 32.00, currentStock: 300, minStockLevel: 80, categoryId: cats[0].id, supplierId: supplier2.id },
    { sku: 'CIM-001', name: 'Epoxy Crack Injection Resin 1kg', unit: 'kg', unitPrice: 120.00, currentStock: 50, minStockLevel: 20, categoryId: cats[1].id, supplierId: supplier1.id },
    { sku: 'CIM-002', name: 'Polyurethane Foam Injection 600ml', unit: 'pcs', unitPrice: 85.00, currentStock: 80, minStockLevel: 25, categoryId: cats[1].id, supplierId: supplier1.id },
    { sku: 'PA-001', name: 'Sika Primer 210T 5L', unit: 'pcs', unitPrice: 95.00, currentStock: 40, minStockLevel: 15, categoryId: cats[2].id, supplierId: supplier1.id },
    { sku: 'PA-002', name: 'Bitumen Primer 18L', unit: 'pcs', unitPrice: 75.00, currentStock: 8, minStockLevel: 10, categoryId: cats[2].id, supplierId: supplier2.id }, // LOW STOCK
    { sku: 'TE-001', name: 'Propane Torch Kit', unit: 'pcs', unitPrice: 350.00, currentStock: 5, minStockLevel: 2, categoryId: cats[3].id, supplierId: supplier2.id },
    { sku: 'SE-001', name: 'Safety Helmet (Class E)', unit: 'pcs', unitPrice: 25.00, currentStock: 30, minStockLevel: 10, categoryId: cats[4].id, supplierId: supplier2.id },
    { sku: 'SE-002', name: 'Safety Harness Full Body', unit: 'pcs', unitPrice: 180.00, currentStock: 4, minStockLevel: 5, categoryId: cats[4].id, supplierId: supplier1.id }, // LOW STOCK
  ];

  const materials = await Promise.all(materialData.map(m => prisma.material.create({ data: m })));
  console.log(`✓ ${materials.length} materials`);

  // ── Low stock alerts ─────────────────────────────────────
  const lowStockMaterials = materials.filter(m => m.currentStock <= m.minStockLevel);
  await Promise.all(lowStockMaterials.map(m =>
    prisma.alert.create({
      data: {
        type: 'LOW_STOCK',
        title: `Low Stock: ${m.name}`,
        message: `${m.name} (${m.sku}) has ${m.currentStock} ${m.unit} remaining. Minimum level is ${m.minStockLevel} ${m.unit}.`,
        entityId: m.id,
        materialId: m.id,
      },
    })
  ));

  // ── Sample Client & Lead ──────────────────────────────────
  const client = await prisma.client.create({
    data: {
      name: 'Al Futtaim Properties LLC',
      contactPerson: 'Mohammed Al Futtaim',
      email: 'projects@alfuttaim.ae',
      phone: '+971 4 222 3333',
      address: 'Festival City, Dubai, UAE',
      taxNumber: 'TRN100234567800003',
    },
  });

  await prisma.lead.create({
    data: {
      title: 'Basement Waterproofing - Building 5',
      clientId: client.id,
      contactName: 'Mohammed Al Futtaim',
      contactEmail: 'projects@alfuttaim.ae',
      contactPhone: '+971 4 222 3333',
      source: 'REFERRAL',
      status: 'QUOTATION_SENT',
      estimatedValue: 185000,
      assignedToId: users[0].id,
      createdById: admin.id,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Sample client & lead`);

  // ── Sample Employees ──────────────────────────────────────
  const now = new Date();
  const employeeData = [
    {
      employeeCode: 'EMP-001',
      userId: users[2].id, // HR user
      firstName: 'Hannah', lastName: 'Hassan',
      email: 'hr@erp.local', phone: '+971 50 111 2222',
      departmentId: departments[4].id, position: 'HR Manager',
      joinDate: new Date('2022-01-15'),
      passportNumber: 'A12345678', passportExpiry: new Date('2028-06-30'),
      visaNumber: 'V98765432', visaExpiry: new Date('2026-01-14'),
      emiratesId: '784-1985-1234567-1', emiratesIdExpiry: new Date('2026-01-14'),
      basicSalary: 12000, housingAllowance: 3000, transportAllowance: 1000,
    },
    {
      employeeCode: 'EMP-002',
      firstName: 'Rajesh', lastName: 'Kumar',
      email: 'rajesh@erp.local', phone: '+971 55 333 4444',
      departmentId: departments[2].id, position: 'Site Supervisor',
      joinDate: new Date('2021-03-01'),
      passportNumber: 'B98765432', passportExpiry: new Date('2025-09-30'), // EXPIRING SOON
      visaNumber: 'V12345678', visaExpiry: new Date('2025-09-30'), // EXPIRING SOON
      emiratesId: '784-1987-7654321-2', emiratesIdExpiry: new Date('2025-09-30'),
      basicSalary: 8000, housingAllowance: 1500, transportAllowance: 800,
    },
    {
      employeeCode: 'EMP-003',
      firstName: 'Ali', lastName: 'Al Hashimi',
      email: 'ali@erp.local', phone: '+971 52 555 6666',
      departmentId: departments[2].id, position: 'Waterproofing Technician',
      joinDate: new Date('2023-06-01'),
      passportNumber: 'C11223344', passportExpiry: new Date('2030-01-01'),
      visaNumber: 'V44332211', visaExpiry: new Date('2027-05-31'),
      emiratesId: '784-1992-1122334-3', emiratesIdExpiry: new Date('2027-05-31'),
      basicSalary: 5500, housingAllowance: 1000, transportAllowance: 500,
    },
  ];

  const employees = await Promise.all(employeeData.map(e => prisma.employee.create({ data: e })));
  console.log(`✓ ${employees.length} employees`);

  // Visa expiry alerts for Rajesh
  await prisma.alert.create({
    data: {
      type: 'VISA_EXPIRY',
      title: `Visa Expiring: ${employees[1].firstName} ${employees[1].lastName}`,
      message: `Visa for ${employees[1].firstName} ${employees[1].lastName} (${employees[1].employeeCode}) expires on ${employees[1].visaExpiry?.toDateString()}. Action required.`,
      entityId: employees[1].id,
    },
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@erp.local   / Admin@1234');
  console.log('   Sales:   sales@erp.local   / Password@1234');
  console.log('   Store:   store@erp.local   / Password@1234');
  console.log('   HR:      hr@erp.local      / Password@1234');
  console.log('   Manager: manager@erp.local / Password@1234');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
