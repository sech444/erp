/**
 * Generates a unique Purchase Order number: PO-2026-00042
 */
export async function generatePoNumber(prisma) {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Generates a unique Quotation number: QT-2026-00017
 */
export async function generateQuotationNumber(prisma) {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `QT-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Formats a Decimal value to 2dp string (for API responses)
 */
export function formatCurrency(value) {
  return Number(value || 0).toFixed(2);
}
