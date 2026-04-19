import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type CheckoutPurpose = 'plan_upgrade' | 'sms_recharge';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: CheckoutPurpose;
  amount: number;
  description: string; // e.g. "Growth Plan - 1 Month" or "1,000 SMS Credits"
}

// ── পেমেন্ট রিসিভার নম্বর — এখানে পরিবর্তন করুন ──
const RECEIVER_PHONE_NUMBER = '01911925901';
const BKASH_NUMBER = RECEIVER_PHONE_NUMBER;
const NAGAD_NUMBER = RECEIVER_PHONE_NUMBER;

export default function CheckoutModal({ isOpen, onClose, purpose, amount, description }: CheckoutModalProps) {
  const { user } = useAuth();
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad'>('bkash');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!senderPhone.trim() || senderPhone.trim().length < 11) {
      toast.error('সঠিক ফোন নম্বর দিন (১১ ডিজিট)');
      return;
    }
    if (!trxId.trim() || trxId.trim().length < 4) {
      toast.error('সঠিক Transaction ID দিন');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('manual_payments').insert([{
      shop_id: user.id,
      purpose,
      amount,
      description,
      payment_method: paymentMethod,
      sender_number: senderPhone.trim(),
      trx_id: trxId.trim(),
      status: 'pending',
    }]);

    setIsSubmitting(false);

    if (error) {
      toast.error('সাবমিট করতে ব্যর্থ হয়েছে: ' + error.message);
      return;
    }

    toast.success(
      'আপনার পেমেন্টটি রিভিউ করা হচ্ছে। খুব শিগগিরই ব্যালেন্স আপডেট করা হবে।',
      { duration: 6000, icon: '✅' }
    );
    setSenderPhone('');
    setTrxId('');
    onClose();
  };

  const activeNumber = paymentMethod === 'bkash' ? BKASH_NUMBER : NAGAD_NUMBER;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative my-8">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-6 text-white rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-extrabold">পেমেন্ট নিশ্চিত করুন</h2>
          <p className="text-white/80 text-sm font-medium mt-1">{description}</p>
        </div>

        <div className="p-6 space-y-5">

          {/* Amount summary */}
          <div className="flex items-center justify-between bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl px-5 py-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">পেমেন্টের পরিমাণ</p>
              <p className="text-3xl font-extrabold text-gray-900">৳{amount.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">উদ্দেশ্য</p>
              <span className="bg-[#0F6E56] text-white text-xs font-extrabold px-3 py-1.5 rounded-full">
                {purpose === 'sms_recharge' ? 'SMS Recharge' : 'Plan Upgrade'}
              </span>
            </div>
          </div>

          {/* Payment method toggle */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">পেমেন্ট মেথড বেছে নিন</p>
            <div className="grid grid-cols-2 gap-3">
              {(['bkash', 'nagad'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border-2 font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === method
                      ? method === 'bkash'
                        ? 'border-pink-400 bg-pink-50 text-pink-700'
                        : 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{method === 'bkash' ? '📱' : '💳'}</span>
                  {method === 'bkash' ? 'bKash' : 'Nagad'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment instructions */}
          <div className={`rounded-xl p-5 border ${paymentMethod === 'bkash' ? 'bg-pink-50 border-pink-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`font-extrabold text-base mb-3 flex items-center gap-2 ${paymentMethod === 'bkash' ? 'text-pink-800' : 'text-orange-800'}`}>
              {paymentMethod === 'bkash' ? '📱 bKash' : '💳 Nagad'} — Send Money নির্দেশনা
            </p>
            <ol className={`text-sm font-medium space-y-2.5 list-none ${paymentMethod === 'bkash' ? 'text-pink-900' : 'text-orange-900'}`}>
              <li className="flex gap-2 items-start">
                <span className={`font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${paymentMethod === 'bkash' ? 'bg-pink-200 text-pink-800' : 'bg-orange-200 text-orange-800'}`}>১</span>
                <span>আপনার {paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} অ্যাপ ওপেন করুন → <strong>"Send Money"</strong> সিলেক্ট করুন।</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className={`font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${paymentMethod === 'bkash' ? 'bg-pink-200 text-pink-800' : 'bg-orange-200 text-orange-800'}`}>২</span>
                নিচের নম্বরে <strong className="font-en mx-1">৳{amount.toLocaleString()}</strong> পাঠান:
              </li>
              <li className={`rounded-lg px-4 py-2.5 font-en font-extrabold text-lg text-center tracking-widest ${paymentMethod === 'bkash' ? 'bg-white border border-pink-200 text-pink-700' : 'bg-white border border-orange-200 text-orange-700'}`}>
                {activeNumber}
              </li>
              <li className="flex gap-2 items-start">
                <span className={`font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${paymentMethod === 'bkash' ? 'bg-pink-200 text-pink-800' : 'bg-orange-200 text-orange-800'}`}>৩</span>
                পেমেন্ট সম্পন্ন হলে নিচে TrxID এবং নম্বর দিয়ে সাবমিট করুন।
              </li>
            </ol>
          </div>

          {/* TrxID form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                প্রেরকের ফোন নম্বর <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                maxLength={14}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition font-en text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Transaction ID (TrxID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={trxId}
                onChange={e => setTrxId(e.target.value.toUpperCase())}
                placeholder="যেমন: ABC1234XYZ"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition font-en text-sm tracking-widest"
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-400 font-medium pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ভুল তথ্য দিলে পেমেন্ট যাচাই ব্যর্থ হতে পারে। সঠিক TrxID নিশ্চিত করুন।
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-bold hover:bg-[#1D9E75] transition shadow-lg shadow-[#0F6E56]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> সাবমিট হচ্ছে...</>
                  : <><CheckCircle2 className="w-4 h-4" /> সাবমিট করুন</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
