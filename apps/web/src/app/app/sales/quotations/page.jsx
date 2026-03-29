'use client';
import { useEffect, useState } from 'react';
import { salesApi } from '@/lib/api';
import { Plus, FileText, Send } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS = { DRAFT:'bg-slate-100 text-slate-600', SENT:'bg-blue-100 text-blue-700', VIEWED:'bg-indigo-100 text-indigo-700', ACCEPTED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700', EXPIRED:'bg-orange-100 text-orange-700' };

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [status, setStatus]         = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    salesApi.getQuotations({ status: status || undefined, limit: 50 }).then(r => setQuotations(r.data.data)).finally(() => setLoading(false));
  }, [status]);

  const handleSend = async (id) => { await salesApi.sendQuotation(id); setQuotations(q => q.map(x => x.id === id ? { ...x, status: 'SENT' } : x)); };

  const total = quotations.reduce((s, q) => s + Number(q.totalAmount), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">Total value: AED {total.toLocaleString()}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> New Quotation</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Quotation #', 'Client', 'Scope', 'Subtotal', 'VAT', 'Total (AED)', 'Valid Until', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : quotations.map(q => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{q.quotationNumber}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{q.client?.name}</td>
                <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-xs">{q.scopeOfWork || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{Number(q.subtotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{Number(q.vatAmount).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{Number(q.totalAmount).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS[q.status])}>{q.status}</span></td>
                <td className="px-4 py-3">
                  {q.status === 'DRAFT' && (
                    <button onClick={() => handleSend(q.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Send size={12}/> Send
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && quotations.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">No quotations found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
