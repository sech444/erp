'use client';
import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import { Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { PLANNING:'bg-slate-100 text-slate-700', ACTIVE:'bg-blue-100 text-blue-700', ON_HOLD:'bg-amber-100 text-amber-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.getProjects({ limit: 50 })
      .then(r => setProjects(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        ) : projects.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-mono text-xs text-slate-400">{p.projectCode}</p>
                <h3 className="font-semibold text-slate-900 mt-0.5">{p.name}</h3>
                <p className="text-sm text-slate-500">{p.client?.name}</p>
              </div>
              <span className={clsx('px-2 py-1 rounded-full text-xs font-medium shrink-0', STATUS_COLORS[p.status])}>
                {p.status}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span><span>{Number(p.progressPct).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${p.progressPct}%` }} />
              </div>
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-slate-100 text-sm">
              <span className="text-slate-500">Value</span>
              <span className="font-semibold text-slate-900">AED {Number(p.projectValue).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {!loading && projects.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">No projects yet</div>
        )}
      </div>
    </div>
  );
}
