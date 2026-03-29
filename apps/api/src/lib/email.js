import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// ── Transporter ───────────────────────────────────────────────────────────────

function createTransport() {
  if (config.NODE_ENV === 'development' && !config.SMTP_PASS) {
    // Dev: log emails instead of sending
    return { sendMail: async (opts) => { console.log('[EMAIL]', opts.to, '|', opts.subject); return { messageId: 'dev-mock' }; } };
  }

  return nodemailer.createTransport({
    host: config.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(config.SMTP_PORT || '587'),
    secure: false,
    auth: { user: config.SMTP_USER || 'apikey', pass: config.SMTP_PASS },
  });
}

async function send({ to, subject, html, attachments = [] }) {
  const transport = createTransport();
  return transport.sendMail({
    from: `"${config.FROM_NAME || 'TechServ ERP'}" <${config.FROM_EMAIL || 'noreply@techserv.ae'}>`,
    to, subject, html, attachments,
  });
}

// ── Email Templates ───────────────────────────────────────────────────────────

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 24px auto; background: white; border-radius: 12px; overflow: hidden; }
  .header { background: #1B5E99; color: white; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p  { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
  .body { padding: 32px; color: #333; }
  .footer { background: #f5f5f5; padding: 16px 32px; text-align: center; font-size: 12px; color: #888; }
  .btn { display: inline-block; background: #1B5E99; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1B5E99; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .total-row td { font-weight: bold; background: #EAF2FB; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>TechServ ERP</h1>
      <p>Construction · Waterproofing · Technical Services</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated email from TechServ ERP. Please do not reply directly to this email.</div>
  </div>
</body>
</html>`;
}

// ── Send Quotation Email ──────────────────────────────────────────────────────

export async function sendQuotationEmail(quotation, pdfPath) {
  const items = (quotation.items || []).map(i => `
    <tr>
      <td>${i.description}</td>
      <td>${i.unit}</td>
      <td>${Number(i.quantity).toFixed(2)}</td>
      <td>AED ${Number(i.unitPrice).toFixed(2)}</td>
      <td>AED ${Number(i.totalPrice).toFixed(2)}</td>
    </tr>`).join('');

  const content = `
    <p>Dear ${quotation.client?.contactPerson || quotation.client?.name || 'Sir/Madam'},</p>
    <p>Please find enclosed our quotation <strong>${quotation.quotationNumber}</strong> for your review.</p>
    ${quotation.scopeOfWork ? `<p><strong>Scope of Work:</strong><br>${quotation.scopeOfWork}</p>` : ''}
    <table>
      <thead><tr><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${items}
        <tr class="total-row"><td colspan="4">Subtotal</td><td>AED ${Number(quotation.subtotal).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="4">VAT (${quotation.vatPct}%)</td><td>AED ${Number(quotation.vatAmount).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="4"><strong>TOTAL</strong></td><td><strong>AED ${Number(quotation.totalAmount).toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
    ${quotation.validUntil ? `<p>This quotation is valid until <strong>${new Date(quotation.validUntil).toLocaleDateString('en-AE')}</strong>.</p>` : ''}
    <p>Please do not hesitate to contact us if you have any questions.</p>
    <p>Best regards,<br><strong>TechServ Team</strong></p>`;

  return send({
    to: quotation.client?.email,
    subject: `Quotation ${quotation.quotationNumber} — TechServ`,
    html: baseTemplate(content),
    attachments: pdfPath ? [{ filename: `${quotation.quotationNumber}.pdf`, path: pdfPath }] : [],
  });
}

// ── Send Invoice Email ────────────────────────────────────────────────────────

export async function sendInvoiceEmail(invoice, pdfPath) {
  const content = `
    <p>Dear ${invoice.client?.name || 'Client'},</p>
    <p>Please find attached your ${invoice.type.replace('_', ' ')} <strong>${invoice.invoiceNumber}</strong>.</p>
    <table>
      <thead><tr><th>Detail</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Subtotal</td><td>AED ${Number(invoice.subtotal).toFixed(2)}</td></tr>
        <tr><td>VAT (${invoice.vatPct}%)</td><td>AED ${Number(invoice.vatAmount).toFixed(2)}</td></tr>
        ${Number(invoice.retentionAmt) > 0 ? `<tr><td>Retention</td><td>(AED ${Number(invoice.retentionAmt).toFixed(2)})</td></tr>` : ''}
        <tr class="total-row"><td><strong>TOTAL DUE</strong></td><td><strong>AED ${Number(invoice.totalAmount).toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
    <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-AE')}</p>
    <p>Please arrange payment at your earliest convenience. Thank you for your business.</p>
    <p>Best regards,<br><strong>TechServ Finance Team</strong></p>`;

  return send({
    to: invoice.client?.email,
    subject: `Invoice ${invoice.invoiceNumber} — AED ${Number(invoice.totalAmount).toFixed(2)} Due ${new Date(invoice.dueDate).toLocaleDateString('en-AE')}`,
    html: baseTemplate(content),
    attachments: pdfPath ? [{ filename: `${invoice.invoiceNumber}.pdf`, path: pdfPath }] : [],
  });
}

// ── Send LPO Email ────────────────────────────────────────────────────────────

export async function sendLPOEmail(purchaseOrder) {
  const items = (purchaseOrder.items || []).map(i => `
    <tr>
      <td>${i.description || i.material?.name}</td>
      <td>${Number(i.quantity).toFixed(2)}</td>
      <td>AED ${Number(i.unitPrice).toFixed(2)}</td>
      <td>AED ${Number(i.totalPrice).toFixed(2)}</td>
    </tr>`).join('');

  const content = `
    <p>Dear ${purchaseOrder.supplier?.contactPerson || purchaseOrder.supplier?.name || 'Supplier'},</p>
    <p>Please find our Local Purchase Order <strong>${purchaseOrder.poNumber}</strong> below.</p>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${items}
        <tr class="total-row"><td colspan="3">Subtotal</td><td>AED ${Number(purchaseOrder.subtotal).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="3">VAT (5%)</td><td>AED ${Number(purchaseOrder.vatAmount).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="3"><strong>TOTAL</strong></td><td><strong>AED ${Number(purchaseOrder.totalAmount).toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
    ${purchaseOrder.deliveryDate ? `<p><strong>Required Delivery By:</strong> ${new Date(purchaseOrder.deliveryDate).toLocaleDateString('en-AE')}</p>` : ''}
    ${purchaseOrder.deliveryAddress ? `<p><strong>Delivery Address:</strong><br>${purchaseOrder.deliveryAddress}</p>` : ''}
    ${purchaseOrder.notes ? `<p><strong>Notes:</strong><br>${purchaseOrder.notes}</p>` : ''}
    <p>Please confirm receipt of this order and expected delivery date.</p>
    <p>Best regards,<br><strong>TechServ Procurement Team</strong></p>`;

  return send({
    to: purchaseOrder.supplier?.email,
    subject: `LPO ${purchaseOrder.poNumber} — AED ${Number(purchaseOrder.totalAmount).toFixed(2)}`,
    html: baseTemplate(content),
  });
}

// ── Send Payslip Email ────────────────────────────────────────────────────────

export async function sendPayslipEmail(employee, payrollItem, period, pdfPath) {
  const content = `
    <p>Dear ${employee.firstName} ${employee.lastName},</p>
    <p>Please find your payslip for <strong>${period}</strong> attached.</p>
    <table>
      <thead><tr><th>Component</th><th>Amount (AED)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td>${Number(payrollItem.basicSalary).toFixed(2)}</td></tr>
        <tr><td>Housing Allowance</td><td>${Number(payrollItem.housingAllowance).toFixed(2)}</td></tr>
        <tr><td>Transport Allowance</td><td>${Number(payrollItem.transportAllowance).toFixed(2)}</td></tr>
        <tr><td>Other Allowances</td><td>${Number(payrollItem.otherAllowances).toFixed(2)}</td></tr>
        <tr><td>Overtime Pay</td><td>${Number(payrollItem.overtimePay).toFixed(2)}</td></tr>
        <tr><td>Deductions</td><td>(${Number(payrollItem.deductions).toFixed(2)})</td></tr>
        <tr class="total-row"><td><strong>NET SALARY</strong></td><td><strong>${Number(payrollItem.netSalary).toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
    <p>If you have any queries, please contact the HR department.</p>
    <p>Best regards,<br><strong>TechServ HR Team</strong></p>`;

  return send({
    to: employee.email,
    subject: `Payslip — ${period} — TechServ`,
    html: baseTemplate(content),
    attachments: pdfPath ? [{ filename: `Payslip_${period.replace(' ', '_')}.pdf`, path: pdfPath }] : [],
  });
}

// ── Expiry Reminder Email ─────────────────────────────────────────────────────

export async function sendExpiryReminderEmail(employee, expiryItems) {
  const items = expiryItems.map(e => `<tr><td>${e.document}</td><td style="color:${e.days<0?'red':'orange'}">${e.days<0?'EXPIRED':e.days+' days left'}</td><td>${e.expiry}</td></tr>`).join('');
  const content = `
    <p>Dear HR Team,</p>
    <p>The following documents for employee <strong>${employee.firstName} ${employee.lastName}</strong> (${employee.employeeCode}) require attention:</p>
    <table>
      <thead><tr><th>Document</th><th>Status</th><th>Expiry Date</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <p>Please take the necessary action to renew these documents.</p>`;

  return send({
    to: config.HR_ALERT_EMAIL || config.FROM_EMAIL,
    subject: `⚠️ Document Expiry Alert — ${employee.firstName} ${employee.lastName}`,
    html: baseTemplate(content),
  });
}
