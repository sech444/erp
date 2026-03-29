'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ date, label }) {
  if (!date) return <span className="text-xs text-slate-300">—</span>;
  const days = daysUntil(date);
  const color = days < 0 ? 'text-red-700 bg-red-100' : days <= 30 ? 'text-orange-700 bg-orange-100' : 'text-amber-700 bg-amber-100';
  return (
    <div>
      <div className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}>
        <AlertTriangle size={10}/>
        {days < 0 ? `EXPIRED ${Math.abs(days)}d ago` : `${days}d left`}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{new Date(date).toLocaleDateString()}</div>
    </div>
  );
}

export default function ExpiryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    hrApi.getExpiryAlerts().then(r => setEmployees(r.data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Expiry Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">Employees with documents expiring within 60 days</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3"/>
          <p className="font-semibold text-slate-700">All documents are valid</p>
          <p className="text-sm text-slate-400 mt-1">No employee documents expiring in the next 60 days</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Employee','Code','Position','Visa','Passport','Emirates ID','Insurance','Medical'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{e.firstName} {e.lastName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.employeeCode}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{e.position}</td>
                  <td className="px-4 py-3"><ExpiryBadge date={e.visaExpiry}/></td>
                  <td className="px-4 py-3"><ExpiryBadge date={e.passportExpiry}/></td>
                  <td className="px-4 py-3"><ExpiryBadge date={e.emiratesIdExpiry}/></td>
                  <td className="px-4 py-3"><ExpiryBadge date={e.insuranceExpiry}/></td>
                  <td className="px-4 py-3"><ExpiryBadge date={e.medicalExpiry}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
