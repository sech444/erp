'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { Plus, FileText } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { DRAFT:'bg-slate-100 text-slate-600', SENT:'bg-blue-100 text-blue-700', PARTIAL:'bg-amber-100 text-amber-700', PAID:'bg-green-100 text-green-700', OVERDUE:'bg-red-100 text-red-700', CANCELLED:'bg-slate-100 text-slate-400' };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    accountingApi.getInvoices({ status: status || undefined, limit: 50 })
      .then(r => setInvoices(r.data.data))
      .finally(() => setLoading(false));
  }, [status]);

  const total = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const paid  = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Total: AED {total.toLocaleString()} · Collected: AED {paid.toLocaleString()}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Invoice #','Type','Client','Project','Amount (AED)','VAT','Total','Due Date','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{inv.type.replace('_',' ')}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{inv.client?.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{inv.project?.projectCode || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{Number(inv.subtotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{Number(inv.vatAmount).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{Number(inv.totalAmount).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[inv.status])}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
