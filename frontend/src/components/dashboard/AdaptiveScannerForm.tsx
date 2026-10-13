import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  MessageSquare, 
  UserCheck, 
  ShoppingBag, 
  Phone, 
  CreditCard, 
  Briefcase, 
  Smartphone, 
  Layers, 
  Search, 
  ArrowRight, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  X, 
  RotateCcw, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type { InputCategory, ScanMode, ScannerContextPayload } from '../../types';

export interface AdaptiveScannerFormProps {
  onScan: (target: string, mode: ScanMode, contextPayload: ScannerContextPayload) => Promise<void>;
  isScanning: boolean;
  error?: string | null;
  onClearError?: () => void;
  brandContext?: {
    brandName: string;
    brandCategory?: string;
    brandId?: string;
  };
  initialTarget?: string;
  onOpenEmergency?: (scenario?: 'link' | 'credentials' | 'money' | 'file') => void;
  onOpenReport?: (target: string) => void;
}

interface CategoryConfig {
  id: InputCategory;
  mode: ScanMode;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge: string;
  submitLabel: string;
  placeholder: string;
  helperText: string;
  samples: { label: string; text: string; context?: Partial<CategoryDraftState> }[];
}

interface CategoryDraftState {
  primaryInput: string;
  channel?: string;
  senderInfo?: string;
  emailSubject?: string;
  requestedAction?: string;
  containedUrl?: string;
  claimedEntity?: string;
  isOpened?: boolean | null;
  enteredSensitiveInfo?: string;
  isImpersonating?: boolean;
  impersonatedEntity?: string;
  isPaymentRequested?: boolean;
  paymentDetails?: string;
  hasTransferredMoney?: boolean | null;
  requestedAmount?: string;
  appSource?: string;
  appPackageId?: string;
  developerName?: string;
  platform?: string;
  suspiciousTraits?: string[];
  jobType?: string;
  notes?: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'message',
    mode: 'message',
    label: 'SMS / Suspicious Message',
    shortLabel: 'SMS / Message',
    icon: MessageSquare,
    badge: 'Urgency & Lures',
    submitLabel: 'Analyze Message',
    placeholder: 'Paste the exact suspicious message text (e.g. "Dear customer, your electricity will be disconnected tonight due to unpaid bill. Immediately contact 9876543210 or click..." )',
    helperText: 'RiskShield AI checks deceptive urgency language, impersonation tokens, embedded links, and sender header legitimacy.',
    samples: []
  },
  {
    id: 'url',
    mode: 'url',
    label: 'Website / URL',
    shortLabel: 'Website / URL',
    icon: Globe,
    badge: 'Domain & Typosquatting',
    submitLabel: 'Analyze URL',
    placeholder: 'Enter website URL or domain (e.g. https://chase-security-verify.top or login.reward-points.xyz)',
    helperText: 'Real-time DNS telemetry, domain age, SSL issuer validation, WHOIS anonymity check, and Google Safe Browsing heuristics.',
    samples: []
  },
  {
    id: 'job',
    mode: 'job',
    label: 'Job Offer / Recruitment',
    shortLabel: 'Job Offer',
    icon: Briefcase,
    badge: 'Task Scam & Advance Fee',
    submitLabel: 'Analyze Job Offer',
    placeholder: 'Paste the job offer text, WhatsApp recruitment pitch, or Telegram task instructions...',
    helperText: 'Identifies high-risk task scams, advance fee fraud, fake data entry lures, and fake company impersonation.',
    samples: []
  },
  {
    id: 'product',
    mode: 'product',
    label: 'Marketplace / Seller',
    shortLabel: 'Marketplace / Seller',
    icon: ShoppingBag,
    badge: 'Fake Store & Escrow Fraud',
    submitLabel: 'Analyze Listing',
    placeholder: 'Enter marketplace product link or webstore URL (e.g. https://olx.in/item/... or https://clearance-deals.shop)',
    helperText: 'Scrutinizes unverified storefronts, off-platform payment coercion, unrealistic discounts, and fake escrow schemes.',
    samples: []
  },
  {
    id: 'payment',
    mode: 'payment',
    label: 'Payment / UPI',
    shortLabel: 'Payment / UPI',
    icon: CreditCard,
    badge: 'VPA & Account Verification',
    submitLabel: 'Analyze Payment Risk',
    placeholder: 'Enter UPI ID, VPA, or payment destination (e.g. refunds-helpdesk@okhdfcbank or merchant-care@ybl)',
    helperText: 'Cross-checks UPI handles against unverified handle patterns, impersonated bank tags, and high-risk recipient formats.',
    samples: []
  },
  {
    id: 'phone',
    mode: 'phone',
    label: 'Phone Number / Sender ID',
    shortLabel: 'Phone / Sender ID',
    icon: Phone,
    badge: 'Header & Spoofing Analysis',
    submitLabel: 'Analyze Contact',
    placeholder: 'Enter phone number or alphanumeric Sender ID (e.g. +91 98765 43210 or VK-HDFCBK or +1-800-432-1000)',
    helperText: 'Analyzes alphanumeric SMS header formats, telecom carrier prefixes, virtual VoIP identifiers, and reported robocall traits.',
    samples: []
  },
  {
    id: 'app',
    mode: 'app',
    label: 'Mobile App',
    shortLabel: 'Mobile App',
    icon: Smartphone,
    badge: 'Package ID & Sideload Risk',
    submitLabel: 'Analyze App',
    placeholder: 'Enter App Store URL, Google Play link, or Android package name (e.g. com.instantcash.fastloan.india)',
    helperText: 'Assesses sideloaded APK hazards, predatory micro-loan permissions, intrusive spyware, and bank app lookalikes.',
    samples: []
  },
  {
    id: 'other',
    mode: 'other',
    label: 'Other Suspicious Content',
    shortLabel: 'Other Content',
    icon: Layers,
    badge: 'Universal Heuristics',
    submitLabel: 'Analyze Content',
    placeholder: 'Paste any suspicious legal notices, digital arrest threats, QR code payloads, crypto lottery vouchers, or raw scripts...',
    helperText: 'Applies deep natural language heuristics, legal coercion detection, and credential solicitation filters.',
    samples: []
  }
];

export const AdaptiveScannerForm: React.FC<AdaptiveScannerFormProps> = ({
  onScan,
  isScanning,
  error,
  onClearError,
  brandContext,
  initialTarget,
  onOpenEmergency,
  onOpenReport
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<InputCategory>('url');
  const [showContextQuestions, setShowContextQuestions] = useState(false);

  // Drafts dictionary preserving user input across category switches
  const [drafts, setDrafts] = useState<Record<InputCategory, CategoryDraftState>>(() => {
    const initial: Record<InputCategory, CategoryDraftState> = {
      message: { primaryInput: '', channel: 'SMS', requestedAction: 'Click a link' },
      url: { primaryInput: '', channel: 'SMS', isOpened: null, enteredSensitiveInfo: 'None' },
      social: { primaryInput: '', platform: 'Instagram', suspiciousTraits: [] },
      job: { primaryInput: '', channel: 'WhatsApp', jobType: 'Remote Task / Review', isPaymentRequested: false },
      product: { primaryInput: '', platform: 'OLX', suspiciousTraits: [], isPaymentRequested: false },
      payment: { primaryInput: '', channel: 'Phone call', hasTransferredMoney: false },
      phone: { primaryInput: '', channel: 'Inbound Voice Call', requestedAction: 'Share OTP / PIN' },
      app: { primaryInput: '', appSource: 'Sideloaded APK / Direct link', suspiciousTraits: [] },
      other: { primaryInput: '', channel: 'Email' }
    };
    return initial;
  });

  // Hydrate initial target if provided (e.g. from Home page link scanner)
  useEffect(() => {
    if (initialTarget && initialTarget.trim()) {
      setDrafts(prev => ({
        ...prev,
        url: { ...prev.url, primaryInput: initialTarget.trim() }
      }));
      setActiveCategoryId('url');
    }
  }, [initialTarget]);

  const activeCategory = useMemo(() => {
    return CATEGORIES.find(c => c.id === activeCategoryId) || CATEGORIES[1];
  }, [activeCategoryId]);

  const currentDraft = drafts[activeCategoryId] || { primaryInput: '' };

  const updateDraft = (patch: Partial<CategoryDraftState>) => {
    setDrafts(prev => ({
      ...prev,
      [activeCategoryId]: {
        ...prev[activeCategoryId],
        ...patch
      }
    }));
    if (error && onClearError) {
      onClearError();
    }
  };

  // Embedded URL detection for text inputs
  const detectedEmbeddedUrl = useMemo(() => {
    if (activeCategoryId === 'message' || activeCategoryId === 'job' || activeCategoryId === 'other') {
      const match = currentDraft.primaryInput.match(/(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/i);
      return match ? match[0] : null;
    }
    return null;
  }, [activeCategoryId, currentDraft.primaryInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = currentDraft.primaryInput.trim();

    if (!query) {
      return;
    }

    const payload: ScannerContextPayload = {
      category: activeCategoryId,
      primaryInput: query,
      channel: currentDraft.channel,
      senderInfo: currentDraft.senderInfo,
      emailSubject: currentDraft.emailSubject,
      requestedAction: currentDraft.requestedAction,
      containedUrl: currentDraft.containedUrl || detectedEmbeddedUrl || undefined,
      claimedEntity: currentDraft.claimedEntity || (brandContext ? brandContext.brandName : undefined),
      isOpened: currentDraft.isOpened ?? undefined,
      enteredSensitiveInfo: currentDraft.enteredSensitiveInfo,
      isImpersonating: currentDraft.isImpersonating,
      impersonatedEntity: currentDraft.impersonatedEntity || (brandContext ? brandContext.brandName : undefined),
      isPaymentRequested: currentDraft.isPaymentRequested,
      paymentDetails: currentDraft.paymentDetails,
      hasTransferredMoney: currentDraft.hasTransferredMoney ?? undefined,
      requestedAmount: currentDraft.requestedAmount,
      appSource: currentDraft.appSource,
      appPackageId: currentDraft.appPackageId,
      notes: currentDraft.notes
    };

    await onScan(query, activeCategory.mode, payload);
  };

  const handleClearCurrent = () => {
    updateDraft({
      primaryInput: '',
      channel: undefined,
      senderInfo: undefined,
      emailSubject: undefined,
      requestedAction: undefined,
      containedUrl: undefined,
      claimedEntity: undefined,
      isOpened: null,
      enteredSensitiveInfo: undefined,
      isImpersonating: false,
      impersonatedEntity: undefined,
      isPaymentRequested: false,
      paymentDetails: undefined,
      hasTransferredMoney: false,
      requestedAmount: undefined,
      appSource: undefined,
      appPackageId: undefined,
      developerName: undefined,
      platform: undefined,
      suspiciousTraits: [],
      notes: undefined
    });
  };

  const handleLoadSample = (sample: { label: string; text: string; context?: Partial<CategoryDraftState> }) => {
    updateDraft({
      primaryInput: sample.text,
      ...sample.context
    });
    if (sample.context && Object.keys(sample.context).length > 0) {
      setShowContextQuestions(true);
    }
  };

  const toggleTrait = (trait: string) => {
    const list = currentDraft.suspiciousTraits || [];
    if (list.includes(trait)) {
      updateDraft({ suspiciousTraits: list.filter(t => t !== trait) });
    } else {
      updateDraft({ suspiciousTraits: [...list, trait] });
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. Category Selector Chips (9 Selectable Buttons)        */}
      {/* ======================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
          <span className="font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Select Suspicious Content Type:
          </span>
          <span className="text-[11px] text-muted-foreground">
            {CATEGORIES.findIndex(c => c.id === activeCategoryId) + 1} of {CATEGORIES.length} Categories
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategoryId === cat.id;
            const hasDraft = !!drafts[cat.id]?.primaryInput?.trim();

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategoryId(cat.id);
                  if (error && onClearError) onClearError();
                }}
                className={`relative px-3 py-2.5 rounded-2xl text-xs font-medium transition-all text-left flex flex-col justify-between gap-1.5 border ${
                  isSelected
                    ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40 shadow-sm ring-1 ring-brand-500/30 font-semibold'
                    : 'bg-card hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-500' : 'text-muted-foreground'}`} />
                  {hasDraft && !isSelected && (
                    <span 
                      title="Draft preserved" 
                      className="w-2 h-2 rounded-full bg-brand-500/80" 
                    />
                  )}
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                  )}
                </div>
                <span className="text-[11px] leading-tight font-mono tracking-tight line-clamp-2">
                  {cat.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Active Category Banner & Helper Description           */}
      {/* ======================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 border border-brand-500/20 font-bold">
            <activeCategory.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-foreground text-sm">
                {activeCategory.label}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-[10px] font-semibold border border-brand-500/20">
                {activeCategory.badge}
              </span>
              {brandContext && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-semibold border border-indigo-500/20">
                  Target: {brandContext.brandName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
              {activeCategory.helperText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowContextQuestions(!showContextQuestions)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-[11px] font-mono transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>{showContextQuestions ? 'Hide Context Questions' : 'Context Questions'}</span>
          {showContextQuestions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. Main Adaptive Form Section                            */}
      {/* ======================================================== */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Primary Input Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
            <span>Primary Indicator / Content:</span>
            {currentDraft.primaryInput && (
              <button
                type="button"
                onClick={handleClearCurrent}
                className="text-[11px] font-normal text-muted-foreground hover:text-red-500 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </label>

          {activeCategoryId === 'message' || activeCategoryId === 'job' || activeCategoryId === 'other' ? (
            <textarea
              rows={4}
              value={currentDraft.primaryInput}
              onChange={(e) => updateDraft({ primaryInput: e.target.value })}
              placeholder={activeCategory.placeholder}
              disabled={isScanning}
              className="w-full bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-4 text-xs sm:text-sm font-mono text-foreground dark:text-zinc-100 placeholder:text-muted-foreground/60 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-y caret-brand-500"
            />
          ) : (
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-muted-foreground absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={currentDraft.primaryInput}
                onChange={(e) => updateDraft({ primaryInput: e.target.value })}
                placeholder={activeCategory.placeholder}
                disabled={isScanning}
                className="w-full bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-3.5 sm:py-4 text-xs sm:text-sm font-mono text-foreground dark:text-zinc-100 placeholder:text-muted-foreground/60 dark:placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all caret-brand-500"
              />
            </div>
          )}
        </div>

        {/* Embedded Link Extraction Pill */}
        {detectedEmbeddedUrl && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs font-mono text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-2 truncate">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Embedded link detected:</span>
              <strong className="truncate font-semibold">{detectedEmbeddedUrl}</strong>
            </div>
            <button
              type="button"
              onClick={() => updateDraft({ containedUrl: detectedEmbeddedUrl })}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                currentDraft.containedUrl === detectedEmbeddedUrl
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-card text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
              }`}
            >
              {currentDraft.containedUrl === detectedEmbeddedUrl ? '✓ Extracted' : 'Extract Target Link'}
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. Category-Specific Contextual Follow-Up Questions      */}
        {/* ======================================================== */}
        <AnimatePresence>
          {showContextQuestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                    Contextual Follow-up Questions (Optional)
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Skip any questions you are unsure about
                </span>
              </div>

              {/* Category 1: SMS / Message Context */}
              {activeCategoryId === 'message' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Communication Channel:</label>
                    <select
                      value={currentDraft.channel || 'SMS'}
                      onChange={(e) => updateDraft({ channel: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="SMS">SMS Text Message</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Email">Email</option>
                      <option value="Instagram / DM">Instagram / Social DM</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Sender ID, Phone, or Email:</label>
                    <input
                      type="text"
                      value={currentDraft.senderInfo || ''}
                      onChange={(e) => updateDraft({ senderInfo: e.target.value })}
                      placeholder="e.g. VK-HDFCBK or +91 98765 43210"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {currentDraft.channel === 'Email' && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-muted-foreground">Email Subject Line:</label>
                      <input
                        type="text"
                        value={currentDraft.emailSubject || ''}
                        onChange={(e) => updateDraft({ emailSubject: e.target.value })}
                        placeholder="e.g. URGENT: Action required on your account"
                        className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">What does the message ask you to do?</label>
                    <div className="flex flex-wrap gap-2">
                      {['Click a link', 'Share OTP / PIN', 'Pay money / fee', 'Call back number', 'Download app / file', 'Claim lottery'].map((act) => (
                        <button
                          key={act}
                          type="button"
                          onClick={() => updateDraft({ requestedAction: act })}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            currentDraft.requestedAction === act
                              ? 'bg-brand-500/20 text-brand-500 border-brand-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 2: Website / URL Context */}
              {activeCategoryId === 'url' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Where did you receive this link?</label>
                    <select
                      value={currentDraft.channel || 'SMS'}
                      onChange={(e) => updateDraft({ channel: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="SMS">SMS Text Message</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp / Telegram">WhatsApp / Telegram</option>
                      <option value="Social Media Ad / Post">Social Media Ad / Post</option>
                      <option value="Google / Search Engine">Search Engine Result</option>
                      <option value="Other">Other / Found online</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Who does this site claim to be?</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. Bank name, Netflix, Courier, Government"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Did you open this URL in your browser?</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'Yes, opened', val: true },
                        { label: 'No, did not open', val: false },
                        { label: 'Not sure', val: null }
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => updateDraft({ isOpened: item.val })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            currentDraft.isOpened === item.val
                              ? 'bg-brand-500/20 text-brand-500 border-brand-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Did you enter credentials or card info?</label>
                    <select
                      value={currentDraft.enteredSensitiveInfo || 'None'}
                      onChange={(e) => updateDraft({ enteredSensitiveInfo: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="None">None / Did not enter anything</option>
                      <option value="Credentials / Password">Username or Password</option>
                      <option value="Credit / Debit Card">Credit / Debit Card numbers</option>
                      <option value="Personal Identity (SSN/Aadhaar)">Personal Identity numbers</option>
                      <option value="OTP / Security Code">OTP or Two-Factor code</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Category 3: Social Profile Context */}
              {activeCategoryId === 'social' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Social Platform:</label>
                    <select
                      value={currentDraft.platform || 'Instagram'}
                      onChange={(e) => updateDraft({ platform: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Twitter / X">Twitter / X</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Is it impersonating a specific brand?</label>
                    <input
                      type="text"
                      value={currentDraft.impersonatedEntity || ''}
                      onChange={(e) => updateDraft({ 
                        impersonatedEntity: e.target.value,
                        isImpersonating: !!e.target.value.trim() 
                      })}
                      placeholder="e.g. Binance, Apple Support, Netflix"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">Suspicious traits observed:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Imitating verified brand',
                        'Unrealistic crypto/giveaway returns',
                        'Asking for private DMs / WhatsApp',
                        'Newly created account',
                        'Selling counterfeit goods'
                      ].map((trait) => (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => toggleTrait(trait)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                            (currentDraft.suspiciousTraits || []).includes(trait)
                              ? 'bg-brand-500/20 text-brand-500 border-brand-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {(currentDraft.suspiciousTraits || []).includes(trait) ? '✓ ' : '+ '}
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 4: Job Offer Context */}
              {activeCategoryId === 'job' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Company / Organization Claimed:</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. Amazon HR, Kelly Services, Freelance Task"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Job / Role Type:</label>
                    <select
                      value={currentDraft.jobType || 'Remote Task / Review'}
                      onChange={(e) => updateDraft({ jobType: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="Remote Task / Review">YouTube / Product Reviews Task</option>
                      <option value="Data Entry">Data Entry Operator</option>
                      <option value="Part-time Assistant">Part-Time Virtual Assistant</option>
                      <option value="Crypto Trader">Crypto Trading / Signal Follower</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">Are they asking for any upfront fees or deposits?</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'Yes, registration / training fee requested', val: true },
                        { label: 'No upfront fee requested', val: false }
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => updateDraft({ isPaymentRequested: item.val })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            currentDraft.isPaymentRequested === item.val
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 5: Marketplace Context */}
              {activeCategoryId === 'product' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Marketplace Platform:</label>
                    <select
                      value={currentDraft.platform || 'OLX'}
                      onChange={(e) => updateDraft({ platform: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="OLX">OLX</option>
                      <option value="Facebook Marketplace">Facebook Marketplace</option>
                      <option value="Amazon">Amazon Marketplace</option>
                      <option value="eBay">eBay</option>
                      <option value="Instagram Store">Instagram Storefront</option>
                      <option value="Independent Webstore">Independent Webstore</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Seller / Item Claim:</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. iPhone 15, Honda City, Used Sofa"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">Suspicious seller behavior:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Price too good to be true',
                        'Demands upfront advance payment',
                        'Refuses cash on delivery',
                        'Urges moving off-platform to WhatsApp',
                        'Claims to be military officer transferring'
                      ].map((trait) => (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => toggleTrait(trait)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                            (currentDraft.suspiciousTraits || []).includes(trait)
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {(currentDraft.suspiciousTraits || []).includes(trait) ? '✓ ' : '+ '}
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 6: Payment / UPI Context */}
              {activeCategoryId === 'payment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Claimed Purpose of Payment:</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. Refund processing, Electricity bill, Customs clearance"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Requested Amount:</label>
                    <input
                      type="text"
                      value={currentDraft.requestedAmount || ''}
                      onChange={(e) => updateDraft({ requestedAmount: e.target.value })}
                      placeholder="e.g. ₹5,000 or $50"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground font-bold text-foreground">
                      Have you already transferred any money to this recipient?
                    </label>
                    <div className="flex gap-2">
                      {[
                        { label: '🚨 Yes, already transferred funds', val: true },
                        { label: '🛡️ No, checking before payment', val: false }
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => updateDraft({ hasTransferredMoney: item.val })}
                          className={`px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
                            currentDraft.hasTransferredMoney === item.val
                              ? item.val
                                ? 'bg-red-500/20 text-red-500 border-red-500/50 font-bold'
                                : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 7: Phone / Sender ID Context */}
              {activeCategoryId === 'phone' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Interaction Channel:</label>
                    <select
                      value={currentDraft.channel || 'Inbound Voice Call'}
                      onChange={(e) => updateDraft({ channel: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="Inbound Voice Call">Inbound Voice Call</option>
                      <option value="Robocall">Automated Robocall</option>
                      <option value="SMS Text">SMS Text Message</option>
                      <option value="WhatsApp Call / Chat">WhatsApp Call / Chat</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Caller / Sender Claim:</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. Bank fraud department, Police, Customs, Courier"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">What did the caller demand?</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Share OTP / PIN',
                        'Transfer funds to safe account',
                        'Install remote desktop app (AnyDesk/TeamViewer)',
                        'Stay on video call for digital arrest',
                        'Click SMS link'
                      ].map((act) => (
                        <button
                          key={act}
                          type="button"
                          onClick={() => updateDraft({ requestedAction: act })}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            currentDraft.requestedAction === act
                              ? 'bg-brand-500/20 text-brand-500 border-brand-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 8: Mobile App Context */}
              {activeCategoryId === 'app' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Download Source:</label>
                    <select
                      value={currentDraft.appSource || 'Sideloaded APK / Direct link'}
                      onChange={(e) => updateDraft({ appSource: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="Sideloaded APK / Direct link">Sideloaded APK / Browser Link</option>
                      <option value="Official Google Play Store">Google Play Store</option>
                      <option value="Official Apple App Store">Apple App Store</option>
                      <option value="Telegram / WhatsApp File">Sent via Telegram / WhatsApp</option>
                      <option value="Third-party Store">Third-Party App Store</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Developer Name Claimed:</label>
                    <input
                      type="text"
                      value={currentDraft.developerName || ''}
                      onChange={(e) => updateDraft({ developerName: e.target.value })}
                      placeholder="e.g. Quick Loan Corp, SBI Helpdesk"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-muted-foreground">Suspicious App Behavior:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Demands contact list & SMS permissions',
                        'Aggressive instant loan harassment',
                        'Demands screen recording / accessibility permissions',
                        'Mimics official banking application'
                      ].map((trait) => (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => toggleTrait(trait)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                            (currentDraft.suspiciousTraits || []).includes(trait)
                              ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {(currentDraft.suspiciousTraits || []).includes(trait) ? '✓ ' : '+ '}
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 9: Other Suspicious Content Context */}
              {activeCategoryId === 'other' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Origin Channel:</label>
                    <select
                      value={currentDraft.channel || 'Email'}
                      onChange={(e) => updateDraft({ channel: e.target.value })}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="Email">Email</option>
                      <option value="WhatsApp / Telegram">WhatsApp / Telegram</option>
                      <option value="Physical Letter / Courier">Physical Letter / Courier</option>
                      <option value="Website Script">Website Script / Pop-up</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground">Claimed Authority / Brand:</label>
                    <input
                      type="text"
                      value={currentDraft.claimedEntity || ''}
                      onChange={(e) => updateDraft({ claimedEntity: e.target.value })}
                      placeholder="e.g. CBI, Supreme Court, Tax Dept, KBC Lottery"
                      className="w-full rounded-xl bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* 5. Emergency Warning Banners (Context-Driven)            */}
        {/* ======================================================== */}
        {currentDraft.hasTransferredMoney && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-red-600 dark:text-red-400">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <strong className="block font-bold text-red-500">CRITICAL FINANCIAL EMERGENCY:</strong>
                <span>
                  You indicated that funds were already transferred. Immediately contact your bank or call the Cyber Crime Helpline (<strong>1930</strong>) to freeze the beneficiary account!
                </span>
              </div>
            </div>
            {onOpenEmergency && (
              <button
                type="button"
                onClick={() => onOpenEmergency('money')}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold tracking-wide hover:bg-red-700 transition-colors whitespace-nowrap shadow-md shadow-red-600/30 shrink-0 self-end sm:self-auto"
              >
                Open Emergency Response
              </button>
            )}
          </div>
        )}

        {currentDraft.enteredSensitiveInfo && currentDraft.enteredSensitiveInfo !== 'None' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-mono text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                Account Compromise Risk: You indicated entering sensitive credentials. Immediately change your passwords and revoke active sessions.
              </span>
            </div>
            {onOpenEmergency && (
              <button
                type="button"
                onClick={() => onOpenEmergency('credentials')}
                className="text-xs underline hover:text-amber-500 font-bold shrink-0"
              >
                Remediation Guide
              </button>
            )}
          </div>
        )}

        {/* Security Disclaimers & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span>Never enter passwords, PINs, or secret OTPs. RiskShield AI analyzes technical indicators only.</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {currentDraft.primaryInput && (
              <button
                type="button"
                onClick={handleClearCurrent}
                className="px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              disabled={isScanning || !currentDraft.primaryInput.trim()}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-orange-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating Telemetry...</span>
                </>
              ) : (
                <>
                  <span>{activeCategory.submitLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-mono mt-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* ======================================================== */}
      {/* 6. Realistic Sample Indicators for Testing               */}
      {/* ======================================================== */}
      {activeCategory.samples && activeCategory.samples.length > 0 && (
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            <span className="text-foreground font-semibold">Test {activeCategory.shortLabel} Scenarios:</span>
            {activeCategory.samples.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadSample(s)}
                className="px-2.5 py-1 rounded-lg bg-muted hover:bg-brand-500/10 text-muted-foreground hover:text-brand-500 border border-border transition-colors text-[10px]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
