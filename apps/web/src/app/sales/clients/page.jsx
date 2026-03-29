'use client';
import { useEffect, useState } from 'react';
import { salesApi } from '@/lib/api';
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name:'', contactPerson:'', email:'', phone:'', address:'', taxNumber:'' });

  const load = () => {
    setLoading(true);
    salesApi.getClients({ search, limit: 50 }).then(r => setClients(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  const handleCreate = async () => {
    await salesApi.createClient(form);
    setShowForm(false);
    setForm({ name:'', contactPerson:'', email:'', phone:'', address:'', taxNumber:'' });
    load();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> New Client
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Client</h2>
            {[
              { k:'name',          l:'Company Name *' },
              { k:'contactPerson', l:'Contact Person' },
              { k:'email',         l:'Email', t:'email' },
              { k:'phone',         l:'Phone' },
              { k:'address',       l:'Address' },
              { k:'taxNumber',     l:'TRN (UAE VAT Number)' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label>
                <input type={f.t || 'text'} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Client</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        ) : clients.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-blue-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                {c.contactPerson && <p className="text-sm text-slate-500">{c.contactPerson}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {c.email    && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12}/>{c.email}</div>}
              {c.phone    && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12}/>{c.phone}</div>}
              {c.taxNumber && <div className="text-xs text-slate-400">TRN: {c.taxNumber}</div>}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
              <span>{c._count?.leads ?? 0} leads</span>
              <span>{c._count?.quotations ?? 0} quotations</span>
            </div>
          </div>
        ))}
        {!loading && clients.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">No clients yet — add your first client</div>
        )}
      </div>
    </div>
  );
}
