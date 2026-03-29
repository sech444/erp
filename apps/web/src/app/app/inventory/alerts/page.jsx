'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { AlertTriangle, CheckCircle, BellOff } from 'lucide-react';
import { clsx } from 'clsx';

const TYPE_COLORS = { LOW_STOCK:'bg-red-50 border-red-200 text-red-700', VEHICLE_SERVICE:'bg-amber-50 border-amber-200 text-amber-700', VISA_EXPIRY:'bg-orange-50 border-orange-200 text-orange-700' };

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); inventoryApi.getAlerts().then(r => setAlerts(r.data.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const dismiss = async (id) => { await inventoryApi.dismissAlert(id); setAlerts(a => a.filter(x => x.id !== id)); };
  const dismissAll = async () => { await inventoryApi.dismissAlert('all'); load(); };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">{alerts.length} unread alerts</p>
        </div>
        {alerts.length > 0 && (
          <button onClick={() => { alerts.forEach(a => dismiss(a.id)); }} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <BellOff size={16}/> Dismiss All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3"/>
          <p className="font-semibold text-slate-700">All clear — no active alerts</p>
          <p className="text-sm text-slate-400 mt-1">Alerts appear here when stock falls below minimum levels or documents are expiring</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={clsx('flex items-start gap-4 p-4 rounded-xl border', TYPE_COLORS[a.type] || 'bg-amber-50 border-amber-200')}>
              <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                {a.material && <p className="text-xs mt-1 opacity-60">SKU: {a.material.sku}</p>}
                <p className="text-xs mt-1 opacity-50">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => dismiss(a.id)} className="shrink-0 text-xs opacity-60 hover:opacity-100 underline">Dismiss</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
