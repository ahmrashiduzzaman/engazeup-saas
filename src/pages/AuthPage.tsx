import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2 } from 'lucide-react';
import EngazeUpFooter from '../components/EngazeUpFooter';
import { supabase } from '../lib/supabase';

export default function AuthPage({ isRegister }: { isRegister: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: name, role: 'seller' } }
      });

      if (error) {
        alert('অ্যাকাউন্ট খুলতে সমস্যা হয়েছে: ' + error.message);
      } else if (data.user) {
        alert('আলহামদুলিল্লাহ! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
        navigate('/onboarding');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert('ভুল ইমেইল বা পাসওয়ার্ড! দয়া করে আবার চেষ্টা করুন।');
      } else if (data.user) {
        navigate('/dashboard');
      }
    }
    setIsAuthLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer" onClick={() => navigate('/')}>
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
              <p>আগে থেকেই একাউন্ট আছে? <span className="text-[#0F6E56] font-bold cursor-pointer hover:underline" onClick={() => navigate('/login')}>লগইন করুন</span></p>
            ) : (
              <p>একাউন্ট নেই? <span className="text-[#0F6E56] font-bold cursor-pointer hover:underline" onClick={() => navigate('/register')}>নতুন একাউন্ট খুলুন</span></p>
            )}
          </div>
        </div>
      </div>

      <EngazeUpFooter />
    </div>
  );
}
