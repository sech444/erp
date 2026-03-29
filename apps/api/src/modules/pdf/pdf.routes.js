import path from 'path';
import fs from 'fs';
import os from 'os';
import { generateQuotationPDF, generateInvoicePDF, generatePayslipPDF } from '../../lib/pdf.js';
import { sendQuotationEmail, sendInvoiceEmail, sendPayslipEmail, sendLPOEmail } from '../../lib/email.js';

export default async function pdfRoutes(fastify) {
  const { prisma } = fastify;
  const auth = [fastify.authenticate];

  // GET /pdf/quotations/:id — download quotation PDF
  fastify.get('/quotations/:id', { preHandler: auth }, async (request, reply) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: request.params.id },
      include: {
        client: true,
        items: { orderBy: { sortOrder: 'asc' }, include: { material: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    });
    if (!quotation) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });

    const tmpPath = path.join(os.tmpdir(), `${quotation.quotationNumber}.pdf`);
    await generateQuotationPDF(quotation, tmpPath);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${quotation.quotationNumber}.pdf"`)
      .send(fs.createReadStream(tmpPath));
  });

  // POST /pdf/quotations/:id/send-email — generate PDF + email to client
  fastify.post('/quotations/:id/send-email', { preHandler: auth }, async (request, reply) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: request.params.id },
      include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quotation) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    if (!quotation.client?.email) return reply.status(400).send({ success: false, error: { code: 'NO_EMAIL', message: 'Client has no email address on record' } });

    const tmpPath = path.join(os.tmpdir(), `${quotation.quotationNumber}.pdf`);
    await generateQuotationPDF(quotation, tmpPath);
    await sendQuotationEmail(quotation, tmpPath);

    await prisma.quotation.update({ where: { id: request.params.id }, data: { status: 'SENT', sentAt: new Date() } });

    return reply.send({ success: true, message: `Quotation emailed to ${quotation.client.email}` });
  });

  // GET /pdf/invoices/:id — download invoice PDF
  fastify.get('/invoices/:id', { preHandler: auth }, async (request, reply) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      include: { client: true, project: { select: { name: true, projectCode: true } }, items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!invoice) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

    const tmpPath = path.join(os.tmpdir(), `${invoice.invoiceNumber}.pdf`);
    await generateInvoicePDF(invoice, tmpPath);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`)
      .send(fs.createReadStream(tmpPath));
  });

  // POST /pdf/invoices/:id/send-email
  fastify.post('/invoices/:id/send-email', { preHandler: auth }, async (request, reply) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      include: { client: true, project: { select: { name: true, projectCode: true } }, items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!invoice) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    if (!invoice.client?.email) return reply.status(400).send({ success: false, error: { code: 'NO_EMAIL', message: 'Client has no email address on record' } });

    const tmpPath = path.join(os.tmpdir(), `${invoice.invoiceNumber}.pdf`);
    await generateInvoicePDF(invoice, tmpPath);
    await sendInvoiceEmail(invoice, tmpPath);

    await prisma.invoice.update({ where: { id: request.params.id }, data: { status: 'SENT', sentAt: new Date() } });

    return reply.send({ success: true, message: `Invoice emailed to ${invoice.client.email}` });
  });

  // GET /pdf/payslips/:payrollItemId — download individual payslip
  fastify.get('/payslips/:payrollItemId', { preHandler: auth }, async (request, reply) => {
    const item = await prisma.payrollItem.findUnique({
      where: { id: request.params.payrollItemId },
      include: {
        employee: { include: { department: true } },
        payroll: true,
      },
    });
    if (!item) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll item not found' } });

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const period = `${months[item.payroll.periodMonth - 1]} ${item.payroll.periodYear}`;
    const filename = `Payslip_${item.employee.employeeCode}_${period.replace(' ','_')}.pdf`;
    const tmpPath = path.join(os.tmpdir(), filename);

    await generatePayslipPDF(item.employee, item, period, tmpPath);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(fs.createReadStream(tmpPath));
  });

  // POST /pdf/payslips/:payrollItemId/send-email
  fastify.post('/payslips/:payrollItemId/send-email', { preHandler: auth }, async (request, reply) => {
    const item = await prisma.payrollItem.findUnique({
      where: { id: request.params.payrollItemId },
      include: { employee: { include: { department: true } }, payroll: true },
    });
    if (!item) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll item not found' } });
    if (!item.employee.email) return reply.status(400).send({ success: false, error: { code: 'NO_EMAIL', message: 'Employee has no email on record' } });

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const period = `${months[item.payroll.periodMonth - 1]} ${item.payroll.periodYear}`;
    const tmpPath = path.join(os.tmpdir(), `payslip_${item.employee.employeeCode}.pdf`);

    await generatePayslipPDF(item.employee, item, period, tmpPath);
    await sendPayslipEmail(item.employee, item, period, tmpPath);

    return reply.send({ success: true, message: `Payslip emailed to ${item.employee.email}` });
  });

  // POST /pdf/purchase-orders/:id/send-email — LPO to supplier
  fastify.post('/purchase-orders/:id/send-email', { preHandler: auth }, async (request, reply) => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: request.params.id },
      include: { supplier: true, items: { include: { material: { select: { name: true } } } } },
    });
    if (!po) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    if (!po.supplier?.email) return reply.status(400).send({ success: false, error: { code: 'NO_EMAIL', message: 'Supplier has no email on record' } });

    await sendLPOEmail(po);
    await prisma.purchaseOrder.update({ where: { id: request.params.id }, data: { status: 'SENT', sentAt: new Date() } });

    return reply.send({ success: true, message: `LPO emailed to ${po.supplier.email}` });
  });
}
