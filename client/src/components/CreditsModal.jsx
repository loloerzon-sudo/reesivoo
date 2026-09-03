import React, { useState } from 'react';
import { Sparkles, Zap, ArrowRight, ExternalLink, X, Loader2, CheckCircle2, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import { couponApi } from '../services/api';
import { playKachingSound } from '../utils/audio';
import { toast } from 'sonner';

export default function CreditsModal({ isOpen, onClose, user, onCreditsUpdated }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleRedeem = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a voucher code');
      return;
    }

    try {
      setLoading(true);
      const res = await couponApi.redeem(cleanCode);

      // Play celebratory sound + confetti
      playKachingSound();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6'],
        });
      } catch (_) {}

      setSuccessMsg(res.message || `+${res.addedCredits} Credits Added!`);
      toast.success(res.message);

      if (onCreditsUpdated) {
        onCreditsUpdated(res.newTotalCredits);
      }

      setTimeout(() => {
        setCode('');
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to redeem code');
    } finally {
      setLoading(false);
    }
  };

  const isOutOfCredits = (user?.scanCredits ?? 0) <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className={`w-14 h-14 rounded-2xl ${isOutOfCredits ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center mx-auto shadow-sm mb-4`}>
          <Zap className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          {isOutOfCredits ? "You're Out of Scan Credits!" : "Scan Credits & Vouchers"}
        </h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed max-w-xs mx-auto">
          {isOutOfCredits
            ? "You've used all your free scans. Redeem a voucher code below or contact the Dev to top up."
            : "Every receipt scan uses 1 credit. Have a voucher code? Redeem it below."}
        </p>

        {/* Balance Card */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Remaining Balance</span>
            <span className="text-2xl font-black text-slate-900">
              {user?.scanCredits ?? 0} <span className="text-sm font-semibold text-slate-500">Credits</span>
            </span>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Active
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Redeem Voucher Form */}
        <form onSubmit={handleRedeem} className="space-y-3 text-left mb-6">
          <label className="block text-xs font-semibold text-slate-700">
            Redeem Voucher / Promo Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Ticket className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. WELCOME10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 uppercase font-mono font-semibold"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Redeem'}
            </button>
          </div>
        </form>

        {/* Contact Dev Banner */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">Need more scan credits?</span>
          <a
            href="https://nerzon.online"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <span>Contact Dev</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
}
