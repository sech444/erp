'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function ProjectProfitPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    accountingApi.getProjectProfit().then(r => setProjects(r.data.data)).finally(() => setLoading(false));
  }, []);

  const totalValue  = projects.reduce((s,p)=>s+p.projectValue,0);
  const totalProfit = projects.reduce((s,p)=>s+p.estimatedProfit,0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Project Profit Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          {projects.length} projects · Total value AED {totalValue.toLocaleString()} · Est. profit AED {totalProfit.toLocaleString()}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Code','Project','Client','Value','Budget','Actual Cost','Variance','Est. Profit','Margin %','Progress','Status'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={11} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : projects.map(p => (
              <tr key={p.projectCode} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{p.projectCode}</td>
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{p.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.client}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{p.projectValue.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{p.budget.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{p.actual.toLocaleString()}</td>
                <td className={clsx('px-4 py-3 tabular-nums font-semibold', p.variance>=0?'text-green-700':'text-red-700')}>{p.variance>=0?'+':''}{p.variance.toLocaleString()}</td>
                <td className={clsx('px-4 py-3 tabular-nums font-bold', p.estimatedProfit>=0?'text-emerald-700':'text-red-700')}>{p.estimatedProfit.toLocaleString()}</td>
                <td className={clsx('px-4 py-3 font-semibold', parseFloat(p.profitMarginPct)>=20?'text-emerald-700':parseFloat(p.profitMarginPct)>=10?'text-amber-700':'text-red-700')}>{p.profitMarginPct}%</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width:`${p.progressPct}%` }}/></div>
                    <span className="text-xs text-slate-500">{p.progressPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{p.status}</span></td>
              </tr>
            ))}
            {!loading && projects.length===0 && <tr><td colSpan={11} className="text-center py-12 text-slate-400">No projects yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
