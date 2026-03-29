'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function ARAgingPage() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getARaging().then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  const buckets = data ? [
    { label: 'Current (not overdue)', items: data.current,  color: 'border-green-200 bg-green-50' },
    { label: '1–30 days overdue',     items: data.days30,   color: 'border-amber-200 bg-amber-50' },
    { label: '31–60 days overdue',    items: data.days60,   color: 'border-orange-200 bg-orange-50' },
    { label: '61–90 days overdue',    items: data.days90,   color: 'border-red-200 bg-red-50' },
    { label: '90+ days overdue',      items: data.over90,   color: 'border-red-300 bg-red-100' },
  ] : [];

  const total = buckets.reduce((s,b)=>s + b.items.reduce((s2,i)=>s2+i.outstanding,0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AR Aging Report</h1>
          <p className="text-sm text-slate-500 mt-1">Total outstanding: AED {total.toLocaleString()}</p>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Loading...</div> : (
        <div className="space-y-4">
          {buckets.map((bucket, bi) => (
            <div key={bi} className={clsx('rounded-xl border p-5', bucket.color)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">{bucket.label}</h3>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{bucket.items.length} invoices</span>
                  <p className="font-bold text-slate-900">AED {bucket.items.reduce((s,i)=>s+i.outstanding,0).toLocaleString()}</p>
                </div>
              </div>
              {bucket.items.length > 0 && (
                <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
                  <thead className="bg-slate-50"><tr>{['Invoice','Client','Outstanding (AED)','Due Date','Days Past'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {bucket.items.map((item,i)=>(
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">{item.invoiceNumber}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{item.client}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{item.outstanding.toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-semibold text-red-600">{item.daysPast > 0 ? `${item.daysPast}d` : 'Current'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {bucket.items.length === 0 && <p className="text-sm text-slate-400 text-center py-2">None</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
