import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export const SampleCorrectionPage = () => {
  const [searchParams] = useSearchParams();
  const sampleIdParam = searchParams.get('sampleId');

  const { user } = useAuth();
  const navigate = useNavigate();

  const [sampleId, setSampleId] = useState(sampleIdParam || '');
  const [currentSample, setCurrentSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Form fields for modification
  const [formData, setFormData] = useState({
    nitrogenMgKg: '',
    phosphorusMgKg: '',
    potassiumMgKg: '',
    ph: '',
    moisturePct: '',
    depthCm: '',
    labReference: ''
  });

  const loadSample = async (sId) => {
    if (!sId) return;
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const res = await api.get(`/api/v1/soil/soil-measurements/${sId}`);
      setCurrentSample(res.data);
      setFormData({
        nitrogenMgKg: res.data.measurements?.nitrogenMgKg ?? '',
        phosphorusMgKg: res.data.measurements?.phosphorusMgKg ?? '',
        potassiumMgKg: res.data.measurements?.potassiumMgKg ?? '',
        ph: res.data.measurements?.ph ?? '',
        moisturePct: res.data.measurements?.moisturePct ?? '',
        depthCm: res.data.depthCm ?? '',
        labReference: res.data.labReference ?? ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve sample.');
      setCurrentSample(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sampleIdParam) {
      loadSample(sampleIdParam);
    }
  }, [sampleIdParam]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        nitrogenMgKg: parseFloat(formData.nitrogenMgKg),
        phosphorusMgKg: parseFloat(formData.phosphorusMgKg),
        potassiumMgKg: parseFloat(formData.potassiumMgKg),
        ph: parseFloat(formData.ph),
        moisturePct: parseFloat(formData.moisturePct),
        depthCm: parseFloat(formData.depthCm),
        labReference: formData.labReference || null
      };

      const res = await api.post(`/api/v1/soil/soil-measurements/${sampleId}/corrections`, payload);
      setSuccess(res.data);
      // Reload updated sample info
      loadSample(sampleId);
    } catch (err) {
      setError(err.response?.data?.detail || 'Correction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Soil Sample Correction</h1>
        <p className="mt-1 text-xs text-slate-500">
          NS-BR-01 & NS-UR-04: Corrections create a new version linked to previous version. Original records are preserved.
        </p>
      </div>

      {/* Explanatory Banner */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-bold">7-Day Immutability Window:</span>
          <p className="mt-0.5 text-amber-800">
            Field Operators can submit corrections within 7 days of initial sample submission. The previous version (v{currentSample?.version || 1}) will remain completely intact in history and audit logs.
          </p>
        </div>
      </div>

      {/* Lookup Bar if no sample selected */}
      {!sampleIdParam && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter Sample ID (e.g. smp_9a31)"
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono focus:border-forest-700 focus:outline-none"
          />
          <button
            onClick={() => loadSample(sampleId)}
            className="rounded-xl bg-forest-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all"
          >
            Load Sample
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-xs text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Correction Rejected</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
          <h3 className="text-base font-bold text-emerald-950">Correction Accepted</h3>
          <p className="mt-1 text-xs text-emerald-800">
            Created new version <span className="font-bold">v{success.version}</span> superseding version <span className="font-bold">v{success.supersedesVersion}</span>.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              to={`/analysis-results?sampleId=${success.sampleId}&version=${success.version}`}
              className="rounded-xl bg-forest-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all"
            >
              View Updated Diagnostics
            </Link>
          </div>
        </div>
      )}

      {currentSample && (
        <form onSubmit={handleCorrectionSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Sample</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xl font-black text-slate-900">{currentSample.sampleId}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  Current: v{currentSample.version}
                </span>
                <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-bold text-forest-800">
                  New Version will be: v{currentSample.version + 1}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <span>Field: <strong className="font-mono text-slate-900">{currentSample.fieldId}</strong></span>
              <br />
              <span>Date: <strong>{currentSample.sampleDate}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nitrogen (N) mg/kg
              </label>
              <input
                type="number"
                step="0.1"
                required
                name="nitrogenMgKg"
                value={formData.nitrogenMgKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phosphorus (P) mg/kg
              </label>
              <input
                type="number"
                step="0.1"
                required
                name="phosphorusMgKg"
                value={formData.phosphorusMgKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Potassium (K) mg/kg
              </label>
              <input
                type="number"
                step="0.5"
                required
                name="potassiumMgKg"
                value={formData.potassiumMgKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Soil pH
              </label>
              <input
                type="number"
                step="0.1"
                required
                name="ph"
                value={formData.ph}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Moisture (%)
              </label>
              <input
                type="number"
                step="0.5"
                required
                name="moisturePct"
                value={formData.moisturePct}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sample Depth (cm)
              </label>
              <input
                type="number"
                step="0.5"
                required
                name="depthCm"
                value={formData.depthCm}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <Link to="/history" className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Cancel & Back to History
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-6 py-3 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{submitting ? "Creating Version..." : `Save as Version ${currentSample.version + 1}`}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default SampleCorrectionPage;
