'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { Plus, Send, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { DRAFT:'bg-slate-100 text-slate-600', SENT:'bg-blue-100 text-blue-700', PARTIAL:'bg-amber-100 text-amber-700', PAID:'bg-green-100 text-green-700', OVERDUE:'bg-red-100 text-red-700', CANCELLED:'bg-slate-100 text-slate-400' };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm]   = useState({ amount:'', method:'BANK_TRANSFER', reference:'', paidAt: new Date().toISOString().split('T')[0] });

  const load = () => {
    setLoading(true);
    accountingApi.getInvoices({ status: status||undefined, limit:50 }).then(r=>setInvoices(r.data.data)).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[status]);

  const handleSend    = async (id) => { await accountingApi.sendInvoice(id); load(); };
  const handlePayment = async () => {
    await accountingApi.addPayment(payModal.id, payForm);
    setPayModal(null);
    setPayForm({ amount:'', method:'BANK_TRANSFER', reference:'', paidAt: new Date().toISOString().split('T')[0] });
    load();
  };

  const totalOutstanding = invoices
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Outstanding: <span className="font-semibold text-red-600">AED {totalOutstanding.toLocaleString()}</span>
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> New Invoice
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

      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
            <p className="text-sm text-slate-500">
              {payModal.invoiceNumber} — Outstanding: AED {(Number(payModal.totalAmount) - Number(payModal.paidAmount)).toLocaleString()}
            </p>
            {[
              { k:'amount',    l:'Amount (AED) *', t:'number' },
              { k:'reference', l:'Reference / Cheque #' },
              { k:'paidAt',    l:'Payment Date', t:'date' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label>
                <input type={f.t || 'text'} value={payForm[f.k]} onChange={e => setPayForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
              <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {['CASH','BANK_TRANSFER','CHEQUE','ONLINE'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPayModal(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
              <button onClick={handlePayment} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Invoice #','Type','Client','Project','Total (AED)','Paid','Outstanding','Due Date','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : invoices.map(inv => {
              const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{inv.type.replace('_',' ')}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.client?.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{inv.project?.projectCode || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">{Number(inv.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-700 tabular-nums">{Number(inv.paidAmount).toLocaleString()}</td>
                  <td className={clsx('px-4 py-3 font-semibold tabular-nums', outstanding > 0 ? 'text-red-600' : 'text-green-700')}>
                    {outstanding > 0 ? outstanding.toLocaleString() : 'Settled'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[inv.status])}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => handleSend(inv.id)} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" title="Send">
                          <Send size={13}/>
                        </button>
                      )}
                      {['SENT','PARTIAL','OVERDUE'].includes(inv.status) && (
                        <button onClick={() => setPayModal(inv)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Record Payment">
                          <DollarSign size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
