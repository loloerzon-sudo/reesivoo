import React, { useState } from 'react';
import { ReceiptText, Sparkles, FolderSync, TableProperties, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { toast } from 'sonner';

export default function LoginView({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [missingClientAlert, setMissingClientAlert] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await authApi.getAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.message?.includes('GOOGLE_CLIENT_ID is missing')) {
        setMissingClientAlert(true);
      } else {
        toast.error(err.message || 'Failed to initiate Google Login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Glassmorphic Logo */}
        <img
          src="/logo.png"
          alt="Reesivoo Logo"
          className="w-20 h-20 rounded-3xl mx-auto shadow-xl shadow-indigo-300/40 object-cover mb-4 ring-4 ring-white"
        />

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          Welcome to Reesivoo
        </h1>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          AI receipt scanning directly to your personal Google Sheet & Google Drive.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-2.5 text-left mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span><strong>Gemini 3.5 Flash:</strong> Instant TIN, Payee & Amount OCR</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <TableProperties className="w-3.5 h-3.5" />
            </div>
            <span><strong>Zero Config:</strong> Auto-creates your personal Google Sheet</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FolderSync className="w-3.5 h-3.5" />
            </div>
            <span><strong>Google Drive:</strong> Automatic receipt photo backups</span>
          </div>
        </div>

        {/* Missing Client ID Guidance Alert */}
        {missingClientAlert && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Google Client ID Needed</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Google requires a free <strong>OAuth Client ID</strong> from Google Cloud Console so it can verify your account (<code>erzon22@gmail.com</code>).
            </p>
            <p className="text-[11px]">
              Simply paste your Client ID & Secret in chat or <code>server/.env</code> to enable official Google Sign-In.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Google Sign-in Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
            <ArrowRight className="w-4 h-4 opacity-70 ml-auto" />
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          Requires Google Drive & Sheets permissions to store your receipts.
        </p>
      </div>
    </div>
  );
}
