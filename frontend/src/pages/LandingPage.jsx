import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import {
  Sprout,
  Activity,
  Layers,
  ShieldCheck,
  Microscope,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Database,
  Cloud,
  ChevronRight
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header / Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo textClassName="text-2xl" />
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-forest-900 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-800 transition-all hover:shadow"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-8 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-4 py-1.5 text-xs font-semibold text-forest-800 border border-forest-200 mb-8">
            <Sprout className="h-3.5 w-3.5 text-leaf-600" />
            <span>Leafline Sunflower Health Intelligence Platform – Service 2</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-forest-950 sm:text-6xl md:text-7xl">
            Understand Your Soil. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-800 via-leaf-600 to-forest-900">
              Grow Smarter.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
            High-precision soil nutrient monitoring and real-time soil health diagnostics for commercial sunflower agriculture. Powered by versioned lab measurements, rule-based agronomic boundaries, and predictive AI.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-7 py-3.5 text-base font-bold text-white shadow-md hover:bg-forest-800 hover:shadow-lg transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-slate-800 border border-slate-300 shadow-sm hover:bg-slate-50 transition-all"
            >
              <span>Explore Dashboard</span>
            </Link>
          </div>

          {/* Quick Demo Credentials Pill */}
          <div className="mt-8 inline-block rounded-xl bg-leaf-50 border border-leaf-200 px-5 py-3 text-xs text-leaf-900">
            <span className="font-bold">Instant Demo Access:</span> Operator: <code className="bg-white px-1.5 py-0.5 rounded border">operator@leafline.ag</code> (PW: <code className="bg-white px-1.5 py-0.5 rounded border">Operator123456</code>) | Agronomist: <code className="bg-white px-1.5 py-0.5 rounded border">agronomist@leafline.ag</code>
          </div>
        </div>
      </section>

      {/* Six Software Modules Section */}
      <section className="py-24 px-8 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-leaf-600">Architectural Core</h2>
            <h3 className="mt-2 text-3xl font-extrabold text-forest-950 sm:text-4xl">
              The Six Software Modules
            </h3>
            <p className="mt-4 text-slate-600">
              Built on a strict 3-layer architecture (API, Business, and Data Layers) ensuring zero coupling, auditability, and AWS enterprise scalability.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                name: "Soil Data Management",
                desc: "Secure sample submission, strict boundary validation, 7-day versioned corrections, and append-only auditability.",
                icon: Database,
                endpoint: "POST /soil-measurements"
              },
              {
                num: "02",
                name: "NPK Analysis",
                desc: "Evaluates available Nitrogen, Phosphorus, and exchangeable Potassium against sunflower-specific ranges into LOW, OK, or HIGH.",
                icon: Layers,
                endpoint: "GET /soil-measurements/{id}"
              },
              {
                num: "03",
                name: "pH & Moisture Analysis",
                desc: "Analyzes soil acidity (0.0–14.0) and volumetric moisture percentage (0–100%) with 1-decimal strict validation.",
                icon: Activity,
                endpoint: "GET /soil-measurements/{id}"
              },
              {
                num: "04",
                name: "Soil Health Score",
                desc: "Combines 5 nutrient parameters into an authoritative overall health badge: GOOD (all in range), FAIR (1 out), or POOR (2+ out or severe).",
                icon: ShieldCheck,
                endpoint: "GET /soil-health"
              },
              {
                num: "05",
                name: "Nutrient Deficiency & Excess",
                desc: "Calculates mathematical deviation severity (Slight <=10%, Moderate <=25%, Severe >25%) and merges private Soil & Nutrient AI view.",
                icon: TrendingUp,
                endpoint: "GET /soil-health"
              },
              {
                num: "06",
                name: "Soil History & Anonymity",
                desc: "Historical field trends with interactive analytics. Provides anonymized made-up codes (FLD-ANON-XXXX) for researchers with zero farmer disclosure.",
                icon: Microscope,
                endpoint: "GET /soil-history"
              }
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.num} className="group relative rounded-2xl border border-slate-200 bg-slate-50/50 p-8 transition-all hover:bg-white hover:shadow-lg hover:border-leaf-200">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-300 group-hover:text-leaf-500 transition-colors">
                      {m.num}
                    </span>
                    <div className="rounded-xl bg-forest-900 p-2.5 text-white shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="mt-5 text-xl font-bold text-forest-950">{m.name}</h4>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{m.desc}</p>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>{m.endpoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sunflower Soil Thresholds Table */}
      <section className="py-20 px-8 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-forest-950 sm:text-3xl">
              Configurable Sunflower Starting Limits
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Starting agronomic thresholds for sunflower cultivation. Fully configurable via backend agronomy settings.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest-900 text-white text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Measurement</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">LOW (Deficient)</th>
                  <th className="px-6 py-4">Good Range</th>
                  <th className="px-6 py-4">HIGH (Excess)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-forest-950">Nitrogen (N)</td>
                  <td className="px-6 py-4 font-mono text-xs">mg/kg</td>
                  <td className="px-6 py-4 text-amber-600">&lt; 20</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">20 – 40</td>
                  <td className="px-6 py-4 text-red-600">&gt; 40</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-forest-950">Phosphorus (P)</td>
                  <td className="px-6 py-4 font-mono text-xs">mg/kg</td>
                  <td className="px-6 py-4 text-amber-600">&lt; 15</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">15 – 30</td>
                  <td className="px-6 py-4 text-red-600">&gt; 30</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-forest-950">Potassium (K)</td>
                  <td className="px-6 py-4 font-mono text-xs">mg/kg</td>
                  <td className="px-6 py-4 text-amber-600">&lt; 120</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">120 – 250</td>
                  <td className="px-6 py-4 text-red-600">&gt; 250</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-forest-950">Soil pH</td>
                  <td className="px-6 py-4 font-mono text-xs">none</td>
                  <td className="px-6 py-4 text-amber-600">&lt; 6.0</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">6.0 – 7.5</td>
                  <td className="px-6 py-4 text-red-600">&gt; 7.5</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-forest-950">Soil Moisture</td>
                  <td className="px-6 py-4 font-mono text-xs">% (volumetric)</td>
                  <td className="px-6 py-4 text-amber-600">&lt; 15%</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">15% – 45%</td>
                  <td className="px-6 py-4 text-red-600">&gt; 45%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-8 text-sm text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo textClassName="text-xl" />
          <p className="text-center md:text-right text-xs text-slate-400">
            Leafline Sunflower Health Intelligence Platform – Service 2: Nutrient & Soil Management Service.<br />
            Compliant with Specification V1.0. Hosted on AWS EC2 & AWS RDS MySQL.
          </p>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
