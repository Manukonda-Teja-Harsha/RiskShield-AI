import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  ShieldAlert, 
  User, 
  LogOut, 
  Lock, 
  HelpCircle, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileMenu: () => void;
  onOpenEmergency: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onOpenEmergency
}) => {
  const navigate = useNavigate();
  const { user, logout, scanHistory, threatWatchList } = useStore();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const highRiskThreats = scanHistory.filter(s => s.status === 'KNOWN_THREAT' || s.status === 'HIGH_RISK').length;

  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-base sm:text-xl text-foreground truncate">
            {title}
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions (Emergency Pill, Notifications Popover, Profile Dropdown) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Scam Emergency Mode Pill */}
        <button
          type="button"
          onClick={() => onOpenEmergency('link')}
          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          title="Open Scam Emergency Mode Guidance"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Emergency Mode</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileMenuOpen(false);
            }}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-card" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-display font-bold text-xs text-foreground">Security Notifications</span>
                {unreadNotifications > 0 && (
                  <button
                    onClick={() => setUnreadNotifications(0)}
                    className="text-[10px] font-mono text-brand-500 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Session Security Guard Active</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Personal telemetry is stored privately in memory. No PII is routed to third-party ad brokers.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Info className="w-3.5 h-3.5 text-brand-500" />
                    <span>Threat Watch Summary</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {threatWatchList.length} items currently monitored. {highRiskThreats} high-risk findings logged in scan history.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Unified Engine v2.0 Operational</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Connected threat feed heuristics online with sub-second analysis latency.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Dropdown Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen(!profileMenuOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-colors text-xs font-mono"
            aria-label="User Profile Menu"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:inline font-bold text-foreground max-w-[120px] truncate">
              {user?.email?.split('@')[0] || 'Account'}
            </span>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border shadow-2xl p-3 z-50 space-y-2">
              <div className="p-2 border-b border-border">
                <span className="font-bold text-xs text-foreground block truncate">
                  {user?.email}
                </span>
                <span className="text-[10px] font-mono text-brand-500 block">
                  {user?.isDemo ? 'Demonstration Session' : 'Standard Consumer License'}
                </span>
              </div>

              <div className="space-y-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full p-2 rounded-xl text-left hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Workspace Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onOpenEmergency('link');
                  }}
                  className="w-full p-2 rounded-xl text-left hover:bg-muted text-red-500 flex items-center gap-2 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Emergency Mode</span>
                </button>

                <a
                  href="#faq"
                  onClick={() => setProfileMenuOpen(false)}
                  className="w-full p-2 rounded-xl text-left hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors block"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Help & Documentation</span>
                </a>
              </div>

              <div className="pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-2 rounded-xl text-left text-red-500 hover:bg-red-500/10 text-xs font-mono flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
