import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  Share2, 
  Smartphone, 
  PhoneCall, 
  FileCheck2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Shield,
  Layers,
  Sparkles,
  User,
  X
} from 'lucide-react';
import { 
  BrandType, 
  BrandOnboardingData, 
  BrandSocialProfile, 
  BrandAppListing, 
  BrandContactChannels,
  RegisteredBrand,
  UserSession
} from '../../types';
import { useStore } from '../../store/useStore';
import { submitBrandWorkspaceOnboarding, isValidEmail } from '../../lib/auth';

interface BrandOnboardingFlowProps {
  initialEmail?: string;
  initialFullName?: string;
  onComplete: (brand: RegisteredBrand, user: UserSession) => void;
  onCancel: () => void;
  onRequiresVerification?: (email: string, fullName: string) => void;
}

export const BrandOnboardingFlow: React.FC<BrandOnboardingFlowProps> = ({
  initialEmail,
  initialFullName,
  onComplete,
  onCancel,
  onRequiresVerification
}) => {
  const { 
    user: currentUser,
    createBrandWorkspace, 
    onboardingDraft, 
    saveOnboardingDraft, 
    clearOnboardingDraft 
  } = useStore();

  const [step, setStep] = useState<1 | 2>(onboardingDraft?.currentStep || 1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Owner Account Credentials (when registering as a new unauthenticated user) ---
  const [ownerFullName, setOwnerFullName] = useState(
    onboardingDraft?.ownerFullName || currentUser?.fullName || initialFullName || ''
  );
  const [ownerEmail, setOwnerEmail] = useState(
    onboardingDraft?.ownerEmail || currentUser?.email || initialEmail || ''
  );
  const [ownerPassword, setOwnerPassword] = useState('');

  // --- Step 1: Identify Brand State ---
  const [brandType, setBrandType] = useState<BrandType>(onboardingDraft?.brandType || 'small_business');
  const [name, setName] = useState(onboardingDraft?.name || '');
  const [primaryIdentityUrl, setPrimaryIdentityUrl] = useState(onboardingDraft?.primaryIdentityUrl || '');
  const [industry, setIndustry] = useState(onboardingDraft?.industry || '');
  const [country, setCountry] = useState(onboardingDraft?.country || 'United States');
  const [description, setDescription] = useState(onboardingDraft?.description || '');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // --- Step 2: References State ---
  const [additionalDomains, setAdditionalDomains] = useState<string[]>(
    onboardingDraft?.additionalDomains || []
  );
  const [newDomainInput, setNewDomainInput] = useState('');

  const [alternativeNames, setAlternativeNames] = useState<string[]>(
    onboardingDraft?.alternativeNames || []
  );
  const [newAliasInput, setNewAliasInput] = useState('');

  const [socialProfiles, setSocialProfiles] = useState<BrandSocialProfile[]>(
    onboardingDraft?.socialProfiles || [
      { id: 'soc-1', platform: 'X', urlOrHandle: '' }
    ]
  );

  const [apps, setApps] = useState<BrandAppListing[]>(
    onboardingDraft?.apps || []
  );

  const [contacts, setContacts] = useState<BrandContactChannels>(
    onboardingDraft?.contacts || {
      businessEmail: initialEmail || '',
      supportEmail: '',
      phone: '',
      whatsApp: '',
      smsSenderId: '',
      supportLink: ''
    }
  );

  const [logoUrl, setLogoUrl] = useState(onboardingDraft?.logoUrl || '');
  const [additionalReferences, setAdditionalReferences] = useState(onboardingDraft?.additionalReferences || '');

  // Collapsible section accordion states
  const [openSections, setOpenSections] = useState({
    domains: true,
    social: true,
    apps: false,
    contacts: false,
    assets: false
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-save draft on changes (never persist password to localStorage draft!)
  const saveCurrentDraft = () => {
    saveOnboardingDraft({
      ownerFullName,
      ownerEmail,
      brandType,
      name,
      primaryIdentityUrl,
      industry,
      country,
      description,
      additionalDomains,
      alternativeNames,
      socialProfiles,
      apps,
      contacts,
      logoUrl,
      additionalReferences,
      currentStep: step
    });
    setDraftSavedToast(true);
    setTimeout(() => setDraftSavedToast(false), 2000);
  };

  // --- Handlers for Step 1 Navigation ---
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    if (!currentUser) {
      if (!ownerFullName.trim() || ownerFullName.trim().length < 2) {
        setStep1Error('Please enter your full name for the Brand Owner account.');
        return;
      }
      if (!ownerEmail.trim() || !isValidEmail(ownerEmail)) {
        setStep1Error('Please enter a valid owner email address.');
        return;
      }
      if (!ownerPassword || ownerPassword.length < 8) {
        setStep1Error('Please create an account password of at least 8 characters.');
        return;
      }
    }

    if (!name.trim()) {
      setStep1Error('Please enter your official brand or public identity name.');
      return;
    }
    if (!primaryIdentityUrl.trim()) {
      setStep1Error('Please enter your primary website or public profile URL (e.g. yoursite.com or instagram.com/brand).');
      return;
    }

    if (!contacts.businessEmail && ownerEmail) {
      setContacts(prev => ({ ...prev, businessEmail: ownerEmail.trim().toLowerCase() }));
    }

    setStep(2);
    saveCurrentDraft();
  };

  // --- Handlers for Step 2 Repeatable Items ---
  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    const clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!additionalDomains.includes(clean)) {
      setAdditionalDomains([...additionalDomains, clean]);
    }
    setNewDomainInput('');
  };

  const handleRemoveDomain = (index: number) => {
    setAdditionalDomains(additionalDomains.filter((_, i) => i !== index));
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAliasInput.trim()) return;
    if (!alternativeNames.includes(newAliasInput.trim())) {
      setAlternativeNames([...alternativeNames, newAliasInput.trim()]);
    }
    setNewAliasInput('');
  };

  const handleRemoveAlias = (index: number) => {
    setAlternativeNames(alternativeNames.filter((_, i) => i !== index));
  };

  const handleAddSocialRow = () => {
    setSocialProfiles([
      ...socialProfiles,
      { id: `soc-${Date.now()}`, platform: 'X', urlOrHandle: '' }
    ]);
  };

  const handleUpdateSocialRow = (id: string, field: 'platform' | 'urlOrHandle', val: string) => {
    setSocialProfiles(socialProfiles.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleRemoveSocialRow = (id: string) => {
    setSocialProfiles(socialProfiles.filter(s => s.id !== id));
  };

  const handleAddAppRow = () => {
    setApps([
      ...apps,
      { id: `app-${Date.now()}`, name: '', playStoreUrl: '', packageId: '' }
    ]);
  };

  const handleUpdateAppRow = (id: string, field: keyof BrandAppListing, val: string) => {
    setApps(apps.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  const handleRemoveAppRow = (id: string) => {
    setApps(apps.filter(a => a.id !== id));
  };

  // --- Final Submit Action ---
  const handleFinalSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    const payload: BrandOnboardingData = {
      ownerFullName: ownerFullName.trim() || undefined,
      ownerEmail: ownerEmail.trim().toLowerCase() || undefined,
      ownerPassword: ownerPassword || undefined,
      brandType,
      name: name.trim(),
      primaryIdentityUrl: primaryIdentityUrl.trim(),
      industry: industry.trim() || undefined,
      country: country.trim() || undefined,
      description: description.trim() || undefined,
      officialWebsite:
        primaryIdentityUrl.includes('.') &&
        !primaryIdentityUrl.includes('instagram.com') &&
        !primaryIdentityUrl.includes('twitter.com') &&
        !primaryIdentityUrl.includes('youtube.com')
          ? primaryIdentityUrl.trim()
          : undefined,
      additionalDomains,
      alternativeNames,
      socialProfiles: socialProfiles.filter(s => s.urlOrHandle.trim().length > 0),
      apps: apps.filter(a => a.name.trim().length > 0),
      contacts: {
        ...contacts,
        businessEmail: contacts.businessEmail || ownerEmail.trim().toLowerCase()
      },
      logoUrl: logoUrl.trim() || undefined,
      additionalReferences: additionalReferences.trim() || undefined,
      currentStep: 2,
      isCompleted: true
    };

    try {
      const apiResult = await submitBrandWorkspaceOnboarding(payload);
      if (!apiResult.success || !apiResult.account) {
        setSubmitError(
          apiResult.error || 'Failed to persist Brand Workspace onboarding. Please verify your connection.'
        );
        setIsSubmitting(false);
        return;
      }

      const { brand, user } = createBrandWorkspace(payload);
      const syncedUser: UserSession = {
        ...user,
        id: apiResult.account.id,
        email: apiResult.account.email,
        fullName: apiResult.account.fullName,
        role: 'brand_owner',
        isEmailVerified: apiResult.account.isEmailVerified,
        authorizedBrands:
          apiResult.account.authorizedBrands.length > 0
            ? apiResult.account.authorizedBrands
            : user.authorizedBrands,
        accessToken: apiResult.account.accessToken
      };

      setShowReviewModal(false);
      setIsSubmitting(false);

      if (
        (apiResult.destination?.type === 'VERIFY_EMAIL' || !apiResult.account.isEmailVerified) &&
        onRequiresVerification
      ) {
        onRequiresVerification(
          apiResult.account.email,
          apiResult.account.fullName || ownerFullName || apiResult.account.email.split('@')[0]
        );
        return;
      }

      onComplete(brand, syncedUser);
    } catch {
      setSubmitError('Unable to reach the onboarding server. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Step Progress Bar */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-mono font-bold text-xs">
              {step}
            </span>
            <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
              {step === 1 ? 'Step 1 of 2 — Identify Your Brand' : 'Step 2 of 2 — Add Official References'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveCurrentDraft}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              title="Save draft progress"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{draftSavedToast ? 'Draft Saved!' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: IDENTIFY YOUR BRAND                              */}
      {/* ======================================================== */}
      {step === 1 && (
        <form onSubmit={handleProceedToStep2} className="space-y-4">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-zinc-900 dark:text-white tracking-tight">
              Tell us about your brand
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Establish your primary digital identity. Creators and small businesses may use a public profile or social URL.
            </p>
          </div>

          {step1Error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{step1Error}</span>
            </div>
          )}

          {/* Owner Account Credentials (shown when user is not yet signed in) */}
          {!currentUser && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Workspace Owner Account Credentials
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block">
                    Owner Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block">
                    Owner Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="security@yourbrand.com"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block">
                  Account Password (min. 8 characters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Brand Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Brand Category / Type <span className="text-red-500">*</span>
            </label>
            <select
              value={brandType}
              onChange={(e) => setBrandType(e.target.value as BrandType)}
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-sans"
            >
              <option value="creator">Creator / Social Brand</option>
              <option value="small_business">Small Business / Agency</option>
              <option value="registered_company">Registered Enterprise / Company</option>
              <option value="financial">Financial / Payment Rails Brand</option>
              <option value="digital_product">App / Digital Product / SaaS</option>
              <option value="other">Other Public Identity</option>
            </select>
          </div>

          {/* Brand Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Official Brand or Public Identity Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Financial, Nova Studio, @techlead"
                className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          {/* Primary Identity URL (NOT restricted to domains only!) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Primary Website, Social Profile, or Public URL <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">Website or Social URL</span>
            </div>
            <div className="relative">
              <Globe className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={primaryIdentityUrl}
                onChange={(e) => setPrimaryIdentityUrl(e.target.value)}
                placeholder="e.g. acmefinancial.com or instagram.com/acmebrand"
                className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Websites are not required. Creators can provide their primary YouTube, X, or Instagram profile.
            </p>
          </div>

          {/* Optional Industry & Country Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Industry / Vertical (Optional)
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Fintech, E-Commerce, Creator"
                className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Country / Region (Optional)
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, Global"
                className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Optional Brand Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Short Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of your public identity or customer mission..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Action Row */}
          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="py-3 px-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Continue to References</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: ADD OFFICIAL BRAND REFERENCES                    */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-zinc-900 dark:text-white tracking-tight">
                Add Official Brand References
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Provide reference assets to power proactive lookalike and impersonation defense. All sections are optional.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Step 1</span>
            </button>
          </div>

          {/* Collapsible Section A: Websites and Domains */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('domains')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  A. Websites, Domains & Brand Aliases
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ({additionalDomains.length + alternativeNames.length} items)
                </span>
              </div>
              {openSections.domains ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.domains && (
              <div className="p-4 pt-1 space-y-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                {/* Additional Domains */}
                <div className="space-y-1.5">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 block">
                    Additional Official Domains & Subdomains
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {additionalDomains.map((dom, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 font-bold">
                        <span>{dom}</span>
                        <button type="button" onClick={() => handleRemoveDomain(idx)} className="text-zinc-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleAddDomain} className="flex gap-2">
                    <input
                      type="text"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      placeholder="Add secondary domain (e.g. pay.acme.com)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button type="submit" className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 shrink-0">
                      Add Domain
                    </button>
                  </form>
                </div>

                {/* Alternative Names & Spelling Variations */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 block">
                    Alternative Names & Spelling Variations (Used for Heuristics)
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {alternativeNames.map((alias, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 font-bold">
                        <span>{alias}</span>
                        <button type="button" onClick={() => handleRemoveAlias(idx)} className="text-zinc-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleAddAlias} className="flex gap-2">
                    <input
                      type="text"
                      value={newAliasInput}
                      onChange={(e) => setNewAliasInput(e.target.value)}
                      placeholder="Add brand alias (e.g. Acme Bank, Acme Pay)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button type="submit" className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 shrink-0">
                      Add Alias
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Section B: Social Media Profiles */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('social')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  B. Official Social Media Profiles
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ({socialProfiles.filter(s => s.urlOrHandle.trim()).length} configured)
                </span>
              </div>
              {openSections.social ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.social && (
              <div className="p-4 pt-1 space-y-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                {socialProfiles.map((soc) => (
                  <div key={soc.id} className="flex items-center gap-2">
                    <select
                      value={soc.platform}
                      onChange={(e) => handleUpdateSocialRow(soc.id, 'platform', e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-bold text-xs"
                    >
                      <option value="X">X / Twitter</option>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Telegram">Telegram</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="text"
                      value={soc.urlOrHandle}
                      onChange={(e) => handleUpdateSocialRow(soc.id, 'urlOrHandle', e.target.value)}
                      placeholder="Handle or Profile URL (e.g. @acmeofficial or https://...)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveSocialRow(soc.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Remove profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSocialRow}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add another social profile</span>
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Section C: Apps & Digital Products */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('apps')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  C. Mobile Apps & Digital Products
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ({apps.length} listings)
                </span>
              </div>
              {openSections.apps ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.apps && (
              <div className="p-4 pt-1 space-y-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                {apps.map((app) => (
                  <div key={app.id} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={app.name}
                        onChange={(e) => handleUpdateAppRow(app.id, 'name', e.target.value)}
                        placeholder="App Name (e.g. Acme Mobile Banking)"
                        className="font-bold text-xs bg-transparent border-none focus:outline-none text-zinc-900 dark:text-white flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAppRow(app.id)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <input
                        type="text"
                        value={app.packageId || ''}
                        onChange={(e) => handleUpdateAppRow(app.id, 'packageId', e.target.value)}
                        placeholder="Android Package ID (e.g. com.acme.app)"
                        className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
                      />
                      <input
                        type="text"
                        value={app.playStoreUrl || ''}
                        onChange={(e) => handleUpdateAppRow(app.id, 'playStoreUrl', e.target.value)}
                        placeholder="Play Store / App Store URL"
                        className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddAppRow}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Mobile App Listing</span>
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Section D: Official Contact Channels */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('contacts')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  D. Official Contact Channels
                </span>
              </div>
              {openSections.contacts ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.contacts && (
              <div className="p-4 pt-1 space-y-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={contacts.businessEmail || ''}
                      onChange={(e) => setContacts({ ...contacts, businessEmail: e.target.value })}
                      placeholder="legal@company.com"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={contacts.supportEmail || ''}
                      onChange={(e) => setContacts({ ...contacts, supportEmail: e.target.value })}
                      placeholder="support@company.com"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      WhatsApp Business / Support
                    </label>
                    <input
                      type="text"
                      value={contacts.whatsApp || ''}
                      onChange={(e) => setContacts({ ...contacts, whatsApp: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Official SMS Sender ID
                    </label>
                    <input
                      type="text"
                      value={contacts.smsSenderId || ''}
                      onChange={(e) => setContacts({ ...contacts, smsSenderId: e.target.value })}
                      placeholder="e.g. ACMESMS"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="py-3 px-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Review & Launch Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FINAL REVIEW MODAL BEFORE SUBMISSION                     */}
      {/* ======================================================== */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white">
                  Review Brand Workspace Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Brand Name:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Primary Identity:</span>
                  <span className="text-brand-500 font-bold">{primaryIdentityUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{brandType}</span>
                </div>
                {additionalDomains.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Domains:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">+{additionalDomains.length} extra</span>
                  </div>
                )}
                {alternativeNames.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Aliases:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{alternativeNames.join(', ')}</span>
                  </div>
                )}
                {socialProfiles.filter(s => s.urlOrHandle).length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Socials:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{socialProfiles.filter(s => s.urlOrHandle).length} profiles</span>
                  </div>
                )}
              </div>

              {/* Critical Legal / Verification Disclosure (Section 6) */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Important Verification Notice</span>
                </div>
                <p className="leading-relaxed">
                  Submitting reference assets establishes your baseline. Submitted assets are tagged as <strong>Pending Verification</strong> until domain ownership is cryptographically proven via DNS TXT challenges in the workspace.
                </p>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] text-red-600 dark:text-red-400 font-mono flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
              >
                Make Edits
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="py-2.5 px-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Workspace...' : 'Confirm & Launch Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
