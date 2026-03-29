'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { Plus, Phone, Mail, Package } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name:'', contactPerson:'', email:'', phone:'', address:'', taxNumber:'', paymentTerms:'' });

  const load = () => { setLoading(true); inventoryApi.getSuppliers().then(r => setSuppliers(r.data.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => { await inventoryApi.createSupplier(form); setShowForm(false); setForm({ name:'',contactPerson:'',email:'',phone:'',address:'',taxNumber:'',paymentTerms:'' }); load(); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Add Supplier</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Supplier</h2>
            {[{k:'name',l:'Supplier Name *'},{k:'contactPerson',l:'Contact Person'},{k:'email',l:'Email',t:'email'},{k:'phone',l:'Phone'},{k:'address',l:'Address'},{k:'taxNumber',l:'TRN'},{k:'paymentTerms',l:'Payment Terms (e.g. Net 30)'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add Supplier</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        : suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-slate-900">{s.name}</h3>
            {s.contactPerson && <p className="text-sm text-slate-500 mt-0.5">{s.contactPerson}</p>}
            <div className="mt-3 space-y-1.5">
              {s.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12}/>{s.email}</div>}
              {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12}/>{s.phone}</div>}
              {s.paymentTerms && <div className="text-xs text-slate-400">Terms: {s.paymentTerms}</div>}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Package size={11}/>{s._count?.materials ?? 0} materials</span>
              <span>{s._count?.purchaseOrders ?? 0} POs</span>
            </div>
          </div>
        ))}
        {!loading && suppliers.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400">No suppliers yet</div>}
      </div>
    </div>
  );
}
