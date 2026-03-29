'use client';
import { useEffect, useState } from 'react';
import { pettyCashApi } from '@/lib/api';
import { Plus, Check, X, Wallet } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { PENDING:'bg-amber-100 text-amber-700', APPROVED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700', REIMBURSED:'bg-blue-100 text-blue-700' };
const CATEGORIES = ['OFFICE','SITE','FUEL','MISC'];

export default function PettyCashPage() {
  const [requests, setRequests] = useState([]);
  const [funds, setFunds]       = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ fundId:'', category:'OFFICE', description:'', amount:'', expenseDate:new Date().toISOString().split('T')[0] });

  const load = () => {
    setLoading(true);
    Promise.all([pettyCashApi.getRequests({ status: status||undefined }), pettyCashApi.getFunds()])
      .then(([r,f])=>{ setRequests(r.data.data); setFunds(f.data.data); }).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[status]);

  const handleCreate  = async () => { await pettyCashApi.createRequest(form); setShowForm(false); load(); };
  const handleApprove = async (id) => { await pettyCashApi.approve(id); load(); };
  const handleReject  = async (id) => { await pettyCashApi.reject(id, { reason:'Rejected' }); load(); };

  const totalPending  = requests.filter(r=>r.status==='PENDING').reduce((s,r)=>s+Number(r.amount),0);
  const totalApproved = requests.filter(r=>r.status==='APPROVED').reduce((s,r)=>s+Number(r.amount),0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Petty Cash</h1>
          <p className="text-sm text-slate-500 mt-1">AED {totalPending.toLocaleString()} pending · AED {totalApproved.toLocaleString()} approved</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> New Request</button>
      </div>

      {/* Fund balances */}
      {funds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map(f=>(
            <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Wallet size={18} className="text-emerald-600"/></div>
              <div>
                <p className="font-semibold text-slate-900">{f.name}</p>
                <p className="text-sm text-emerald-700 font-bold">AED {Number(f.balance).toLocaleString()}</p>
                <p className="text-xs text-slate-400">Limit: AED {Number(f.maxLimit).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['','PENDING','APPROVED','REJECTED'].map(s=>(
          <button key={s} onClick={()=>setStatus(s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', status===s?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>{s||'All'}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Petty Cash Request</h2>
            {funds.length > 0 && (
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Fund *</label>
                <select value={form.fundId} onChange={e=>setForm(p=>({...p,fundId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select fund...</option>
                  {funds.map(f=><option key={f.id} value={f.id}>{f.name} (AED {Number(f.balance).toLocaleString()})</option>)}
                </select>
              </div>
            )}
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {[{k:'description',l:'Description *'},{k:'amount',l:'Amount (AED) *',t:'number'},{k:'expenseDate',l:'Expense Date',t:'date'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Submit</button></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Category','Description','Amount (AED)','Fund','Date','Requested By','Status','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : requests.map(r=>(
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{r.category}</span></td>
                <td className="px-4 py-3 text-slate-900 font-medium">{r.description}</td>
                <td className="px-4 py-3 font-bold text-slate-900">AED {Number(r.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.fund?.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.expenseDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.requestedBy?.name}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>{r.status}</span></td>
                <td className="px-4 py-3">
                  {r.status==='PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={()=>handleApprove(r.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={13}/></button>
                      <button onClick={()=>handleReject(r.id)}  className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X size={13}/></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && requests.length===0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">No petty cash requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
