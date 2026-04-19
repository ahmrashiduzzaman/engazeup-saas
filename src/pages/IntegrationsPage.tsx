import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Copy, Code, Link as LinkIcon, MessageCircle, Key, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Steadfast API keys state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Facebook Integration States
  const [fbPages, setFbPages] = useState<FacebookPage[]>([]);
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [connectedFbPage, setConnectedFbPage] = useState<{id: string, name: string} | null>(null);
  const [selectedPageId, setSelectedPageId] = useState('');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://otvzexarrpuaewjjdxna.supabase.co'}/functions/v1/woo-webhook?shop_id=${user?.id || 'YOUR_SHOP_ID'}`;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  useEffect(() => {
    if (!user) return;
    const fetchKeys = async () => {
      setIsLoadingKeys(true);
      const { data } = await supabase
        .from('shops')
        .select('steadfast_api_key, steadfast_api_secret, fb_page_id, fb_page_name')
        .eq('id', user.id)
        .single();
      if (data) {
        setApiKey(data.steadfast_api_key ?? '');
        setApiSecret(data.steadfast_api_secret ?? '');
        setIsSaved(!!(data.steadfast_api_key));
        
        if (data.fb_page_id && data.fb_page_name) {
          setConnectedFbPage({ id: data.fb_page_id, name: data.fb_page_name });
        }
      }
      setIsLoadingKeys(false);
    };
    fetchKeys();
  }, [user]);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!apiKey.trim()) { toast.error('API Key দিন'); return; }

    setIsSavingKeys(true);
    const { error } = await supabase
      .from('shops')
      .update({ steadfast_api_key: apiKey.trim(), steadfast_api_secret: apiSecret.trim() })
      .eq('id', user.id);

    if (error) {
      toast.error('সেভ করতে ব্যর্থ: ' + error.message);
    } else {
      toast.success('✅ Steadfast API কানেক্ট হয়েছে!');
      setIsSaved(true);
    }
    setIsSavingKeys(false);
  };

  const copyToClip = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }
    else { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
  };

  const triggerFacebookLogin = async () => {
    toast.loading('ফেসবুক রি-অথেনটিকেট করা হচ্ছে...', { duration: 3000 });
    // Force Facebook to issue a new token
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'pages_show_list pages_read_engagement pages_manage_metadata pages_messaging business_management',
        redirectTo: window.location.href,
        queryParams: { auth_type: 'reauthenticate' }
      }
    });
  };

  const fetchFacebookPages = async () => {
    setIsFetchingPages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;

      if (!providerToken) {
        toast.error('নতুন টোকেন প্রয়োজন। ফেসবুকে লগইন করা হচ্ছে...');
        await triggerFacebookLogin();
        return;
      }

      // ✅ Edge Function-এর মাধ্যমে Long-Lived Token — FACEBOOK_APP_ID ও APP_SECRET Supabase Secrets-এ
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otvzexarrpuaewjjdxna.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/fb-token-exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ provider_token: providerToken }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errMsg = data.error || 'Token exchange failed';
        if (
          errMsg.toLowerCase().includes('expired') ||
          errMsg.toLowerCase().includes('invalid') ||
          errMsg.toLowerCase().includes('oauth')
        ) {
          toast.error('সেশন এক্সপায়ার হয়েছে! পুনরায় লগইন করা হচ্ছে...');
          await triggerFacebookLogin();
          return;
        }
        throw new Error(errMsg);
      }

      const pages: FacebookPage[] = data.pages ?? [];
      setFbPages(pages);

      if (pages.length === 0) {
        toast.error('আপনার অ্যাকাউন্টে কোনো ফেসবুক পেজ পাওয়া যায়নি।');
      } else {
        toast.success(`✅ ${pages.length} টি পেজ পাওয়া গেছে! (Long-Lived Token সহ)`);
      }
    } catch (err: any) {
      console.error('FB Fetch Error:', err);
      toast.error('পেজ আনতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setIsFetchingPages(false);
    }
  };

  const handleConnectFbPage = async () => {
    if (!user || !selectedPageId) return;
    
    const pageToConnect = fbPages.find(p => p.id === selectedPageId);
    if (!pageToConnect) return;
    
    setIsSavingKeys(true);
    
    try {
      // 1. Subscribe App to the Page's Webhooks
      const subResponse = await fetch(`https://graph.facebook.com/v19.0/${pageToConnect.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${pageToConnect.access_token}`, {
        method: 'POST',
      });
      const subData = await subResponse.json();
      
      if (subData.error) {
        throw new Error(subData.error.message || 'Failed to subscribe webhook');
      }

      // 2. Save token to Database
      const { error } = await supabase
        .from('shops')
        .update({ 
          fb_page_id: pageToConnect.id,
          fb_page_name: pageToConnect.name,
          fb_page_access_token: pageToConnect.access_token
        })
        .eq('id', user.id);
        
      if (error) throw error;

      toast.success(`✅ ${pageToConnect.name} কানেক্ট এবং Webhook সাবস্ক্রাইব হয়েছে!`);
      setConnectedFbPage({ id: pageToConnect.id, name: pageToConnect.name });
      setFbPages([]); // clear the list once connected to show success compact state
      setSelectedPageId('');
    } catch (err: any) {
      toast.error('কোথাও সমস্যা হয়েছে: ' + err.message);
    } finally {
      setIsSavingKeys(false);
    }
  };

  return (
    <DashboardLayout title="ইন্টিগ্রেশন ও API" subtitle="আপনার স্টোর বা ফেসবুক পেজের সাথে EngazeUp কানেক্ট করুন">
      <div className="space-y-6 mt-6">

        {/* ── ✨ HERO: Facebook Page Connection ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1877F2] via-[#0d5fd4] to-[#0a4bb5] p-6 shadow-xl text-white">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
                <FacebookIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold">Facebook Page AI অটোমেশন</h2>
                  <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-blue-100 text-sm mt-1">
                  {connectedFbPage
                    ? `✅ কানেক্টেড: ${connectedFbPage.name}`
                    : 'আপনার পেজ কানেক্ট করুন — AI অটোমেটিক্যালি ইনবক্স ম্যানেজ করবে!'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {connectedFbPage ? (
                <>
                  <span className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl font-bold text-sm border border-white/30">
                    <CheckCircle2 className="w-4 h-4 text-green-300" />
                    {connectedFbPage.name}
                  </span>
                  <button
                    onClick={fetchFacebookPages}
                    disabled={isFetchingPages}
                    className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur px-5 py-2.5 rounded-xl font-bold text-sm transition border border-white/30"
                  >
                    {isFetchingPages ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    পেজ পরিবর্তন করুন
                  </button>
                </>
              ) : (
                <button
                  onClick={fetchFacebookPages}
                  disabled={isFetchingPages}
                  className="flex items-center justify-center gap-2 bg-white text-[#1877F2] font-extrabold px-6 py-3 rounded-xl hover:bg-blue-50 transition shadow-lg w-full sm:w-auto text-sm"
                >
                  {isFetchingPages ? <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" /> : <FacebookIcon className="w-4 h-4" />}
                  Continue with Facebook
                </button>
              )}
            </div>
          </div>

          {/* Page selector inside the hero card */}
          {fbPages.length > 0 && (
            <div className="relative z-10 mt-5 bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 space-y-3">
              <label className="block text-sm font-bold text-blue-100">কোন পেজে AI কানেক্ট করবেন?</label>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="w-full p-3 bg-white/90 text-gray-800 border border-white/30 rounded-xl font-en text-sm outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="" disabled>একটি পেজ সিলেক্ট করুন</option>
                {fbPages.map(page => (
                  <option key={page.id} value={page.id}>{page.name} ({page.category})</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleConnectFbPage}
                  disabled={!selectedPageId || isSavingKeys}
                  className="flex-1 flex justify-center items-center gap-2 bg-white text-[#1877F2] font-extrabold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition disabled:opacity-60"
                >
                  {isSavingKeys ? <><Loader2 className="w-4 h-4 animate-spin" /> কানেক্ট হচ্ছে...</> : '✅ Confirm & Connect AI'}
                </button>
                <button
                  onClick={() => setFbPages([])}
                  className="px-5 py-2.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition border border-white/30 text-sm"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Steadfast API Integration ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0F6E56]" />
              Steadfast কুরিয়ার API
            </h3>
            {isSaved && (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-extrabold px-3 py-1.5 rounded-full border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> কানেক্টেড
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-5">
            আপনার Steadfast অ্যাকাউন্ট থেকে API Key ও Secret সংগ্রহ করুন।
            এটি সেভ করলে পার্সেল ট্র্যাকিং ও অর্ডার সিঙ্ক অটোমেটিক হবে।
          </p>
          {isLoadingKeys ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> লোড হচ্ছে...
            </div>
          ) : (
            <form onSubmit={handleSaveKeys} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Steadfast API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setIsSaved(false); }}
                  placeholder="আপনার Steadfast API Key"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition font-en text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Steadfast API Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={e => { setApiSecret(e.target.value); setIsSaved(false); }}
                    placeholder="আপনার Steadfast API Secret"
                    className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition font-en text-sm"
                  />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSavingKeys || !apiKey.trim()}
                className="flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1D9E75] transition disabled:opacity-60 shadow-sm"
              >
                {isSavingKeys ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><CheckCircle2 className="w-4 h-4" /> API কানেক্ট করুন</>}
              </button>
            </form>
          )}
        </div>

        {/* ── Facebook AI Auto-Reply Integration ── */}
        <div className="bg-white rounded-2xl border border-[#1877F2]/20 shadow-sm p-6 overflow-hidden relative">
          {/* Decorative Background blob */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1877F2]/5 rounded-bl-[100px] z-0 pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FacebookIcon className="w-6 h-6 text-[#1877F2]" />
              Facebook Page AI অটোমেশন
            </h3>
            {connectedFbPage && (
              <span className="flex items-center gap-1.5 bg-[#1877F2]/10 text-[#1877F2] text-xs font-extrabold px-3 py-1.5 rounded-full border border-[#1877F2]/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> কানেক্টেড ({connectedFbPage.name})
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-5 relative z-10">
            আপনার ফেসবুক অ্যাকাউন্ট থেকে পেজ সিলেক্ট করুন। AI অটোমেটিক্যালি আপনার পেজের ইনবক্সে আসা কাস্টমারদের রিপ্লাই দেওয়া শুরু করবে!
          </p>

          <div className="relative z-10 space-y-4">
            {fbPages.length === 0 ? (
              <button
                onClick={fetchFacebookPages}
                disabled={isFetchingPages}
                className="flex items-center gap-2 bg-[#1877F2] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1664D9] transition disabled:opacity-60 shadow-sm w-full sm:w-auto justify-center"
              >
                {isFetchingPages ? <><Loader2 className="w-4 h-4 animate-spin" /> পেজ খুঁজছি...</> : 'আপনার পেজগুলো খুঁজুন'}
              </button>
            ) : (
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700">কোন পেজে AI কানেক্ট করবেন?</label>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 outline-none transition font-en text-sm bg-white"
                >
                  <option value="" disabled>একটি পেজ সিলেক্ট করুন</option>
                  {fbPages.map(page => (
                    <option key={page.id} value={page.id}>{page.name} ({page.category})</option>
                  ))}
                </select>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConnectFbPage}
                    disabled={!selectedPageId || isSavingKeys}
                    className="flex-1 flex justify-center items-center gap-2 bg-[#1877F2] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1664D9] transition disabled:opacity-60 shadow-sm"
                  >
                    {isSavingKeys ? <><Loader2 className="w-4 h-4 animate-spin" /> কানেক্ট হচ্ছে...</> : 'Confirm & Connect AI'}
                  </button>
                  <button
                    onClick={() => setFbPages([])}
                    className="px-6 py-3 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Supabase API Credentials ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-[#0F6E56]" /> Webhook / REST API (আপনার স্টোর থেকে)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={webhookUrl} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600 font-mono text-sm" />
                <button onClick={() => copyToClip(webhookUrl, 'url')} className="px-5 bg-[#0F6E56]/10 text-[#0F6E56] font-bold rounded-xl hover:bg-[#0F6E56]/20 transition flex items-center gap-2 min-w-[110px] justify-center">
                  {copiedUrl ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key (Supabase Anon)</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={supabaseAnonKey} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600 font-mono text-sm" />
                <button onClick={() => copyToClip(supabaseAnonKey, 'key')} className="px-5 bg-[#0F6E56]/10 text-[#0F6E56] font-bold rounded-xl hover:bg-[#0F6E56]/20 transition flex items-center gap-2 min-w-[110px] justify-center">
                  {copiedKey ? 'Copied!' : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Integration Guides ── */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">কানেকশন গাইডলাইন</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <LinkIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600', title: 'WooCommerce', body: 'WordPress Dashboard → Settings → Advanced → Webhooks → Topic: Order Created → webhook URL পেস্ট করুন।' },
              { icon: <MessageCircle className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600', title: 'ManyChat / Facebook', body: 'ফ্লো-বিল্ডারে External Request ব্লক যুক্ত করুন। POST request করুন webhook URL-এ, Header-এ API Key দিন।' },
              { icon: <Code className="w-6 h-6" />, color: 'bg-gray-50 text-gray-600', title: 'Custom Website', body: `ব্যাকএন্ড থেকে webhook URL-এ POST করুন। Headers-এ কোনো API Key-এর প্রয়োজন নেই, শুধু URL-টি ব্যবহার করলেই অটোমেটিক আপনার পে-লোড সেভ হবে।` },
            ].map((g, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className={`w-12 h-12 ${g.color} rounded-xl flex items-center justify-center mb-4`}>{g.icon}</div>
                <h4 className="font-bold text-gray-800 mb-2">{g.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
