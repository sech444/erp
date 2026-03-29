'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS = { DRAFT:'bg-slate-100 text-slate-600', SENT:'bg-blue-100 text-blue-700', PARTIALLY_RECEIVED:'bg-amber-100 text-amber-700', RECEIVED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700' };

export default function PurchaseOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    inventoryApi.getPOs({ status: status || undefined, limit: 50 }).then(r => setOrders(r.data.data)).finally(() => setLoading(false));
  }, [status]);

  const updateStatus = async (id, newStatus) => {
    await inventoryApi.createPO; // placeholder
    // call status update endpoint
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> New PO</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['PO #','Supplier','Items','Subtotal','VAT','Total (AED)','Status','Delivery Date','Created'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : orders.map(o => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{o.poNumber}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{o.supplier?.name}</td>
                <td className="px-4 py-3 text-slate-500">{o._count?.items ?? 0}</td>
                <td className="px-4 py-3 text-slate-700">{Number(o.subtotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{Number(o.vatAmount).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{Number(o.totalAmount).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS[o.status])}>{o.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && orders.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400">No purchase orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
