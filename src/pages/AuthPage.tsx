import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import EngazeUpFooter from '../components/EngazeUpFooter';
import { supabase } from '../lib/supabase';

export default function AuthPage({ isRegister }: { isRegister: boolean }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [isAuthLoading, setIsAuthLoading]   = useState(false);
  const [isFbLoading, setIsFbLoading]       = useState(false);
  const navigate = useNavigate();

  // ── Facebook OAuth — scopes include page management so auto-connect works ──
  const handleFacebookLogin = async () => {
    setIsFbLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          scopes:
            'pages_show_list pages_read_engagement pages_manage_metadata pages_messaging business_management',
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      // Navigation handled by App.tsx onAuthStateChange + exchangeFbTokenInBackground
    } catch (err: any) {
      toast.error('Facebook login ব্যর্থ হয়েছে: ' + err.message);
      setIsFbLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role: 'seller' } },
      });
      if (error) {
        toast.error('অ্যাকাউন্ট খুলতে সমস্যা হয়েছে: ' + error.message);
      } else if (data.user) {
        toast.success('আলহামদুলিল্লাহ! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
        navigate('/onboarding');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error('ভুল ইমেইল বা পাসওয়ার্ড! দয়া করে আবার চেষ্টা করুন।');
      } else if (data.user) {
        navigate('/dashboard');
      }
    }
    setIsAuthLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f8faff 50%, #eff6ff 100%)' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* ── Logo ── */}
          <div
            className="flex justify-center mb-8 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-2.5 text-[#0F6E56] font-extrabold text-2xl">
              <div className="w-10 h-10 bg-[#0F6E56] rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              EngazeUp
            </div>
          </div>

          {/* ── Card ── */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

            {/* ── Hero Section: Facebook CTA ── */}
            <div
              className="relative px-8 pt-8 pb-7"
              style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0d5fd4 100%)' }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-10"
                   style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10"
                   style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(-30%, 30%)' }} />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full shadow-sm">
                    <Zap className="w-3 h-3" />
                    RECOMMENDED — ১ ক্লিকে সব সেটআপ
                  </span>
                </div>

                <p className="text-white/90 text-sm font-medium mb-5 leading-relaxed">
                  Facebook দিয়ে {isRegister ? 'সাইন আপ' : 'লগইন'} করলে আপনার পেজ <strong className="text-white">অটোমেটিক কানেক্ট</strong> হয়ে যাবে — আলাদা সেটআপের দরকার নেই!
                </p>

                <button
                  id="fb-login-btn"
                  onClick={handleFacebookLogin}
                  disabled={isFbLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white text-[#1877F2] font-extrabold py-4 rounded-2xl hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg text-base disabled:opacity-70"
                >
                  {isFbLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#1877F2]" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isFbLoading
                    ? 'Facebook-এ যাচ্ছি...'
                    : `Continue with Facebook`}
                </button>

                <p className="text-center text-white/60 text-xs mt-3">
                  🔒 আপনার পাসওয়ার্ড আমরা দেখতে পাই না
                </p>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="relative px-8 py-4">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-100" />
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  অথবা ইমেইল দিয়ে
                </span>
              </div>
            </div>

            {/* ── Email / Password Form ── */}
            <div className="px-8 pb-8">
              <h2 className="text-lg font-bold text-gray-700 mb-5 text-center">
                {isRegister ? 'ইমেইল দিয়ে নতুন একাউন্ট' : 'ইমেইল দিয়ে লগইন'}
              </h2>

              <form className="space-y-4" onSubmit={handleAuth}>
                {isRegister && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5">আপনার নাম</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition text-sm"
                      placeholder="মোঃ রহিম উদ্দিন"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition text-sm font-en"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition text-sm font-en"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>

                <button
                  id="email-auth-btn"
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-[#0F6E56] text-white py-3.5 rounded-xl font-bold hover:bg-[#1D9E75] active:scale-[0.98] transition-all mt-2 flex justify-center items-center gap-2 disabled:opacity-70 shadow-sm"
                >
                  {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isRegister ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                {isRegister ? (
                  <>আগে থেকেই একাউন্ট আছে?{' '}
                    <span
                      className="text-[#0F6E56] font-bold cursor-pointer hover:underline"
                      onClick={() => navigate('/login')}
                    >লগইন করুন</span>
                  </>
                ) : (
                  <>একাউন্ট নেই?{' '}
                    <span
                      className="text-[#0F6E56] font-bold cursor-pointer hover:underline"
                      onClick={() => navigate('/register')}
                    >নতুন একাউন্ট খুলুন</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* ── Trust Badges ── */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400 font-medium">
            <span>🔒 SSL সুরক্ষিত</span>
            <span>🇧🇩 বাংলাদেশে তৈরি</span>
            <span>⚡ ১ ক্লিক সেটআপ</span>
          </div>
        </div>
      </div>

      <EngazeUpFooter />
    </div>
  );
}
