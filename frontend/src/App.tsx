import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useStore } from './store/useStore';

// User Dashboard Layout & Sub-pages
import { UserDashboardLayout } from './pages/dashboard/UserDashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { DashboardInsights } from './pages/dashboard/DashboardInsights';
import { DashboardThreatWatch } from './pages/dashboard/DashboardThreatWatch';
import { DashboardActivity } from './pages/dashboard/DashboardActivity';

// Brand Dashboard Layout & Sub-pages (Challenge 03)
import { BrandDashboardLayout } from './pages/brand/BrandDashboardLayout';
import { BrandOverview } from './pages/brand/BrandOverview';
import { BrandThreats } from './pages/brand/BrandThreats';
import { BrandInvestigations } from './pages/brand/BrandInvestigations';
import { BrandProfilePage } from './pages/brand/BrandProfilePage';
import { BrandIntelligence } from './pages/brand/BrandIntelligence';

// Scroll to top helper on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  const { theme, restoreSession } = useStore();

  // Sync theme class on root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Restore and verify active Supabase session from backend (/api/auth/me) on app mount
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* User Dashboard Nested Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="user">
              <UserDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="insights" element={<DashboardInsights />} />
          <Route path="threat-watch" element={<DashboardThreatWatch />} />
          <Route path="activity" element={<DashboardActivity />} />
        </Route>

        {/* Brand Dashboard Protected Nested Routes (/brand-dashboard & /brand) */}
        <Route
          path="/brand-dashboard"
          element={
            <ProtectedRoute allowedRole="brand_owner">
              <BrandDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<BrandOverview />} />
          <Route path="threats" element={<BrandThreats />} />
          <Route path="investigations" element={<BrandInvestigations />} />
          <Route path="profile" element={<BrandProfilePage />} />
          <Route path="intelligence" element={<BrandIntelligence />} />
        </Route>

        <Route
          path="/brand"
          element={
            <ProtectedRoute allowedRole="brand_owner">
              <BrandDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<BrandOverview />} />
          <Route path="threats" element={<BrandThreats />} />
          <Route path="investigations" element={<BrandInvestigations />} />
          <Route path="profile" element={<BrandProfilePage />} />
          <Route path="intelligence" element={<BrandIntelligence />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
