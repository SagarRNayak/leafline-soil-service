import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Search,
  Filter,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Edit3,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const SoilHistoryPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fieldFilter, setFieldFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = `/api/v1/soil/soil-history?page=${page}&size=15`;
      if (fieldFilter) query += `&fieldId=${fieldFilter}`;
      if (regionFilter) query += `&region=${regionFilter}`;
      if (fromDate) query += `&from=${fromDate}`;
      if (toDate) query += `&to=${toDate}`;

      const res = await api.get(query);
      setItems(res.data.items);
      setTotal(res.data.total);
      setIsAnonymous(res.data.isAnonymous);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleExportCSV = () => {
    if (!items || items.length === 0) return;
    const headers = ["Sample ID", "Field ID", "Date", "Version", "Depth (cm)", "Nitrogen (mg/kg)", "Phosphorus (mg/kg)", "Potassium (mg/kg)", "pH", "Moisture (%)", "Health Status"];
    const rows = items.map(i => [
      i.sampleId,
      isAnonymous ? i.anonymousFieldCode : i.fieldId,
      i.sampleDate,
      i.version,
      i.depthCm,
      i.nitrogenMgKg ?? "",
      i.phosphorusMgKg ?? "",
      i.potassiumMgKg ?? "",
      i.ph ?? "",
      i.moisturePct ?? "",
      i.healthStatus
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leafline_Soil_History_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Prepare chart data chronologically (oldest to newest)
  const chartData = [...items]
    .filter(i => i.nitrogenMgKg !== null)
    .sort((a, b) => new Date(a.sampleDate) - new Date(b.sampleDate))
    .map(i => ({
      date: i.sampleDate,
      label: `${i.sampleDate} (v${i.version})`,
      N: i.nitrogenMgKg,
      P: i.phosphorusMgKg,
      K: i.potassiumMgKg,
      pH: i.ph,
      Moisture: i.moisturePct
    }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Soil History & Trends</h1>
          <p className="mt-1 text-xs text-slate-500">
            Module 6: Temporal Historical Records. Filter by field, date range, or region.
          </p>
        </div>

        {isAnonymous && (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
            Breeder / Researcher Anonymized View Active
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleFilterSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        {!isAnonymous && (
          <div className="relative min-w-[160px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter Field ID (e.g. fld_0412)"
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-forest-700 focus:outline-none"
            />
          </div>
        )}

        <div className="relative min-w-[150px]">
          <Filter className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Region (e.g. Central)"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2 pl-8 pr-3 text-xs focus:border-forest-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-slate-300 py-1.5 px-2.5 text-xs text-slate-700 focus:border-forest-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-slate-300 py-1.5 px-2.5 text-xs text-slate-700 focus:border-forest-700 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-forest-900 px-4 py-2 text-xs font-bold text-white hover:bg-forest-800 transition-all shadow-sm"
        >
          Apply Filters
        </button>

        <button
          type="button"
          onClick={() => {
            setFieldFilter('');
            setRegionFilter('');
            setFromDate('');
            setToDate('');
            setPage(1);
            fetchHistory();
          }}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-forest-300 bg-forest-50 px-3 py-2 text-xs font-bold text-forest-900 hover:bg-forest-100 transition-colors shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-forest-700" />
          <span>Export CSV</span>
        </button>
      </form>

      {/* Interactive Trend Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NPK Timeline Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-forest-950 mb-1">NPK Nutrients Over Time (mg/kg)</h3>
            <p className="text-[11px] text-slate-400 mb-4">Historical Nitrogen, Phosphorus and Potassium levels</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="N" stroke="#16a34a" strokeWidth={2} name="Nitrogen (20-40)" />
                  <Line type="monotone" dataKey="P" stroke="#eab308" strokeWidth={2} name="Phosphorus (15-30)" />
                  <Line type="monotone" dataKey="K" stroke="#3b82f6" strokeWidth={2} name="Potassium (120-250)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* pH and Moisture Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-forest-950 mb-1">Soil pH & Moisture Levels</h3>
            <p className="text-[11px] text-slate-400 mb-4">Acidity (pH) and Volumetric Moisture percentage (%)</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="pH" stroke="#8b5cf6" strokeWidth={2} name="pH (6.0-7.5)" />
                  <Line type="monotone" dataKey="Moisture" stroke="#06b6d4" strokeWidth={2} name="Moisture % (15-45)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* History Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-forest-950">Soil Measurement Records</h3>
            <p className="text-xs text-slate-500">Total {total} historical records found</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-leaf-500 border-t-transparent mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No historical records matched your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sample ID</th>
                  <th className="py-3 px-4">{isAnonymous ? 'Field Code (Anon)' : 'Field ID'}</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Depth</th>
                  <th className="py-3 px-4">N (mg/kg)</th>
                  <th className="py-3 px-4">P (mg/kg)</th>
                  <th className="py-3 px-4">K (mg/kg)</th>
                  <th className="py-3 px-4">pH</th>
                  <th className="py-3 px-4">Moisture</th>
                  <th className="py-3 px-4">Overall Health</th>
                  {!isAnonymous && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((row) => (
                  <tr key={`${row.sampleId}-v${row.version}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.sampleId}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-forest-900">
                      {isAnonymous ? row.anonymousFieldCode : row.fieldId}
                    </td>
                    <td className="py-3 px-4">{row.sampleDate}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        v{row.version}
                      </span>
                    </td>
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
                            : row.healthStatus === 'POOR'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.healthStatus}
                      </span>
                    </td>
                    {!isAnonymous && (
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/analysis-results?sampleId=${row.sampleId}&version=${row.version}`}
                          className="font-bold text-leaf-700 hover:text-leaf-800 underline"
                        >
                          View
                        </Link>
                        {user?.role === 'field_operator' && (
                          <Link
                            to={`/sample-correction?sampleId=${row.sampleId}`}
                            className="font-bold text-forest-800 hover:text-forest-950 underline"
                          >
                            Correct
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {Math.ceil(total / 15) || 1}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= Math.ceil(total / 15)}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SoilHistoryPage;
