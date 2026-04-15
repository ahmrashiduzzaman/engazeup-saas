import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import EngazeUpFooter from '../components/EngazeUpFooter';
import { supabase } from '../lib/supabase';

export default function AuthPage({ isRegister }: { isRegister: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const navigate = useNavigate();

  const handleFacebookLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          scopes: 'pages_show_list,pages_read_engagement,pages_messaging',
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('Facebook login failed: ' + err.message);
    }
  };

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
        toast.error('অ্যাকাউন্ট খুলতে সমস্যা হয়েছে: ' + error.message);
      } else if (data.user) {
        toast.success('আলহামদুলিল্লাহ! আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
        navigate('/onboarding');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        toast.error('ভুল ইমেইল বা পাসওয়ার্ড! দয়া করে আবার চেষ্টা করুন।');
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">অথবা</span>
            </div>
          </div>

          <button
            onClick={handleFacebookLogin}
            type="button"
            className="w-full bg-[#1877F2] text-white py-3 rounded-lg font-bold hover:bg-[#1664D9] transition flex justify-center items-center gap-2 shadow-sm"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
            </svg>
            Connect with Facebook
          </button>

          <div className="mt-8 text-center text-sm text-gray-600">
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
