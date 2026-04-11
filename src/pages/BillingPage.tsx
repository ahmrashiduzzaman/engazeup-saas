import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import CheckoutModal from '../components/CheckoutModal';
import type { CheckoutPurpose } from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Download, X, Wallet, Plus, Loader2, Zap,
  CreditCard, CheckCircle2, ArrowUpRight, Sparkles
} from 'lucide-react';

type Plan = 'starter' | 'growth' | 'pro';
interface ShopData { sms_credits: number; plan: Plan; plan_expires_at: string | null; }

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: 999,
    orders: 'মাসে ৫০০',
    color: 'blue',
    features: ['৫০০ অর্ডার/মাস', '২টি কুরিয়ার ইন্টিগ্রেশন', 'বেসিক ফ্রড ডিটেকশন', 'SMS ক্রেডিট ওয়ালেট'],
  },
  {
    id: 'growth' as Plan,
    name: 'Growth',
    price: 1999,
    orders: 'মাসে ৩,০০০',
    color: 'green',
    badge: 'সবচেয়ে জনপ্রিয়',
    features: ['৩,০০০ অর্ডার/মাস', 'সব কুরিয়ার ইন্টিগ্রেশন', 'আনলিমিটেড কাস্টমার CRM', 'Bulk SMS ক্যাম্পেইন', 'AI ফ্রড ডিটেকশন'],
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 3999,
    orders: 'আনলিমিটেড',
    color: 'purple',
    features: ['আনলিমিটেড অর্ডার', 'Facebook Ads ROI অ্যানালাইসিস', '৫ জন টিম মেম্বার অ্যাক্সেস', 'ডেডিকেটেড একাউন্ট ম্যানেজার', 'প্রায়রিটি সাপোর্ট'],
  },
];

const PLAN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
  green: { bg: 'bg-[#0F6E56]/5', border: 'border-[#0F6E56]', text: 'text-[#0F6E56]' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700' },
};

const SMS_PACKAGES = [
  { credits: 100, price: 100 },
  { credits: 500, price: 500 },
  { credits: 1000, price: 980 },
  { credits: 5000, price: 4500 },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Unified checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPurpose, setCheckoutPurpose] = useState<CheckoutPurpose>('plan_upgrade');
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [checkoutDescription, setCheckoutDescription] = useState('');

  const fetchShopData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('shops')
      .select('sms_credits, plan, plan_expires_at')
      .eq('id', user.id)
      .single();
    setShopData(data ?? { sms_credits: 0, plan: 'starter', plan_expires_at: null });
    setIsLoading(false);
  };

  useEffect(() => { fetchShopData(); }, [user]);

  const currentPlanDetails = PLANS.find(p => p.id === (shopData?.plan ?? 'starter')) ?? PLANS[0];

  const openSmsRecharge = (pkg: typeof SMS_PACKAGES[0]) => {
    setCheckoutPurpose('sms_recharge');
    setCheckoutAmount(pkg.price);
    setCheckoutDescription(`${pkg.credits.toLocaleString()} SMS ক্রেডিট রিচার্জ`);
    setShowUpgradeModal(false);
    setCheckoutOpen(true);
  };

  const openPlanUpgrade = (plan: typeof PLANS[0]) => {
    setCheckoutPurpose('plan_upgrade');
    setCheckoutAmount(plan.price);
    setCheckoutDescription(`${plan.name} Plan — ১ মাস সাবস্ক্রিপশন`);
    setShowUpgradeModal(false);
    setCheckoutOpen(true);
  };

  const formatExpiry = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : 'ট্রায়াল চলছে';

  return (
    <DashboardLayout title="বিলিং ও সাবস্ক্রিপশন" subtitle="আপনার প্ল্যান এবং SMS ওয়ালেট পরিচালনা করুন">
      <div className="max-w-4xl mt-6 space-y-6">

        {/* ── SMS WALLET ── */}
        <div className="bg-gradient-to-br from-[#0F6E56] to-[#0a4d3c] rounded-2xl p-px shadow-lg">
          <div className="bg-white rounded-[14px] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-[#0F6E56]/10 p-4 rounded-xl">
                  <Wallet className="w-8 h-8 text-[#0F6E56]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">SMS ওয়ালেট ব্যালেন্স</p>
                  {isLoading
                    ? <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 text-[#0F6E56] animate-spin" /><span className="text-gray-400">লোড হচ্ছে...</span></div>
                    : <div className="flex items-end gap-3">
                      <h3 className="text-5xl font-extrabold text-gray-900 leading-none">{shopData?.sms_credits?.toLocaleString('en-IN') ?? '0'}</h3>
                      <span className="text-xl font-bold text-[#0F6E56] mb-1">ক্রেডিট</span>
                    </div>
                  }
                  <p className="text-sm text-gray-500 mt-2 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    প্রতিটি SMS পাঠাতে <span className="font-bold text-gray-800 mx-0.5">১ ক্রেডিট</span> খরচ হয়
                  </p>
                </div>
              </div>
              {/* Quick recharge packages */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center md:text-right">রিচার্জ প্যাকেজ</p>
                <div className="grid grid-cols-2 gap-2">
                  {SMS_PACKAGES.map(pkg => (
                    <button
                      key={pkg.credits}
                      onClick={() => openSmsRecharge(pkg)}
                      className="flex flex-col items-center bg-[#0F6E56]/5 hover:bg-[#0F6E56]/10 border border-[#0F6E56]/20 hover:border-[#0F6E56]/40 rounded-xl px-3 py-2 transition group"
                    >
                      <span className="font-extrabold text-[#0F6E56] text-sm">{pkg.credits >= 1000 ? `${pkg.credits / 1000}K` : pkg.credits}</span>
                      <span className="text-xs text-gray-500 font-medium">৳{pkg.price}</span>
                      {pkg.credits === 1000 && <span className="text-[9px] font-extrabold bg-amber-100 text-amber-700 px-1.5 rounded-full mt-0.5">Best!</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!isLoading && (shopData?.sms_credits ?? 0) < 50 && (
              <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-xl shrink-0">⚠️</span>
                <p className="text-sm text-amber-800 font-medium">আপনার SMS ব্যালেন্স কম! এখনই রিচার্জ করুন।</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CURRENT PLAN ── */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
          {isLoading
            ? <div className="flex items-center gap-3 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /><span>লোড হচ্ছে...</span></div>
            : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-800">বর্তমান প্ল্যান:</h3>
                    <span className={`px-3 py-1 rounded-lg text-sm font-extrabold border ${PLAN_COLORS[currentPlanDetails.color].bg} ${PLAN_COLORS[currentPlanDetails.color].text} ${PLAN_COLORS[currentPlanDetails.color].border}`}>
                      {currentPlanDetails.name}
                    </span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-bold border border-green-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                  <p className="text-gray-500 mb-3 font-medium">{formatExpiry(shopData?.plan_expires_at ?? null)}</p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-gray-200">৳{currentPlanDetails.price.toLocaleString()}/মাস</span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-gray-200">{currentPlanDetails.orders} অর্ডার</span>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none border border-red-300 text-red-500 px-5 py-2.5 rounded-lg font-medium hover:bg-red-50 transition">ক্যান্সেল</button>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex-1 md:flex-none bg-[#0F6E56] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#1D9E75] transition shadow-sm flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" /> আপগ্রেড করুন
                  </button>
                </div>
              </div>
            )
          }
        </div>

        {/* ── INVOICE HISTORY ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-800">ইনভয়েস হিস্ট্রি</h3>
          </div>
          <table className="w-full text-left text-sm font-en">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {['20 Mar 2026', '20 Feb 2026', '20 Jan 2026'].map((date, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="p-4 text-gray-700">{date}</td>
                  <td className="p-4 font-medium">৳{currentPlanDetails.price.toLocaleString()}</td>
                  <td className="p-4 text-gray-600">{currentPlanDetails.name}</td>
                  <td className="p-4"><span className="text-green-600 font-bold">Paid</span></td>
                  <td className="p-4 text-right">
                    <button className="text-[#0F6E56] hover:underline flex items-center gap-1 justify-end ml-auto font-medium">
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── UPGRADE PLAN MODAL ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative my-8">
            <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-6 text-white rounded-t-2xl">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-white/20 p-2 rounded-xl"><Sparkles className="w-6 h-6" /></div>
                <h2 className="text-xl font-extrabold">প্ল্যান আপগ্রেড করুন</h2>
              </div>
              <p className="text-white/80 text-sm font-medium">পেমেন্ট করুন — আমরা ২৪ ঘণ্টার মধ্যে অ্যাক্টিভ করব।</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(plan => {
                const colors = PLAN_COLORS[plan.color];
                const isCurrent = plan.id === shopData?.plan;
                return (
                  <div key={plan.id} className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${isCurrent ? `${colors.border} ${colors.bg}` : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}>
                    {plan.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">{plan.badge}</span>}
                    {isCurrent && <span className={`absolute -top-3 right-4 text-xs font-extrabold px-3 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>বর্তমান</span>}
                    <h3 className="text-lg font-extrabold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-gray-900">৳{plan.price.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm font-medium">/মাস</span>
                    </div>
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 font-medium">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${colors.text}`} /> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isCurrent}
                      onClick={() => openPlanUpgrade(plan)}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${isCurrent
                        ? `${colors.bg} ${colors.text} border ${colors.border} opacity-70 cursor-not-allowed`
                        : 'bg-[#0F6E56] text-white hover:bg-[#1D9E75] shadow-sm'
                        }`}
                    >
                      {isCurrent ? '✓ বর্তমান প্ল্যান' : 'এই প্ল্যান বেছে নিন →'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── UNIFIED CHECKOUT MODAL ── */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        purpose={checkoutPurpose}
        amount={checkoutAmount}
        description={checkoutDescription}
      />
    </DashboardLayout>
  );
}
