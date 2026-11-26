import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Microscope,
  ShieldCheck,
  Filter,
  Layers,
  MapPin,
  Calendar,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const ResearcherDashboardPage = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [regionFilter, setRegionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAnonymousData = async () => {
    setLoading(true);
    try {
      let query = `/api/v1/soil/soil-history?size=50&anonymous=true`;
      if (regionFilter) query += `&region=${regionFilter}`;
      const res = await api.get(query);
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Error loading researcher data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnonymousData();
  }, [regionFilter]);

  // Aggregate NPK averages by region
  const regionalGroups = {};
  data.forEach(item => {
    const reg = item.region || 'General Agricultural Region';
    if (!regionalGroups[reg]) {
      regionalGroups[reg] = { region: reg, count: 0, totalN: 0, totalP: 0, totalK: 0 };
    }
    regionalGroups[reg].count += 1;
    regionalGroups[reg].totalN += item.nitrogenMgKg || 0;
    regionalGroups[reg].totalP += item.phosphorusMgKg || 0;
    regionalGroups[reg].totalK += item.potassiumMgKg || 0;
  });

  const regionalChartData = Object.values(regionalGroups).map(g => ({
    region: g.region,
    avgN: Math.round((g.totalN / g.count) * 10) / 10,
    avgP: Math.round((g.totalP / g.count) * 10) / 10,
    avgK: Math.round((g.totalK / g.count) * 10) / 10,
    count: g.count
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-800 p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-800/80 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-700 mb-2">
            <Microscope className="h-3.5 w-3.5 text-indigo-300" />
            <span>Breeder & Agronomic Research Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Anonymous Field Soil Diagnostics
          </h1>
          <p className="mt-1 text-xs text-indigo-200 max-w-2xl leading-relaxed">
            Privacy-preserving regional soil intelligence. All personal identities, owner identifiers, farm names, and exact GPS coordinates are masked into standardized anonymous field codes.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 p-4 border border-white/10 text-xs shrink-0 space-y-1">
          <div className="flex items-center gap-2 text-indigo-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white">Anonymity Enforced</span>
          </div>
          <p className="text-[11px] text-indigo-300">
            Compliant with NS-BR-06 & Researcher Governance.
          </p>
        </div>
      </div>

      {/* Region Filter */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="font-bold text-slate-700">Filter by Agricultural Region:</span>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-medium text-slate-800 focus:outline-none"
          >
            <option value="">All Available Regions</option>
            <option value="North Valley">North Valley</option>
            <option value="Central Plains">Central Plains</option>
            <option value="Southern Basin">Southern Basin</option>
            <option value="Eastern Highlands">Eastern Highlands</option>
            <option value="River Delta">River Delta</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Showing {data.length} of {total} research records
        </span>
      </div>

      {/* Regional NPK Aggregate Bar Chart */}
      {regionalChartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-forest-950">Regional NPK Nutrient Means</h3>
              <p className="text-xs text-slate-400">Mean chemical concentration by agricultural zone</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-emerald-600 rounded"></span> Nitrogen (N)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-amber-500 rounded"></span> Phosphorus (P)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-blue-600 rounded"></span> Potassium (K)</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="region" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }} />
                <Bar dataKey="avgN" fill="#16a34a" name="Avg N (mg/kg)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgP" fill="#eab308" name="Avg P (mg/kg)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgK" fill="#2563eb" name="Avg K (mg/kg)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Anonymous Research Records Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-base font-bold text-forest-950">Masked Soil Datasets</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly anonymized dataset for genetic correlation, breeding trials, and regional soil characterization.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Anonymous Code</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Depth</th>
                  <th className="py-3 px-4">Nitrogen (mg/kg)</th>
                  <th className="py-3 px-4">Phosphorus (mg/kg)</th>
                  <th className="py-3 px-4">Potassium (mg/kg)</th>
                  <th className="py-3 px-4">pH</th>
                  <th className="py-3 px-4">Moisture</th>
                  <th className="py-3 px-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-900 bg-indigo-50/40">
                      {row.anonymousFieldCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.region}</td>
                    <td className="py-3 px-4">{row.sampleDate}</td>
                    <td className="py-3 px-4">{row.depthCm} cm</td>
                    <td className="py-3 px-4 font-mono">{row.nitrogenMgKg ?? '-'}</td>
                    <td className="py-3 px-4 font-mono">{row.phosphorusMgKg ?? '-'}</td>
                    <td className="py-3 px-4 font-mono">{row.potassiumMgKg ?? '-'}</td>
                    <td className="py-3 px-4 font-mono">{row.ph ?? '-'}</td>
                    <td className="py-3 px-4 font-mono">{row.moisturePct ? `${row.moisturePct}%` : '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          row.healthStatus === 'GOOD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.healthStatus === 'FAIR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {row.healthStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ResearcherDashboardPage;
