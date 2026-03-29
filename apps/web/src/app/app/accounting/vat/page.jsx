'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { Plus, Calculator } from 'lucide-react';
import { clsx } from 'clsx';

export default function VATPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [form, setForm] = useState({ period:'', startDate:'', endDate:'' });

  const load = () => { setLoading(true); accountingApi.getVATReturns().then(r=>setReturns(r.data.data)).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const handleCalc = async () => { await accountingApi.calcVAT(form); setShowCalc(false); load(); };
  const handleSubmit = async (id) => { await accountingApi.calcVAT; /* call submit endpoint */ load(); };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">VAT Returns</h1>
          <p className="text-sm text-slate-500 mt-1">UAE FTA 5% VAT compliance</p>
        </div>
        <button onClick={()=>setShowCalc(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Calculator size={16}/> Calculate VAT Return</button>
      </div>

      {showCalc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Calculate VAT Return</h2>
            {[{k:'period',l:'Period (e.g. Q1-2026)'},{k:'startDate',l:'Start Date',t:'date'},{k:'endDate',l:'End Date',t:'date'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowCalc(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCalc} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Calculate</button></div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <div className="text-center py-12 text-slate-400">Loading...</div>
        : returns.map(r=>(
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{r.period}</h3>
                <p className="text-xs text-slate-500">{new Date(r.startDate).toLocaleDateString()} — {new Date(r.endDate).toLocaleDateString()}</p>
              </div>
              <span className={clsx('px-3 py-1 rounded-full text-xs font-bold',
                r.status==='PAID'?'bg-green-100 text-green-700':r.status==='SUBMITTED'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-600')}>
                {r.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Output VAT (Sales)</p>
                <p className="text-lg font-bold text-green-700">AED {Number(r.outputVAT).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Input VAT (Purchases)</p>
                <p className="text-lg font-bold text-blue-700">AED {Number(r.inputVAT).toLocaleString()}</p>
              </div>
              <div className={clsx('rounded-lg p-3 text-center', Number(r.netVAT)>=0?'bg-red-50':'bg-emerald-50')}>
                <p className="text-xs text-slate-500">Net VAT Payable</p>
                <p className={clsx('text-lg font-bold', Number(r.netVAT)>=0?'text-red-700':'text-emerald-700')}>AED {Number(r.netVAT).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {!loading && returns.length===0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Calculator size={32} className="mx-auto mb-2 opacity-30"/>
            No VAT returns yet — calculate your first return above
          </div>
        )}
      </div>
    </div>
  );
}
