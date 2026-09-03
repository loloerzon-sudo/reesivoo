import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reesivoo</span>
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500">Last updated: September 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Reesivoo, you agree to be bound by these Terms of Service. If you do not agree, please do not access or use the application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">2. Description of Service</h2>
            <p>
              Reesivoo is an AI-assisted receipt digitization tool that extracts expense details from receipt images and logs them into your designated Google Drive and Google Sheets accounts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">3. User Responsibility & Verification</h2>
            <p>
              AI-generated data extractions are provided as a convenience. Users are solely responsible for reviewing and verifying extracted merchant names, TIN numbers, dates, and amounts before submitting them for formal tax, business, or accounting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">4. Scan Credits & Vouchers</h2>
            <p>
              New accounts receive promotional free scan credits. Additional credits may be acquired via promotional vouchers or credits. Credits are non-refundable once redeemed.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">5. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that abuse system rate limits, engage in fraudulent voucher generation, or violate applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">6. Contact Information</h2>
            <p>
              Questions regarding these Terms can be addressed to the developer at <a href="https://nerzon.online" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">nerzon.online</a> or <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">erzon22@gmail.com</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
