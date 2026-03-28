'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { ACTIVE:'bg-green-50 text-green-700', INACTIVE:'bg-slate-100 text-slate-600', ON_LEAVE:'bg-amber-50 text-amber-700', TERMINATED:'bg-red-50 text-red-700' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await hrApi.getEmployees({ search, limit: 50 });
    setEmployees(res.data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const expiryWarning = (date) => {
    if (!date) return false;
    return new Date(date) <= new Date(Date.now() + 60*24*60*60*1000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Code','Name','Department','Position','Status','Basic Salary','Visa Expiry','Emirates ID Expiry'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.employeeCode}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3 text-slate-500">{emp.department?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{emp.position}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[emp.status])}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">AED {Number(emp.basicSalary).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {emp.visaExpiry ? (
                    <span className={clsx('flex items-center gap-1 text-xs', expiryWarning(emp.visaExpiry) ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                      {expiryWarning(emp.visaExpiry) && <AlertTriangle size={12} />}
                      {new Date(emp.visaExpiry).toLocaleDateString()}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {emp.emiratesIdExpiry ? (
                    <span className={clsx('text-xs', expiryWarning(emp.emiratesIdExpiry) ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                      {new Date(emp.emiratesIdExpiry).toLocaleDateString()}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!loading && employees.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
