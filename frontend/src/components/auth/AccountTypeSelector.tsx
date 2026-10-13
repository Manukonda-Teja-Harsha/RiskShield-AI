import React from 'react';
import { motion } from 'framer-motion';
import { UserRound, Building2, ArrowRight, ShieldCheck, Check } from 'lucide-react';

interface AccountTypeSelectorProps {
  onSelect: (type: 'personal' | 'brand') => void;
  onSwitchToSignIn: () => void;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  onSelect,
  onSwitchToSignIn
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-white tracking-tight">
          Join RiskShield AI
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Choose how you want to use RiskShield.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        {/* Option A: Personal Account */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onSelect('personal')}
          className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserRound className="w-5 h-5" />
            </div>

            <div>
              <h2 className="font-display font-bold text-base text-zinc-900 dark:text-white group-hover:text-brand-500 transition-colors">
                Personal Account
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Scan suspicious links, investigate potential scams, and manage your personal protection activity.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-brand-500">
            <span>Continue as Personal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Option B: Brand Workspace */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onSelect('brand')}
          className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display font-bold text-base text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Brand Workspace
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                  PRO
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Protect your brand against impersonation, suspicious domains, fake profiles, and digital threats.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-amber-500">
            <span>Create Brand Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Trust & Switcher */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <span>Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-bold text-brand-500 hover:underline"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
