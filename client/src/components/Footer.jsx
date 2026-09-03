import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto py-5 border-t border-slate-200/60 bg-white/50 backdrop-blur text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img src="/logo.png" alt="Reesivoo" className="w-4 h-4 rounded-sm object-cover" />
          <span className="font-semibold text-slate-700">Reesivoo</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</a>
          <span>•</span>
          <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms</a>
          <span>•</span>
          <a
            href="https://nerzon.online"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1 font-medium"
            title="Developer Website"
          >
            <span>Dev</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>
    </footer>
  );
}
