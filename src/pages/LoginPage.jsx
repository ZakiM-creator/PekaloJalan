import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FIREBASE_SETUP_MESSAGE, firebaseReady, explainFirebaseError } from '../services/firebaseService';

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const LoginPage = () => {
  const { handleGoogleLogin } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await handleGoogleLogin();
    } catch (err) {
      setError(explainFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50 text-slate-800">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 text-center">
        <img
          src="/logo-pin.png"
          alt="Logo PekaloJalan"
          className="h-20 w-auto mx-auto"
        />

        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-serif text-indigo-800">
            PekaloJalan
          </h1>
          <p className="text-sm text-slate-600">Portal Rekomendasi Wisata & AI Trip Planner Kota Pekalongan</p>
          <p className="text-xs text-slate-500">Masuk dengan akun Google untuk mulai menjelajah.</p>
        </div>

        {!firebaseReady && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{FIREBASE_SETUP_MESSAGE}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onLogin}
          disabled={submitting || !firebaseReady}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleLogo />
          <span>{submitting ? 'Membuka jendela Google...' : 'Masuk dengan Google'}</span>
        </button>

        <p className="text-[11px] text-slate-500">
          Hanya email dan nama dari akun Google yang dipakai untuk menentukan hak akses Anda.
        </p>
      </div>
    </div>
  );
};
