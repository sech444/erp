'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';

const STATUS_COLORS = { PRESENT:'bg-green-100 text-green-700', ABSENT:'bg-red-100 text-red-700', HALF_DAY:'bg-amber-100 text-amber-700', ON_LEAVE:'bg-blue-100 text-blue-700', HOLIDAY:'bg-purple-100 text-purple-700' };

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ employeeId:'', date:'', status:'PRESENT', checkIn:'', checkOut:'', notes:'' });

  const load = () => {
    setLoading(true);
    Promise.all([hrApi.getAttendance({ date, limit: 100 }), hrApi.getEmployees({ status:'ACTIVE', limit: 200 })])
      .then(([a, e]) => { setAttendance(a.data.data); setEmployees(e.data.data); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  const handleSave = async () => { await hrApi.markAttendance({ ...form, date }); setShowForm(false); load(); };

  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const absentCount  = attendance.filter(a => a.status === 'ABSENT').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">{presentCount} present · {absentCount} absent · {attendance.length} total records</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Mark Attendance</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Mark Attendance</h2>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Employee *</label>
              <select value={form.employeeId} onChange={e=>setForm(p=>({...p,employeeId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select employee...</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {['PRESENT','ABSENT','HALF_DAY','ON_LEAVE','HOLIDAY'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            {['checkIn','checkOut'].map(f=>(
              <div key={f}><label className="block text-xs font-medium text-slate-700 mb-1">{f === 'checkIn' ? 'Check In' : 'Check Out'} Time</label>
                <input type="time" value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button><button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Employee','Code','Status','Check In','Check Out','Overtime (h)','Notes'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : attendance.map(a => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{a.employee?.firstName} {a.employee?.lastName}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.employee?.employeeCode}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[a.status])}>{a.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-slate-600">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td className="px-4 py-3 text-slate-700 font-medium">{Number(a.overtimeHours).toFixed(1)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{a.notes || '—'}</td>
              </tr>
            ))}
            {!loading && attendance.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No attendance records for {date}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
