import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  Check, 
  User, 
  LogOut, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface BrandHeaderProps {
  onToggleMobileMenu: () => void;
  onOpenQuickScan?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ 
  onToggleMobileMenu,
  onOpenQuickScan
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    user, 
    logout, 
    activeBrandId, 
    setActiveBrandId, 
    registeredBrands, 
    brandThreatFindings,
    brandActivities 
  } = useStore();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeBrand = registeredBrands.find(b => b.id === activeBrandId) || registeredBrands[0] || (user?.brandName ? {
    id: user.brandId || 'user-brand',
    name: user.brandName,
    slug: (user.brandName || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    logoInitial: (user.brandName || 'B').slice(0, 2).toUpperCase(),
    accentColor: '#FF5500',
    category: 'Company & Product',
    description: '',
    registeredAt: 'Today',
    relativeTime: 'Active',
    status: 'PENDING_DNS' as const,
    verifiedAssetsCount: 0,
    activeCampaignsCount: 0,
    website: '',
    verifiedDomains: [],
    alternativeNames: [],
    officialSocials: [],
    pastWork: []
  } : undefined);

  // Resolve header titles based on route path
  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path === '/brand-dashboard' || path === '/brand-dashboard/') {
      return {
        title: 'Brand Protection Overview',
        subtitle: `Identity attestation, lookalike intelligence, and active posture for ${activeBrand?.name || 'Registered Brand'}`
      };
    }
    if (path.includes('/threats')) {
      return {
        title: 'Brand Threat Register',
        subtitle: 'Itemized suspicious indicators, lookalikes, homographs, and impersonation attempts'
      };
    }
    if (path.includes('/investigations')) {
      return {
        title: 'Threat Investigations & Evidence',
        subtitle: 'In-depth comparative analysis, RFC-2142 abuse packets, and lifecycle review'
      };
    }
    if (path.includes('/profile')) {
      return {
        title: 'Brand Profile & Digital Assets',
        subtitle: 'Manage official domains, social handles, mobile apps, and DNS TXT verification'
      };
    }
    if (path.includes('/intelligence')) {
      return {
        title: 'Intelligence & Longitudinal Reports',
        subtitle: 'Threat vectors over time, impersonator infrastructure clusters, and exportable briefing'
      };
    }
    return {
      title: 'Brand Protection Command Center',
      subtitle: 'Digital asset attestation and trademark defense'
    };
  };

  const { title, subtitle } = getHeaderInfo();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter scoped threat notifications
  const scopedFindings = brandThreatFindings.filter(f => f.brandId === activeBrand?.id);
  const unreviewedFindings = scopedFindings.filter(f => f.status === 'NEW' || f.status === 'UNDER_REVIEW');

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hamburger & Contextual Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-display font-extrabold text-foreground tracking-tight line-clamp-1">
                {title}
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold">
                ENTERPRISE
              </span>
            </div>
            <p className="hidden md:block text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Brand Selector, Notifications, Profile */}
        <div className="flex items-center gap-2.5">
          {/* Active Brand Workspace Indicator */}
          {activeBrand && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground shadow-sm"
              title={`Active Brand Workspace: ${activeBrand.name}`}
            >
              <div 
                className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm"
                style={{ backgroundColor: activeBrand?.accentColor || '#3B82F6' }}
              >
                {activeBrand?.logoInitial || 'B'}
              </div>
              <span className="text-xs font-bold max-w-[120px] sm:max-w-[160px] truncate">
                {activeBrand?.name}
              </span>
            </div>
          )}

          {/* Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted/60 transition-all shadow-sm"
              title="Threat Alerts & Activity"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreviewedFindings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
                  {unreviewedFindings.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Brand Alerts</span>
                    <span className="text-[10px] font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold">
                      {unreviewedFindings.length} Active
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{activeBrand?.name}</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {unreviewedFindings.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                      No unreviewed threats for {activeBrand?.name}.
                    </div>
                  ) : (
                    unreviewedFindings.map((finding) => (
                      <div
                        key={finding.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/brand-dashboard/threats');
                        }}
                        className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/80 border border-border cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                            finding.severity === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                            {finding.severity}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(finding.firstDetectedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-foreground truncate">
                          {finding.target}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {finding.detectionReason}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-border mt-2">
                  <Link
                    to="/brand-dashboard/threats"
                    onClick={() => setNotificationsOpen(false)}
                    className="block text-center text-xs font-bold text-brand-400 hover:text-brand-300 py-1"
                  >
                    View All Threats ({scopedFindings.length}) →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-card border border-border hover:border-brand-500/40 text-foreground transition-all shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline text-xs font-bold truncate max-w-[100px]">
                {user?.email?.split('@')[0] || 'Brand Owner'}
              </span>
              <ChevronDown className="hidden sm:inline w-3 h-3 text-muted-foreground" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {user?.email || 'brand@acme.com'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block mt-0.5">
                    Authorized Brand Owner
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
