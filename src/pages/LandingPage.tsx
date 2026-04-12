import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Wallet, MessageCircle, ShieldAlert, BarChart3, CheckCircle2 } from 'lucide-react';
import EngazeUpFooter from '../components/EngazeUpFooter';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      {/* Navbar */}
      <nav className="bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
          <TrendingUp className="h-8 w-8" />
          <span>EngazeUp</span>
        </div>
        <div className="hidden md:flex gap-6 items-center font-medium">
          <a href="#features" className="text-gray-600 hover:text-[#0F6E56] transition">ফিচারসমূহ</a>
          <a href="#pricing" className="text-gray-600 hover:text-[#0F6E56] transition">প্যাকেজ</a>
          <button onClick={() => navigate('/login')} className="text-[#0F6E56] font-bold hover:text-[#1D9E75] transition">লগইন</button>
          <button onClick={() => navigate('/register')} className="bg-[#0F6E56] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#1D9E75] shadow-md shadow-[#0F6E56]/20 transition transform hover:-translate-y-0.5">
            ফ্রি ট্রায়াল শুরু করুন
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 md:px-12 max-w-6xl mx-auto text-center flex-1">
        <div className="inline-flex items-center gap-2 bg-[#0F6E56]/10 text-[#0F6E56] px-5 py-2 rounded-full text-sm font-bold mb-8 border border-[#0F6E56]/20 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F6E56] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0F6E56]"></span>
          </span>
          বাংলাদেশের প্রথম F-Commerce Operating System
        </div>

        <h1 className="text-[2.5rem] md:text-6xl lg:text-[4rem] font-extrabold text-gray-900 leading-[1.2] md:leading-[1.15] mb-6 tracking-tight">
          ম্যানুয়াল হিসাবের দিন শেষ, <br className="hidden md:block" />
          ব্যবসা হোক <span className="text-[#0F6E56]" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>১০০% অটোমেটেড!</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
          সব কুরিয়ারের লাইভ ট্র্যাকিং, COD হিসাব, AI ফ্রড ডিটেকশন এবং <b className="text-gray-800">Bulk SMS মার্কেটিং</b>। আপনার অনলাইন ব্যবসাকে রকেটের গতিতে বড় করার সম্পূর্ণ কন্ট্রোল এখন এক ড্যাশবোর্ডে।
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={() => navigate('/register')} className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-[#1D9E75] hover:to-[#0F6E56] transition-all shadow-xl shadow-[#0F6E56]/25 transform hover:-translate-y-1">
            ফ্রি ট্রায়াল শুরু করুন (১৪ দিন)
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
            {/* Starter */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">নতুন পেজ বা ছোট ব্যবসার জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳৯৯৯</span>
                <span className="text-gray-500 font-medium">/মাস</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium text-gray-700">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>মাসে ৫০০ অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>২টি কুরিয়ার ইন্টিগ্রেশন</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>বেসিক ফ্রড ডিটেকশন</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="w-full py-3 rounded-lg border-2 border-[#0F6E56] text-[#0F6E56] font-bold hover:bg-[#0F6E56] hover:text-white transition">শুরু করুন</button>
            </div>

            {/* Growth */}
            <div className="bg-gradient-to-b from-[#0F6E56] to-[#0a4d3c] text-white p-8 rounded-2xl border border-[#0F6E56] shadow-2xl relative transform md:-translate-y-4 flex flex-col">
              <div className="absolute top-0 right-0 bg-[#1D9E75] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl shadow-sm">জনপ্রিয় (Best Value)</div>
              <h3 className="text-xl font-bold mb-2">Growth</h3>
              <p className="text-white/80 text-sm mb-6 font-medium">ক্রমবর্ধমান F-commerce এর জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳১,৯৯৯</span>
                <span className="text-white/70 font-medium">/মাস</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>মাসে ৩,০০০ অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>সব কুরিয়ার ও API ইন্টিগ্রেশন</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>আনলিমিটেড কাস্টমার CRM</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>Bulk SMS মার্কেটিং টুলস</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="w-full py-3.5 rounded-lg bg-white text-[#0F6E56] font-extrabold hover:bg-gray-100 transition shadow-lg transform hover:-translate-y-0.5">ফ্রি ট্রায়াল শুরু করুন</button>
            </div>

            {/* Pro */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">বড় এজেন্সি ও ব্র্যান্ডের জন্য</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">৳৩,৯৯৯</span>
                <span className="text-gray-500 font-medium">/মাস</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 font-medium text-gray-700">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>আনলিমিটেড অর্ডার ট্র্যাকিং</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>Facebook Ads ROI অ্যানালাইসিস</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>টিম মেম্বার অ্যাক্সেস (৫ জন)</span></li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#1D9E75]" /> <span>ডেডিকেটেড একাউন্ট ম্যানেজার</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="w-full py-3 rounded-lg border-2 border-[#0F6E56] text-[#0F6E56] font-bold hover:bg-[#0F6E56] hover:text-white transition">শুরু করুন</button>
            </div>
          </div>
        </div>
      </section>

      <EngazeUpFooter />
    </div>
  );
}
