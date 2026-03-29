'use client';
import { useEffect, useState } from 'react';
import { documentsApi } from '@/lib/api';
import { Upload, FolderOpen, FileText, Download } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORIES = ['CONTRACT','INVOICE','LPO','DRAWING','EMPLOYEE_DOC','PROJECT_PHOTO','WARRANTY','INSURANCE','OTHER'];
const CAT_COLORS  = { CONTRACT:'bg-blue-100 text-blue-700', INVOICE:'bg-green-100 text-green-700', LPO:'bg-indigo-100 text-indigo-700', DRAWING:'bg-purple-100 text-purple-700', EMPLOYEE_DOC:'bg-orange-100 text-orange-700', PROJECT_PHOTO:'bg-pink-100 text-pink-700', WARRANTY:'bg-emerald-100 text-emerald-700', INSURANCE:'bg-amber-100 text-amber-700', OTHER:'bg-slate-100 text-slate-600' };

export default function DocumentsPage() {
  const [docs, setDocs]         = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name:'', category:'CONTRACT', fileUrl:'', notes:'' });

  const load = () => { setLoading(true); documentsApi.getAll({ category: category||undefined, limit:100 }).then(r=>setDocs(r.data.data)).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[category]);

  const handleCreate = async () => { await documentsApi.upload(form); setShowForm(false); setForm({ name:'', category:'CONTRACT', fileUrl:'', notes:'' }); load(); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
          <p className="text-sm text-slate-500 mt-1">{docs.length} documents</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Upload size={16}/> Upload Document</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['',...CATEGORIES].map(c=>(
          <button key={c} onClick={()=>setCategory(c)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', category===c?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>{c||'All'}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Upload Document</h2>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
              </select>
            </div>
            {[{k:'name',l:'Document Name *'},{k:'fileUrl',l:'File URL / Path'},{k:'notes',l:'Notes'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type="text" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Upload</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? <div className="col-span-4 text-center py-12 text-slate-400">Loading...</div>
        : docs.map(d=>(
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0"><FileText size={18} className="text-slate-500"/></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{d.name}</p>
                <span className={clsx('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium', CAT_COLORS[d.category])}>{d.category.replace('_',' ')}</span>
              </div>
            </div>
            {d.project && <p className="text-xs text-slate-500 mb-1">Project: {d.project.projectCode}</p>}
            {d.notes && <p className="text-xs text-slate-400 mb-2 truncate">{d.notes}</p>}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
              {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"><Download size={12}/> View</a>}
            </div>
          </div>
        ))}
        {!loading && docs.length===0 && <div className="col-span-4 text-center py-16 text-slate-400"><FolderOpen size={32} className="mx-auto mb-2 opacity-30"/>No documents yet</div>}
      </div>
    </div>
  );
}
