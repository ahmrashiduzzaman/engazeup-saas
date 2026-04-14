import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

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

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🚀 Global Supabase Auth Listener for OAuth Redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only redirect if they are on the login/register/landing pages
        // This prevents ripping them out of deep links (like /orders) when they refresh the browser
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/register') {
          navigate('/dashboard', { replace: true });
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