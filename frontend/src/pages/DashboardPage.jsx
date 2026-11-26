import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Layers,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Calendar,
  Sparkles,
  MapPin
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/soil/dashboard/summary');
      setSummary(res.data);
    } catch (err) {
      setError('Unable to load dashboard summary metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-leaf-500 border-t-transparent"></div>
          <span className="text-xs font-semibold text-slate-500">Retrieving soil records from AWS RDS...</span>
        </div>
      </div>
    );
  }

  const healthData = [
    { name: 'GOOD Health', value: summary?.goodHealthCount || 0, color: '#16a34a' },
    { name: 'FAIR Health', value: summary?.fairHealthCount || 0, color: '#eab308' },
    { name: 'POOR Health', value: summary?.poorHealthCount || 0, color: '#dc2626' }
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 p-6 text-white shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-forest-800/80 px-3 py-1 text-xs font-semibold text-leaf-300 border border-forest-700 mb-2">
            <Sparkles className="h-3 w-3 text-leaf-400" />
            <span>Service 2: Soil & Nutrient Intelligence Active</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Welcome back, {user?.fullName || user?.email}
          </h1>
          <p className="mt-1 text-xs text-forest-200">
            Real-time Sunflower agronomy diagnostics. All measurements verified against biological thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'field_operator' && (
            <Link
              to="/submit-sample"
              className="inline-flex items-center gap-2 rounded-xl bg-leaf-500 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-leaf-600 transition-all"
            >
              <FlaskConical className="h-4 w-4" />
              <span>Submit New Sample</span>
            </Link>
          )}
          <button
            onClick={fetchSummary}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Fields</span>
            <Layers className="h-4 w-4 text-forest-700" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary?.accessibleFields || 0}</div>
          <span className="text-[11px] text-slate-500">Accessible fields</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Samples</span>
            <FlaskConical className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{summary?.totalSamples || 0}</div>
          <span className="text-[11px] text-slate-500">Tested samples</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Good</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-700">{summary?.goodHealthCount || 0}</div>
          <span className="text-[11px] text-emerald-600 font-medium">100% in good range</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">Fair</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700">{summary?.fairHealthCount || 0}</div>
          <span className="text-[11px] text-amber-600 font-medium">1 non-severe out</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-red-800">
            <span className="text-xs font-bold uppercase tracking-wider">Poor</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-red-700">{summary?.poorHealthCount || 0}</div>
          <span className="text-[11px] text-red-600 font-medium">2+ out or severe</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Problems</span>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-orange-600">
            {(summary?.deficiencyCount || 0) + (summary?.excessCount || 0)}
          </div>
          <span className="text-[11px] text-slate-500">
            {summary?.deficiencyCount || 0} Def / {summary?.excessCount || 0} Exc
          </span>
        </div>
      </div>

      {/* Visual Charts & Health Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Soil Health Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-forest-950">Soil Health Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Aggregated overall status across active fields</p>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} samples`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-2 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-600"></span>
              <span>GOOD ({summary?.goodHealthCount || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span>FAIR ({summary?.fairHealthCount || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600"></span>
              <span>POOR ({summary?.poorHealthCount || 0})</span>
            </div>
          </div>
        </div>

        {/* Recent Submissions Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-forest-950">Recent Soil Samples</h3>
              <p className="text-xs text-slate-500">Live records retrieved directly from AWS RDS</p>
            </div>
            <Link
              to="/history"
              className="text-xs font-bold text-forest-800 hover:text-forest-950 inline-flex items-center gap-1"
            >
              <span>View Full History</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {summary?.recentSubmissions?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No recent submissions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Sample ID</th>
                    <th className="py-3 px-4">Field ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Overall Health</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {summary?.recentSubmissions?.map((s) => (
                    <tr key={`${s.sampleId}-v${s.version}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.sampleId}</td>
                      <td className="py-3 px-4 font-mono">{s.fieldId}</td>
                      <td className="py-3 px-4">{s.sampleDate}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          v{s.version}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-forest-600"></span>
                          {s.state}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            s.healthStatus === 'GOOD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.healthStatus === 'FAIR'
                              ? 'bg-amber-100 text-amber-800'
                              : s.healthStatus === 'POOR'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.healthStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/analysis-results?sampleId=${s.sampleId}&version=${s.version}`}
                          className="font-bold text-leaf-700 hover:text-leaf-800 underline"
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
