import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const navigate = useNavigate();

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    // Here we could save shop settings to a new profile table, omitted for brevity
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">শপ সেটআপ</h2>
        <p className="text-center text-gray-500 mb-8">আপনার ব্যবসার বিস্তারিত তথ্য দিয়ে প্রোফাইল সম্পূর্ণ করুন</p>

        <form className="space-y-6" onSubmit={handleSetup}>
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
            <p className="text-xs text-gray-500 mt-2">* পেমেন্ট প্রক্রিয়া সম্পূর্ণ করতে স্ট্রাইপ (Stripe) গেটওয়ে ব্যবহার করা হবে।</p>
          </div>

          <button type="submit" className="w-full bg-[#0F6E56] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#1D9E75] transition">
            ড্যাশবোর্ডে প্রবেশ করুন
          </button>
        </form>
      </div>
    </div>
  );
}
