import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Copy, Code, Link as LinkIcon, MessageCircle, Key, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

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

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'}/rest/v1/orders`;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  useEffect(() => {
    if (!user) return;
    const fetchKeys = async () => {
      setIsLoadingKeys(true);
      const { data } = await supabase
        .from('shops')
        .select('steadfast_api_key, steadfast_api_secret')
        .eq('id', user.id)
        .single();
      if (data) {
        setApiKey(data.steadfast_api_key ?? '');
        setApiSecret(data.steadfast_api_secret ?? '');
        setIsSaved(!!(data.steadfast_api_key));
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

  return (
    <DashboardLayout title="ইন্টিগ্রেশন ও API" subtitle="আপনার স্টোর বা ফেসবুক পেজের সাথে EngazeUp কানেক্ট করুন">
      <div className="space-y-6 mt-6">

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
              { icon: <Code className="w-6 h-6" />, color: 'bg-gray-50 text-gray-600', title: 'Custom Website', body: `ব্যাকএন্ড থেকে webhook URL-এ POST করুন। Headers-এ apikey ও Authorization: Bearer [key] দিন। Body-তে shop_id: "${user?.id}" রাখুন।` },
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
