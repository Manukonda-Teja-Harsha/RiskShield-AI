import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Shield, Mail, Lock, Building2, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'user' | 'brand_owner';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'user',
}) => {
  const navigate = useNavigate();
  const { login } = useStore();
  const [role, setRole] = useState<'user' | 'brand_owner'>(initialRole);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brandName, setBrandName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide a valid email and password.');
      return;
    }
    if (role === 'brand_owner' && isRegister && !brandName) {
      setError('Please provide your official brand name.');
      return;
    }

    // Authenticate through the centralized user store
    login(email, role, role === 'brand_owner' ? (brandName || 'Acme Financial') : undefined);
    onClose();
    navigate(role === 'brand_owner' ? '/brand-dashboard' : '/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">
                {isRegister ? 'Create RiskShield Account' : 'Sign In to RiskShield AI'}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground">
                Digital Risk Protection Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Role Tabs */}
          <div className="flex p-1 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => { setRole('user'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                role === 'user'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5 text-brand-500" />
              Personal User
            </button>
            <button
              type="button"
              onClick={() => { setRole('brand_owner'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                role === 'brand_owner'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Brand Owner
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 dark:text-red-400 font-mono">
              {error}
            </div>
          )}

          {role === 'brand_owner' && isRegister && (
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1.5">
                Official Brand Name *
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Acme Financial"
                className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 caret-brand-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'brand_owner' ? 'security@brand.com' : 'user@example.com'}
                className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 caret-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 caret-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95"
          >
            <span>{isRegister ? 'Complete Registration' : 'Authenticate Session'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-brand-500 font-semibold hover:underline"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
