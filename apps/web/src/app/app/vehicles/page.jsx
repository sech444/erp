'use client';
import { useEffect, useState } from 'react';
import { vehicleApi } from '@/lib/api';
import { Plus, Car } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_COLORS = { ACTIVE:'bg-green-100 text-green-700', UNDER_MAINTENANCE:'bg-amber-100 text-amber-700', INACTIVE:'bg-slate-100 text-slate-600' };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ plateNumber:'', make:'', model:'', year: new Date().getFullYear(), type:'Van' });

  const load = () => { setLoading(true); vehicleApi.getVehicles().then(r => setVehicles(r.data.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => { await vehicleApi.createVehicle(form); setShowForm(false); load(); };

  function expiryClass(date) {
    if (!date) return 'text-slate-300';
    const days = Math.ceil((new Date(date) - new Date()) / 86400000);
    return days < 0 ? 'text-red-600 font-bold' : days <= 30 ? 'text-orange-600 font-semibold' : 'text-slate-600';
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Vehicle Fleet</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={16}/> Add Vehicle</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add Vehicle</h2>
            {[{k:'plateNumber',l:'Plate Number *'},{k:'make',l:'Make (e.g. Toyota)'},{k:'model',l:'Model'},{k:'year',l:'Year',t:'number'},{k:'type',l:'Type (Van/Truck/Car)'},{k:'assignedTo',l:'Assigned To'}].map(f=>(
              <div key={f.k}><label className="block text-xs font-medium text-slate-700 mb-1">{f.l}</label><input type={f.t||'text'} value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button><button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add Vehicle</button></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
        : vehicles.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Car size={18} className="text-blue-600"/></div>
                <div>
                  <p className="font-bold text-slate-900">{v.plateNumber}</p>
                  <p className="text-sm text-slate-500">{v.make} {v.model} {v.year}</p>
                </div>
              </div>
              <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[v.status])}>{v.status.replace('_',' ')}</span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Type:</span><span className="text-slate-700 font-medium">{v.type}</span></div>
              {v.assignedTo && <div className="flex justify-between"><span className="text-slate-500">Assigned:</span><span className="text-slate-700">{v.assignedTo}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Insurance:</span><span className={expiryClass(v.insuranceExpiry)}>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Registration:</span><span className={expiryClass(v.registrationExpiry)}>{v.registrationExpiry ? new Date(v.registrationExpiry).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Next service:</span><span className={expiryClass(v.nextServiceDate)}>{v.nextServiceDate ? new Date(v.nextServiceDate).toLocaleDateString() : '—'}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
              <span>{v._count?.fuelLogs ?? 0} fuel logs</span>
              <span>{v._count?.maintenanceLogs ?? 0} service records</span>
            </div>
          </div>
        ))}
        {!loading && vehicles.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400">No vehicles added yet</div>}
      </div>
    </div>
  );
}
