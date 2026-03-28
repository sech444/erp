// 'use client';

// import { useEffect, useState } from 'react';
// import {
//   BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
//   LineChart, Line, CartesianGrid, PieChart, Pie, Cell
// } from 'recharts';
// import {
//   TrendingUp, Package, Users, AlertTriangle, DollarSign,
//   FileText, Hammer, Bell, CheckCircle, Clock, ArrowUpRight
// } from 'lucide-react';
// import { dashboardApi } from '@/lib/api';
// import { clsx } from 'clsx';

// function KpiCard({ label, value, sub, icon: Icon, color, trend }) {
//   return (
//     <div className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4">
//       <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', color)}>
//         <Icon size={22} className="text-white" />
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="text-sm text-slate-500 font-medium">{label}</p>
//         <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
//         {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
//       </div>
//       {trend && (
//         <div className="flex items-start">
//           <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
//             trend > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
//           )}>
//             <ArrowUpRight size={12} className={trend < 0 ? 'rotate-180' : ''} />
//             {Math.abs(trend)}%
//           </span>
//         </div>
//       )}
//     </div>
//   );
// }

// function AlertCard({ alerts }) {
//   return (
//     <div className="bg-white rounded-xl border border-slate-200 p-5">
//       <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//         <Bell size={16} className="text-amber-500" />
//         Active Alerts
//       </h3>
//       <div className="space-y-3">
//         {alerts.map((a, i) => (
//           <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
//             <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
//             <div>
//               <p className="text-sm font-medium text-slate-800">{a.title}</p>
//               <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
//             </div>
//           </div>
//         ))}
//         {alerts.length === 0 && (
//           <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
//             <CheckCircle size={16} className="text-green-500" />
//             No active alerts
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// export default function DashboardPage() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     dashboardApi.summary()
//       .then(r => setData(r.data.data))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) {
//     return (
//       <div className="p-8 flex items-center justify-center min-h-64">
//         <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }

//   const s = data?.sales     || {};
//   const inv = data?.inventory || {};
//   const hr = data?.hr       || {};

//   const pipelineChartData = [
//     { name: 'New',       value: 4 },
//     { name: 'Contacted', value: 8 },
//     { name: 'Quoted',    value: 6 },
//     { name: 'Negotiation', value: 3 },
//     { name: 'Won',       value: s.wonLeads || 0 },
//   ];

//   const salesTrend = data?.salesTrend?.map(t => ({
//     month: new Date(t.month).toLocaleString('default', { month: 'short' }),
//     leads: Number(t.leads),
//     value: Number(t.pipeline_value) / 1000,
//   })) || [];

//   return (
//     <div className="p-6 space-y-6 max-w-7xl mx-auto">
//       {/* Header */}
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
//         <p className="text-sm text-slate-500 mt-1">
//           {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
//         </p>
//       </div>

//       {/* KPI Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <KpiCard
//           label="Total Leads"
//           value={s.totalLeads ?? '—'}
//           sub={`${s.wonLeads ?? 0} won · ${s.conversionRate ?? 0}% conversion`}
//           icon={TrendingUp}
//           color="bg-blue-600"
//           trend={12}
//         />
//         <KpiCard
//           label="Won Revenue"
//           value={`AED ${((s.totalWonValue || 0) / 1000).toFixed(0)}K`}
//           sub={`${s.activeQuotations ?? 0} quotations active`}
//           icon={DollarSign}
//           color="bg-emerald-600"
//           trend={8}
//         />
//         <KpiCard
//           label="Stock Value"
//           value={`AED ${((inv.totalStockValue || 0) / 1000).toFixed(0)}K`}
//           sub={`${inv.lowStockItems ?? 0} items below threshold`}
//           icon={Package}
//           color={inv.lowStockItems > 0 ? 'bg-amber-500' : 'bg-blue-600'}
//         />
//         <KpiCard
//           label="Active Employees"
//           value={hr.activeEmployees ?? '—'}
//           sub={`${hr.expiringDocs ?? 0} docs expiring · ${hr.pendingLeave ?? 0} leave pending`}
//           icon={Users}
//           color="bg-purple-600"
//         />
//       </div>

//       {/* Charts row */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {/* Sales trend */}
//         <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
//           <h3 className="font-semibold text-slate-800 mb-4">Sales Pipeline (6 months)</h3>
//           {salesTrend.length > 0 ? (
//             <ResponsiveContainer width="100%" height={200}>
//               <LineChart data={salesTrend}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="month" tick={{ fontSize: 12 }} />
//                 <YAxis tick={{ fontSize: 12 }} />
//                 <Tooltip formatter={(v, n) => [n === 'value' ? `${v}K AED` : v, n === 'value' ? 'Pipeline' : 'Leads']} />
//                 <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} />
//                 <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
//               </LineChart>
//             </ResponsiveContainer>
//           ) : (
//             <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet — leads will appear here</div>
//           )}
//         </div>

//         {/* Pipeline distribution */}
//         <div className="bg-white rounded-xl border border-slate-200 p-5">
//           <h3 className="font-semibold text-slate-800 mb-4">Pipeline Distribution</h3>
//           <ResponsiveContainer width="100%" height={180}>
//             <PieChart>
//               <Pie data={pipelineChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
//                 {pipelineChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="mt-2 space-y-1">
//             {pipelineChartData.map((item, i) => (
//               <div key={i} className="flex items-center justify-between text-xs">
//                 <div className="flex items-center gap-1.5">
//                   <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
//                   <span className="text-slate-600">{item.name}</span>
//                 </div>
//                 <span className="font-medium text-slate-800">{item.value}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Bottom row */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {/* Alerts */}
//         <AlertCard alerts={[
//           ...(inv.lowStockItems > 0 ? [{ title: 'Low Stock Items', message: `${inv.lowStockItems} materials below minimum threshold` }] : []),
//           ...(hr.expiringDocs > 0  ? [{ title: 'Document Expiry', message: `${hr.expiringDocs} employee documents expiring within 60 days` }] : []),
//           ...(hr.pendingLeave > 0  ? [{ title: 'Pending Leave Requests', message: `${hr.pendingLeave} leave requests awaiting approval` }] : []),
//         ]} />

//         {/* Recent Leads */}
//         <div className="bg-white rounded-xl border border-slate-200 p-5">
//           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             <TrendingUp size={16} className="text-blue-500" />
//             Recent Leads
//           </h3>
//           <div className="space-y-3">
//             {(data?.recent?.leads || []).map(lead => (
//               <div key={lead.id} className="flex items-start gap-3">
//                 <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
//                 <div className="min-w-0 flex-1">
//                   <p className="text-sm font-medium text-slate-800 truncate">{lead.title}</p>
//                   <p className="text-xs text-slate-400">{lead.client?.name} · {lead.status}</p>
//                 </div>
//               </div>
//             ))}
//             {!data?.recent?.leads?.length && (
//               <p className="text-sm text-slate-400 text-center py-4">No leads yet</p>
//             )}
//           </div>
//         </div>

//         {/* Recent Stock Movements */}
//         <div className="bg-white rounded-xl border border-slate-200 p-5">
//           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             <Package size={16} className="text-emerald-500" />
//             Recent Stock
//           </h3>
//           <div className="space-y-3">
//             {(data?.recent?.stockMovements || []).map(m => (
//               <div key={m.id} className="flex items-center gap-3">
//                 <span className={clsx(
//                   'px-2 py-0.5 rounded text-xs font-medium shrink-0',
//                   m.type === 'IN'  ? 'bg-green-50 text-green-700' :
//                   m.type === 'OUT' ? 'bg-red-50 text-red-700' :
//                   'bg-slate-100 text-slate-600'
//                 )}>
//                   {m.type}
//                 </span>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-sm text-slate-800 truncate">{m.material?.name}</p>
//                   <p className="text-xs text-slate-400">Qty: {m.quantity}</p>
//                 </div>
//               </div>
//             ))}
//             {!data?.recent?.stockMovements?.length && (
//               <p className="text-sm text-slate-400 text-center py-4">No movements yet</p>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Package, Users, AlertTriangle, DollarSign,
  CheckCircle, ArrowUpRight, RefreshCw, Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchDashboard() {
  const token = localStorage.getItem('accessToken');
  const res = await axios.get(`${API}/api/v1/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

async function fetchInventorySummary() {
  const token = localStorage.getItem('accessToken');
  const res = await axios.get(`${API}/api/v1/inventory/reports/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

async function fetchAlerts() {
  const token = localStorage.getItem('accessToken');
  const res = await axios.get(`${API}/api/v1/inventory/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend != null && (
        <div className="flex items-start pt-1">
          <span className={clsx(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          )}>
            <ArrowUpRight size={11} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  );
}

const STAGE_COLORS = ['#64748b','#3b82f6','#6366f1','#f59e0b','#10b981','#ef4444'];
const PIE_LABELS  = ['New','Contacted','Quoted','Negotiation','Won','Lost'];

export default function DashboardPage() {
  const [dash,    setDash]    = useState(null);
  const [inv,     setInv]     = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, i, a] = await Promise.all([
        fetchDashboard().catch(() => null),
        fetchInventorySummary().catch(() => null),
        fetchAlerts().catch(() => []),
      ]);
      setDash(d);
      setInv(i);
      setAlerts(Array.isArray(a) ? a : []);
    } catch (e) {
      setError('Could not load dashboard data. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s   = dash?.sales     || {};
  const hr  = dash?.hr        || {};
  const inv2= dash?.inventory || inv || {};

  const pieData = [
    { name: 'New',         value: 4  },
    { name: 'Contacted',   value: 8  },
    { name: 'Quoted',      value: 6  },
    { name: 'Negotiation', value: 3  },
    { name: 'Won',         value: s.wonLeads || 0 },
    { name: 'Lost',        value: 1  },
  ].filter(d => d.value > 0);

  const salesTrend = (dash?.salesTrend || []).map(t => ({
    month: new Date(t.month).toLocaleString('default', { month: 'short' }),
    Leads: Number(t.leads),
    'Pipeline (K AED)': (Number(t.pipeline_value) / 1000).toFixed(1),
  }));

  const barData = [
    { label: 'Materials', value: inv2.totalMaterials || 0 },
    { label: 'Low Stock',  value: inv2.lowStockItems  || 0 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Leads"
          value={loading ? '…' : (s.totalLeads ?? 0)}
          sub={`${s.wonLeads ?? 0} won · ${s.conversionRate ?? 0}% conversion`}
          icon={TrendingUp}
          color="bg-blue-600"
          trend={12}
        />
        <KpiCard
          label="Won Revenue"
          value={loading ? '…' : `AED ${((s.totalWonValue || 0) / 1000).toFixed(0)}K`}
          sub={`${s.activeQuotations ?? 0} quotations active`}
          icon={DollarSign}
          color="bg-emerald-600"
          trend={8}
        />
        <KpiCard
          label="Stock Value"
          value={loading ? '…' : `AED ${((inv2.totalStockValue || 0) / 1000).toFixed(0)}K`}
          sub={`${inv2.lowStockItems ?? inv2.lowStockCount ?? 0} items below threshold`}
          icon={Package}
          color={(inv2.lowStockItems || inv2.lowStockCount) > 0 ? 'bg-amber-500' : 'bg-blue-600'}
        />
        <KpiCard
          label="Active Employees"
          value={loading ? '…' : (hr.activeEmployees ?? 0)}
          sub={`${hr.expiringDocs ?? 0} docs expiring · ${hr.pendingLeave ?? 0} leave pending`}
          icon={Users}
          color="bg-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sales trend line chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800">Sales Pipeline — Last 6 Months</h3>
          </div>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Pipeline (K AED)" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-slate-400 gap-2">
              <TrendingUp size={28} className="opacity-30" />
              <p className="text-sm">No pipeline data yet — create leads to see the trend</p>
            </div>
          )}
        </div>

        {/* Pipeline pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-800">Pipeline Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                {pieData.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Inventory bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-emerald-500" />
            <h3 className="font-semibold text-slate-800">Inventory Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={i === 1 && entry.value > 0 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Total value</span>
            <span className="font-semibold text-slate-800">
              AED {((inv2.totalStockValue || 0) / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        {/* Active alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="font-semibold text-slate-800">Active Alerts</h3>
            {alerts.length > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{alerts.length}</span>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.length > 0 ? alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                <CheckCircle size={24} className="text-emerald-400" />
                <p className="text-sm">No active alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent leads + stock */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-blue-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Recent Leads</h3>
            </div>
            <div className="space-y-2">
              {(dash?.recent?.leads || []).slice(0, 3).map(lead => (
                <div key={lead.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{lead.title}</p>
                    <p className="text-xs text-slate-400">{lead.status}</p>
                  </div>
                </div>
              ))}
              {!dash?.recent?.leads?.length && <p className="text-xs text-slate-400">No leads yet</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} className="text-emerald-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Recent Stock</h3>
            </div>
            <div className="space-y-2">
              {(dash?.recent?.stockMovements || []).slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className={clsx(
                    'px-1.5 py-0.5 rounded text-xs font-bold shrink-0',
                    m.type === 'IN'  ? 'bg-emerald-100 text-emerald-700' :
                    m.type === 'OUT' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  )}>{m.type}</span>
                  <p className="text-xs text-slate-700 truncate">{m.material?.name}</p>
                </div>
              ))}
              {!dash?.recent?.stockMovements?.length && <p className="text-xs text-slate-400">No movements yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}