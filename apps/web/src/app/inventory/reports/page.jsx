'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function InventoryReportsPage() {
  const [summary, setSummary]         = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([inventoryApi.getSummary(), inventoryApi.getConsumption({})])
      .then(([s, c]) => { setSummary(s.data.data); setConsumption(c.data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-400">Loading reports...</div>;

  const chartData = consumption.slice(0, 10).map(c => ({ name: c.material?.name?.slice(0, 20) || '?', qty: Number(c.totalConsumed), value: c.estimatedValue }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Inventory Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Materials',  value: summary?.totalMaterials ?? 0 },
          { label: 'Low Stock Items',  value: summary?.lowStockCount  ?? 0 },
          { label: 'Total Stock Value',value: `AED ${((summary?.totalStockValue || 0)/1000).toFixed(1)}K` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Top 10 Consumed Materials (Quantity)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }}/>
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }}/>
              <Tooltip/>
              <Bar dataKey="qty" fill="#3b82f6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-slate-400 text-sm py-8 text-center">No consumption data yet</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-800">Consumption Detail</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>{['Material','SKU','Unit','Total Consumed','Transactions','Est. Value (AED)'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consumption.map((c,i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.material?.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.material?.sku}</td>
                <td className="px-4 py-3 text-slate-500">{c.material?.unit}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{Number(c.totalConsumed).toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">{c.transactions}</td>
                <td className="px-4 py-3 text-slate-700">{Number(c.estimatedValue).toLocaleString()}</td>
              </tr>
            ))}
            {consumption.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
