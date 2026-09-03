import React from 'react';
import { ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-slate-200/60 bg-white/50 backdrop-blur text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <img src="/logo.png" alt="Reesivoo" className="w-4 h-4 rounded-sm object-cover" />
          <span className="font-semibold text-slate-700">Reesivoo</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <span>Developed with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline mx-0.5" />
          <span>by</span>
          <a
            href="https://nerzon.online"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 ml-0.5"
          >
            <span>nerzon.online</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>
    </footer>
  );
}
