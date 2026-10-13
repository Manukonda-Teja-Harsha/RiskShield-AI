import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  UserRound, 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  ChevronRight
} from 'lucide-react';
import { AuthorizedBrandMembership } from '../../types';

interface WorkspaceSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  userEmail: string;
  userName?: string;
  authorizedBrands: AuthorizedBrandMembership[];
  onSelectWorkspace: (type: 'personal' | 'brand', brandId?: string) => void;
  onCreateNewBrand?: () => void;
}

export const WorkspaceSelectionModal: React.FC<WorkspaceSelectionModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
  authorizedBrands,
  onSelectWorkspace,
  onCreateNewBrand
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 overflow-hidden"
        >
          {/* Ambient Glow */}
          <div 
            aria-hidden="true" 
            className="absolute -top-24 -right-24 w-60 h-60 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" 
          />

          {/* Header */}
          <div className="flex items-start justify-between mb-6 relative">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-500">
                Authorized Access
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-zinc-900 dark:text-white mt-0.5">
                Select Workspace
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{userEmail}</span>
              </p>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Workspace Options */}
          <div className="space-y-3 relative">
            {/* Personal Workspace Option */}
            <button
              type="button"
              onClick={() => onSelectWorkspace('personal')}
              className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-brand-500/50 bg-zinc-50/70 dark:bg-zinc-900/60 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-brand-500 transition-colors">
                      Personal Account
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                      Individual
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    Personal threat triage, URL inspection, and scam alerts
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>

            {/* Brand Workspaces */}
            {authorizedBrands.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    Brand Workspaces ({authorizedBrands.length})
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {authorizedBrands.map((brand) => (
                    <button
                      key={brand.brandId}
                      type="button"
                      onClick={() => onSelectWorkspace('brand', brand.brandId)}
                      className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50/70 dark:bg-zinc-900/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                              {brand.brandName}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                              {brand.role || 'Member'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {brand.verificationStatus === 'VERIFIED' ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified Brand Identity
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                Pending DNS Verification
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer: Register New Brand Workspace */}
          {onCreateNewBrand && (
            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Need to protect a company?
              </span>
              <button
                type="button"
                onClick={onCreateNewBrand}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 transition-colors py-1 px-2.5 rounded-lg hover:bg-brand-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Brand Workspace</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorkspaceSelectionModal;
