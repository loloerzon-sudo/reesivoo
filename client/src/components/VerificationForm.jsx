import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, DollarSign, Calendar, Building, Hash, MapPin, Tag, FileText } from 'lucide-react';

const CATEGORIES = [
  'Repair Maintenance',
  'De Minimis',
  'Utilities',
  'Subscription',
  'Transportation',
  'Miscellaneous',
  'Gasoline',
  'Representation',
  'Pantry',
  'Medicine/Office Others',
  'Others'
];

export default function VerificationForm({
  initialData = {},
  onSubmit,
  onDiscard,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    date: initialData.date || new Date().toISOString().split('T')[0],
    payee: initialData.payee || '',
    tin: initialData.tin || '',
    address: initialData.address || '',
    invoiceNo: initialData.invoiceNo || '',
    category: initialData.category || 'Others',
    remarks: initialData.remarks || '',
    amount: initialData.amount !== null && initialData.amount !== undefined ? initialData.amount : '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Helper to determine if input should highlight attention (was null/empty from AI)
  const isAttentionNeeded = (field) => {
    return !formData[field] || formData[field].toString().trim() === '';
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Verify Extracted Data</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              AI Ready
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review the extracted fields against the receipt photo before saving to Google Sheets.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Date & Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </span>
              {isAttentionNeeded('date') && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Verify
                </span>
              )}
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`w-full text-sm px-3 py-2 rounded-xl border transition-colors ${
                isAttentionNeeded('date')
                  ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              } focus:outline-none focus:ring-2`}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-600 text-xs">₱</span>
                Amount (Total PHP)
              </span>
              {isAttentionNeeded('amount') && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Verify
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                ₱
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                className={`w-full text-sm pl-8 pr-3 py-2 rounded-xl border transition-colors font-bold ${
                  isAttentionNeeded('amount')
                    ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-200'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                } focus:outline-none focus:ring-2`}
                required
              />
            </div>
          </div>
        </div>

        {/* Payee / Merchant Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Payee / Merchant Name
            </span>
            {isAttentionNeeded('payee') && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Missing
              </span>
            )}
          </label>
          <input
            type="text"
            name="payee"
            placeholder="e.g. Shell Gas Station, Jollibee, Shopee"
            value={formData.payee}
            onChange={handleChange}
            className={`w-full text-sm px-3 py-2 rounded-xl border transition-colors ${
              isAttentionNeeded('payee')
                ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-200'
                : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
            } focus:outline-none focus:ring-2`}
            required
          />
        </div>

        {/* TIN & Invoice/OR No Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                TIN
              </span>
              {isAttentionNeeded('tin') && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Not found
                </span>
              )}
            </label>
            <input
              type="text"
              name="tin"
              placeholder="000-000-000-000"
              value={formData.tin}
              onChange={handleChange}
              className={`w-full text-sm px-3 py-2 rounded-xl border transition-colors ${
                isAttentionNeeded('tin')
                  ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              } focus:outline-none focus:ring-2`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Invoice / OR #
              </span>
              {isAttentionNeeded('invoiceNo') && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Not found
                </span>
              )}
            </label>
            <input
              type="text"
              name="invoiceNo"
              placeholder="e.g. SI-123456 / OR-987"
              value={formData.invoiceNo}
              onChange={handleChange}
              className={`w-full text-sm px-3 py-2 rounded-xl border transition-colors ${
                isAttentionNeeded('invoiceNo')
                  ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              } focus:outline-none focus:ring-2`}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Address
            </span>
            {isAttentionNeeded('address') && (
              <span className="text-[10px] text-slate-400">Optional</span>
            )}
          </label>
          <input
            type="text"
            name="address"
            placeholder="Merchant address or branch"
            value={formData.address}
            onChange={handleChange}
            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Expense Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-colors cursor-pointer font-medium text-slate-800"
            required
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks / Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Remarks / Description
            </span>
            {isAttentionNeeded('remarks') && (
              <span className="text-[10px] text-slate-400">Optional</span>
            )}
          </label>
          <input
            type="text"
            name="remarks"
            placeholder="e.g. Client lunch meeting, office supplies"
            value={formData.remarks}
            onChange={handleChange}
            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="pt-5 mt-4 border-t border-slate-100 flex items-center gap-3">
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <XCircle className="w-4 h-4 text-slate-400" />
          <span>Discard</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm shadow-emerald-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving to Sheets & Drive...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit to Google Sheet</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
