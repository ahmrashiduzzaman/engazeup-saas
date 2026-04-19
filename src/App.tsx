import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Pages
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardHome from './pages/DashboardHome';
import FinanceView from './pages/FinanceView';
import InventoryPage from './pages/InventoryPage';
import NewParcelForm from './pages/NewParcelForm';
import OrderList from './pages/OrderList';
import CustomerDirectory from './pages/CustomerDirectory';
import IntegrationsPage from './pages/IntegrationsPage';
import BillingPage from './pages/BillingPage';
import AdminPanel from './pages/AdminPanel';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

/**
 * After a Facebook OAuth login, Supabase gives us a short-lived provider_token.
 * We silently exchange it for long-lived page tokens in the background
 * so that when the user visits Integrations they already have them ready.
 */
async function exchangeFbTokenInBackground(providerToken: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otvzexarrpuaewjjdxna.supabase.co';
    const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
      console.warn('[FB-TOKEN] Background exchange failed:', data.error);
      return;
    }

    const pages = data.pages ?? [];
    console.log(`[FB-TOKEN] Background exchange OK — ${pages.length} pages available.`);

    // If the user has exactly one page, auto-save it silently
    if (pages.length === 1) {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      // Check if page is already connected
      const { data: shopRow } = await supabase
        .from('shops')
        .select('fb_page_id')
        .eq('id', userId)
        .single();

      if (!shopRow?.fb_page_id) {
        const page = pages[0];
        // Subscribe to FB Page webhooks
        await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${page.access_token}`,
          { method: 'POST' }
        );
        // Save to DB
        await supabase
          .from('shops')
          .update({
            fb_page_id: page.id,
            fb_page_name: page.name,
            fb_page_access_token: page.access_token,
          })
          .eq('id', userId);

        console.log(`[FB-TOKEN] Auto-connected single page: ${page.name}`);
        toast.success(`✅ Facebook পেজ "${page.name}" অটোমেটিক কানেক্ট হয়ে গেছে!`, { duration: 5000 });
      }
    }
  } catch (err: any) {
    console.warn('[FB-TOKEN] Background exchange error:', err.message);
  }
}

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🚀 Global Supabase Auth Listener for OAuth Redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only redirect if they are on the login/register/landing pages
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/register') {
          navigate('/dashboard', { replace: true });
        }

        // 🔑 If logged in via Facebook OAuth, silently exchange tokens in background
        const provider = session.user?.app_metadata?.provider;
        const providerToken = session.provider_token;
        if (provider === 'facebook' && providerToken) {
          console.log('[FB-TOKEN] Facebook login detected — starting background token exchange...');
          // Run in background, don't block navigation
          exchangeFbTokenInBackground(providerToken);
        }
      }
    });

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
      subscription.unsubscribe(); // Cleanup Auth Listener
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage isRegister={false} />} />
      <Route path="/register" element={<AuthPage isRegister={true} />} />

      {/* Protected Routes */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><FinanceView /></ProtectedRoute>} />
      <Route path="/new-parcel" element={<ProtectedRoute><NewParcelForm /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomerDirectory /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: "'Hind Siliguri', sans-serif", fontSize: '14px', fontWeight: '600' },
            success: { iconTheme: { primary: '#0F6E56', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}