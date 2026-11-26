import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.detail;
      if (!msg) {
        if (!err.response) {
          msg = 'Cannot connect to backend server. If using Docker, open http://localhost instead of :3000, or start the Python backend on port 8000.';
        } else {
          msg = 'Login failed. Please check your credentials.';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Column: Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <Link to="/">
              <Logo textClassName="text-2xl" />
            </Link>
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Sign In to Your Workspace
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Access field nutrient records, soil health badges, and NPK analytics.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@leafline.ag"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-leaf-700 hover:text-leaf-800">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-700 focus:ring-offset-2 transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Platform"}
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              One-Click Role Test Logins
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('operator@leafline.ag', 'Operator123456')}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-forest-50 hover:border-forest-300 text-left transition-colors"
              >
                <span className="font-bold text-slate-900 block">Field Operator</span>
                <span className="text-[10px] text-slate-500">Submit & Correct</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('agronomist@leafline.ag', 'Agronomist123456')}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-left transition-colors"
              >
                <span className="font-bold text-slate-900 block">Agronomist</span>
                <span className="text-[10px] text-slate-500">Flags & Severity</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('researcher@leafline.ag', 'Researcher123456')}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-left transition-colors"
              >
                <span className="font-bold text-slate-900 block">Researcher</span>
                <span className="text-[10px] text-slate-500">Anonymous Trends</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@leafline.ag', 'Admin123456')}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-left transition-colors"
              >
                <span className="font-bold text-slate-900 block">Administrator</span>
                <span className="text-[10px] text-slate-500">Approvals & Audit</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-forest-900 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column: Visual Brand Banner */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 p-16 text-white">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-forest-800/80 px-4 py-1.5 text-xs font-semibold text-leaf-300 border border-forest-700">
            Sunflower Agronomic Intelligence
          </div>
          <h3 className="mt-6 text-3xl font-extrabold leading-tight">
            Standardized NPK, pH & Moisture Analytics
          </h3>
          <p className="mt-4 text-forest-200 text-sm leading-relaxed max-w-md">
            Built to integrate seamlessly with the Leafline platform. Every measurement is verified against biological thresholds and audited for compliance.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-forest-200">
            <CheckCircle2 className="h-4 w-4 text-leaf-400 shrink-0" />
            <span>Strict Sunflower limits: N 20-40, P 15-30, K 120-250 mg/kg</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-forest-200">
            <CheckCircle2 className="h-4 w-4 text-leaf-400 shrink-0" />
            <span>Append-only versioning: Corrections never overwrite original data</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-forest-200">
            <CheckCircle2 className="h-4 w-4 text-leaf-400 shrink-0" />
            <span>Dual-engine flags: Rule-based logic merged with predictive Soil AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
