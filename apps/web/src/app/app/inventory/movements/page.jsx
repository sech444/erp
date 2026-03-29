'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { ArrowDown, ArrowUp, ArrowLeftRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';

const TYPE_CONFIG = {
  IN:       { label: 'Stock In',    icon: ArrowDown,       color: 'bg-green-100 text-green-700' },
  OUT:      { label: 'Stock Out',   icon: ArrowUp,         color: 'bg-red-100 text-red-700' },
  TRANSFER: { label: 'Transfer',    icon: ArrowLeftRight,  color: 'bg-blue-100 text-blue-700' },
  ADJUSTMENT:{ label: 'Adjustment', icon: ArrowLeftRight,  color: 'bg-slate-100 text-slate-600' },
  RETURN:   { label: 'Return',      icon: ArrowDown,       color: 'bg-amber-100 text-amber-700' },
};

export default function MovementsPage() {
  const [movements, setMovements] = useState([]);
  const [type, setType]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [showIn, setShowIn]       = useState(false);
  const [showOut, setShowOut]     = useState(false);
  const [materials, setMaterials] = useState([]);
  const [form, setForm]           = useState({ materialId:'', quantity:'', reference:'', notes:'' });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      inventoryApi.getMovements({ type: type || undefined, limit: 100 }),
      inventoryApi.getMaterials({ limit: 200 }),
    ]).then(([m, mats]) => { setMovements(m.data.data); setMaterials(mats.data.data); }).finally(() => setLoading(false));
  }, [type]);

  const handleStockIn  = async () => { await inventoryApi.stockIn(form);  setShowIn(false);  setForm({ materialId:'', quantity:'', reference:'', notes:'' }); setType('IN'); };
  const handleStockOut = async () => { await inventoryApi.stockOut(form); setShowOut(false); setForm({ materialId:'', quantity:'', reference:'', notes:'' }); setType('OUT'); };

  const Modal = ({ title, onSave, onClose }) => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div><label className="block text-xs font-medium text-slate-700 mb-1">Material *</label>
          <select value={form.materialId} onChange={e => setForm(p => ({ ...p, materialId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select material...</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku}) — {Number(m.currentStock).toFixed(2)} {m.unit}</option>)}
          </select>
        </div>
        {[{k:'quantity',l:'Quantity *',t:'number'},{k:'reference',l:'Reference / PO #'},{k:'notes',l:'Notes'}].map(f=>(
          <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label>
            <input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        ))}
        <div className="flex gap-3 pt-2"><button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button><button onClick={onSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowIn(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><ArrowDown size={16}/> Stock In</button>
          <button onClick={() => setShowOut(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"><ArrowUp size={16}/> Stock Out</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {showIn  && <Modal title="Stock In"  onSave={handleStockIn}  onClose={() => setShowIn(false)}/>}
      {showOut && <Modal title="Stock Out" onSave={handleStockOut} onClose={() => setShowOut(false)}/>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Type','Material','SKU','Qty','Reference','Project','Date','By'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : movements.map(m => {
              const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.IN;
              const Icon = cfg.icon;
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', cfg.color)}><Icon size={11}/>{cfg.label}</span></td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.material?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.material?.sku}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{Number(m.quantity).toFixed(2)} {m.material?.unit}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{m.reference || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{m.project?.projectCode || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{m.performedBy?.name}</td>
                </tr>
              );
            })}
            {!loading && movements.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">No movements found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
