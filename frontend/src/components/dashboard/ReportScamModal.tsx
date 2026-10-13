import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, Send, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ReportScamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTarget?: string;
}

export const ReportScamModal: React.FC<ReportScamModalProps> = ({
  isOpen,
  onClose,
  initialTarget = ''
}) => {
  const { addUserReport } = useStore();
  const [target, setTarget] = useState(initialTarget);
  const [category, setCategory] = useState('Credential Phishing');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      setError('Please provide the suspicious link, phone number, or handle.');
      return;
    }

    addUserReport({
      target: target.trim(),
      category,
      status: 'SUBMITTED',
      notes: notes.trim() || 'Submitted via User Dashboard',
      evidenceCount: 1
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h2 id="report-modal-title" className="font-display font-extrabold text-lg text-foreground">
                  File Scam Report
                </h2>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Community Threat Intelligence Intake
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">Report Successfully Filed</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Your report has been queued under status <span className="font-mono text-brand-500 font-bold">SUBMITTED</span> for automated heuristic verification.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-foreground mb-1.5">
                  Suspicious Indicator / URL / Handle *
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. fake-account-login.top or @impersonator_bot"
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 caret-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-foreground mb-1.5">
                  Scam Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="Credential Phishing">Credential Phishing</option>
                  <option value="Executive Impersonation">Executive Impersonation</option>
                  <option value="Package Courier Scam">Package Courier Scam</option>
                  <option value="Counterfeit Store / Fake Merchant">Counterfeit Store / Fake Merchant</option>
                  <option value="Malware Attachment Lure">Malware Attachment Lure</option>
                  <option value="Financial Extortion / Blackmail">Financial Extortion / Blackmail</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-foreground mb-1.5">
                  Observed Details & Context (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe where you found this indicator (e.g. unsolicited SMS text received today)..."
                  rows={3}
                  className="w-full bg-white dark:bg-zinc-900/90 border border-border dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 resize-none caret-brand-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Responsible intake notice */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2 text-[11px] text-muted-foreground">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  <strong>Ethical Reporting Standards:</strong> Reports are logged for verification and do not automatically black-list domains without technical correlation.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-muted text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Threat Report</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReportScamModal;
