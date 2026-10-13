import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { ScanDetailModal } from '../../components/dashboard/ScanDetailModal';
import { EmergencyModeModal } from '../../components/dashboard/EmergencyModeModal';
import { ReportScamModal } from '../../components/dashboard/ReportScamModal';
import { ScanResult } from '../../types';

export const UserDashboardLayout: React.FC = () => {
  const location = useLocation();

  // Sidebar collapse & mobile state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modal states
  const [inspectedResult, setInspectedResult] = useState<ScanResult | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyScenario, setEmergencyScenario] = useState<'link' | 'credentials' | 'money' | 'file'>('link');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');

  // Callbacks shared with child pages via Outlet context
  const handleInspectResult = (result: ScanResult) => {
    setInspectedResult(result);
  };

  const handleOpenEmergency = (scenario: 'link' | 'credentials' | 'money' | 'file' = 'link') => {
    setEmergencyScenario(scenario);
    setEmergencyOpen(true);
  };

  const handleOpenReport = (target: string = '') => {
    setReportTarget(target);
    setReportOpen(true);
  };

  // Derive contextual header copy from current sub-route
  const getHeaderMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/insights')) {
      return {
        title: 'Security Insights & Analytics',
        subtitle: 'Telemetry outcome distribution, target breakdowns, and threat exposure trends.'
      };
    }
    if (path.startsWith('/dashboard/threat-watch')) {
      return {
        title: 'Threat Watch Surveillance',
        subtitle: 'Surveillance of critical domains, SSL integrity, and continuous feed reputation.'
      };
    }
    if (path.startsWith('/dashboard/activity')) {
      return {
        title: 'Activity Journal & Audit Log',
        subtitle: 'Chronological telemetry archive across scans, reports, and pinned security findings.'
      };
    }
    return {
      title: 'Security Overview & Telemetry Console',
      subtitle: 'Real-time threat evaluation, universal input scanning, and monitored domain activity.'
    };
  };

  const { title, subtitle } = getHeaderMeta();

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors selection:bg-brand-500 selection:text-white">
      {/* 1. Sidebar Navigation */}
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Contextual Top Header */}
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenEmergency={handleOpenEmergency}
        />

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
          <Outlet 
            context={{
              onInspectResult: handleInspectResult,
              onOpenEmergency: handleOpenEmergency,
              onOpenReport: handleOpenReport
            }} 
          />
        </main>

        {/* Subtle Workspace Footer */}
        <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>RiskShield AI • Personal Threat Intelligence Platform</span>
            <span>All detections cite source feeds and evidence logs.</span>
          </div>
        </footer>
      </div>

      {/* 3. Global Modal Dialogs */}
      <ScanDetailModal
        scan={inspectedResult}
        onClose={() => setInspectedResult(null)}
        onOpenEmergency={handleOpenEmergency}
        onOpenReport={handleOpenReport}
      />

      <EmergencyModeModal
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        initialScenario={emergencyScenario}
      />

      <ReportScamModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        initialTarget={reportTarget}
      />
    </div>
  );
};
