'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ projectId:'', clientId:'', issueDate:'', expiryDate:'', scope:'', terms:'' });

  const load = () => { setLoading(true); axios.get(`${API}/api/v1/warranties`, auth()).then(r=>setWarranties(r.data.data||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const handleCreate = async () => { await axios.post(`${API}/api/v1/warranties`, form, auth()); setShowForm(false); load(); };

  function daysLeft(date) {
    return Math.ceil((new Date(date) - new Date()) / 86400000);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Warranty Certificates</h1>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Issue Warranty</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Issue Warranty Certificate</h2>
            {[{k:'projectId',l:'Project ID'},{k:'clientId',l:'Client ID'},{k:'issueDate',l:'Issue Date',t:'date'},{k:'expiryDate',l:'Expiry Date',t:'date'},{k:'scope',l:'Scope of Warranty'},{k:'terms',l:'Terms & Conditions'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Issue</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        : warranties.map(w=>{
          const days = daysLeft(w.expiryDate);
          return (
            <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0"><ShieldCheck size={18} className="text-emerald-600"/></div>
                <div>
                  <p className="font-bold text-slate-900 font-mono text-sm">{w.certNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Issued {new Date(w.issueDate).toLocaleDateString()}</p>
                </div>
              </div>
              {w.scope && <p className="text-xs text-slate-600 mb-3 line-clamp-2">{w.scope}</p>}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Expires</span>
                  <span className={days < 0 ? 'text-red-600 font-bold' : days <= 90 ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                    {new Date(w.expiryDate).toLocaleDateString()} {days < 0 ? '(EXPIRED)' : `(${days}d)`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && warranties.length===0 && (
          <div className="col-span-3 text-center py-16 text-slate-400"><ShieldCheck size={32} className="mx-auto mb-2 opacity-30"/>No warranty certificates yet</div>
        )}
      </div>
    </div>
  );
}
