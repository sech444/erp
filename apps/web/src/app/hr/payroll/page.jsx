'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { Plus, Check, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS = { DRAFT:'bg-slate-100 text-slate-600', APPROVED:'bg-blue-100 text-blue-700', PAID:'bg-green-100 text-green-700' };
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showGen, setShowGen]   = useState(false);
  const [genForm, setGenForm]   = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [detail, setDetail]     = useState(null);

  const load = () => { setLoading(true); hrApi.getPayrolls().then(r => setPayrolls(r.data.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleGenerate = async () => { await hrApi.generatePayroll(genForm); setShowGen(false); load(); };
  const handleApprove  = async (id) => { await hrApi.approvePayroll(id); load(); };
  const handleMarkPaid = async (id) => { await hrApi.markPaid(id); load(); };
  const handleDetail   = async (id) => { const r = await hrApi.getPayroll(id); setDetail(r.data.data); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
        <button onClick={() => setShowGen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Generate Payroll</button>
      </div>

      {showGen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Generate Payroll</h2>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
              <select value={genForm.month} onChange={e=>setGenForm(p=>({...p,month:parseInt(e.target.value)}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
              <input type="number" value={genForm.year} onChange={e=>setGenForm(p=>({...p,year:parseInt(e.target.value)}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowGen(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button><button onClick={handleGenerate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Generate</button></div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Payroll — {MONTHS[detail.periodMonth-1]} {detail.periodYear}</h2>
              <button onClick={()=>setDetail(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr>{['Employee','Basic','Housing','Transport','Other','OT Pay','Deductions','Net'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items?.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{item.employee?.firstName} {item.employee?.lastName}</td>
                    {[item.basicSalary, item.housingAllowance, item.transportAllowance, item.otherAllowances, item.overtimePay, item.deductions].map((v,i)=>(
                      <td key={i} className="px-3 py-2 text-slate-600 tabular-nums">{Number(v).toLocaleString()}</td>
                    ))}
                    <td className="px-3 py-2 font-bold text-slate-900 tabular-nums">{Number(item.netSalary).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Period','Employees','Total Basic','Allowances','Overtime','Deductions','Net Total','Status','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
            : payrolls.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>handleDetail(p.id)}>
                <td className="px-4 py-3 font-semibold text-slate-900">{MONTHS[p.periodMonth-1]} {p.periodYear}</td>
                <td className="px-4 py-3 text-slate-600">{p._count?.items ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{Number(p.totalBasic).toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{Number(p.totalAllowances).toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{Number(p.totalOvertime).toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">({Number(p.totalDeductions).toLocaleString()})</td>
                <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">AED {Number(p.totalNet).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS[p.status])}>{p.status}</span></td>
                <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                  {p.status === 'DRAFT'    && <button onClick={()=>handleApprove(p.id)}  className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><Check size={12}/> Approve</button>}
                  {p.status === 'APPROVED' && <button onClick={()=>handleMarkPaid(p.id)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"><DollarSign size={12}/> Mark Paid</button>}
                </td>
              </tr>
            ))}
            {!loading && payrolls.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400">No payroll records — generate first payroll above</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
