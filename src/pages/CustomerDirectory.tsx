import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MessageCircle, Trash2, X, Send, Loader2, Users } from 'lucide-react';

export default function CustomerDirectory() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // SMS Modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Dual Scrollbar refs
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const tableContentRef = React.useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState<number>(1000);
  const isSyncingLeft = React.useRef(false);

  useEffect(() => {
    const updateWidth = () => {
      if (tableContentRef.current) {
        setTableWidth(tableContentRef.current.scrollWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [customers]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingLeft.current) return;
    if (tableScrollRef.current) {
      isSyncingLeft.current = true;
      tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isSyncingLeft.current = false; }, 10);
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingLeft.current) return;
    if (topScrollRef.current) {
      isSyncingLeft.current = true;
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isSyncingLeft.current = false; }, 10);
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('CustomerDirectory fetch error:', error);
      setFetchError(`ডাটা লোড করতে সমস্যা হয়েছে: ${error.message}`);
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', id);

      if (!error) fetchCustomers();
    }
  };

  const handleSendSms = async () => {
    if (customers.length === 0) {
      toast.error('কোনো কাস্টমার নেই!');
      return;
    }

    const phoneNumbers = customers
      .map(c => c.phone)
      .filter(Boolean);

    if (phoneNumbers.length === 0) {
      toast.error('কোনো ফোন নম্বর পাওয়া যায়নি!');
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('সেশন পাওয়া যায়নি! দয়া করে লগআউট করে আবার লগইন করুন।');
        setIsSending(false);
        return;
      }

      // Use fetch for absolute control over headers
      const response = await fetch('https://otvzexarrpuaewjjdxna.supabase.co/functions/v1/bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dnpleGFycnB1YWV3ampkeG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTgyMzcsImV4cCI6MjA5MDk3NDIzN30.2SMR4Gt8SShEqzf2T448iPc8U_mQcv0yB51JXSN-ov8',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumbers,
          message: smsMessage.trim()
        })
      });

      const responseText = await response.text();
      let responseData: any = {};

      if (responseText && responseText.trim() !== '') {
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error("Non-JSON API Gateway Response:", responseText);
          if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${responseText}`);
          }
        }
      }

      if (!response.ok) {
        throw new Error(responseData?.error || `API Error ${response.status}: ${responseText}`);
      }

      toast.success(`✅ ${responseData?.sent_to || phoneNumbers.length} জন কাস্টমারকে SMS পাঠানো হয়েছে!`);
      setShowSmsModal(false);
      setSmsMessage('');

    } catch (err: any) {
      console.error('Final SMS Dispatch Error:', err);
      toast.error(err.message || 'অজানা সমস্যা হয়েছে।');
    } finally {
      setIsSending(false);
    }
  };

  const MAX_SMS_LENGTH = 160;
  const charCount = smsMessage.length;
  const smsPartCount = Math.ceil(charCount / MAX_SMS_LENGTH) || 1;

  return (
    <DashboardLayout title="কাস্টমার ডিরেক্টরি (CRM)" subtitle="আপনার কাস্টমার ডাটাবেস এবং Bulk SMS সিস্টেম">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
          <h3 className="font-bold text-gray-700 font-bengali flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0F6E56]" />
            কাস্টমার লিস্ট
            {customers.length > 0 && (
              <span className="bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-extrabold px-2 py-0.5 rounded-full">{customers.length} জন</span>
            )}
          </h3>
          <button
            onClick={() => setShowSmsModal(true)}
            disabled={customers.length === 0 || isLoading}
            className="bg-[#0F6E56] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1D9E75] transition shadow-sm transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <MessageCircle className="w-5 h-5" /> Bulk SMS পাঠান
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500 font-bengali">লোড হচ্ছে... ⏳</div>
        ) : fetchError ? (
          <div className="p-8 text-center">
            <p className="text-red-500 font-bold mb-2">⚠️ ডাটা লোড হয়নি</p>
            <p className="text-red-400 text-sm font-en mb-4">{fetchError}</p>
            <p className="text-gray-500 text-sm">সম্ভাব্য কারণ: customers টেবিল নেই — প্রাথমিক মাইগ্রেশন SQL রান করুন।</p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            {/* Top Horizontal Scrollbar */}
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll} 
              className="overflow-x-auto w-full mb-3"
            >
              <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
            </div>

            <div className="relative w-full overflow-hidden border rounded-lg">
              <div 
                ref={tableScrollRef} 
                onScroll={handleBottomScroll}
                className="max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-auto w-full custom-scrollbar"
              >
                <table ref={tableContentRef} className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
                  <thead className="sticky top-0 z-20 bg-white shadow-sm border-b-2 border-gray-200 text-gray-700">
                  <tr>
                  <th className="p-4 font-medium sticky left-0 z-30 bg-white shadow-[1px_0_0_#e2e8f0]">Customer ID</th>
                  <th className="p-4 font-medium font-bengali">Name</th>
                  <th className="p-4 font-medium">Phone Number</th>
                  <th className="p-4 font-medium text-center">Total Orders</th>
                  <th className="p-4 font-medium text-right">Total Spent</th>
                  <th className="p-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400">
                      <p className="text-4xl mb-3">👤</p>
                      <p className="font-bold text-gray-600 mb-1">কোনো কাস্টমার পাওয়া যায়নি</p>
                      <p className="text-sm">নতুন পার্সেল এন্ট্রি করলে কাস্টমার অটোম্যাটিক্যালি যুক্ত হবে।</p>
                    </td>
                  </tr>
                ) : customers.map((cust) => (
                  <tr key={cust.id} className="group border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-extrabold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[1px_0_0_#e2e8f0]">{String(cust.id).slice(0, 8).toUpperCase()}</td>
                    <td className="p-4 font-bold text-gray-700 font-bengali">{cust.name}</td>
                    <td className="p-4 text-gray-600 font-medium">{cust.phone}</td>
                    <td className="p-4 text-center font-extrabold text-[#3B82F6]">{cust.total_orders}</td>
                    <td className="p-4 text-right font-extrabold text-[#0F6E56]">৳ {Number(cust.total_spent).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(cust.id)} className="p-1.5 bg-red-50 rounded hover:bg-red-500 hover:text-white text-red-500 transition ml-auto" title="মুছে ফেলুন">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
      </div>

      {/* ── BULK SMS MODAL ── */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">

            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-6 text-white">
              <button
                onClick={() => { setShowSmsModal(false); setSmsMessage(''); }}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-white/20 p-2 rounded-xl">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold">Bulk SMS ক্যাম্পেইন</h2>
              </div>
              <p className="text-white/80 text-sm font-medium">সকল কাস্টমারকে একসাথে মেসেজ পাঠান</p>
            </div>

            <div className="p-6 space-y-5">

              {/* Recipient summary */}
              <div className="flex items-center gap-3 bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl px-4 py-3">
                <Users className="w-5 h-5 text-[#0F6E56] shrink-0" />
                <p className="text-sm font-bold text-gray-800">
                  <span className="text-[#0F6E56] text-base">{customers.length} জন</span> কাস্টমারকে SMS পাঠানো হবে
                  <span className="text-gray-500 font-medium ml-1">
                    ({customers.length} ক্রেডিট ব্যয় হবে)
                  </span>
                </p>
              </div>

              {/* Message composer */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  মেসেজ লিখুন
                </label>
                <textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  rows={5}
                  maxLength={640}
                  placeholder="যেমন: প্রিয় কাস্টমার, আমাদের ঈদ সেলে ৩০% ছাড় পাচ্ছেন! আজই অর্ডার করুন। - রহিমস কালেকশন"
                  className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition resize-none text-sm leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-400 font-medium">
                    {smsPartCount > 1 ? (
                      <span className="text-amber-500 font-bold">⚠️ {smsPartCount} SMS parts ({charCount} chars)</span>
                    ) : (
                      <span>{charCount} / {MAX_SMS_LENGTH} characters</span>
                    )}
                  </p>
                  <p className="text-xs font-bold text-gray-400">
                    মোট খরচ: <span className="text-[#0F6E56]">{customers.length * smsPartCount} ক্রেডিট</span>
                  </p>
                </div>
              </div>

              {/* Compliance Warning */}
              <div className="bg-orange-50 text-amber-700 text-sm p-2 rounded-md border border-orange-200 mt-4 font-medium">
                ⚠️ সতর্কতা (বিটিআরসি নিয়ম): প্রোমোশনাল এসএমএস অবশ্যই বাংলায় লিখতে হবে (শুধু সংখ্যা বা লিংক ইংরেজিতে দেওয়া যাবে), নিয়ম অমান্য করলে একাউন্ট সাসপেন্ড হতে পারে!
              </div>

              {/* Warning if multi-part SMS */}
              {smsPartCount > 1 && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                  <span className="shrink-0">⚠️</span>
                  <span>আপনার মেসেজটি {smsPartCount}টি SMS পার্টে পাঠানো হবে। প্রতি পার্টের জন্য আলাদা ক্রেডিট কাটবে।</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowSmsModal(false); setSmsMessage(''); }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleSendSms}
                  disabled={isSending || !smsMessage.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-bold hover:bg-[#1D9E75] transition shadow-lg shadow-[#0F6E56]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> পাঠানো হচ্ছে...</>
                  ) : (
                    <><Send className="w-4 h-4" /> SMS পাঠান</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
