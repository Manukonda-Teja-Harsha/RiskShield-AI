import React, { useState, createContext, useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BrandSidebar } from '../../components/brand/BrandSidebar';
import { BrandHeader } from '../../components/brand/BrandHeader';
import { ThreatInvestigationModal } from '../../components/brand/ThreatInvestigationModal';
import { BrandThreatFinding } from '../../types';
import { useStore } from '../../store/useStore';

interface BrandDashboardContextType {
  openInspectModal: (finding: BrandThreatFinding) => void;
}

const BrandDashboardContext = createContext<BrandDashboardContextType | null>(null);

export const useBrandDashboard = () => {
  const context = useContext(BrandDashboardContext);
  if (!context) {
    throw new Error('useBrandDashboard must be used within BrandDashboardLayout');
  }
  return context;
};

export const BrandDashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inspectFinding, setInspectFinding] = useState<BrandThreatFinding | null>(null);
  const { user, loadBrandWorkspaces, loadBrandWorkspaceDetails, activeBrandId } = useStore();

  useEffect(() => {
    if (user && !user.isDemo) {
      void loadBrandWorkspaces();
      void loadBrandWorkspaceDetails(activeBrandId);
    }
  }, [user, activeBrandId]);

  const openInspectModal = (finding: BrandThreatFinding) => {
    setInspectFinding(finding);
  };

  return (
    <BrandDashboardContext.Provider value={{ openInspectModal }}>
      <div className="min-h-screen bg-background text-foreground flex transition-colors">
        {/* Sidebar */}
        <BrandSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <BrandHeader
            onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          />

          <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>

        {/* Global Investigation Inspector Modal */}
        <ThreatInvestigationModal
          finding={inspectFinding}
          onClose={() => setInspectFinding(null)}
        />
      </div>
    </BrandDashboardContext.Provider>
  );
};

export default BrandDashboardLayout;
