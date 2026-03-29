'use client';
import { useEffect, useState } from 'react';
import { salesApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function SalesAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salesApi.getAnalytics().then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-400">Loading analytics...</div>;

  const sourceData = (data?.leadsBySource || []).map(s => ({ name: s.source, value: s._count.id }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Sales Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads',      value: data?.totalLeads ?? 0 },
          { label: 'Won Leads',        value: data?.wonLeads ?? 0 },
          { label: 'Conversion Rate',  value: `${data?.conversionRate ?? 0}%` },
          { label: 'Won Revenue',      value: `AED ${((data?.totalWonValue || 0) / 1000).toFixed(0)}K` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Pipeline Value by Source (AED)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={(data?.leadsBySource || []).map(s => ({ name: s.source, value: Number(s._sum.estimatedValue || 0) / 1000 }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip formatter={v => [`${v}K AED`]}/>
              <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-2">Active Clients</h3>
        <p className="text-3xl font-bold text-slate-900">{data?.activeClients ?? 0}</p>
        <p className="text-sm text-slate-500 mt-1">Total active client accounts</p>
      </div>
    </div>
  );
}
