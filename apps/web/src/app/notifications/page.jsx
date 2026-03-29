'use client';
import { useEffect, useState } from 'react';
import { notificationsApi, inventoryApi } from '@/lib/api';
import { Bell, BellOff, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts]               = useState([]);
  const [loading, setLoading]             = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      notificationsApi.getAll({ limit: 50 }).catch(()=>({ data:{ data:[] } })),
      inventoryApi.getAlerts(),
    ]).then(([n,a])=>{ setNotifications(n.data.data||[]); setAlerts(a.data.data||[]); }).finally(()=>setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const markRead    = async (id) => { await notificationsApi.markRead(id); load(); };
  const markAllRead = async ()   => { await notificationsApi.markAllRead(); load(); };
  const dismissAlert= async (id) => { await inventoryApi.dismissAlert(id); setAlerts(a=>a.filter(x=>x.id!==id)); };

  const unread = notifications.filter(n=>!n.isRead).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-slate-500 mt-1">{unread} unread</p>}
        </div>
        {unread > 0 && <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><BellOff size={16}/> Mark All Read</button>}
      </div>

      {alerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500"/> System Alerts</h2>
          <div className="space-y-2">
            {alerts.map(a=>(
              <div key={a.id} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={()=>dismissAlert(a.id)} className="text-xs text-slate-400 hover:text-slate-700 shrink-0 underline">Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Bell size={14} className="text-blue-500"/> Notifications</h2>
        {loading ? <div className="text-center py-8 text-slate-400">Loading...</div>
        : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3"/>
            <p className="text-slate-600 font-medium">You're all caught up</p>
            <p className="text-sm text-slate-400 mt-1">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n=>(
              <div key={n.id} className={clsx('flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer', n.isRead?'bg-white border-slate-200':'bg-blue-50 border-blue-200')} onClick={()=>!n.isRead&&markRead(n.id)}>
                <Info size={16} className={n.isRead?'text-slate-400':'text-blue-600'} />
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm', n.isRead?'text-slate-700':'text-slate-900 font-semibold')}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5"/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
