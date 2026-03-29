'use client';

import { useEffect, useState } from 'react';
import { salesApi } from '@/lib/api';
import { Plus, Search, Phone, Mail, Calendar, TrendingUp, Filter } from 'lucide-react';
import { clsx } from 'clsx';

const STAGES = [
  { key: 'NEW',            label: 'New Lead',        color: 'bg-slate-100 text-slate-700' },
  { key: 'CONTACTED',      label: 'Contacted',       color: 'bg-blue-100 text-blue-700' },
  { key: 'QUOTATION_SENT', label: 'Quotation Sent',  color: 'bg-indigo-100 text-indigo-700' },
  { key: 'NEGOTIATION',    label: 'Negotiation',     color: 'bg-amber-100 text-amber-700' },
  { key: 'WON',            label: 'Won',             color: 'bg-green-100 text-green-700' },
  { key: 'LOST',           label: 'Lost',            color: 'bg-red-100 text-red-700' },
];

function LeadCard({ lead, onStatusChange }) {
  const stage = STAGES.find(s => s.key === lead.status);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight">{lead.title}</h3>
        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', stage?.color)}>
          {stage?.label}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{lead.client?.name || lead.contactName}</p>

      {lead.estimatedValue && (
        <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold mb-3">
          <TrendingUp size={12} />
          AED {Number(lead.estimatedValue).toLocaleString()}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-400">
          {lead.contactPhone && <Phone size={12} />}
          {lead.contactEmail && <Mail size={12} />}
          {lead.followUpDate && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Calendar size={11} />
              {new Date(lead.followUpDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{lead.assignedTo?.name}</span>
      </div>

      {/* Quick status change */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <select
          value={lead.status}
          onChange={e => onStatusChange(lead.id, e.target.value)}
          onClick={e => e.stopPropagation()}
          className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white"
        >
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads]       = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('list'); // list | pipeline
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', contactName: '', contactEmail: '', contactPhone: '', source: 'OTHER', estimatedValue: '' });

  const load = async () => {
    setLoading(true);
    const [leadsRes, pipelineRes] = await Promise.all([
      salesApi.getLeads({ search, limit: 50 }),
      salesApi.getPipeline(),
    ]);
    setLeads(leadsRes.data.data);
    setPipeline(pipelineRes.data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const handleStatusChange = async (id, status) => {
    await salesApi.updateLead(id, { status });
    load();
  };

  const handleCreate = async () => {
    await salesApi.createLead(form);
    setShowForm(false);
    setForm({ title: '', contactName: '', contactEmail: '', contactPhone: '', source: 'OTHER', estimatedValue: '' });
    load();
  };

  const totalPipelineValue = pipeline.filter(s => !['WON','LOST'].includes(s.stage)).reduce((s, x) => s + x.value, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads & Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pipeline value: <span className="font-semibold text-slate-800">AED {totalPipelineValue.toLocaleString()}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Lead
        </button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {pipeline.map(s => (
          <div key={s.stage} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.count}</p>
            <p className="text-xs text-slate-500 mt-1">{STAGES.find(st => st.key === s.stage)?.label}</p>
            {s.value > 0 && <p className="text-xs text-emerald-600 font-medium mt-1">AED {(s.value / 1000).toFixed(0)}K</p>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {['list', 'pipeline'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx('px-4 py-2 text-sm font-medium capitalize transition-colors',
                view === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New Lead</h2>
            {[
              { key: 'title',        label: 'Lead Title',    type: 'text',  required: true },
              { key: 'contactName',  label: 'Contact Name',  type: 'text',  required: true },
              { key: 'contactEmail', label: 'Email',         type: 'email' },
              { key: 'contactPhone', label: 'Phone',         type: 'tel' },
              { key: 'estimatedValue', label: 'Est. Value (AED)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-700 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {['REFERRAL','WEBSITE','COLD_CALL','EXHIBITION','SOCIAL_MEDIA','TENDER','OTHER'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Leads list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : view === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Lead', 'Client', 'Status', 'Est. Value', 'Assigned To', 'Follow-Up', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{lead.title}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.client?.name || lead.contactName}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STAGES.find(s => s.key === lead.status)?.color)}>
                      {STAGES.find(s => s.key === lead.status)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {lead.estimatedValue ? `AED ${Number(lead.estimatedValue).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{lead.assignedTo?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={e => handleStatusChange(lead.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600"
                    >
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No leads found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban pipeline view */
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.status === stage.key);
            return (
              <div key={stage.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold', stage.color)}>{stage.label}</span>
                  <span className="text-xs font-bold text-slate-600">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
