import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { User, Mail, Phone, Building, Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    organisation: '',
    requestedRole: 'field_operator',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessData(null);

    // Validation
    if (formData.password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) {
      setError('Password must contain both letters and numbers.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(formData);
      setSuccessData(res);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 justify-center items-center py-12 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block">
            <Logo textClassName="text-2xl" />
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-forest-950">
            Register for Leafline Soil Service
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Submit soil samples, monitor NPK diagnostics, or explore anonymous agronomic research.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold">Registration Issue</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {successData ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-emerald-950">Registration Submitted</h3>
            <p className="mt-2 text-sm text-emerald-800">
              {successData.message}
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              Note: Field Operator, Agronomist, and Researcher accounts require Administrator approval before viewing field measurements.
            </p>

            {successData.verificationToken && (
              <div className="mt-6 pt-4 border-t border-emerald-200">
                <span className="text-xs font-semibold text-emerald-900 block mb-2">
                  Dev/Evaluation Mode Quick Verification:
                </span>
                <Link
                  to={`/verify?token=${successData.verificationToken}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition-all"
                >
                  Verify Email Address Now
                </Link>
              </div>
            )}

            <div className="mt-6">
              <Link to="/login" className="text-xs font-bold text-forest-900 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Marcus Vance"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="marcus@farm.ag"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1-555-0199"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Organisation / Farm *
                </label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    name="organisation"
                    value={formData.organisation}
                    onChange={handleChange}
                    placeholder="Prairie Sun Sunflower Co."
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Requested Role *
              </label>
              <div className="relative">
                <Shield className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  name="requestedRole"
                  value={formData.requestedRole}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm bg-white focus:border-forest-700 focus:outline-none"
                >
                  <option value="field_operator">Field Operator (Submit & Correct Samples)</option>
                  <option value="agronomist">Agronomist (Analyze Soil Health & Severity)</option>
                  <option value="researcher">Breeder / Researcher (Anonymous Historical Data)</option>
                  <option value="farmer">Farmer (View Own Field Soil Health)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password * (Min 12 chars)
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 12 chars, letters & nums"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-forest-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-800 transition-all disabled:opacity-50"
            >
              {loading ? "Submitting Registration..." : "Complete Registration"}
            </button>

            <p className="text-center text-xs text-slate-500 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-forest-900 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
export default RegisterPage;
