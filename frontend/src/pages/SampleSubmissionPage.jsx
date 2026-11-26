import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const SampleSubmissionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({
    fieldId: '',
    sampleDate: new Date().toISOString().split('T')[0],
    depthCm: '20.0',
    nitrogenMgKg: '',
    phosphorusMgKg: '',
    potassiumMgKg: '',
    ph: '',
    moisturePct: '',
    labReference: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedSample, setSubmittedSample] = useState(null);
  const [pollStatus, setPollStatus] = useState(null); // RECEIVED -> ANALYSING -> READY

  // Load user's accessible fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.get('/api/v1/soil/fields');
        setFields(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, fieldId: res.data[0].fieldId }));
        }
      } catch (err) {
        console.warn("Could not load fields automatically");
      }
    };
    fetchFields();
  }, []);

  // Poll backend for READY analysis status
  useEffect(() => {
    let interval;
    if (submittedSample && pollStatus !== 'READY' && pollStatus !== 'ANALYSIS_FAILED') {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/api/v1/soil/soil-measurements/${submittedSample.sampleId}?version=${submittedSample.version}`);
          setPollStatus(res.data.state);
          if (res.data.state === 'READY') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [submittedSample, pollStatus]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittedSample(null);
    setPollStatus(null);

    // Frontend validations
    const n = parseFloat(formData.nitrogenMgKg);
    const p = parseFloat(formData.phosphorusMgKg);
    const k = parseFloat(formData.potassiumMgKg);
    const ph = parseFloat(formData.ph);
    const m = parseFloat(formData.moisturePct);
    const d = parseFloat(formData.depthCm);

    if (isNaN(n) || n < 0 || n > 1000) {
      setError('Nitrogen must be between 0 and 1000 mg/kg.');
      return;
    }
    if (isNaN(p) || p < 0 || p > 1000) {
      setError('Phosphorus must be between 0 and 1000 mg/kg.');
      return;
    }
    if (isNaN(k) || k < 0 || k > 1500) {
      setError('Potassium must be between 0 and 1500 mg/kg.');
      return;
    }
    if (isNaN(ph) || ph < 0.0 || ph > 14.0) {
      setError('pH must be between 0.0 and 14.0.');
      return;
    }
    if (isNaN(m) || m < 0 || m > 100) {
      setError('Moisture must be between 0 and 100%.');
      return;
    }
    if (isNaN(d) || d < 0 || d > 100) {
      setError('Sample depth must be between 0 and 100 cm.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fieldId: formData.fieldId,
        sampleDate: formData.sampleDate,
        depthCm: d,
        nitrogenMgKg: n,
        phosphorusMgKg: p,
        potassiumMgKg: k,
        ph: ph,
        moisturePct: m,
        labReference: formData.labReference || null,
        units: {
          nitrogen: 'mg/kg',
          phosphorus: 'mg/kg',
          potassium: 'mg/kg',
          ph: 'none',
          moisture: '%'
        }
      };

      const res = await api.post('/api/v1/soil/soil-measurements', payload);
      setSubmittedSample(res.data);
      setPollStatus(res.data.state); // Initial state is RECEIVED
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail?.message) {
        setError(`${detail.message}: ${detail.errors?.join(', ')}`);
      } else {
        setError(detail || 'Failed to submit soil sample.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Submit Soil Sample</h1>
        <p className="mt-1 text-xs text-slate-500">
          Module 1: Soil Data Management. Enter lab test values for assigned sunflower fields.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-xs text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Submission Rejected</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {submittedSample ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-bold text-forest-950">Soil Sample Successfully Received</h3>
          <p className="mt-1 text-xs text-slate-600">
            HTTP 202 Accepted. Stored in MySQL with version {submittedSample.version}.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Sample ID:</span>
              <span className="font-mono font-bold text-slate-900">{submittedSample.sampleId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Field ID:</span>
              <span className="font-mono font-bold text-slate-900">{submittedSample.fieldId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sample Date:</span>
              <span className="text-slate-900 font-medium">{submittedSample.sampleDate}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">Background Analysis:</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                pollStatus === 'READY'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800 animate-pulse'
              }`}>
                {pollStatus === 'READY' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>READY</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                    <span>{pollStatus || 'PROCESSING'}...</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {pollStatus === 'READY' && (
              <Link
                to={`/analysis-results?sampleId=${submittedSample.sampleId}&version=${submittedSample.version}`}
                className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-6 py-3 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all"
              >
                <span>View Full Soil Diagnostics</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <button
              onClick={() => {
                setSubmittedSample(null);
                setFormData(prev => ({
                  ...prev,
                  depthCm: '20.0',
                  nitrogenMgKg: '',
                  phosphorusMgKg: '',
                  potassiumMgKg: '',
                  ph: '',
                  moisturePct: '',
                  labReference: ''
                }));
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Submit Another Sample
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field ID */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Field Identifier *
              </label>
              {fields.length > 0 ? (
                <select
                  name="fieldId"
                  value={formData.fieldId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm bg-white font-mono focus:border-forest-700 focus:outline-none"
                >
                  {fields.map(f => (
                    <option key={f.fieldId} value={f.fieldId}>
                      {f.fieldId} ({f.region})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  name="fieldId"
                  value={formData.fieldId}
                  onChange={handleChange}
                  placeholder="fld_0412"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
                />
              )}
            </div>

            {/* Sample Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sampling Date *
              </label>
              <input
                type="date"
                required
                name="sampleDate"
                value={formData.sampleDate}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm focus:border-forest-700 focus:outline-none"
              />
            </div>

            {/* Depth (cm) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sample Depth (cm) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  required
                  name="depthCm"
                  value={formData.depthCm}
                  onChange={handleChange}
                  placeholder="20.0"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-12 text-sm focus:border-forest-700 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  cm
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-forest-950 mb-4 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-leaf-600" />
              <span>Chemical & Moisture Measurements (Fixed Units)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Nitrogen */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nitrogen (N) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Good: 20–40
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    name="nitrogenMgKg"
                    value={formData.nitrogenMgKg}
                    onChange={handleChange}
                    placeholder="28.0"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-16 text-sm focus:border-forest-700 focus:outline-none font-mono"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    mg/kg
                  </span>
                </div>
              </div>

              {/* Phosphorus */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phosphorus (P) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Good: 15–30
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    name="phosphorusMgKg"
                    value={formData.phosphorusMgKg}
                    onChange={handleChange}
                    placeholder="22.0"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-16 text-sm focus:border-forest-700 focus:outline-none font-mono"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    mg/kg
                  </span>
                </div>
              </div>

              {/* Potassium */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Potassium (K) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Good: 120–250
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    name="potassiumMgKg"
                    value={formData.potassiumMgKg}
                    onChange={handleChange}
                    placeholder="180.0"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-16 text-sm focus:border-forest-700 focus:outline-none font-mono"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    mg/kg
                  </span>
                </div>
              </div>

              {/* pH */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Soil pH * (1 decimal)
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Good: 6.0–7.5
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    name="ph"
                    value={formData.ph}
                    onChange={handleChange}
                    placeholder="6.8"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-12 text-sm focus:border-forest-700 focus:outline-none font-mono"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    pH
                  </span>
                </div>
              </div>

              {/* Moisture */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Soil Moisture (%) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Good: 15%–45%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    name="moisturePct"
                    value={formData.moisturePct}
                    onChange={handleChange}
                    placeholder="30.0"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-12 text-sm focus:border-forest-700 focus:outline-none font-mono"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Lab Reference */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lab Reference (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">Max 40 chars</span>
                </div>
                <input
                  type="text"
                  maxLength={40}
                  name="labReference"
                  value={formData.labReference}
                  onChange={handleChange}
                  placeholder="LAB-2026-X88"
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm focus:border-forest-700 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-leaf-600" />
              <span>Duplicate samples for the same field, date & depth will be rejected (409 Conflict).</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-800 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? "Transmitting Sample..." : "Submit Soil Sample"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default SampleSubmissionPage;
