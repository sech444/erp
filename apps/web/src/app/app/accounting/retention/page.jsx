'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export default function RetentionPage() {
  const [retentions, setRetentions] = useState([]);
  const [released, setReleased]     = useState('false');
  const [loading, setLoading]       = useState(true);
  const [releaseModal, setReleaseModal] = useState(null);
  const [releaseForm, setReleaseForm]   = useState({ releasedAmt:'', notes:'' });

  const load = () => {
    setLoading(true);
    accountingApi.getRetentions({ released }).then(r=>setRetentions(r.data.data)).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[released]);

  const handleRelease = async () => {
    await accountingApi.releaseRetention(releaseModal.id, releaseForm);
    setReleaseModal(null); load();
  };

  const totalHeld = retentions.filter(r=>!r.released).reduce((s,r)=>s+Number(r.retentionAmt),0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retention Management</h1>
          <p className="text-sm text-slate-500 mt-1">Total held: <span className="font-bold text-amber-600">AED {totalHeld.toLocaleString()}</span></p>
        </div>
      </div>

      <div className="flex gap-2">
        {[['false','Held'],['true','Released'],['','All']].map(([v,l])=>(
          <button key={v} onClick={()=>setReleased(v)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', released===v?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>{l}</button>
        ))}
      </div>

      {releaseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Release Retention</h2>
            <p className="text-sm text-slate-500">Total retention: AED {Number(releaseModal.retentionAmt).toLocaleString()}</p>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Amount to Release (AED)</label>
              <input type="number" value={releaseForm.releasedAmt} onChange={e=>setReleaseForm(p=>({...p,releasedAmt:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={Number(releaseModal.retentionAmt).toFixed(2)}/>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <input type="text" value={releaseForm.notes} onChange={e=>setReleaseForm(p=>({...p,notes:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3 pt-2"><button onClick={()=>setReleaseModal(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleRelease} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Release</button></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Project','Client','Invoice Value (AED)','Rate %','Retention (AED)','Due Date','Status','Action'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : retentions.map(r=>(
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.project?.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.client?.name}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{Number(r.invoiceValue).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-600">{Number(r.retentionPct)}%</td>
                <td className="px-4 py-3 font-bold text-amber-700 tabular-nums">{Number(r.retentionAmt).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', r.released?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700')}>
                    {r.released ? `Released AED ${Number(r.releasedAmt).toLocaleString()}` : 'Held'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!r.released && (
                    <button onClick={()=>setReleaseModal(r)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      <Check size={12}/> Release
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && retentions.length===0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">No retention records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
