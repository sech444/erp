'use client';
import { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PLPage() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear]   = useState(new Date().getFullYear());

  const load = () => {
    setLoading(true);
    accountingApi.getPL({ startDate: `${year}-01-01`, endDate: `${year}-12-31` })
      .then(r => setData(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [year]);

  const chartData = data ? [
    { name: 'Revenue',       value: data.revenue.total,       color: '#10b981' },
    { name: 'Payroll',       value: data.expenses.payroll,    color: '#ef4444' },
    { name: 'Materials',     value: data.expenses.materials,  color: '#f59e0b' },
    { name: 'Gross Profit',  value: Math.max(0, data.grossProfit), color: '#3b82f6' },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Profit & Loss</h1>
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Loading...</div> : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Total Revenue',   value:`AED ${(data.revenue.total/1000).toFixed(0)}K`,       color:'text-emerald-700' },
              { label:'Total Expenses',  value:`AED ${(data.expenses.total/1000).toFixed(0)}K`,      color:'text-red-700' },
              { label:'Gross Profit',    value:`AED ${(data.grossProfit/1000).toFixed(0)}K`,          color: data.grossProfit>=0?'text-blue-700':'text-red-700' },
              { label:'Gross Margin',    value:`${data.grossMarginPct}%`,                             color:'text-slate-900' },
            ].map(k=>(
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Revenue vs Expenses vs Profit</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip formatter={v=>[`AED ${Number(v).toLocaleString()}`]}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {chartData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3">Revenue Breakdown</h3>
              <div className="space-y-3">
                {[['Invoiced (excl. VAT)', data.revenue.invoiced],['VAT Collected', data.revenue.vatCollected],['Outstanding', data.revenue.pending]].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-sm"><span className="text-slate-600">{l}</span><span className="font-semibold text-slate-900">AED {Number(v).toLocaleString()}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3">Expense Breakdown</h3>
              <div className="space-y-3">
                {[['Payroll', data.expenses.payroll],['Materials', data.expenses.materials],['Total', data.expenses.total]].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-sm"><span className="text-slate-600">{l}</span><span className={`font-semibold ${l==='Total'?'text-red-700':'text-slate-900'}`}>AED {Number(v).toLocaleString()}</span></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
