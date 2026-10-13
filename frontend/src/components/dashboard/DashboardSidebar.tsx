import React from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  PieChart, 
  Eye, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  X,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, theme, toggleTheme } = useStore();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Home',
      icon: Shield,
      exact: true,
      badge: undefined
    },
    {
      to: '/dashboard/insights',
      label: 'Insights',
      icon: PieChart,
      exact: false,
      badge: undefined
    },
    {
      to: '/dashboard/threat-watch',
      label: 'Threat Watch',
      icon: Eye,
      exact: false,
      badge: undefined
    },
    {
      to: '/dashboard/activity',
      label: 'Activity',
      icon: Activity,
      exact: false,
      badge: undefined
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-card border-r border-border text-foreground transition-all duration-300">
      {/* Top: Logo & Platform Identity */}
      <div>
        <div className={`p-4 flex items-center justify-between border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group select-none overflow-hidden"
            title="Return to Public Site"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-extrabold text-base tracking-tight text-foreground truncate">
                  RiskShield <span className="text-brand-500">AI</span>
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono font-semibold truncate">
                  User Workspace
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5" aria-label="Dashboard Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-mono font-semibold transition-all relative ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-500 font-bold border border-brand-500/30 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                } ${collapsed ? 'justify-center px-2.5' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-500' : 'text-muted-foreground'}`} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && (
                  <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Utility and Profile actions */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden md:flex items-center gap-2 w-full p-2 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {!collapsed && <span>Collapse Sidebar</span>}
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Light/Dark Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-brand-500 shrink-0" />
          )}
          {!collapsed && (
            <span className="truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        {/* User Card & Logout */}
        <div className={`pt-2 border-t border-border flex items-center justify-between gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shrink-0 text-xs font-bold font-mono">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground block truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground block truncate">
                  {user?.role === 'user' ? 'Consumer Protection' : user?.role || 'User'}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:block shrink-0 sticky top-0 h-screen transition-all duration-300 z-30 ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay & Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-72 z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSidebar;
