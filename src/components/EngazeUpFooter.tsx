import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EngazeUpFooter() {
  const navigate = useNavigate();
  return (
    <footer className="w-full bg-[#0F6E56] text-white py-10 mt-auto border-t-4 border-[#1D9E75]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
        <div
          className="flex items-center gap-2.5 mb-5 hover:scale-105 transition-transform duration-300 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-6 w-6 text-[#1D9E75]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-sans">EngazeUp</span>
        </div>
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-2 leading-snug" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
            বাংলাদেশের F-commerce ব্যবসার <span className="text-[#1D9E75]">সম্পূর্ণ অপারেটিং সিস্টেম।</span>
          </h2>
          <p className="text-sm md:text-base text-white/80 font-medium max-w-xl mx-auto leading-relaxed">
            ফাইন্যান্স, কাস্টমার রিলেশন এবং ডেলিভারি ম্যানেজমেন্ট— সবকিছু এখন এক প্ল্যাটফর্মে।
          </p>
        </div>
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
}
