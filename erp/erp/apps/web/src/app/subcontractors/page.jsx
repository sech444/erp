'use client';
import { useEffect, useState } from 'react';
import { subcontractorApi } from '@/lib/api';
import { Plus, Phone, Mail, Wrench } from 'lucide-react';

export default function SubcontractorsPage() {
  const [subs, setSubs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name:'', contactPerson:'', email:'', phone:'', specialty:'', address:'', taxNumber:'' });

  const load = () => { setLoading(true); subcontractorApi.getAll().then(r=>setSubs(r.data.data)).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const handleCreate = async () => { await subcontractorApi.create(form); setShowForm(false); setForm({ name:'',contactPerson:'',email:'',phone:'',specialty:'',address:'',taxNumber:'' }); load(); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Subcontractors</h1>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Add Subcontractor</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Subcontractor</h2>
            {[{k:'name',l:'Company Name *'},{k:'contactPerson',l:'Contact Person'},{k:'email',l:'Email',t:'email'},{k:'phone',l:'Phone'},{k:'specialty',l:'Specialty (e.g. Waterproofing)'},{k:'address',l:'Address'},{k:'taxNumber',l:'TRN'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        : subs.map(s=>(
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0"><Wrench size={18} className="text-orange-600"/></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{s.name}</h3>
                {s.specialty && <p className="text-xs text-blue-600 font-medium mt-0.5">{s.specialty}</p>}
                {s.contactPerson && <p className="text-xs text-slate-500">{s.contactPerson}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              {s.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12}/>{s.email}</div>}
              {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12}/>{s.phone}</div>}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
              <span>{s._count?.workOrders ?? 0} work orders</span>
              <span>{s._count?.payments  ?? 0} payments</span>
            </div>
          </div>
        ))}
        {!loading && subs.length===0 && <div className="col-span-3 text-center py-16 text-slate-400">No subcontractors added yet</div>}
      </div>
    </div>
  );
}
