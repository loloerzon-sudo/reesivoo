import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, ExternalLink, FileSpreadsheet, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { playKachingSound } from '../utils/audio';

export default function SuccessModal({ result, onScanAgain }) {
  useEffect(() => {
    // Play satisfying Ka-ching cash register chime
    playKachingSound();

    // Fire celebratory confetti on mount
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'],
      });
    } catch (_) {}
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-6 sm:p-8 text-center animate-in fade-in zoom-in duration-300">
      {/* Success Badge */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm shadow-emerald-100 mb-5">
        <CheckCircle className="w-9 h-9" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Receipt Logged!
      </h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        The receipt photo is backed up in your Google Drive and appended as a new row in your Google Sheet.
      </p>

      {/* Direct Links */}
      <div className="space-y-3 mb-6">
        {result?.sheetUrl && (
          <a
            href={result.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 transition-colors group"
          >
            <div className="flex items-center gap-3 text-left">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">Google Sheet</p>
                <p className="text-[11px] text-emerald-700">Open Receipt Tracker</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}

        {result?.driveFileUrl && (
          <a
            href={result.driveFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-900 transition-colors group"
          >
            <div className="flex items-center gap-3 text-left">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Google Drive</p>
                <p className="text-[11px] text-blue-700">View Stored Receipt Image</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
      </div>

      {/* Scan Again Button */}
      <button
        onClick={onScanAgain}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors cursor-pointer"
      >
        <span>Scan Another Receipt</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
