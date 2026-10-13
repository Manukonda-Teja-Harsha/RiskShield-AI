import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Sun, Moon, LogIn, UserCheck, Building2, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface NavbarProps {
  onOpenAuth?: (initialRole?: 'user' | 'brand_owner') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { theme, toggleTheme, user, logout } = useStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-4 z-40 w-full max-w-7xl mx-auto px-4 sm:px-6">
      <nav 
        aria-label="Main Navigation"
        className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl transition-colors duration-200"
      >
        {/* RiskShield AI Logo linking to Home */}
        <Link 
          to="/"
          className="flex items-center gap-3 group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-105 group-hover:shadow-orange-500/40 transition-all duration-200">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-foreground flex items-center gap-1 leading-tight">
              RiskShield <span className="text-brand-500">AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono font-semibold">
              Digital Risk Protection
            </span>
          </div>
        </Link>

        {/* Right Nav: Theme Toggle & Login/Dashboard link */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground transition-all duration-200 group active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-brand-500 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </div>
            <span className="text-xs font-mono font-medium hidden md:inline text-muted-foreground group-hover:text-foreground">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* Authentication & Profile Status */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={user.role === 'brand_owner' ? '/brand-dashboard' : '/dashboard'}
                className="px-3.5 py-2 rounded-xl bg-muted border border-border text-xs font-semibold text-foreground hover:border-brand-500/50 flex items-center gap-2 transition-all"
              >
                {user.role === 'brand_owner' ? (
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                )}
                <span className="hidden sm:inline font-mono">
                  {user.role === 'brand_owner' ? 'Brand Workspace' : 'My Dashboard'}
                </span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Log out"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              type="button"
              className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <LogIn className="w-4 h-4 stroke-[2.2]" />
              <span>Log in</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
