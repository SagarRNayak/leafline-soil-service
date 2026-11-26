import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const NutrientDeficiencyPage = () => {
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState('fld_0412');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.get('/api/v1/soil/fields');
        setFields(res.data);
        if (res.data.length > 0) {
          setSelectedField(res.data[0].fieldId);
        }
      } catch (err) {
        console.warn("Could not fetch fields");
      }
    };
    fetchFields();
  }, []);

  // Fetch soil health and flags for selected field
  useEffect(() => {
    if (!selectedField) return;
    const fetchHealth = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/v1/soil/soil-health?fieldId=${selectedField}`);
        setHealthData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'No health data available for this field.');
        setHealthData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, [selectedField]);

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'slight':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'SLIGHT (<= 10% deviation)' };
      case 'moderate':
        return { bg: 'bg-orange-100 text-orange-800 border-orange-200', label: 'MODERATE (10%–25% deviation)' };
      case 'severe':
        return { bg: 'bg-red-100 text-red-800 border-red-200', label: 'SEVERE (> 25% deviation)' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'NORMAL' };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Nutrient Deficiency & Excess</h1>
          <p className="mt-1 text-xs text-slate-500">
            Module 5: Agronomic Problems. Detailed rule-based thresholds merged with private Soil & Nutrient AI view.
          </p>
        </div>

        {fields.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Select Field:</span>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none"
            >
              {fields.map(f => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.fieldId} - {f.region}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-leaf-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <p className="font-bold">{error}</p>
          <p className="mt-1 text-xs text-amber-700">Submit a soil sample to evaluate deficiencies.</p>
        </div>
      ) : healthData ? (
        <>
          {/* Header Summary Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-forest-900 p-3 text-white">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Target Field: <span className="font-mono text-slate-900">{healthData.fieldId}</span>
                </span>
                <h3 className="text-lg font-bold text-forest-950">
                  Sample {healthData.sampleId} (v{healthData.version}) – Health: {healthData.healthStatus}
                </h3>
                <span className="text-xs text-slate-500">
                  Analysed at {healthData.analysedAt ? new Date(healthData.analysedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">AI View Engine:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-leaf-50 text-leaf-800 border border-leaf-200">
                <Sparkles className="h-3.5 w-3.5 text-leaf-600" />
                <span>{healthData.aiView || 'AI View Pending'}</span>
              </span>
            </div>
          </div>

          {/* Deficiency & Excess Flags Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-forest-950">Nutrient Status & Severity Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays both deterministic rule-based flags and predictive Soil AI view. Rule flags remain primary in any conflict.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Nutrient</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Severity (Distance)</th>
                  <th className="py-3.5 px-6">Rule-Based Flag</th>
                  <th className="py-3.5 px-6">AI Predictive View</th>
                  <th className="py-3.5 px-6">Disagreement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {healthData.flags?.map((f) => {
                  const isDeficient = f.state === 'DEFICIENT' || f.state === 'LOW';
                  const isExcess = f.state === 'EXCESS' || f.state === 'HIGH';
                  const isOK = f.state === 'OK';
                  const sevInfo = getSeverityBadge(f.severity);

                  return (
                    <tr key={f.nutrient} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 capitalize text-sm">
                        {f.nutrient}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            isDeficient
                              ? 'bg-amber-100 text-amber-800'
                              : isExcess
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDeficient && <TrendingDown className="h-3.5 w-3.5" />}
                          {isExcess && <TrendingUp className="h-3.5 w-3.5" />}
                          {isOK && <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>{isOK ? 'OPTIMAL' : f.state}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {f.severity ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevInfo.bg}`}>
                            {sevInfo.label}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">None (In Range)</span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-mono font-semibold text-slate-800">
                        {f.ruleFlag || f.state}
                      </td>

                      <td className="py-4 px-6 font-mono">
                        {f.aiFlag ? (
                          <span className="inline-flex items-center gap-1 text-leaf-800 font-bold">
                            <span>{f.aiFlag}</span>
                            {f.aiScore && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({Math.round(f.aiScore * 100)}% conf)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">AI View Pending</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {f.disagreement ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            <span>AI Diverged (Rule Kept)</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Aligned</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};
export default NutrientDeficiencyPage;
