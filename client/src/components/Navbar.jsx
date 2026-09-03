import React from 'react';
import { ExternalLink, LogOut, FileSpreadsheet, Zap, ShieldCheck } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenCreditsModal, onOpenAdminModal }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Reesivoo Logo"
            className="w-9 h-9 rounded-xl shadow-sm shadow-indigo-200/50 object-cover"
          />
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900">Reesivoo</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              AI Receipt Scanner
            </span>
          </div>
        </div>

        {/* User Actions */}
        {user ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Scan Credits Indicator */}
            <button
              onClick={onOpenCreditsModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              title="View scan credits or redeem voucher"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
              <span>{user.scanCredits ?? 0} Scans</span>
              <span className="hidden sm:inline-block text-[10px] text-indigo-500 font-normal ml-0.5">• Need Credits?</span>
            </button>

            {/* Admin Portal Button (Exclusively for erzon22@gmail.com) */}
            {user.email === 'erzon22@gmail.com' && (
              <button
                onClick={onOpenAdminModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                title="Manage vouchers & user credits"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">👑 Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* Quick Access to User's Personal Google Sheet */}
            {user.sheetUrl && (
              <a
                href={user.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Open your personal Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Open My Google Sheet</span>
                <span className="sm:hidden">My Sheet</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                  {(user.name || user.email || 'E')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left text-xs leading-tight">
                <p className="font-semibold text-slate-800 truncate max-w-[140px]">{user.name || 'User'}</p>
                <p className="text-slate-400 truncate max-w-[140px]">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
