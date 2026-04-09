import React, { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LayoutDashboard, Wallet, Package, CreditCard, ShieldAlert, AlertTriangle,
  TrendingUp, LogOut, Menu, X, Users, AlertCircle, CheckCircle2,
  Clock, ChevronRight, BarChart3, Settings, ExternalLink, Download, Loader2, MessageCircle, PlusCircle, Send, Copy, Link, Code, Key
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const supabaseUrl = 'https://otvzexarrpuaewjjdxna.supabase.co';
const supabaseKey = 'sb_publishable_7jBWsP_UplGHBSmiA3rn5w_a_7U8WzI';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- MOCK DATA ---
const mockUser = {
  id: 'u1',
  name: 'রহিম ইকবাল',
  email: 'rahim@example.com',
  shopName: 'রহিমস কালেকশন',
  role: 'seller', // 'seller' or 'admin'
  subscription: 'Growth',
  joinedAt: '2023-10-01'
};

const mockAdmin = {
  id: 'a1',
  name: 'অ্যাডমিন',
  email: 'admin@engazeup.com',
  role: 'admin'
};

const courierColors: Record<string, string> = {
  'Pathao': '#EF4444',
  'Steadfast': '#3B82F6',
  'RedX': '#EF4444',
  'Paperfly': '#8B5CF6'
};

const mockOrders = [
  { id: 'ORD-1001', customer: 'কামরুল হাসান', phone: '01711000001', courier: 'Pathao', status: 'Delivered', cod: 1550, risk: 'Low', dispatchDate: '2026-04-01', paid: true },
  { id: 'ORD-1002', customer: 'সাদিয়া আফরিন', phone: '01822000002', courier: 'Steadfast', status: 'In Transit', cod: 2100, risk: 'Low', dispatchDate: '2026-04-02', paid: false },
  { id: 'ORD-1003', customer: 'জুলহাস মিয়া', phone: '01933000003', courier: 'RedX', status: 'Returned', cod: 850, risk: 'High', dispatchDate: '2026-03-25', paid: false },
  { id: 'ORD-1004', customer: 'ফাহিম আহমেদ', phone: '01744000004', courier: 'Pathao', status: 'Pending COD', cod: 3200, risk: 'Medium', dispatchDate: '2026-03-28', paid: false },
  { id: 'ORD-1005', customer: 'তাসনিয়া রহমান', phone: '01655000005', courier: 'Paperfly', status: 'Delivered', cod: 1200, risk: 'Low', dispatchDate: '2026-04-01', paid: true },
  { id: 'ORD-1006', customer: 'অনিক মাহমুদ', phone: '01566000006', courier: 'Steadfast', status: 'Pending COD', cod: 4500, risk: 'High', dispatchDate: '2026-03-20', paid: false },
  { id: 'ORD-1007', customer: 'মুনিয়া ইসলাম', phone: '01877000007', courier: 'Pathao', status: 'In Transit', cod: 950, risk: 'Low', dispatchDate: '2026-04-03', paid: false },
];

const mockCustomers = [
  { id: 'CUST-001', name: 'রহিম ইকবাল', phone: '01711223344', totalOrders: 15, totalSpent: 45000 },
  { id: 'CUST-002', name: 'সাদিয়া আফরিন', phone: '01822334455', totalOrders: 8, totalSpent: 21000 },
  { id: 'CUST-003', name: 'জুলহাস মিয়া', phone: '01933445566', totalOrders: 24, totalSpent: 85000 },
  { id: 'CUST-004', name: 'ফাহিম আহমেদ', phone: '01744556677', totalOrders: 3, totalSpent: 5200 },
  { id: 'CUST-005', name: 'তাসনিয়া রহমান', phone: '01655667788', totalOrders: 11, totalSpent: 32000 },
  { id: 'CUST-006', name: 'ইশিকা চৌধুরী', phone: '01511223344', totalOrders: 6, totalSpent: 12500 }
];

const mockTrendData = [
  { name: '২৮ মার্চ', orders: 45, returns: 5 },
  { name: '২৯ মার্চ', orders: 52, returns: 4 },
  { name: '৩০ মার্চ', orders: 38, returns: 8 },
  { name: '৩১ মার্চ', orders: 65, returns: 3 },
  { name: '১ এপ্রিল', orders: 48, returns: 6 },
  { name: '২ এপ্রিল', orders: 55, returns: 4 },
  { name: '৩ এপ্রিল', orders: 30, returns: 2 },
];

const mockFinanceData = [
  { name: 'Pathao', received: 45000, pending: 12500, overdue: 3000 },
  { name: 'Steadfast', received: 32000, pending: 18000, overdue: 4500 },
  { name: 'RedX', received: 28000, pending: 5000, overdue: 1200 },
  { name: 'Paperfly', received: 15000, pending: 8000, overdue: 0 },
];

function readSteadfastEnv(name: 'VITE_STEADFAST_API_KEY' | 'VITE_STEADFAST_SECRET_KEY' | 'VITE_STEADFAST_API_BASE') {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === null) return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function steadfastStatusSummary(data: unknown): { statusLabel: string; codLabel: string } {
  if (typeof data !== 'object' || data === null) {
    return { statusLabel: 'Unknown', codLabel: '—' };
  }
  const o = data as Record<string, unknown>;
  const cons =
    o.consignment && typeof o.consignment === 'object'
      ? (o.consignment as Record<string, unknown>)
      : null;

  const str = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : '';

  let raw =
    str(o.delivery_status) ||
    (cons ? str(cons.delivery_status) || str(cons.status) : '');
  if (!raw && typeof o.status === 'string' && o.status.trim() && !/^\d{3}$/.test(o.status.trim())) {
    raw = o.status.trim();
  }

  const statusLabel = raw
    ? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown';

  const codRaw =
    o.cod_amount ??
    o.codAmount ??
    o.cod ??
    (cons && (cons.cod_amount ?? cons.codAmount ?? cons.cod));

  let codLabel = '—';
  if (codRaw !== undefined && codRaw !== null && codRaw !== '') {
    const n = typeof codRaw === 'number' ? codRaw : Number(codRaw);
    codLabel = Number.isFinite(n) ? `৳ ${n.toLocaleString('en-BD')}` : String(codRaw);
  }

  return { statusLabel, codLabel };
}

function extractSteadfastFailureMessage(parsed: unknown, rawText: string, status: number): string {
  const chunks: string[] = [];

  if (typeof parsed === 'object' && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) chunks.push(o.message.trim());
    if (typeof o.error === 'string' && o.error.trim()) chunks.push(o.error.trim());
    if (typeof o.exception === 'string' && o.exception.trim()) {
      chunks.push(`Exception: ${o.exception.trim()}`);
    }
    if (o.errors !== undefined) {
      chunks.push(
        typeof o.errors === 'string' ? o.errors : JSON.stringify(o.errors, null, 2)
      );
    }
  }

  if (chunks.length === 0 && rawText.trim()) {
    chunks.push(rawText.length > 4000 ? `${rawText.slice(0, 4000)}…` : rawText);
  }

  const body = chunks.length > 0 ? chunks.join('\n\n') : 'No response body';
  return `${body}\n\n[HTTP ${status}]`;
}

function statusBadgeTone(statusLabel: string): string {
  const s = statusLabel.toLowerCase();
  if (s.includes('deliver')) {
    return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90 shadow-sm shadow-emerald-900/5';
  }
  if (s.includes('cancel') || s.includes('return')) {
    return 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/90 shadow-sm shadow-rose-900/5';
  }
  if (s.includes('transit') || s.includes('pending') || s.includes('hold')) {
    return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/90 shadow-sm shadow-sky-900/5';
  }
  return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 shadow-sm shadow-amber-900/5';
}

async function checkSteadfastStatus(
  trackingId: string,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  setParcelData: Dispatch<SetStateAction<any>>
) {
  setIsLoading(true);
  try {
    const apiKey = readSteadfastEnv('VITE_STEADFAST_API_KEY');
    const secretKey = readSteadfastEnv('VITE_STEADFAST_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Set VITE_STEADFAST_API_KEY and VITE_STEADFAST_SECRET_KEY in .env');
    }

    const url = `https://portal.packzy.com/api/v1/status_by_cid/${trackingId}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
        },
      });

      const rawText = await res.text();
      console.log(rawText);

      let parsedJson: unknown;
      try {
        parsedJson = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedJson = undefined;
      }

      if (!res.ok) {
        const detail = extractSteadfastFailureMessage(parsedJson, rawText, res.status);
        const err = new Error(detail) as Error & { status: number; body: unknown; rawBody: string };
        err.status = res.status;
        err.body = parsedJson !== undefined ? parsedJson : rawText;
        err.rawBody = rawText;
        throw err;
      }

      const data = parsedJson !== undefined ? parsedJson : rawText;
      setParcelData(data);
      return data;
    } catch (e) {
      if (e instanceof Error && 'status' in e && typeof (e as { status: unknown }).status === 'number') {
        throw e;
      }
      const fallback = e instanceof Error ? e.message : String(e);
      throw new Error(`Steadfast request failed (network or client error):\n\n${fallback}`);
    }
  } finally {
    setIsLoading(false);
  }
}

function saveCustomerToLocal(parcelData: any) {
  localStorage.removeItem('engazeup_customers');
  console.log('Extracting Data:', parcelData);
  if (!parcelData || typeof parcelData !== 'object') return;

  const o = parcelData as Record<string, any>;
  const cons = o.consignment && typeof o.consignment === 'object' ? o.consignment : null;

  const name = cons?.recipient_name || cons?.customer_name || o.recipient_name;
  const phone = cons?.recipient_phone || cons?.customer_phone || o.recipient_phone;
  const codRaw = cons?.cod_amount || o.cod_amount || 0;

  const codItemPrice = Number(codRaw) || 0;

  if (!name && !phone) return;

  const key = 'engazeup_customers';
  const existing = localStorage.getItem(key);
  let customers: any[] = [];
  try {
    if (existing) customers = JSON.parse(existing);
  } catch (e) { }

  if (!Array.isArray(customers)) customers = [];

  const phoneStr = phone ? String(phone).trim() : 'No Phone';
  const nameStr = name ? String(name).trim() : 'Unknown';

  const existingIdx = customers.findIndex(c => c.phone === phoneStr);

  if (existingIdx !== -1 && phoneStr !== 'No Phone') {
    customers[existingIdx].totalOrders = (customers[existingIdx].totalOrders || 1) + 1;
    customers[existingIdx].totalSpent = (customers[existingIdx].totalSpent || 0) + codItemPrice;
  } else {
    customers.unshift({
      id: `CUST-${Date.now()}`,
      name: nameStr,
      phone: phoneStr,
      totalOrders: 1,
      totalSpent: codItemPrice
    });
  }

  localStorage.setItem(key, JSON.stringify(customers));
}

// --- APP COMPONENT ---
export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [parcelData, setParcelData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@700;800;900&display=swap');
      body {
        font-family: 'Hind Siliguri', sans-serif;
        background-color: #F8F9FA;
        color: #1F2937;
      }
      .font-en {
        font-family: 'Inter', sans-serif;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    }
  }, []);

  const login = (role = 'seller') => {
    setUser(role === 'admin' ? mockAdmin : mockUser);
    setCurrentView(role === 'admin' ? 'admin' : 'dashboard');
  };

  const logout = () => {
    setUser(null);
    setCurrentView('landing');
  };

  const navigate = (view: string) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  // --- VIEWS ---
  const LandingPage = () => (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">

      {/* Navbar */}
      <nav className="bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer" onClick={() => navigate('landing')}>
          <TrendingUp className="h-8 w-8" />
          <span>EngazeUp</span>
        </div>
        <div className="hidden md:flex gap-6 items-center font-medium">
          <a href="#features" className="text-gray-600 hover:text-[#0F6E56] transition">ফিচারসমূহ</a>
          <a href="#pricing" className="text-gray-600 hover:text-[#0F6E56] transition">প্যাকেজ</a>
          <button onClick={() => navigate('login')} className="text-[#0F6E56] font-bold hover:text-[#1D9E75] transition">লগইন</button>
          <button onClick={() => navigate('register')} className="bg-[#0F6E56] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#1D9E75] shadow-md shadow-[#0F6E56]/20 transition transform hover:-translate-y-0.5">
            ফ্রি ট্রায়াল শুরু করুন
          </button>
        </div>
        <button className="md:hidden text-gray-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      {/* Hero Section - Balanced & Professional */}
      <section className="py-20 px-6 md:px-12 max-w-6xl mx-auto text-center flex-1">
        <div className="inline-flex items-center gap-2 bg-[#0F6E56]/10 text-[#0F6E56] px-5 py-2 rounded-full text-sm font-bold mb-8 border border-[#0F6E56]/20 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F6E56] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0F6E56]"></span>
          </span>
          বাংলাদেশের প্রথম F-Commerce Operating System
        </div>

        {/* Noto Sans Bengali Applied to the 100% Text */}
        <h1 className="text-[2.5rem] md:text-6xl lg:text-[4rem] font-extrabold text-gray-900 dark:text-gray-900 leading-[1.2] md:leading-[1.15] mb-6 tracking-tight">
          ম্যানুয়াল হিসাবের দিন শেষ, <br className="hidden md:block" />
          ব্যবসা হোক <span className="text-[#0F6E56]" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>১০০% অটোমেটেড!</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
          সব কুরিয়ারের লাইভ ট্র্যাকিং, COD হিসাব, AI ফ্রড ডিটেকশন এবং <b className="text-gray-800">Bulk SMS মার্কেটিং</b>। আপনার অনলাইন ব্যবসাকে রকেটের গতিতে বড় করার সম্পূর্ণ কন্ট্রোল এখন এক ড্যাশবোর্ডে।
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={() => navigate('register')} className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-[#1D9E75] hover:to-[#0F6E56] transition-all shadow-xl shadow-[#0F6E56]/25 transform hover:-translate-y-1">
            ফ্রি ট্রায়াল শুরু করুন (১৪ দিন)
          </button>
          <button onClick={() => login('admin')} className="bg-white text-[#0F6E56] border-2 border-[#0F6E56]/20 px-8 py-4 rounded-xl text-lg font-bold hover:border-[#0F6E56] hover:bg-gray-50 transition-all transform hover:-translate-y-1">
            অ্যাডমিন ডেমো দেখুন
          </button>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-100">
          <p className="text-sm text-gray-500 font-bold mb-6 uppercase tracking-wider">ইন্টিগ্রেটেড কুরিয়ার পার্টনার্স</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition duration-500">
            <span className="text-2xl font-bold font-en text-[#EF4444]">PATHAO</span>
            <span className="text-2xl font-bold font-en text-[#3B82F6]">STEADFAST</span>
            <span className="text-2xl font-bold font-en text-[#EF4444]">REDX</span>
            <span className="text-2xl font-bold font-en text-[#8B5CF6]">PAPERFLY</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">কেন ৬৮% অনলাইন ব্যবসা ২ বছরে বন্ধ হয়?</h2>
            <p className="text-gray-600 text-lg">আমাদের ডাটা বলছে, মূল সমস্যা সেলস নয়, সমস্যা হলো ম্যানেজমেন্ট এবং মার্কেটিংয়ে।</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: 'COD রিকন্সিলিয়েশন (টাকার হিসাব)', desc: 'কোন অর্ডারের টাকা এসেছে, কোনটা আটকে আছে তার হিসাব মেলানো এখন ১ সেকেন্ডের ব্যাপার। EngazeUp দেয় স্বয়ংক্রিয় লাইভ COD ট্র্যাকিং।', icon: Wallet },
              { title: 'স্মার্ট কাস্টমার CRM ও Bulk SMS 🚀', desc: 'সব কাস্টমারের ডাটাবেস স্বয়ংক্রিয়ভাবে সেভ হবে। নতুন অফার বা ডিসকাউন্ট জানাতে এক ক্লিকে হাজার হাজার কাস্টমারকে Bulk SMS পাঠান। সেলস বাড়বে রকেটের গতিতে!', icon: MessageCircle },
              { title: 'AI ফেক অর্ডার ও রিটার্ন অ্যালার্ট', desc: 'অর্ডার কনফার্ম করার আগেই কাস্টমারের ফোন নাম্বারের পূর্ববর্তী ডেলিভারি রেকর্ড অ্যানালাইসিস করে ফ্রড বা রিটার্ন ঝুঁকি জানিয়ে দেয়।', icon: ShieldAlert },
              { title: 'রিয়েল নেট মুনাফা ড্যাশবোর্ড', desc: 'শুধুমাত্র সেলস ভলিউম দেখে লাভ হিসাব করেন? কুরিয়ার চার্জ, রিটার্ন লস বাদ দিয়ে আপনার আসল নেট মুনাফা কত, তা রিয়েলটাইমে দেখুন।', icon: BarChart3 }
            ].map((f, i) => (
              <div key={i} className="group p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-[#0F6E56]/10 hover:border-[#0F6E56]/30 transition-all duration-300 bg-[#F8F9FA]/50 hover:bg-white cursor-pointer transform hover:-translate-y-1">
                <div className="bg-[#0F6E56]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-[#0F6E56] group-hover:text-white text-[#0F6E56]">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#F8F9FA]">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">সহজ ও স্বচ্ছ প্রাইসিং</h2>
            <p className="text-gray-600 text-lg">কোনো লুকানো চার্জ নেই। আপনার ব্যবসার সাইজ অনুযায়ী প্যাকেজ বেছে নিন।</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">নতুন পেজ বা ছোট ব্যবসার জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳৯৯৯</span>
                <span className="text-gray-500 font-medium">/মাস</span>
                <p className="text-xs text-gray-400 mt-1 font-medium">Billed as $৯/month via Stripe</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium text-gray-700">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>মাসে ৫০০ অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>২টি কুরিয়ার ইন্টিগ্রেশন</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>বেসিক ফ্রড ডিটেকশন</span></li>
              </ul>
              <button onClick={() => navigate('register')} className="w-full py-3 rounded-lg border-2 border-[#0F6E56] text-[#0F6E56] font-bold hover:bg-[#0F6E56] hover:text-white transition">শুরু করুন</button>
            </div>

            <div className="bg-gradient-to-b from-[#0F6E56] to-[#0a4d3c] text-white p-8 rounded-2xl border border-[#0F6E56] shadow-2xl relative transform md:-translate-y-4 flex flex-col">
              <div className="absolute top-0 right-0 bg-[#1D9E75] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl shadow-sm">জনপ্রিয় (Best Value)</div>
              <h3 className="text-xl font-bold mb-2">Growth</h3>
              <p className="text-white/80 text-sm mb-6 font-medium">ক্রমবর্ধমান F-commerce এর জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳১,৯৯৯</span>
                <span className="text-white/70 font-medium">/মাস</span>
                <p className="text-xs text-white/60 mt-1 font-medium">Billed as $১৯/month via Stripe</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>মাসে ৩,০০০ অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>সব কুরিয়ার ও API ইন্টিগ্রেশন</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>আনলিমিটেড কাস্টমার CRM</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>Bulk SMS মার্কেটিং টুলস</span></li>
              </ul>
              <button onClick={() => navigate('register')} className="w-full py-3.5 rounded-lg bg-white text-[#0F6E56] font-extrabold hover:bg-gray-100 transition shadow-lg transform hover:-translate-y-0.5">ফ্রি ট্রায়াল শুরু করুন</button>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">বড় এজেন্সি ও ব্র্যান্ডের জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳৩,৯৯৯</span>
                <span className="text-gray-500 font-medium">/মাস</span>
                <p className="text-xs text-gray-400 mt-1 font-medium">Billed as $৩৯/month via Stripe</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium text-gray-700">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>আনলিমিটেড অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>Facebook Ads ROI অ্যানালাইসিস</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>টিম মেম্বার অ্যাক্সেস (৫ জন)</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>ডেডিকেটেড একাউন্ট ম্যানেজার</span></li>
              </ul>
              <button onClick={() => navigate('register')} className="w-full py-3 rounded-lg border-2 border-[#0F6E56] text-[#0F6E56] font-bold hover:bg-[#0F6E56] hover:text-white transition">শুরু করুন</button>
            </div>
          </div>
        </div>
      </section>

      <EngazeUpFooter />
    </div>
  );


  // --- FOOTER COMPONENT ---
  const EngazeUpFooter = () => (
    <footer className="w-full bg-[#0F6E56] text-white py-10 mt-auto border-t-4 border-[#1D9E75]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">

        {/* Central Brand Section */}
        <div
          className="flex items-center gap-2.5 mb-5 hover:scale-105 transition-transform duration-300 cursor-pointer"
          onClick={() => navigate('landing')}
        >
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-6 w-6 text-[#1D9E75]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-sans">EngazeUp</span>
        </div>

        {/* Prominent Mission Statement (Standard Sized) */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-2 leading-snug" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
            বাংলাদেশের F-commerce ব্যবসার <span className="text-[#1D9E75]">সম্পূর্ণ অপারেটিং সিস্টেম।</span>
          </h2>
          <p className="text-sm md:text-base text-white/80 font-medium max-w-xl mx-auto leading-relaxed">
            ফাইন্যান্স, কাস্টমার রিলেশন এবং ডেলিভারি ম্যানেজমেন্ট— সবকিছু এখন এক প্ল্যাটফর্মে।
          </p>
        </div>

        {/* Bottom Copyright & Links */}
        <div className="w-full border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-white/60 font-en">
          <p>© {new Date().getFullYear()} EngazeUp. All rights reserved.</p>
          <div className="flex gap-5 font-medium">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Support</a>
          </div>
        </div>

      </div>
    </footer>
  );

  // --- AUTH PAGE COMPONENT ---
  const AuthPage = ({ isRegister }: { isRegister: boolean }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAuthLoading(true);

      if (isRegister) {
        // Registration Logic
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: name } }
        });

        if (error) {
          alert('অ্যাকাউন্ট খুলতে সমস্যা হয়েছে: ' + error.message);
        } else if (data.user) {
          // আসল ইউজারের ডাটা সেট করা হচ্ছে
          setUser({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || 'নতুন ইউজার',
            email: data.user.email,
            shopName: 'আমার শপ',
            role: 'seller',
            subscription: 'Free Trial',
          });
          alert('আলহামদুলিল্লাহ! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
          navigate('onboarding');
        }
      } else {
        // Login Logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          alert('ভুল ইমেইল বা পাসওয়ার্ড! দয়া করে আবার চেষ্টা করুন।');
        } else if (data.user) {
          // আসল ইউজারের ডাটা সেট করা হচ্ছে
          setUser({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || 'ইউজার',
            email: data.user.email,
            shopName: 'আমার শপ',
            role: 'seller',
            subscription: 'Growth',
          });
          navigate('dashboard');
        }
      }
      setIsAuthLoading(false);
    };
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FA]">

        {/* Main Content Area (Login/Register Card) */}
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer" onClick={() => navigate('landing')}>
                <TrendingUp className="h-8 w-8" />
                <span>EngazeUp</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
              {isRegister ? 'নতুন একাউন্ট খুলুন' : 'একাউন্টে লগইন করুন'}
            </h2>

            <form className="space-y-4" onSubmit={handleAuth}>
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">আপনার নাম</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none transition"
                    placeholder="মোঃ রহিম"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ইমেইল এড্রেস</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none transition"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none transition"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-lg font-bold hover:bg-[#1D9E75] transition mt-6 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isRegister ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {isRegister ? (
                <p>আগে থেকেই একাউন্ট আছে? <span className="text-[#0F6E56] font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>লগইন করুন</span></p>
              ) : (
                <p>একাউন্ট নেই? <span className="text-[#0F6E56] font-bold cursor-pointer hover:underline" onClick={() => navigate('register')}>নতুন একাউন্ট খুলুন</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <EngazeUpFooter />

      </div>
    );
  };

  const OnboardingPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">শপ সেটআপ</h2>
        <p className="text-center text-gray-500 mb-8">আপনার ব্যবসার বিস্তারিত তথ্য দিয়ে প্রোফাইল সম্পূর্ণ করুন</p>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); login('seller'); }}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">দোকানের নাম (Shop Name)</label>
              <input type="text" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none" placeholder="যেমন: রহিমস কালেকশন" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ফেসবুক পেজ URL</label>
              <input type="url" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none font-en" placeholder="facebook.com/yourpage" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">প্রোডাক্ট ক্যাটাগরি</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none">
              <option>Fashion & Clothing</option>
              <option>Health & Beauty</option>
              <option>Electronics & Gadgets</option>
              <option>Home & Lifestyle</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">কানেক্টেড কুরিয়ার (একাধিক নির্বাচন করা যাবে)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Pathao', 'Steadfast', 'RedX', 'Paperfly'].map((courier) => (
                <label key={courier} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" defaultChecked={courier === 'Pathao'} className="accent-[#0F6E56] w-4 h-4" />
                  <span className="font-en font-medium text-gray-700">{courier}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">পেমেন্ট রিসিভ করার নাম্বার (bKash/Nagad)</label>
            <input type="text" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none font-en" placeholder="01XXXXXXXXX" />
          </div>

          <hr className="my-6" />

          <div className="bg-[#0F6E56]/5 p-4 rounded-lg border border-[#0F6E56]/20">
            <h4 className="font-semibold text-[#0F6E56] mb-2">সাবস্ক্রিপশন প্ল্যান নির্বাচন করুন</h4>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none font-en">
              <option value="starter">Starter - ৳999/month ($9)</option>
              <option value="growth">Growth - ৳1,999/month ($19)</option>
              <option value="pro">Pro - ৳3,999/month ($39)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">* পেমেন্ট প্রক্রিয়া সম্পূর্ণ করতে স্ট্রাইপ (Stripe) গেটওয়ে ব্যবহার করা হবে。</p>
          </div>

          <button type="submit" className="w-full bg-[#0F6E56] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#1D9E75] transition">
            ড্যাশবোর্ডে প্রবেশ করুন
          </button>
        </form>
      </div>
    </div>
  );

  // --- DASHBOARD LAYOUT (SIDEBAR & HEADER) ---
  // --- DASHBOARD LAYOUT (SIDEBAR & HEADER) ---
  const DashboardLayout = ({ children, title, subtitle }: any) => {

    // আপনার অ্যাপের আসল পেজগুলোর নামের (ID) সাথে মিলিয়ে মেনু তৈরি করা হলো
    const menuItems = [
      { id: 'dashboard', label: 'আজকের অবস্থা', icon: LayoutDashboard },
      { id: 'finance', label: 'টাকার হিসাব', icon: Wallet },
      { id: 'inventory', label: 'স্টক ও ইনভেন্টরি', icon: Package },
      { id: 'new-parcel', label: 'নতুন পার্সেল', icon: PlusCircle }, // <-- 'create-order' পরিবর্তন করে 'new-parcel' করা হয়েছে
      { id: 'orders', label: 'অর্ডার লিস্ট', icon: Package },
      { id: 'customers', label: 'কাস্টমার ডিরেক্টরি', icon: Users },
      { id: 'integrations', label: 'ইন্টিগ্রেশন ও API', icon: Link },
      { id: 'billing', label: 'বিলিং ও প্ল্যান', icon: CreditCard },
    ];

    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-bengali">

        {/* Mobile Navbar */}
        <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-xl cursor-pointer" onClick={() => navigate('dashboard')}>
            <TrendingUp className="h-6 w-6" />
            <span>EngazeUp</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`w-64 bg-white border-r border-gray-100 flex-col md:flex fixed md:relative z-40 h-screen transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-6 hidden md:flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('dashboard')}>
            <TrendingUp className="h-8 w-8" />
            <span>EngazeUp</span>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
            {menuItems.map(item => {
              // বর্তমান পেজ অনুযায়ী অ্যাকটিভ কালার সেট করার লজিক
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)} // এখানে ক্লিক করলেই পেজ পরিবর্তন হবে
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${isActive
                    ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/20'
                    : 'text-gray-600 hover:bg-[#0F6E56]/10 hover:text-[#0F6E56]'
                    }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#0F6E56]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl mb-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#0F6E56]/10 flex items-center justify-center text-[#0F6E56] font-extrabold text-lg">
                R
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-bold text-gray-900 truncate">আমার শপ</p>
                <p className="text-xs text-gray-500 font-medium truncate">Growth Plan</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl font-bold transition-all duration-300"
            >
              <LogOut className="h-4 w-4" /> লগআউট
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FA]">
          {/* Header Area */}
          <header className="bg-white border-b border-gray-100 px-6 py-8 md:px-10 md:py-10 shadow-sm z-10">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight flex items-center gap-3">
                {title}
                {/* Title-এর পাশে লাইভ রেড ডট */}
                {title?.includes("আজকের অবস্থা") && <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse mt-1"></span>}
              </h1>
              {subtitle && <p className="text-gray-500 font-medium text-sm md:text-base">{subtitle}</p>}
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
            <div className="max-w-6xl mx-auto pb-20">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}
      </div>
    );
  };
  const DashboardHome = () => {
    const [searchInput, setSearchInput] = useState('236310870');
    const [liveStats, setLiveStats] = useState({ todayOrders: 0, pendingCod: 0, inTransit: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [parcelData, setParcelData] = useState<any>(null);

    // --- GAMIFIED TRIAL LOGIC ---
    const [tasks, setTasks] = useState({ api: false, csv: false, sms: false });
    const [celebration, setCelebration] = useState({ show: false, message: '', days: 0 });

    const currentTotalDays = 14 + (tasks.api ? 5 : 0) + (tasks.csv ? 5 : 0) + (tasks.sms ? 3 : 0);
    const progressPercent = 25 + (tasks.api ? 25 : 0) + (tasks.csv ? 25 : 0) + (tasks.sms ? 25 : 0);

    const handleTaskComplete = (taskKey: 'api' | 'csv' | 'sms', daysAdd: number, taskName: string) => {
      if (tasks[taskKey]) return;

      setTasks(prev => ({ ...prev, [taskKey]: true }));
      setCelebration({ show: true, message: taskName, days: daysAdd });

      setTimeout(() => {
        setCelebration({ show: false, message: '', days: 0 });
      }, 4000);
    };

    // --- BENGALI NUMBER & TOOLTIP LOGIC ---
    const engToBdNum = (num: number | string) => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).replace(/\d/g, (d) => bengaliDigits[parseInt(d)]);
    };

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

    // --- API & DATA FETCHING ---
    useEffect(() => {
      const fetchStats = async () => {
        const { data, error } = await supabase.from('orders').select('*');
        if (!error && data) {
          let todayCount = 0;
          let pendingMoney = 0;
          let transitCount = 0;
          const todayStr = new Date().toLocaleDateString('en-GB');
          data.forEach(order => {
            const orderDate = new Date(order.created_at).toLocaleDateString('en-GB');
            if (orderDate === todayStr) todayCount++;
            if (order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'in transit') {
              transitCount++;
              pendingMoney += (Number(order.cod_amount) || 0);
            }
          });
          setLiveStats({ todayOrders: todayCount, pendingCod: pendingMoney, inTransit: transitCount });
        }
      };
      fetchStats();
    }, []);

    const testSteadfastApi = async () => {
      if (!searchInput.trim()) return;
      try {
        const result = await checkSteadfastStatus(searchInput, setIsLoading, setParcelData);
        const currentStatus = String(result?.delivery_status || result?.status || '');
        if (currentStatus.toLowerCase() === 'delivered') {
          const savedData = localStorage.getItem('engazeup_customers');
          const customers = savedData ? JSON.parse(savedData) : [];
          if (customers.length > 0) {
            const customer = customers[0];
            setTimeout(() => {
              alert(`[Automated Upsell SMS Triggered]\n\nSending to: ${customer.phone}\n\nMessage: "প্রিয় ${customer.name}, আপনার পার্সেলটি সফলভাবে ডেলিভারি হয়েছে। পরবর্তী অর্ডারে ১০% ছাড় পেতে THANKYOU10 কোডটি ব্যবহার করুন!"`);
            }, 1000);
          }
        }
      } catch (e) {
        alert(`Steadfast API error\n\n${e instanceof Error ? e.message : String(e)}`);
      }
    };

    const liveSummary = parcelData ? steadfastStatusSummary(parcelData) : null;

    return (
      <DashboardLayout title="আজকের অবস্থা (Today's Status)" subtitle="আপনার সম্পূর্ণ ফিন্যান্সিয়াল ও অপারেশনাল ওভারভিউ">

        {/* --- CELEBRATION OVERLAY --- */}
        {celebration.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <style>{`
              @keyframes floatUp {
                0% { transform: translateY(100vh) rotate(0deg) scale(0.5); opacity: 1; }
                100% { transform: translateY(-20vh) rotate(360deg) scale(1.5); opacity: 0; }
              }
              .confetti-piece { animation: floatUp 3s ease-out forwards; position: absolute; }
            `}</style>

            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm transition-opacity duration-300" />

            <div className="bg-white p-8 rounded-3xl shadow-2xl z-10 flex flex-col items-center transform transition-all scale-105 border-4 border-[#0F6E56]">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-extrabold text-[#0F6E56] mb-2">দারুণ কাজ!</h2>
              <p className="text-xl font-bold text-gray-700">{celebration.message} সম্পন্ন হয়েছে।</p>
              <div className="mt-4 bg-[#0F6E56]/10 px-6 py-3 rounded-xl border border-[#0F6E56]/20">
                <p className="text-[#0F6E56] font-extrabold text-lg">+{engToBdNum(celebration.days)} দিন ফ্রি যুক্ত হলো!</p>
              </div>
            </div>

            {/* Falling Emojis / Confetti (FIXED SYNTAX HERE) */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece text-4xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                {['🎊', '🎈', '🎁', '✨', '🚀'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        {/* --- GAMIFIED TRIAL UNLOCK WIDGET --- */}
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
              <div className="border-2 border-green-100 bg-green-50/60 p-5 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <CheckCircle2 className="w-6 h-6" /> অ্যাকাউন্ট তৈরি
                </div>
                <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
              </div>

              <div
                className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.api ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white hover:border-[#0F6E56]/40 hover:shadow-md cursor-pointer group'}`}
                onClick={() => handleTaskComplete('api', 5, 'API কানেকশন')}
              >
                <div className={`flex items-center gap-2 font-bold ${tasks.api ? 'text-green-700' : 'text-gray-700 group-hover:text-[#0F6E56]'}`}>
                  {tasks.api ? <CheckCircle2 className="w-6 h-6" /> : <Link className="w-6 h-6 text-gray-400 group-hover:text-[#0F6E56]" />}
                  API কানেক্ট
                </div>
                {tasks.api ? (
                  <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                ) : (
                  <button className="mt-auto bg-gray-50 group-hover:bg-[#0F6E56] text-gray-500 group-hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 group-hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                    <span>আনলক</span><span className="bg-gray-200 text-gray-600 group-hover:bg-white/20 group-hover:text-white px-1.5 py-0.5 rounded text-xs">+৫ দিন</span>
                  </button>
                )}
              </div>

              <div
                className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.csv ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white hover:border-[#0F6E56]/40 hover:shadow-md cursor-pointer group'}`}
                onClick={() => handleTaskComplete('csv', 5, 'কাস্টমার লিস্ট ইমপোর্ট')}
              >
                <div className={`flex items-center gap-2 font-bold ${tasks.csv ? 'text-green-700' : 'text-gray-700 group-hover:text-[#0F6E56]'}`}>
                  {tasks.csv ? <CheckCircle2 className="w-6 h-6" /> : <Users className="w-6 h-6 text-gray-400 group-hover:text-[#0F6E56]" />}
                  কাস্টমার লিস্ট
                </div>
                {tasks.csv ? (
                  <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                ) : (
                  <button className="mt-auto bg-gray-50 group-hover:bg-[#0F6E56] text-gray-500 group-hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 group-hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                    <span>আনলক</span><span className="bg-gray-200 text-gray-600 group-hover:bg-white/20 group-hover:text-white px-1.5 py-0.5 rounded text-xs">+৫ দিন</span>
                  </button>
                )}
              </div>

              <div
                className={`border-2 p-5 rounded-xl flex flex-col gap-3 transition-all duration-300 ${tasks.sms ? 'border-green-100 bg-green-50/60' : 'border-gray-100 bg-white hover:border-[#0F6E56]/40 hover:shadow-md cursor-pointer group'}`}
                onClick={() => handleTaskComplete('sms', 3, 'Bulk SMS ক্যাম্পেইন')}
              >
                <div className={`flex items-center gap-2 font-bold ${tasks.sms ? 'text-green-700' : 'text-gray-700 group-hover:text-[#0F6E56]'}`}>
                  {tasks.sms ? <CheckCircle2 className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 text-gray-400 group-hover:text-[#0F6E56]" />}
                  Bulk SMS সেন্ড
                </div>
                {tasks.sms ? (
                  <p className="text-sm text-green-600 font-bold mt-auto">সম্পন্ন হয়েছে!</p>
                ) : (
                  <button className="mt-auto bg-gray-50 group-hover:bg-[#0F6E56] text-gray-500 group-hover:text-white font-extrabold py-2 px-3 rounded-lg text-sm transition-colors border border-gray-200 group-hover:border-[#0F6E56] flex items-center justify-center gap-1.5 w-full">
                    <span>আনলক</span><span className="bg-gray-200 text-gray-600 group-hover:bg-white/20 group-hover:text-white px-1.5 py-0.5 rounded text-xs">+৩ দিন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Top Metrics Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "আজকের মোট অর্ডার", value: engToBdNum(liveStats.todayOrders) + " টি", sub: "Supabase থেকে লাইভ", color: "text-blue-600" },
            { label: "পেন্ডিং COD (সব কুরিয়ার)", value: "৳ " + engToBdNum(liveStats.pendingCod.toLocaleString('en-IN')), sub: "লাইভ ক্লাউড হিসাব", color: "text-amber-600" },
            { label: "ইন-ট্রানজিট / পেন্ডিং", value: engToBdNum(liveStats.inTransit) + " টি", sub: "অপেক্ষমান পার্সেল", color: "text-[#0F6E56]" },
            { label: "ফ্রড ফ্ল্যাগড (Risk)", value: "০ টি", sub: "শীঘ্রই AI যুক্ত হবে", color: "text-red-600" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center">
              <p className="text-gray-500 text-sm font-bold mb-3">{stat.label}</p>
              <h3 className={`text-4xl font-extrabold ${stat.color} mb-3 drop-shadow-sm tracking-tight`}>{stat.value}</h3>
              <p className="text-xs text-gray-400 font-medium">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* --- Live Tracking --- */}
        <section className="mb-8" aria-label="লাইভ পার্সেল ট্র্যাকিং">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">লাইভ পার্সেল ট্র্যাকিং</h2>
            <div className="flex w-full sm:w-auto">
              <div className="relative flex w-full sm:w-80 shadow-sm rounded-xl">
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="কনসাইনমেন্ট আইডি (CID)..." className="w-full font-en px-4 py-2.5 rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] transition" />
                <button onClick={testSteadfastApi} disabled={isLoading} className="px-6 py-2.5 bg-[#0F6E56] text-white font-semibold rounded-r-xl border border-[#0F6E56] hover:bg-[#1D9E75] hover:border-[#1D9E75] transition disabled:opacity-70 flex items-center gap-2 whitespace-nowrap">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ট্র্যাক করুন'}
                </button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-2xl border border-gray-100/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-6 md:p-8 shadow-sm overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100"><Loader2 className="h-6 w-6 text-[#0F6E56] animate-spin" /></div>
                <div className="flex-1 space-y-2"><div className="h-4 w-48 bg-slate-200/90 rounded-lg animate-pulse" /><div className="h-3 w-32 bg-slate-100 rounded-md animate-pulse" /></div>
              </div>
              <div className="h-14 w-40 bg-amber-100/80 rounded-full animate-pulse mb-4" /><div className="h-10 w-full max-w-xs bg-slate-100 rounded-xl animate-pulse" />
            </div>
          )}

          {!isLoading && parcelData && liveSummary && (
            <div className="group rounded-2xl border border-gray-100/90 bg-gradient-to-br from-white via-[#f8fafc] to-[#f0fdf9]/40 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#1D9E75] text-white shadow-lg">
                    <Package className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Delivery status</p>
                    <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold tracking-wide ${statusBadgeTone(liveSummary.statusLabel)}`}>{liveSummary.statusLabel}</span>
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

        {/* --- Chart & Alerts Section (Horizontal Layout) --- */}
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
                <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F6E56" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
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

          <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-xl text-red-600">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">AI ফ্রড অ্যালার্ট</h3>
                    <span className="bg-red-100 text-red-600 font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wide">High Risk</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">অর্ডার কনফার্ম করার আগে যাচাই করুন। এই নাম্বারগুলোর রেকর্ড সন্দেহজনক।</p>
                </div>
              </div>
              <button className="whitespace-nowrap px-6 py-3 text-sm text-[#0F6E56] font-bold border-2 border-[#0F6E56]/20 rounded-xl hover:bg-[#0F6E56] hover:text-white transition-all duration-300">
                সব অ্যালার্ট দেখুন
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {mockOrders.filter(o => o.risk === 'High').map(order => (
                <div key={order.id} className="p-5 border border-red-100 bg-red-50/40 rounded-xl hover:bg-red-50 transition-colors cursor-pointer flex flex-col h-full">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-extrabold text-gray-900 font-en text-sm">{order.id}</span>
                    <span className="text-xs font-bold text-gray-600 font-en bg-white px-2.5 py-1 rounded-md border border-gray-100 shadow-sm">{order.phone}</span>
                  </div>
                  <p className="text-base font-bold text-gray-800 mb-4">{order.customer}</p>
                  <div className="mt-auto bg-white border border-red-200 p-3 rounded-lg flex items-start gap-2.5 shadow-sm">
                    <span className="text-red-500 text-sm leading-none mt-0.5">⚠️</span>
                    <p className="text-xs text-red-700 font-bold leading-relaxed text-left">
                      পূর্ববর্তী ৩টি অর্ডারের ২টি রিটার্ন হয়েছে।
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </DashboardLayout>
    );
  };

  const NewParcelForm = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [codAmount, setCodAmount] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      const codItemPrice = Number(codAmount) || 0;
      const phoneStr = phone.trim();
      const nameStr = name.trim();

      const { data, error } = await supabase.from('orders').insert([{
        customer_name: nameStr,
        phone_number: phoneStr,
        address: address,
        cod_amount: codItemPrice,
        source: 'EngazeUp Dashboard',
        status: 'pending'
      }]);

      if (error) {
        alert('Database Error: ' + error.message);
        setIsSubmitting(false);
        return;
      }

      setTimeout(() => {
        setIsSubmitting(false);
        alert(`পার্সেল সফলভাবে Steadfast-এ এন্ট্রি হয়েছে!\n\n[SMS Triggered]\n"প্রিয় ${nameStr}, আপনার ${codAmount} টাকার অর্ডারটি কনফার্ম হয়েছে।"`);
        setName('');
        setPhone('');
        setAddress('');
        setCodAmount('');
        setNote('');
      }, 1500);
    };

    return (
      <DashboardLayout title="নতুন পার্সেল এন্ট্রি" subtitle="সরাসরি Steadfast সিস্টেমে নতুন অর্ডার তৈরি করুন">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Send className="w-5 h-5 text-[#0F6E56]" /> পার্সেলের বিস্তারিত তথ্য
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">কাস্টমার নাম *</label>
                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] focus:bg-white outline-none transition" placeholder="মোঃ রহিম" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর *</label>
                    <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] focus:bg-white outline-none transition font-en" placeholder="01XXX-XXXXXX" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ডেলিভারি অ্যাড্রেস *</label>
                  <textarea required rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] focus:bg-white outline-none transition resize-none" placeholder="বাসা, ফ্ল্যাট নম্বর, রোড বা বিস্তারিত ঠিকানা..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cash on Delivery (COD) অ্যামাউন্ট *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-en font-medium">৳</span>
                      <input required type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} min="0" className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] focus:bg-white outline-none transition font-en" placeholder="1500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">নোট (ঐচ্ছিক)</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] focus:bg-white outline-none transition" placeholder="যেকোনো অতিরিক্ত তথ্য..." />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="bg-[#0F6E56] hover:bg-[#1D9E75] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 transition shadow-lg shadow-[#0F6E56]/20 disabled:opacity-75 disabled:cursor-not-allowed transform active:scale-[0.98]">
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> পার্সেল তৈরি হচ্ছে...</>
                    ) : (
                      <><Send className="w-5 h-5" /> পার্সেল তৈরি করুন</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  };
  // --- FINANCE VIEW PAGE ---
  const FinanceView = () => (
    <DashboardLayout title="টাকার হিসাব (Finance)" subtitle="আপনার ফাইন্যান্সিয়াল রিপোর্ট এবং COD সেটেলমেন্ট">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <p className="text-gray-500 text-sm font-bold mb-2 font-bengali">সর্বমোট রিসিভড (Received)</p>
          <h3 className="text-4xl font-extrabold text-[#0F6E56] font-en">৳ 1,20,000</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <p className="text-gray-500 text-sm font-bold mb-2 font-bengali">সর্বমোট পেন্ডিং (Pending)</p>
          <h3 className="text-4xl font-extrabold text-amber-500 font-en">৳ 35,500</h3>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-4 font-medium">Courier Partner</th>
                <th className="p-4 font-medium text-right">Received</th>
                <th className="p-4 font-medium text-right">Pending</th>
                <th className="p-4 font-medium text-right">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {mockFinanceData.map((data, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-extrabold" style={{ color: courierColors[data.name] || '#333' }}>{data.name}</td>
                  <td className="p-4 text-right font-bold text-[#0F6E56]">৳ {data.received.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-bold text-amber-500">৳ {data.pending.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-bold text-red-500">৳ {data.overdue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );

  // --- ORDER LIST PAGE ---
  const OrderList = () => (
    <DashboardLayout title="অর্ডার লিস্ট (Orders)" subtitle="আপনার সকল কুরিয়ারের অর্ডারের বিস্তারিত তালিকা">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium font-bengali">Customer</th>
                <th className="p-4 font-medium">Phone</th>
                <th className="p-4 font-medium">Courier</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">COD Amount</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">{order.id}</td>
                  <td className="p-4 font-bold text-gray-700 font-bengali">{order.customer}</td>
                  <td className="p-4 text-gray-600 font-medium">{order.phone}</td>
                  <td className="p-4 font-extrabold" style={{ color: courierColors[order.courier] || '#333' }}>{order.courier}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeTone(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-extrabold text-[#0F6E56]">৳ {order.cod.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );

  // --- CUSTOMER DIRECTORY PAGE ---
  const CustomerDirectory = () => (
    <DashboardLayout title="কাস্টমার ডিরেক্টরি (CRM)" subtitle="আপনার কাস্টমার ডাটাবেস এবং Bulk SMS সিস্টেম">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-700 font-bengali">কাস্টমার লিস্ট</h3>
          <button className="bg-[#0F6E56] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1D9E75] transition font-bengali shadow-sm transform hover:-translate-y-0.5">
            <MessageCircle className="w-5 h-5" /> Bulk SMS পাঠান
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
            <thead className="bg-white border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-4 font-medium">Customer ID</th>
                <th className="p-4 font-medium font-bengali">Name</th>
                <th className="p-4 font-medium">Phone Number</th>
                <th className="p-4 font-medium text-center">Total Orders</th>
                <th className="p-4 font-medium text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {mockCustomers.map((cust, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">{cust.id}</td>
                  <td className="p-4 font-bold text-gray-700 font-bengali">{cust.name}</td>
                  <td className="p-4 text-gray-600 font-medium">{cust.phone}</td>
                  <td className="p-4 text-center font-extrabold text-[#3B82F6]">{cust.totalOrders}</td>
                  <td className="p-4 text-right font-extrabold text-[#0F6E56]">৳ {cust.totalSpent.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
  const InventoryPage = () => (
    <DashboardLayout title="স্টক ও ইনভেন্টরি" subtitle="আপনার প্রোডাক্টের বর্তমান স্টক">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left whitespace-nowrap text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4 font-bengali">প্রোডাক্টের নাম</th>
              <th className="p-4 text-center">স্টক আছে</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-4 font-bold">SKU-101</td>
              <td className="p-4 font-bengali">প্রিমিয়াম ওয়ালেট</td>
              <td className="p-4 text-center font-bold text-green-600">145</td>
            </tr>
            <tr className="border-b">
              <td className="p-4 font-bold">SKU-102</td>
              <td className="p-4 font-bengali">অর্গানিক টি</td>
              <td className="p-4 text-center font-bold text-red-500 flex items-center justify-center gap-1"><AlertTriangle size={14} /> 0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
  const BillingPage = () => (
    <DashboardLayout title="বিলিং ও সাবস্ক্রিপশন" subtitle="আপনার বর্তমান প্ল্যান পরিচালনা করুন">
      <div className="max-w-4xl">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">বর্তমান প্ল্যান: {user?.subscription}</h3>
            <p className="text-gray-600 mb-4">আপনার সাবস্ক্রিপশন ২০ এপ্রিল, ২০২৬ এ রিনিউ হবে।</p>
            <div className="flex gap-4">
              <span className="bg-[#0F6E56]/10 text-[#0F6E56] px-3 py-1 rounded text-sm font-bold border border-[#0F6E56]/20 font-en">৳1,999/month ($19)</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm font-bold border border-green-200">Active</span>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none border border-red-500 text-red-500 px-6 py-2.5 rounded-lg font-medium hover:bg-red-50 transition">ক্যান্সেল করুন</button>
            <button className="flex-1 md:flex-none bg-[#0F6E56] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#1D9E75] transition">আপগ্রেড করুন</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
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
                <tr key={i} className="border-b border-gray-50">
                  <td className="p-4 text-gray-800">{date}</td>
                  <td className="p-4 font-medium">৳1,999 ($19.00)</td>
                  <td className="p-4">Growth</td>
                  <td className="p-4"><span className="text-green-600 font-medium">Paid</span></td>
                  <td className="p-4 text-right">
                    <button className="text-[#0F6E56] hover:underline flex items-center gap-1 justify-end w-full">
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );

  const IntegrationsPage = () => {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    // আপনার Supabase-এর আসল ডিটেইলস
    const webhookUrl = 'https://otvzexarrpuaewjjdxna.supabase.co/rest/v1/orders';
    const apiKey = 'sb_publishable_7jBWsP_UplGHBSmiA3rn5w_a_7U8WzI';

    const copyToClip = (text: string, type: 'url' | 'key') => {
      navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    };

    return (
      <DashboardLayout title="ইন্টিগ্রেশন ও API" subtitle="আপনার স্টোর বা ফেসবুক পেজের সাথে EngazeUp কানেক্ট করুন">
        <div className="space-y-6">
          {/* API Credentials Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-[#0F6E56]" /> API ক্রেডেনশিয়াল (Credentials)
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (এই লিংকে ডাটা আসবে)</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={webhookUrl} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600 font-mono text-sm" />
                  <button onClick={() => copyToClip(webhookUrl, 'url')} className="px-5 bg-[#0F6E56]/10 text-[#0F6E56] font-bold rounded-xl hover:bg-[#0F6E56]/20 transition flex items-center gap-2 min-w-[120px] justify-center">
                    {copiedUrl ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key (Authorization / সিকিউরিটি)</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={apiKey} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600 font-mono text-sm" />
                  <button onClick={() => copyToClip(apiKey, 'key')} className="px-5 bg-[#0F6E56]/10 text-[#0F6E56] font-bold rounded-xl hover:bg-[#0F6E56]/20 transition flex items-center gap-2 min-w-[120px] justify-center">
                    {copiedKey ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Guides */}
          <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4">কানেকশন গাইডলাইন (Guides)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* WooCommerce */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Link className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">WooCommerce</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                আপনার ওয়ার্ডপ্রেস ড্যাশবোর্ড থেকে <b>Settings &gt; Advanced &gt; Webhooks</b>-এ যান। Topic হিসেবে 'Order Created' সিলেক্ট করুন এবং ওপরের Webhook URL-টি পেস্ট করে সেভ করুন।
              </p>
            </div>
            {/* ManyChat */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">ManyChat / Facebook</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                আপনার ফ্লো-বিল্ডারে 'External Request' ব্লক যুক্ত করুন। Request Type <b>POST</b> সিলেক্ট করে URL এবং Header-এ API Key বসিয়ে দিন।
              </p>
            </div>
            {/* Custom Web */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center mb-4">
                <Code className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Custom Website</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                আপনার ব্যাকএন্ড থেকে ওপরের লিংকে <b>POST</b> রিকোয়েস্ট পাঠান। Headers-এ `apikey` এবং `Authorization: Bearer [key]` যুক্ত করে বডিতে ডাটা পাঠান।
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  };

  const AdminPanel = () => (
    <DashboardLayout title="অ্যাডমিন প্যানেল" subtitle="প্লাটফর্ম ওভারভিউ এবং ইউজার ম্যানেজমেন্ট">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-[#0F6E56]">
          <p className="text-gray-500 text-sm font-medium mb-1">Monthly Recurring Revenue (MRR)</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">$12,450</h3>
          <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +15% this month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Active Paid Subscriptions</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">845</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">Growth plan is most popular</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Processed Orders (All time)</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">2.5M+</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">ইউজার ম্যানেজমেন্ট (Sellers)</h3>
          <input type="text" placeholder="Search by email or shop..." className="p-2 border border-gray-300 rounded outline-none focus:border-[#0F6E56] text-sm font-en w-64" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
            <thead className="bg-white border-b border-gray-200">
              <tr className="text-gray-500">
                <th className="p-4 font-medium">Shop / User</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Joined Date</th>
                <th className="p-4 font-medium text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Rahim Collection', email: 'rahim@example.com', plan: 'Growth', status: 'Active', date: '01 Oct 2023' },
                { name: 'Gadget BD', email: 'hello@gadgetbd.com', plan: 'Pro', status: 'Active', date: '15 Jan 2024' },
                { name: 'Sneakers Hub', email: 'info@sneakers.bd', plan: 'Starter', status: 'Past Due', date: '10 Mar 2025' },
                { name: 'Women Fashion', email: 'admin@wf.com', plan: 'Growth', status: 'Active', date: '22 Feb 2026' },
              ].map((u, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700">{u.plan}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{u.date}</td>
                  <td className="p-4 text-right space-x-2">
                    <button className="text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded text-xs font-bold hover:bg-[#0F6E56]/20 transition">Manage</button>
                    <button className="text-red-600 bg-red-100 px-3 py-1 rounded text-xs font-bold hover:bg-red-200 transition">Flag</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );

  // --- ROUTER ---
  switch (currentView) {
    case 'landing': return <LandingPage />;
    case 'login': return <AuthPage isRegister={false} />;
    case 'register': return <AuthPage isRegister={true} />;
    case 'onboarding': return <OnboardingPage />;
    case 'dashboard': return <DashboardHome />;
    case 'finance': return <FinanceView />;
    case 'new-parcel': return <NewParcelForm />;
    case 'orders': return <OrderList />;
    case 'customers': return <CustomerDirectory />;
    case 'inventory': return <InventoryPage />;
    case 'billing': return <BillingPage />;
    case 'integrations': return <IntegrationsPage />;
    case 'admin': return <AdminPanel />;
    default: return <LandingPage />;
  }
}