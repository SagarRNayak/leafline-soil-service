import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing verification token in URL');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify?token=${token}`);
        setResult(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Verification failed. The link may be expired.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen bg-slate-50 justify-center items-center py-12 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Link to="/" className="inline-block mb-6">
          <Logo textClassName="text-2xl" />
        </Link>

        {loading ? (
          <div className="py-8">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-leaf-600" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Verifying your email address...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 border border-red-200">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
            <h3 className="text-base font-bold text-red-900">Verification Failed</h3>
            <p className="mt-1 text-xs text-red-700">{error}</p>
            <Link to="/login" className="mt-4 inline-block text-xs font-bold text-forest-900 underline">
              Return to Login
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 p-6 border border-emerald-200">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
            <h3 className="text-lg font-bold text-emerald-950">Email Verified Successfully</h3>
            <p className="mt-2 text-xs text-emerald-800">{result?.message}</p>
            {result?.isApproved ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Your account is approved! You can now sign in.
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                Note: Your role ({result?.role}) is awaiting Administrator activation.
              </p>
            )}
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-forest-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-800 transition-all"
            >
              Proceed to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
export default VerifyEmailPage;
