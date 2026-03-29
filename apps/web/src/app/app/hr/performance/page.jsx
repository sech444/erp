'use client';
import { useEffect, useState } from 'react';
import { hrApi } from '@/lib/api';
import { Plus, Star } from 'lucide-react';

export default function PerformancePage() {
  const [reviews, setReviews]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ employeeId:'', reviewDate: new Date().toISOString().split('T')[0], reviewPeriod:'', overallScore:'', strengths:'', improvements:'', managerNotes:'', kpis:'[]' });

  const load = () => {
    setLoading(true);
    Promise.all([hrApi.getReviews({}), hrApi.getEmployees({ status:'ACTIVE', limit:200 })])
      .then(([r,e])=>{ setReviews(r.data.data); setEmployees(e.data.data); }).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleCreate = async () => {
    await hrApi.createReview({ ...form, kpis: JSON.parse(form.kpis || '[]'), overallScore: parseFloat(form.overallScore) });
    setShowForm(false); load();
  };

  function scoreColor(score) {
    if (score >= 80) return 'text-green-700 bg-green-100';
    if (score >= 60) return 'text-amber-700 bg-amber-100';
    return 'text-red-700 bg-red-100';
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Performance Reviews</h1>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> New Review</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">New Performance Review</h2>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Employee *</label>
              <select value={form.employeeId} onChange={e=>setForm(p=>({...p,employeeId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select employee...</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            {[
              {k:'reviewDate',    l:'Review Date',   t:'date'},
              {k:'reviewPeriod',  l:'Period (e.g. Q1 2026)'},
              {k:'overallScore',  l:'Overall Score (0–100)', t:'number'},
              {k:'strengths',     l:'Strengths'},
              {k:'improvements',  l:'Areas for Improvement'},
              {k:'managerNotes',  l:'Manager Notes'},
            ].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label>
                <input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save Review</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        : reviews.map(r=>(
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-900">{r.employee?.firstName} {r.employee?.lastName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.employee?.position}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${scoreColor(Number(r.overallScore))}`}>
                {Number(r.overallScore).toFixed(0)}
              </span>
            </div>
            <p className="text-xs font-medium text-blue-600 mb-3">{r.reviewPeriod}</p>
            {r.strengths && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-slate-600 mb-1">Strengths</p>
                <p className="text-xs text-slate-500 line-clamp-2">{r.strengths}</p>
              </div>
            )}
            {r.improvements && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Improvements</p>
                <p className="text-xs text-slate-500 line-clamp-2">{r.improvements}</p>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">{new Date(r.reviewDate).toLocaleDateString()}</p>
          </div>
        ))}
        {!loading && reviews.length===0 && <div className="col-span-3 text-center py-16 text-slate-400">No performance reviews yet</div>}
      </div>
    </div>
  );
}
