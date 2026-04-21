import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import {
  TrendingUp, Menu, LayoutDashboard, Wallet, Package, PlusCircle,
  Users, Link as LinkIcon, CreditCard, LogOut, Store, Pencil, X, Loader2, CheckCircle2
} from 'lucide-react';

interface ShopProfile {
  shop_name: string | null;
  plan: string;
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter Plan', color: 'text-blue-600' },
  growth:  { label: 'Growth Plan',  color: 'text-[#0F6E56]' },
  pro:     { label: 'Pro Plan',     color: 'text-purple-600' },
};

export default function DashboardLayout({
  children, title, subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shops')
      .select('shop_name, plan')
      .eq('id', user.id)
      .single();
    if (data) setShopProfile({ shop_name: data.shop_name, plan: data.plan ?? 'starter' });
  };

  useEffect(() => { fetchProfile(); }, [user]);

  const openEditModal = () => {
    setEditName(shopProfile?.shop_name ?? '');
    setShowEditModal(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('shops')
      .update({ shop_name: editName.trim() })
      .eq('id', user.id);

    if (error) {
      toast.error('সেভ করতে ব্যর্থ হয়েছে: ' + error.message);
    } else {
      toast.success('শপের নাম আপডেট হয়েছে!');
      setShowEditModal(false);
      fetchProfile();
    }
    setIsSaving(false);
  };

  const displayName = shopProfile?.shop_name || user?.email?.split('@')[0] || 'My Shop';
  const planInfo = PLAN_LABELS[shopProfile?.plan ?? 'starter'] ?? PLAN_LABELS.starter;
  const avatarChar = (shopProfile?.shop_name?.[0] || user?.email?.[0] || 'S').toUpperCase();
  const hasRealName = !!shopProfile?.shop_name;

  const menuItems = [
    { id: 'dashboard',    path: '/dashboard',    label: 'আজকের অবস্থা',      icon: LayoutDashboard },
    { id: 'finance',      path: '/finance',      label: 'টাকার হিসাব',        icon: Wallet },
    { id: 'inventory',    path: '/inventory',    label: 'স্টক ও ইনভেন্টরি',   icon: Package },
    { id: 'new-parcel',   path: '/new-parcel',   label: 'নতুন পার্সেল',       icon: PlusCircle },
    { id: 'orders',       path: '/orders',       label: 'অর্ডার লিস্ট',       icon: Package },
    { id: 'customers',    path: '/customers',    label: 'কাস্টমার ডিরেক্টরি', icon: Users },
    { id: 'integrations', path: '/integrations', label: 'ইন্টিগ্রেশন ও API',  icon: LinkIcon },
    { id: 'billing',      path: '/billing',      label: 'বিলিং ও প্ল্যান',    icon: CreditCard },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 flex flex-col md:flex-row font-bengali dashboard-root">
      {/* Mobile Navbar */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 text-[#0F6E56] font-bold text-xl cursor-pointer" onClick={() => navigate('/dashboard')}>
          <TrendingUp className="h-6 w-6" /><span>EngazeUp</span>
        </div>
        <button aria-label="Open Mobile Menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 md:relative z-50 md:z-40 h-screen transition-all duration-300 ${isMobileMenuOpen ? 'left-0' : '-left-64 md:left-0'}`}>
        <div className="p-6 hidden md:flex items-center gap-2 text-[#0F6E56] font-bold text-2xl cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/dashboard')}>
          <TrendingUp className="h-8 w-8" /><span>EngazeUp</span>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/20'
                    : 'text-gray-600 hover:bg-[#0F6E56]/10 hover:text-[#0F6E56]'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Shop Profile Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 rounded-xl mb-3 border border-gray-100">
            <div className="w-9 h-9 rounded-full bg-[#0F6E56]/10 flex items-center justify-center text-[#0F6E56] font-extrabold text-base uppercase shrink-0">
              {avatarChar}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1">
                <p className={`text-sm font-bold truncate ${hasRealName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                  {hasRealName ? displayName : 'শপের নাম দিন'}
                </p>
              </div>
              <p className={`text-xs font-bold truncate ${planInfo.color}`}>{planInfo.label}</p>
            </div>
            <button
              onClick={openEditModal}
              title="শপের নাম এডিট করুন"
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F6E56] hover:bg-[#0F6E56]/10 transition shrink-0"
            >
              <Pencil size={14} />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl font-bold transition-all duration-300"
          >
            <LogOut className="h-4 w-4" /> লগআউট
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F9FA] dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-8 md:px-10 md:py-10 shadow-sm z-10 flex-shrink-0">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight flex items-center gap-3">
              {title}
              {title?.includes('আজকের অবস্থা') && <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse mt-1" />}
            </h1>
            {subtitle && <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">{subtitle}</p>}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          <div className="max-w-6xl mx-auto pb-20">{children}</div>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5" />
                <h2 className="text-lg font-extrabold">শপের প্রোফাইল এডিট</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveName} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  আপনার শপের নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="যেমন: রহিম কালেকশন"
                  maxLength={60}
                  autoFocus
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition text-sm"
                />
                <p className="text-xs text-gray-400 mt-1.5 font-medium">এই নামটি আপনার সাইডবারে দেখাবে।</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editName.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-bold hover:bg-[#1D9E75] transition shadow-lg shadow-[#0F6E56]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</>
                    : <><CheckCircle2 className="w-4 h-4" /> সেভ করুন</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
