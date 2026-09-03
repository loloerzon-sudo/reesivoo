import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Ticket, 
  Users, 
  PlusCircle, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Filter, 
  Zap, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVoucherPortal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' | 'generator' | 'users'
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filter state for coupons table: 'all' | 'unused' | 'redeemed'
  const [statusFilter, setStatusFilter] = useState('unused');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick batch generator state
  const [tier, setTier] = useState(100);
  const [batchCount, setBatchCount] = useState(5);
  const [batchPrefix, setBatchPrefix] = useState('GCASH');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState([]);

  // Custom promo creator state
  const [customCode, setCustomCode] = useState('');
  const [customCredits, setCustomCredits] = useState(25);
  const [customMaxUses, setCustomMaxUses] = useState(100);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, uRes] = await Promise.all([
        adminApi.getCoupons(),
        adminApi.getUsers()
      ]);
      if (cRes.coupons) setCoupons(cRes.coupons);
      if (uRes.users) setUsers(uRes.users);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await adminApi.generateBatch({
        prefix: batchPrefix,
        credits: tier,
        count: batchCount,
      });
      setLastGenerated(res.codes || []);
      toast.success(res.message || 'Vouchers generated successfully!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to generate vouchers');
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomCreate = async (e) => {
    e.preventDefault();
    if (!customCode.trim()) return;
    try {
      setGenerating(true);
      await adminApi.createCoupon({
        code: customCode.trim().toUpperCase(),
        credits: customCredits,
        max_uses: customMaxUses,
      });
      toast.success(`Created promo code ${customCode.toUpperCase()}!`);
      setCustomCode('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create promo');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!confirm(`Are you sure you want to delete code "${code}"?`)) return;
    try {
      await adminApi.deleteCoupon(id);
      toast.success(`Deleted ${code}`);
      setCoupons(coupons.filter(c => c.id !== id));
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleAdjustUserCredits = async (userId, currentCredits, addAmount) => {
    const newTotal = Math.max(0, currentCredits + addAmount);
    try {
      await adminApi.updateUserCredits(userId, newTotal);
      toast.success(`Updated credits to ${newTotal}`);
      setUsers(users.map(u => u.id === userId ? { ...u, scan_credits: newTotal } : u));
    } catch (err) {
      toast.error('Failed to update credits');
    }
  };

  if (!isOpen) return null;

  // Filtered coupons
  const filteredCoupons = coupons.filter((c) => {
    const isRedeemed = c.times_used >= c.max_uses;
    if (statusFilter === 'unused' && isRedeemed) return false;
    if (statusFilter === 'redeemed' && !isRedeemed) return false;
    if (searchTerm) {
      const matchCode = c.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = c.redeemed_by_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCode || matchEmail;
    }
    return true;
  });

  const unusedCount = coupons.filter(c => c.times_used < c.max_uses).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">Admin Voucher Management</h3>
              <p className="text-[11px] text-slate-500">Exclusively for erzon22@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-100 flex gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'vouchers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Voucher Codes</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              {unusedCount} Unused
            </span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'generator'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>1-Click Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Balances ({users.length})</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: VOUCHERS LIST */}
          {activeTab === 'vouchers' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('unused')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'unused' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Ready to Sell ({unusedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('redeemed')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'redeemed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Redeemed ({coupons.length - unusedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    All ({coupons.length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search code or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-60 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Voucher Code</th>
                      <th className="px-3 py-3">Credits</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Claimed By</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No vouchers match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCoupons.map((c) => {
                        const isRedeemed = c.times_used >= c.max_uses;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{c.code}</span>
                                <button
                                  onClick={() => copyToClipboard(c.code)}
                                  className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                  title="Copy Code"
                                >
                                  {copiedCode === c.code ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-semibold text-indigo-700">
                              +{c.credits} Scans
                            </td>
                            <td className="px-3 py-3 text-slate-500">
                              {c.max_uses === 1 ? 'Single-Use' : `Multi (${c.times_used}/${c.max_uses})`}
                            </td>
                            <td className="px-3 py-3">
                              {isRedeemed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  Claimed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {c.redeemed_by_email ? (
                                <div className="leading-tight">
                                  <p className="font-semibold text-slate-800">{c.redeemed_by_name || 'User'}</p>
                                  <p className="text-[10px] text-slate-400">{c.redeemed_by_email}</p>
                                </div>
                              ) : (
                                <span className="text-slate-300 italic">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => handleDeleteCoupon(c.id, c.code)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GENERATOR */}
          {activeTab === 'generator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Quick GCash Batch Generator */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ₱
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Quick GCash Single-Use Batch</h4>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Generates ready-to-sell single-use vouchers formatted as <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GCASH100-XXXXX</code>.
                </p>

                <form onSubmit={handleBatchGenerate} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Scan Credit Pack Tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={50}>50 Scans (Suggested: ₱49)</option>
                      <option value={100}>100 Scans (Suggested: ₱99)</option>
                      <option value={250}>250 Scans (Suggested: ₱199)</option>
                      <option value={500}>500 Scans (Suggested: ₱399)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={batchPrefix}
                        onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Quantity
                      </label>
                      <select
                        value={batchCount}
                        onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={1}>1 Code</option>
                        <option value={5}>5 Codes</option>
                        <option value={10}>10 Codes</option>
                        <option value={20}>20 Codes</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generating}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate {batchCount} Vouchers</span>
                  </button>
                </form>

                {/* Newly Generated Results Box */}
                {lastGenerated.length > 0 && (
                  <div className="mt-4 p-3 bg-white border border-emerald-200 rounded-xl space-y-2 animate-in zoom-in-95">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>Generated Codes:</span>
                      <button
                        onClick={() => copyToClipboard(lastGenerated.join('\n'))}
                        className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy All</span>
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[11px]">
                      {lastGenerated.map((code) => (
                        <div key={code} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
                          <span className="font-bold text-slate-900">{code}</span>
                          <button
                            onClick={() => copyToClipboard(code)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Marketing Promo Creator */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Custom Promo / Campaign</h4>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Create named public codes (e.g. <code className="bg-white px-1 py-0.5 rounded border border-slate-200">SUMMER2026</code>) that multiple users can redeem once each.
                </p>

                <form onSubmit={handleCustomCreate} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Promo Code Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SUMMER50"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Scans Given
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customCredits}
                        onChange={(e) => setCustomCredits(parseInt(e.target.value, 10))}
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Max Redemptions
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customMaxUses}
                        onChange={(e) => setCustomMaxUses(parseInt(e.target.value, 10))}
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generating || !customCode.trim()}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    <span>Create Campaign Code</span>
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: USERS & BALANCES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Manage registered users and grant scan credits directly.
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-3 py-3">Email</th>
                      <th className="px-3 py-3">Balance</th>
                      <th className="px-3 py-3 text-right">Adjust Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                          )}
                          <span>{u.name || 'User'}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="px-3 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {u.scan_credits ?? 0} Scans
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleAdjustUserCredits(u.id, u.scan_credits ?? 0, 50)}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          >
                            +50
                          </button>
                          <button
                            onClick={() => handleAdjustUserCredits(u.id, u.scan_credits ?? 0, 100)}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          >
                            +100
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
