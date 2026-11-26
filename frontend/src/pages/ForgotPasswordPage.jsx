import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Mail, Lock, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import api from '../services/api';

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1 = request, 2 = confirm
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/password-reset', { email });
      setMsg(res.data.message);
      if (res.data.resetToken) {
        setToken(res.data.resetToken); // For easy dev test
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 12 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must have at least 12 characters and contain letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/confirm-reset', {
        token,
        newPassword,
        confirmPassword
      });
      setMsg(res.data.message);
      setStep(3); // Completed
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 justify-center items-center py-12 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <Logo textClassName="text-2xl" />
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-forest-950">Password Reset</h2>
          <p className="mt-1 text-xs text-slate-500">
            {step === 1 && "Enter your email to receive a secure 30-minute password reset link."}
            {step === 2 && "Enter your reset token and your new password."}
            {step === 3 && "Your password has been securely updated."}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@leafline.ag"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition-all disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            {msg && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                {msg}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Reset Token
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="rst_..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm font-mono focus:border-forest-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                New Password (Min 12 chars)
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 12 chars with letters and digits"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-forest-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-forest-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition-all disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Confirm & Update Password"}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-slate-900">{msg}</p>
            <p className="text-xs text-slate-500 mt-1">
              All previous sessions have been safely invalidated.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block w-full rounded-xl bg-forest-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition-all"
            >
              Log In Now
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-forest-900">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
