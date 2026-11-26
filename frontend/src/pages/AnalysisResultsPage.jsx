import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Edit3,
  Download,
  Printer,
  FileText
} from 'lucide-react';

export const AnalysisResultsPage = () => {
  const [searchParams] = useSearchParams();
  const sampleIdParam = searchParams.get('sampleId');
  const versionParam = searchParams.get('version');

  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentSamples, setRecentSamples] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState('');

  const fetchReportData = async () => {
    if (!sample) return null;
    const res = await api.get(`/api/v1/soil/soil-measurements/${sample.sampleId}/report?version=${sample.version}`);
    return res.data;
  };

  const handleOpenReport = async () => {
    if (!sample) return;
    setDownloading(true);
    setReportError('');
    try {
      const data = await fetchReportData();
      setReportData(data);
      setShowReportModal(true);
    } catch (err) {
      console.error("Failed to load report", err);
      const msg = err.response?.data?.detail || err.message || "Failed to load report";
      setReportError(msg);
      alert(`Report Error: ${msg}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCertificateHTML = (data = reportData) => {
    if (!data) return;
    const statusColor = data.healthStatus === 'GOOD' ? '#10b981' : data.healthStatus === 'FAIR' ? '#f59e0b' : '#ef4444';
    const rows = data.flags.map(f => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-weight:bold; text-transform:capitalize;">${f.nutrient}</td>
        <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-weight:bold;">${data.measurements[f.nutrient]?.value ?? ''} ${data.measurements[f.nutrient]?.unit ?? ''}</td>
        <td style="padding:10px; border-bottom:1px solid #e2e8f0;">${data.measurements[f.nutrient]?.goodRange ?? ''}</td>
        <td style="padding:10px; border-bottom:1px solid #e2e8f0;"><span style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:11px;">${f.status} ${f.severity ? `(${f.severity})` : ''}</span></td>
        <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-family:monospace; color:#15803d;">${f.aiView || 'AI Pending'} ${f.aiConfidence || ''}</td>
      </tr>
    `).join('');

    const recs = data.recommendations.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Leafline Soil Certificate - ${data.sampleId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
        .header { border-bottom: 2px solid #052e16; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .badge { background-color: ${statusColor}; color: white; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
        .rec-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; }
        .rec-box h4 { margin: 0 0 10px 0; color: #14532d; font-size: 13px; text-transform: uppercase; }
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom:20px; display:flex; gap:10px;">
        <button onclick="window.print()" style="background:#052e16; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer;">🖨️ Print / Save as PDF</button>
    </div>
    <div class="header">
        <div>
            <h1 style="color:#052e16; margin:0 0 6px 0; font-size:24px;">LEAFLINE SOIL & NUTRIENT INTELLIGENCE</h1>
            <p style="margin:0; font-size:13px; color:#64748b;">Sunflower Agronomic Health Diagnostic Certificate</p>
        </div>
        <div style="text-align:right;">
            <span class="badge">${data.healthStatus}</span>
            <p style="margin:6px 0 0 0; font-size:11px; color:#64748b;">Rule Engine: ${data.ruleVersion}</p>
        </div>
    </div>
    <div class="meta-grid">
        <div><strong>Sample ID:</strong><br><span style="font-family:monospace;">${data.sampleId} (v${data.version})</span></div>
        <div><strong>Field ID:</strong><br><span style="font-family:monospace;">${data.fieldId}</span></div>
        <div><strong>Sample Date:</strong><br>${data.sampleDate}</div>
        <div><strong>AI Model:</strong><br><span style="color:#15803d; font-weight:bold;">${data.aiModel}</span></div>
    </div>
    <h3 style="font-size:14px; text-transform:uppercase; color:#0f172a; margin-bottom:10px;">Nutrient & Soil Diagnostics</h3>
    <table>
        <thead>
            <tr>
                <th>Parameter</th>
                <th>Measured Value</th>
                <th>Good Benchmark</th>
                <th>Status</th>
                <th>AI Validation</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
    <div class="rec-box">
        <h4>Agronomic Field Recommendations</h4>
        <ul style="margin:0; padding-left:20px; color:#14532d;">
            ${recs}
        </ul>
    </div>
    <div style="border-top:1px solid #e2e8f0; padding-top:12px; font-size:11px; color:#94a3b8; display:flex; justify-content:space-between;">
        <span>Generated by Leafline Nutrient & Soil Intelligence Service (Service 2)</span>
        <span>Certificate Timestamp: ${data.generatedAt}</span>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Soil_Health_Certificate_${data.sampleId}_v${data.version}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadCSV = (data = reportData) => {
    if (!data) return;
    const headers = ["Parameter", "Measured Value", "Unit", "Benchmark Good Range", "Status", "Severity", "AI View", "AI Confidence"];
    const rows = data.flags.map(f => [
      f.nutrient,
      data.measurements[f.nutrient]?.value ?? "",
      data.measurements[f.nutrient]?.unit ?? "",
      `"${data.measurements[f.nutrient]?.goodRange ?? ""}"`,
      f.status,
      f.severity || "",
      f.aiView || "AI Pending",
      f.aiConfidence || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement('a');
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Soil_Health_Data_${data.sampleId}_v${data.version}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadJSON = (data = reportData) => {
    if (!data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Soil_Health_Report_${data.sampleId}_v${data.version}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const fetchSample = async (sId, ver) => {
    setLoading(true);
    setError('');
    try {
      const url = ver
        ? `/api/v1/soil/soil-measurements/${sId}?version=${ver}`
        : `/api/v1/soil/soil-measurements/${sId}`;
      const res = await api.get(url);
      setSample(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Sample not found or unauthorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If sampleId passed in URL, load it directly
    if (sampleIdParam) {
      fetchSample(sampleIdParam, versionParam);
    } else {
      // Otherwise load latest ready samples to choose from
      const loadDefault = async () => {
        try {
          const res = await api.get('/api/v1/soil/soil-history?size=10');
          if (res.data.items && res.data.items.length > 0) {
            setRecentSamples(res.data.items);
            const first = res.data.items[0];
            fetchSample(first.sampleId, first.version);
          } else {
            setLoading(false);
          }
        } catch (err) {
          setError('Could not fetch sample list.');
          setLoading(false);
        }
      };
      loadDefault();
    }
  }, [sampleIdParam, versionParam]);

  const getHealthBadge = (healthStatus) => {
    switch (healthStatus) {
      case 'GOOD':
        return {
          bg: 'bg-emerald-500',
          lightBg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
          textColor: 'text-emerald-700',
          icon: CheckCircle2,
          description: 'All 5 nutrient & physical soil parameters are within their optimal agronomic ranges.'
        };
      case 'FAIR':
        return {
          bg: 'bg-amber-500',
          lightBg: 'bg-amber-50 border-amber-200 text-amber-950',
          textColor: 'text-amber-700',
          icon: AlertTriangle,
          description: 'One parameter is outside good range, but no severe nutrient depletion or toxicity detected.'
        };
      case 'POOR':
        return {
          bg: 'bg-red-500',
          lightBg: 'bg-red-50 border-red-200 text-red-950',
          textColor: 'text-red-700',
          icon: XCircle,
          description: 'Two or more parameters are outside range, or a critical nutrient exhibits severe deficiency/excess.'
        };
      default:
        return {
          bg: 'bg-slate-400',
          lightBg: 'bg-slate-50 border-slate-200 text-slate-800',
          textColor: 'text-slate-600',
          icon: Clock,
          description: 'Analysis processing or status pending.'
        };
    }
  };

  const getNutrientCard = (name, value, unit, low, high) => {
    if (value === undefined || value === null) return null;

    let state = 'OK';
    let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let statusText = 'Optimal Range';

    // Check against spec boundaries
    if (value < low) {
      state = 'LOW';
      statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
      statusText = 'LOW (Deficient)';
    } else if (value > high) {
      state = 'HIGH';
      statusColor = 'text-red-700 bg-red-50 border-red-200';
      statusText = 'HIGH (Excess)';
    }

    // Match flag from backend if present
    const flagObj = sample?.flags?.find(f => f.nutrient.toLowerCase() === name.toLowerCase());
    const severity = flagObj?.severity;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{name}</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusColor}`}>
            {statusText}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 font-mono">{value}</span>
          <span className="text-xs font-bold text-slate-500">{unit}</span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Good Range:</span>
          <span className="font-semibold text-slate-800">{low} – {high} {unit}</span>
        </div>

        {severity && (
          <div className="mt-2 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 flex items-center justify-between">
            <span>Deviation Severity:</span>
            <span className="uppercase font-extrabold">{severity}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-leaf-500 border-t-transparent"></div>
          <span className="text-xs font-semibold text-slate-500">Loading analysis diagnostics...</span>
        </div>
      </div>
    );
  }

  const health = getHealthBadge(sample?.health?.status);
  const HealthIcon = health.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Sample Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Soil Analysis Results</h1>
          <p className="mt-1 text-xs text-slate-500">
            Module 4: Health Scoring & Diagnostics. Comprehensive chemical and moisture evaluation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sample && (
            <>
              <button
                onClick={handleOpenReport}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest-900 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                <span>{downloading ? "Preparing..." : "View Certificate"}</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    setDownloading(true);
                    const data = reportData || await fetchReportData();
                    if (data) {
                      setReportData(data);
                      handleDownloadCertificateHTML(data);
                    }
                  } catch (e) {
                    alert("Download failed: " + (e.response?.data?.detail || e.message));
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-forest-800 bg-forest-50 px-3.5 py-2 text-xs font-bold text-forest-900 shadow-sm hover:bg-forest-100 transition-all disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-forest-700" />
                <span>Download Report (.html)</span>
              </button>
            </>
          )}

          {recentSamples.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Sample:</span>
              <select
                value={sample?.sampleId || ''}
                onChange={(e) => {
                  const selected = recentSamples.find(s => s.sampleId === e.target.value);
                  if (selected) fetchSample(selected.sampleId, selected.version);
                }}
                className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none"
              >
                {recentSamples.map(s => (
                  <option key={`${s.sampleId}-v${s.version}`} value={s.sampleId}>
                    {s.sampleId} (v{s.version}) - {s.fieldId || s.anonymousFieldCode}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="font-bold">{error}</p>
          <Link to="/history" className="mt-4 inline-block text-xs font-bold text-forest-900 underline">
            Browse Soil History
          </Link>
        </div>
      ) : sample ? (
        <>
          {/* Prominent Overall Soil Health Badge Card */}
          <div className={`rounded-2xl border p-8 shadow-sm ${health.lightBg}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`rounded-2xl ${health.bg} p-4 text-white shadow-md`}>
                  <HealthIcon className="h-10 w-10" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      Overall Soil Health
                    </span>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-black text-white ${health.bg}`}>
                      {sample?.health?.status || sample?.state}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mt-1">
                    {sample?.health?.status === 'GOOD' && 'Optimal Sunflower Growing Conditions'}
                    {sample?.health?.status === 'FAIR' && 'Moderate Nutrient Deviation Detected'}
                    {sample?.health?.status === 'POOR' && 'Action Required: Soil Imbalance'}
                  </h2>
                  <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">
                    {health.description}
                  </p>
                </div>
              </div>

              {/* Sample Meta Details Pill */}
              <div className="rounded-xl bg-white/80 p-4 border border-slate-200/80 text-xs space-y-1.5 shrink-0">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Sample ID:</span>
                  <span className="font-mono font-bold text-slate-900">{sample.sampleId}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Field ID:</span>
                  <span className="font-mono font-bold text-slate-900">{sample.fieldId}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Version:</span>
                  <span className="font-bold text-forest-900">v{sample.version}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-800">{sample.sampleDate}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                  <span className="text-slate-500">AI Model:</span>
                  <span className="font-semibold text-leaf-700">{sample.health?.modelVersion || 'soil-ai-1.2.0'}</span>
                </div>
              </div>
            </div>

            {/* Field Operator Correction Link (if within 7 days) */}
            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Data audited in MySQL. Rule engine: <code className="font-bold">{sample.health?.ruleVersion || 'SUNFLOWER_RULES_V1'}</code>
              </span>
              <Link
                to={`/sample-correction?sampleId=${sample.sampleId}`}
                className="inline-flex items-center gap-1 font-bold text-forest-800 hover:text-forest-950 underline"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Correct Measurements (Creates v{sample.version + 1})</span>
              </Link>
            </div>
          </div>

          {/* 5 Measurement Cards Grid */}
          <div>
            <h3 className="text-base font-bold text-forest-950 mb-4">Five Critical Measurements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getNutrientCard('Nitrogen', sample.measurements?.nitrogenMgKg, 'mg/kg', 20.0, 40.0)}
              {getNutrientCard('Phosphorus', sample.measurements?.phosphorusMgKg, 'mg/kg', 15.0, 30.0)}
              {getNutrientCard('Potassium', sample.measurements?.potassiumMgKg, 'mg/kg', 120.0, 250.0)}
              {getNutrientCard('pH', sample.measurements?.ph, '', 6.0, 7.5)}
              {getNutrientCard('Moisture', sample.measurements?.moisturePct, '%', 15.0, 45.0)}
            </div>
          </div>

          {/* Formal Soil Health Report Modal */}
          {showReportModal && reportData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-leaf-600">
                      Official Agronomic Certificate
                    </span>
                    <h2 className="text-2xl font-black text-forest-950 mt-1">
                      {reportData.reportTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Service: {reportData.service} | Rule Engine: {reportData.ruleVersion}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                {/* Report Metadata */}
                <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Sample ID</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{reportData.sampleId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Field ID</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{reportData.fieldId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Sample Date</span>
                    <p className="font-medium text-slate-900 mt-0.5">{reportData.sampleDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Overall Health</span>
                    <p className={`font-black mt-0.5 ${
                      reportData.healthStatus === 'GOOD' ? 'text-emerald-700' : reportData.healthStatus === 'FAIR' ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {reportData.healthStatus}
                    </p>
                  </div>
                </div>

                {/* Measurements Table */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Nutrient Diagnostics</h4>
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Parameter</th>
                        <th className="py-2.5 px-3">Measured</th>
                        <th className="py-2.5 px-3">Benchmark Range</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">AI View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.flags.map((f) => (
                        <tr key={f.nutrient} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold capitalize text-slate-900">{f.nutrient}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-forest-900">
                            {reportData.measurements[f.nutrient]?.value} {reportData.measurements[f.nutrient]?.unit}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {reportData.measurements[f.nutrient]?.goodRange}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.status === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {f.status} {f.severity ? `(${f.severity})` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-leaf-800 font-mono font-bold">
                            {f.aiView || 'AI Pending'} {f.aiConfidence ? `(${f.aiConfidence})` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Agronomic Recommendations */}
                <div className="mb-6 p-4 rounded-2xl bg-forest-50 border border-forest-200 text-xs">
                  <h4 className="font-bold text-forest-950 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-leaf-600" />
                    <span>Agronomic Field Recommendations</span>
                  </h4>
                  <ul className="space-y-1.5 text-forest-900">
                    {reportData.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-leaf-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions: Print PDF, Download HTML, CSV, and JSON */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    onClick={() => handleDownloadCertificateHTML()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest-900 px-4 py-2 text-xs font-bold text-white hover:bg-forest-800 transition-all shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Certificate (.html)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadCSV()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => handleDownloadJSON()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
export default AnalysisResultsPage;
