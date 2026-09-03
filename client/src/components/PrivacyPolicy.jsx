import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last updated: September 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">1. Overview</h2>
            <p>
              Reesivoo (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides an AI-powered receipt scanning service that helps users extract expense details and organize them directly in their personal Google Drive and Google Sheets. We respect your privacy and are committed to protecting your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">2. Google API Data & Scopes</h2>
            <p className="mb-2">
              Reesivoo requests access to specific Google services via OAuth 2.0:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Google Drive API:</strong> Used exclusively to create a designated &ldquo;Receipts (Reesivoo)&rdquo; folder and upload images of receipts you submit.</li>
              <li><strong>Google Sheets API:</strong> Used exclusively to create and append expense rows to your personal &ldquo;Receipt Tracker&rdquo; spreadsheet.</li>
              <li><strong>Google User Info (Email and Profile):</strong> Used to authenticate your account and display your profile name.</li>
            </ul>
            <p className="mt-2 text-xs bg-indigo-50 text-indigo-900 p-3 rounded-xl border border-indigo-100 font-medium">
              We do not sell, rent, or transfer your Google user data to any third-party advertisers. All receipt photos and spreadsheets remain your exclusive personal property inside your Google account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">3. Data Processing & AI</h2>
            <p>
              When you upload or photograph a receipt, the image is temporarily processed by Google Gemini AI to extract text, merchant details, dates, and amounts. Temporary upload files on our server are purged immediately after analysis or submission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">4. Data Security</h2>
            <p>
              All communications between your browser, our servers, and Google APIs are encrypted using HTTPS / Transport Layer Security (TLS). Authentication tokens are securely managed using HTTP-only encrypted session cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">5. Contact Us</h2>
            <p>
              If you have any questions or requests regarding your data, please contact the developer at <a href="https://nerzon.online" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">nerzon.online</a> or via email at <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">erzon22@gmail.com</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
