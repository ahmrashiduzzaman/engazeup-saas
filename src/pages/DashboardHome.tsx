import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { engToBdNum, checkSteadfastStatus, steadfastStatusSummary } from '../lib/utils';
import { Loader2, CheckCircle2, Link as LinkIcon, Users, MessageCircle, ShieldAlert, Package } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area } from 'recharts';

export default function DashboardHome() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [liveStats, setLiveStats] = useState({ todayOrders: 0, pendingCod: 0, inTransit: 0, flagged: 0 });
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [parcelData, setParcelData] = useState<any>(null);
  const [tasks, setTasks] = useState({ api: false, csv: false, sms: false });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [celebration, setCelebration] = useState({ show: false, message: '', days: 0 });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [highRiskOrders, setHighRiskOrders] = useState<any[]>([]);

  const currentTotalDays = 14 + (tasks.api ? 5 : 0) + (tasks.csv ? 5 : 0) + (tasks.sms ? 3 : 0);
  const progressPercent = 25 + (tasks.api ? 25 : 0) + (tasks.csv ? 25 : 0) + (tasks.sms ? 25 : 0);

  const closeCelebration = () => setCelebration({ show: false, message: '', days: 0 });

  // Auto-dismiss celebration after 3.5 seconds
  useEffect(() => {
    if (!celebration.show) return;
    const timer = setTimeout(closeCelebration, 3500);
    return () => clearTimeout(timer);
  }, [celebration.show]);

  // ── Real gamification: verify tasks against DB on mount ──
  useEffect(() => {
    if (!user) return;
    const verifyTasks = async () => {
      setIsLoadingTasks(true);
      const [shopRes, customerRes, smsRes] = await Promise.all([
        // Task 1: API connected — check for saved Steadfast API key
        supabase.from('shops').select('steadfast_api_key, sms_credits').eq('id', user.id).single(),
        // Task 2: Customer list — check if any customers exist
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('shop_id', user.id).eq('is_deleted', false),
        // Task 3: SMS recharge history — check manual_payments for any sms_recharge
        supabase.from('manual_payments').select('id', { count: 'exact', head: true }).eq('shop_id', user.id).eq('purpose', 'sms_recharge'),
      ]);

      const apiConnected = !!(shopRes.data?.steadfast_api_key);
      const hasCustomers = (customerRes.count ?? 0) > 0;
      const hasSmsHistory = (smsRes.count ?? 0) > 0 || (shopRes.data?.sms_credits ?? 0) > 0;

      const prev = { api: false, csv: false, sms: false };
      const next = { api: apiConnected, csv: hasCustomers, sms: hasSmsHistory };

      // Show celebration for any task newly completed since page load
      if (next.api && !prev.api) setCelebration({ show: true, message: 'API কানেকশন', days: 5 });
      else if (next.csv && !prev.csv) setCelebration({ show: true, message: 'কাস্টমার লিস্ট', days: 5 });
      else if (next.sms && !prev.sms) setCelebration({ show: true, message: 'Bulk SMS ক্রেডিট', days: 3 });

      setTasks(next);
      setIsLoadingTasks(false);
    };
    verifyTasks();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', user.id)
        .eq('is_deleted', false);
      
      if (!error && data) {
        let todayCount = 0;
        let pendingMoney = 0;
        let transitCount = 0;
        let flaggedCount = 0;
        const trendMap: Record<string, { orders: number, returns: number }> = {};
        const risks: any[] = [];

        const todayStr = new Date().toLocaleDateString('en-GB');
        
        data.forEach(order => {
          const dateObj = new Date(order.created_at);
          const orderDate = dateObj.toLocaleDateString('en-GB');
          const dayName = dateObj.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });

          if (!trendMap[dayName]) trendMap[dayName] = { orders: 0, returns: 0 };
          trendMap[dayName].orders++;

          if (orderDate === todayStr) todayCount++;
          
          const status = order.status?.toLowerCase() || '';
          if (status === 'pending' || status.includes('transit')) {
            transitCount++;
            pendingMoney += (Number(order.cod_amount) || 0);
          }
          if (status.includes('return') || status.includes('cancel')) {
            trendMap[dayName].returns++;
            flaggedCount++;
            risks.push(order);
          }
        });

        const formattedTrends = Object.entries(trendMap).map(([name, vals]) => ({ name, ...vals }));
        setTrendData(formattedTrends.slice(-7));
        setHighRiskOrders(risks.slice(0, 4));
        setLiveStats({ todayOrders: todayCount, pendingCod: pendingMoney, inTransit: transitCount, flagged: flaggedCount });
      }
    };
    fetchStats();
  }, [user]);

  const testSteadfastApi = async () => {
    if (!searchInput.trim()) return;
    try {
      // In production, you would call your supabase edge function here instead of steadfast directly
      const result = await checkSteadfastStatus(searchInput, setIsLoadingTracking, setParcelData);
      const currentStatus = String(result?.delivery_status || result?.status || '');
      if (currentStatus.toLowerCase() === 'delivered') {
        setTimeout(() => alert(`[Automated Upsell SMS Triggered]\n\n"আপনার পার্সেলটি সফলভাবে ডেলিভারি হয়েছে। পরবর্তী অর্ডারে ছাড় পেতে..."`), 1000);
      }
    } catch (e) {
      alert(`Tracking error\n\n${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const liveSummary = parcelData ? steadfastStatusSummary(parcelData) : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 transform transition-all z-50 relative">
          <p className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-2 last:mb-0">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
              <span className="text-sm font-medium text-gray-600">{entry.name}:</span>
              <span className="text-base font-extrabold" style={{ color: entry.color }}>
                {engToBdNum(entry.value)} টি
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout title="আজকের অবস্থা (Today's Status)" subtitle="আপনার সম্পূর্ণ ফিন্যান্সিয়াল ও অপারেশনাল ওভারভিউ">
      {/* CELEBRATION OVERLAY */}
      {celebration.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={closeCelebration}>
          <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } } @keyframes floatUp { 0% { transform: translateY(100vh) scale(0.5); opacity:1; } 100% { transform: translateY(-20vh) scale(1.5); opacity:0; } } .confetti-piece { animation: floatUp 3s ease-out forwards; position: absolute; pointer-events: none; }`}</style>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl z-10 flex flex-col items-center border-4 border-[#0F6E56] max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={closeCelebration} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition font-bold">X</button>
            <div className='text-6xl mb-4 animate-bounce'>{String.fromCodePoint(0x1F389)}</div>
            <h2 className='text-3xl font-extrabold text-[#0F6E56] mb-2'>{'\u09a6\u09be\u09b0\u09c1\u09a3 \u0995\u09be\u099c!'}</h2>
            <p className='text-lg font-bold text-gray-700 text-center'>{celebration.message}{' \u09b8\u09ae\u09cd\u09aa\u09a8\u09cd\u09a8 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964'}</p>
            <div className="mt-4 bg-[#0F6E56]/10 px-6 py-3 rounded-xl border border-[#0F6E56]/20">
              <p className='text-[#0F6E56] font-extrabold text-xl'>{'+' + engToBdNum(celebration.days) + ' \u09a6\u09bf\u09a8 \u09ab\u09cd\u09b0\u09bf \u09af\u09c1\u0995\u09cd\u09a4 \u09b9\u09b2\u09cb!'}</p>
            </div>
            <div className="mt-5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className='h-full bg-[#0F6E56] rounded-full' style={{ animation: 'shrink 3.5s linear forwards' }} />
            </div>
            <p className='text-xs text-gray-400 mt-1.5 font-medium'>{'\u09e9.\u09eb \u09b8\u09c7\u0995\u09c7\u09a8\u09cd\u09a1\u09c7 \u09b8\u09cd\u09ac\u09af\u09bc\u0982\u0995\u09cd\u09b0\u09bf\u09af\u09bc\u09ad\u09be\u09ac\u09c7 \u09ac\u09a8\u09cd\u09a7 \u09b9\u09ac\u09c7'}</p>
            <button onClick={closeCelebration} className='mt-4 w-full py-3 bg-[#0F6E56] hover:bg-[#1D9E75] text-white font-extrabold rounded-xl transition shadow-md'>{'\u09a6\u09be\u09b0\u09c1\u09a3! \u099a\u09be\u09b2\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u0987 \ud83d\ude80'}</button>
          </div>
          {[...Array(20)].map((_, i) => (
            <div key={i} className='confetti-piece text-3xl' style={{ left: Math.random() * 100 + '%', animationDelay: Math.random() * 0.5 + 's', animationDuration: (2 + Math.random() * 2) + 's' }}>
              {[String.fromCodePoint(0x1F38A), String.fromCodePoint(0x1F388), String.fromCodePoint(0x1F381), String.fromCodePoint(0x2728), String.fromCodePoint(0x1F680)][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* GAMIFIED TRIAL UNLOCK WIDGET */}
      <div className="bg-gradient-to-br from-[#0F6E56] to-[#0a4d3c] rounded-3xl p-[3px] shadow-lg mb-10 transform transition-all relative overflow-hidden">
        <div className="bg-white rounded-[22px] p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-3">
                <span className="text-2xl">🎁</span> আপনার ট্রায়াল পিরিয়ড বাড়ান!
                <span className="text-white bg-[#0F6E56] border border-[#0F6E56]/20 px-4 py-1.5 rounded-full text-sm font-extrabold tracking-wide shadow-md">
                  {engToBdNum(currentTotalDays)} দিন বাকি
                </span>
              </h2>
              {progressPercent < 100 ? (
                <p className="text-gray-600 mt-2 font-medium">আপনার অ্যাকাউন্টটি সম্পূর্ণ রেডি করুন এবং আনলক করুন আরও <span className="font-extrabold text-[#0F6E56]">{engToBdNum(13 - (currentTotalDays - 14))}</span> দিন একদম ফ্রি!</p>
              ) : (
                <p className="text-[#0F6E56] mt-2 font-extrabold">অভিনন্দন! আপনি পুরো ২৭ দিনের ফ্রি ট্রায়াল আনলক করেছেন।</p>
              )}
            </div>
            <div className="hidden md:block text-right bg-gray-50 px-5 py-4 rounded-xl border border-gray-100 min-w-[200px]">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">সেটআপ প্রগ্রেস</p>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#1D9E75] rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-sm text-[#0F6E56] font-extrabold mt-1">{engToBdNum(progressPercent)}% সম্পন্ন</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Task 0 — Account created (always done) */}
            <div className="border-2 border-green-100 bg-green-50/60 p-5 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle2 className="w-6 h-6" /> অ্যাকাউন্ট তৈরি
              </div>
              <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
            </div>

            {/* Task 1 — API connected (real: shops.steadfast_api_key) */}
            {isLoadingTasks ? (
              <div className="border-2 border-gray-100 bg-gray-50 p-5 rounded-xl animate-pulse h-24" />
            ) : (
              <div className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.api ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
                <div className={`flex items-center gap-2 font-bold ${tasks.api ? 'text-green-700' : 'text-gray-700'}`}>
                  {tasks.api ? <CheckCircle2 className="w-6 h-6" /> : <LinkIcon className="w-6 h-6 text-gray-400" />} API কানেক্ট
                </div>
                {tasks.api
                  ? <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                  : <a href="/integrations" className="mt-auto bg-gray-50 hover:bg-[#0F6E56] text-gray-500 hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                      <span>API কানেক্ট করুন</span><span className="bg-gray-200 text-gray-600 hover:bg-white/20 px-1.5 py-0.5 rounded text-xs">+৫ দিন</span>
                    </a>
                }
              </div>
            )}

            {/* Task 2 — Customer list (real: customers count > 0) */}
            {isLoadingTasks ? (
              <div className="border-2 border-gray-100 bg-gray-50 p-5 rounded-xl animate-pulse h-24" />
            ) : (
              <div className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.csv ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
                <div className={`flex items-center gap-2 font-bold ${tasks.csv ? 'text-green-700' : 'text-gray-700'}`}>
                  {tasks.csv ? <CheckCircle2 className="w-6 h-6" /> : <Users className="w-6 h-6 text-gray-400" />} কাস্টমার লিস্ট
                </div>
                {tasks.csv
                  ? <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                  : <a href="/new-parcel" className="mt-auto bg-gray-50 hover:bg-[#0F6E56] text-gray-500 hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                      <span>পার্সেল যোগ করুন</span><span className="bg-gray-200 text-gray-600 hover:bg-white/20 px-1.5 py-0.5 rounded text-xs">+৫ দিন</span>
                    </a>
                }
              </div>
            )}

            {/* Task 3 — SMS recharge (real: manual_payments sms_recharge or sms_credits > 0) */}
            {isLoadingTasks ? (
              <div className="border-2 border-gray-100 bg-gray-50 p-5 rounded-xl animate-pulse h-24" />
            ) : (
              <div className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.sms ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white'}`}>
                <div className={`flex items-center gap-2 font-bold ${tasks.sms ? 'text-green-700' : 'text-gray-700'}`}>
                  {tasks.sms ? <CheckCircle2 className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 text-gray-400" />} Bulk SMS সেন্ড
                </div>
                {tasks.sms
                  ? <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                  : <a href="/billing" className="mt-auto bg-gray-50 hover:bg-[#0F6E56] text-gray-500 hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                      <span>SMS রিচার্জ করুন</span><span className="bg-gray-200 text-gray-600 hover:bg-white/20 px-1.5 py-0.5 rounded text-xs">+৩ দিন</span>
                    </a>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "আজকের মোট অর্ডার", value: engToBdNum(liveStats.todayOrders) + " টি", sub: "Supabase থেকে লাইভ", color: "text-blue-600" },
          { label: "পেন্ডিং COD (সব কুরিয়ার)", value: "৳ " + engToBdNum(liveStats.pendingCod.toLocaleString('en-IN')), sub: "লাইভ ক্লাউড হিসাব", color: "text-amber-600" },
          { label: "ইন-ট্রানজিট / পেন্ডিং", value: engToBdNum(liveStats.inTransit) + " টি", sub: "অপেক্ষমান পার্সেল", color: "text-[#0F6E56]" },
          { label: "ফ্রড ফ্ল্যাগড / রিটার্ন", value: engToBdNum(liveStats.flagged) + " টি", sub: "অ্যানালাইসিস সম্পন্ন", color: "text-red-600" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 text-sm font-bold mb-3">{stat.label}</p>
            <h3 className={`text-4xl font-extrabold ${stat.color} mb-3 tracking-tight`}>{stat.value}</h3>
            <p className="text-xs text-gray-400 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Live Tracking */}
      <section className="mb-8" aria-label="লাইভ পার্সেল ট্র্যাকিং">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">লাইভ পার্সেল ট্র্যাকিং</h2>
          <div className="flex w-full sm:w-auto">
            <div className="relative flex w-full sm:w-80 shadow-sm rounded-xl">
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="কনসাইনমেন্ট আইডি (CID)..." className="w-full font-en px-4 py-2.5 rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] transition" />
              <button onClick={testSteadfastApi} disabled={isLoadingTracking} className="px-6 py-2.5 bg-[#0F6E56] text-white font-semibold rounded-r-xl border border-[#0F6E56] hover:bg-[#1D9E75] hover:border-[#1D9E75] transition disabled:opacity-70 flex items-center gap-2 whitespace-nowrap">
                {isLoadingTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ট্র্যাক করুন'}
              </button>
            </div>
          </div>
        </div>

        {isLoadingTracking && (
          <div className="rounded-2xl border border-gray-100/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-6 md:p-8 shadow-sm overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100"><Loader2 className="h-6 w-6 text-[#0F6E56] animate-spin" /></div><div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200/90 rounded-lg animate-pulse" /><div className="h-3 w-32 bg-slate-100 rounded-md animate-pulse" /></div></div>
          </div>
        )}

        {!isLoadingTracking && parcelData && liveSummary && (
          <div className="group rounded-2xl border border-gray-100/90 bg-gradient-to-br from-white via-[#f8fafc] to-[#f0fdf9]/40 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#1D9E75] text-white shadow-lg"><Package className="h-6 w-6" strokeWidth={2} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Delivery status</p>
                  <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold tracking-wide`}>{liveSummary.statusLabel}</span>
                  <p className="mt-3 text-sm text-gray-500 font-medium max-w-md">রিয়েল-টাইমে Steadfast থেকে আপডেট।</p>
                </div>
              </div>
              <div className="sm:text-right rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 px-5 py-4 shadow-inner min-w-[min(100%,14rem)]">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">COD amount</p>
                <p className="text-2xl md:text-3xl font-extrabold text-[#0F6E56]">{engToBdNum(liveSummary.codLabel.replace(/৳ /g, ''))} ৳</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Chart & Alerts */}
      <div className="flex flex-col gap-8 mb-8">
        <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-8 flex justify-between items-center">
            <span>অর্ডার বনাম রিটার্ন ট্রেন্ড</span>
            <select className="text-sm font-bold border border-gray-200 rounded-lg p-2 outline-none text-gray-600 focus:border-[#0F6E56]">
              <option>গত ৭ দিন</option>
              <option>এই মাস</option>
            </select>
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F6E56" stopOpacity={0.3} /><stop offset="95%" stopColor="#0F6E56" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => engToBdNum(val)} tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0F6E56', strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '14px' }} />
                <Area activeDot={{ r: 6, strokeWidth: 0, fill: '#0F6E56' }} type="monotone" dataKey="orders" name="মোট অর্ডার" stroke="#0F6E56" strokeWidth={4} fillOpacity={1} fill="url(#colorOrders)" animationDuration={1500} />
                <Area activeDot={{ r: 6, strokeWidth: 0, fill: '#EF4444' }} type="monotone" dataKey="returns" name="রিটার্ন" stroke="#EF4444" strokeWidth={4} fillOpacity={1} fill="url(#colorReturns)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {highRiskOrders.length > 0 && (
          <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-xl text-red-600"><ShieldAlert className="h-7 w-7" /></div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">AI ফ্লাগড অর্ডার</h3>
                    <span className="bg-red-100 text-red-600 font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wide">High Risk</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">অর্ডার কনফার্ম করার আগে যাচাই করুন। এই নাম্বারগুলোর রেকর্ড সন্দেহজনক।</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {highRiskOrders.map(order => (
                <div key={order.id} className="p-5 border border-red-100 bg-red-50/40 rounded-xl hover:bg-red-50 transition-colors cursor-pointer flex flex-col h-full">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-extrabold text-gray-900 font-en text-sm">{order.id.slice(0, 8)}</span>
                    <span className="text-xs font-bold text-gray-600 font-en bg-white px-2.5 py-1 rounded-md border border-gray-100 shadow-sm">{order.phone_number}</span>
                  </div>
                  <p className="text-base font-bold text-gray-800 mb-4">{order.customer_name}</p>
                  <div className="mt-auto bg-white border border-red-200 p-3 rounded-lg flex items-start gap-2.5 shadow-sm">
                    <span className="text-red-500 text-sm leading-none mt-0.5">⚠️</span>
                    <p className="text-xs text-red-700 font-bold leading-relaxed text-left">ফ্লাগড ডিউ টু: {order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
