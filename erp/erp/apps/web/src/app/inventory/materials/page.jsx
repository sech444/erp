'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { clsx } from 'clsx';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku:'', name:'', unit:'sqm', unitPrice:'', minStockLevel:'', description:'' });

  const load = async () => {
    setLoading(true);
    const res = await inventoryApi.getMaterials({ search, lowStock, limit: 50 });
    setMaterials(res.data.data);
    setMeta(res.data.meta || {});
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, lowStock]);

  const handleCreate = async () => {
    await inventoryApi.createMaterial(form);
    setShowForm(false);
    setForm({ sku:'', name:'', unit:'sqm', unitPrice:'', minStockLevel:'', description:'' });
    load();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materials</h1>
          <p className="text-sm text-slate-500 mt-1">{meta.total ?? materials.length} materials in database</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Material
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or name..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setLowStock(o => !o)}
          className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
            lowStock ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>
          <AlertTriangle size={14} /> Low Stock Only
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Material</h2>
            {[{k:'sku',l:'SKU *'},{k:'name',l:'Name *'},{k:'description',l:'Description'},{k:'unit',l:'Unit (sqm/kg/pcs/ltr)'},{k:'unitPrice',l:'Unit Price (AED) *',t:'number'},{k:'minStockLevel',l:'Min Stock Level',t:'number'}].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label>
                <input type={f.t||'text'} value={form[f.k]} onChange={e => setForm(p=>({...p,[f.k]:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add Material</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['SKU','Name','Category','Unit','Price (AED)','Stock','Min Level','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : materials.map(m => {
              const isLow = Number(m.currentStock) <= Number(m.minStockLevel);
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-500">{m.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{m.unit}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{Number(m.unitPrice).toFixed(2)}</td>
                  <td className={clsx('px-4 py-3 font-bold', isLow ? 'text-red-600' : 'text-slate-900')}>
                    {Number(m.currentStock).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{Number(m.minStockLevel).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {isLow ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                        <AlertTriangle size={11} /> Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && materials.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No materials found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
