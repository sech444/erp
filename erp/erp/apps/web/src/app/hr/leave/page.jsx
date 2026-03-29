'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { Plus, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { PENDING:'bg-amber-100 text-amber-700', APPROVED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700', CANCELLED:'bg-slate-100 text-slate-600' };
const LEAVE_TYPES   = ['ANNUAL','SICK','EMERGENCY','UNPAID','MATERNITY','PATERNITY'];

export default function LeavePage() {
  const [leaves, setLeaves]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ employeeId:'', type:'ANNUAL', startDate:'', endDate:'', reason:'' });

  const load = () => {
    setLoading(true);
    Promise.all([
      hrApi.getLeaves({ status: status || undefined }),
      hrApi.getEmployees({ status:'ACTIVE', limit:200 }),
    ]).then(([l, e]) => { setLeaves(l.data.data); setEmployees(e.data.data); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [status]);

  const handleCreate  = async () => { await hrApi.createLeave(form); setShowForm(false); setForm({ employeeId:'', type:'ANNUAL', startDate:'', endDate:'', reason:'' }); load(); };
  const handleApprove = async (id) => { await hrApi.approveLeave(id); load(); };
  const handleReject  = async (id) => { await hrApi.rejectLeave(id, { reason: 'Rejected by manager' }); load(); };

  const totalDays = leaves.reduce((s, l) => s + l.totalDays, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
          <p className="text-sm text-slate-500 mt-1">{leaves.filter(l=>l.status==='PENDING').length} pending approval · {totalDays} total days</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> New Request</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['','PENDING','APPROVED','REJECTED'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', status===s?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>{s||'All'}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Leave Request</h2>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Employee *</label>
              <select value={form.employeeId} onChange={e=>setForm(p=>({...p,employeeId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select employee...</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Leave Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {LEAVE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {[{k:'startDate',l:'Start Date',t:'date'},{k:'endDate',l:'End Date',t:'date'},{k:'reason',l:'Reason'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Submit Request</button></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Employee','Type','From','To','Days','Reason','Status','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : leaves.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{l.employee?.firstName} {l.employee?.lastName}</td>
                <td className="px-4 py-3 text-slate-600 text-xs font-medium">{l.type}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(l.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(l.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{l.totalDays}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{l.reason || '—'}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[l.status])}>{l.status}</span></td>
                <td className="px-4 py-3">
                  {l.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(l.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={13}/></button>
                      <button onClick={() => handleReject(l.id)}  className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X size={13}/></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && leaves.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">No leave requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
