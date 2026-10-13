import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Building2, 
  Sun, 
  Moon, 
  CheckCircle2,
  Sparkles,
  UserPlus,
  LogIn,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { authenticateCredentials, isValidEmail } from '../lib/auth';
import { AccountTypeSelector } from '../components/auth/AccountTypeSelector';
import { PersonalRegisterForm } from '../components/auth/PersonalRegisterForm';
import { EmailVerificationScreen } from '../components/auth/EmailVerificationScreen';
import { BrandOnboardingFlow } from '../components/auth/BrandOnboardingFlow';
import { WorkspaceSelectionModal } from '../components/auth/WorkspaceSelectionModal';
import { RegisteredBrand, UserSession } from '../types';

type AuthView = 
  | 'signin' 
  | 'select_account_type' 
  | 'register_personal' 
  | 'onboarding_brand' 
  | 'verify_email';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    login, 
    verifyEmail, 
    switchWorkspace, 
    theme, 
    toggleTheme, 
    quickScanTarget, 
    setQuickScanTarget 
  } = useStore();

  // Active view state
  const [view, setView] = useState<AuthView>('signin');

  // Sign In Form States
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Email verification target state
  const [verifyEmailTarget, setVerifyEmailTarget] = useState<string>('');
  const [verifyUserName, setVerifyUserName] = useState<string>('');

  // Multi-workspace modal state
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [pendingUserSession, setPendingUserSession] = useState<UserSession | null>(null);

  // Common UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pendingScanTarget = 
    (location.state as any)?.pendingScanTarget || 
    quickScanTarget || 
    (typeof window !== 'undefined' ? localStorage.getItem('riskshield_pending_scan') : null);

  // Destination route resolver
  const resolveDestination = (userRole?: string) => {
    const rawFrom = (location.state as any)?.from;
    const path = typeof rawFrom === 'string' ? rawFrom : rawFrom?.pathname;
    if (path && path !== '/login' && path !== '/') {
      return path;
    }
    return userRole === 'brand_owner' ? '/brand-dashboard' : '/dashboard';
  };

  // Redirect if already logged in and verified
  useEffect(() => {
    if (user) {
      if (!user.isEmailVerified && !user.isDemo) {
        setVerifyEmailTarget(user.email);
        setVerifyUserName(user.fullName || user.email.split('@')[0]);
        setView('verify_email');
        return;
      }
      if (pendingScanTarget) {
        setQuickScanTarget(pendingScanTarget);
      }
      const dest = resolveDestination(user.role);
      navigate(dest, { 
        replace: true, 
        state: { pendingScanTarget } 
      });
    }
  }, [user, navigate, pendingScanTarget, setQuickScanTarget]);

  // Read URL query parameter (?mode=register or ?verify=true) on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    const verify = searchParams.get('verify');
    if (mode === 'register') {
      setView('select_account_type');
    } else if (verify === 'true') {
      setView('verify_email');
    }
  }, [location.search]);

  // Switch views cleanly with error clearing
  const transitionTo = (newView: AuthView) => {
    setView(newView);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // =========================================================
  // Sign In Submission (Role-Agnostic Authentication)
  // =========================================================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailTrimmed = signInEmail.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setErrorMessage('Please enter a valid email address (e.g. name@company.com).');
      return;
    }
    if (!signInPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateCredentials({ 
        email: emailTrimmed, 
        password: signInPassword 
      });

      // Handle unverified email account requirement
      if (result.requiresEmailVerification || (result.user && result.user.isEmailVerified === false)) {
        const unverifiedEmail = result.user?.email || emailTrimmed;
        setVerifyEmailTarget(unverifiedEmail);
        setVerifyUserName(result.user?.fullName || unverifiedEmail.split('@')[0]);
        transitionTo('verify_email');
        setErrorMessage('Please verify your email address to access your dashboard.');
        return;
      }

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      // Check for multi-workspace access (Scenario C)
      const authorizedBrands = result.user.authorizedBrands || [];
      if (authorizedBrands.length > 1 || (result.user.role === 'user' && authorizedBrands.length >= 1)) {
        // Multi-workspace account: prompt workspace selection modal
        setPendingUserSession(result.user);
        setShowWorkspaceModal(true);
        return;
      }

      // Single workspace sign in
      login(
        result.user.email,
        result.user.role,
        result.user.brandName,
        result.user.isDemo || false,
        result.user.fullName,
        result.user.isEmailVerified ?? true,
        result.user.authorizedBrands
      );

      if (pendingScanTarget) {
        setQuickScanTarget(pendingScanTarget);
      }

      const targetRoute = resolveDestination(result.user.role);
      navigate(targetRoute, { 
        replace: true, 
        state: { pendingScanTarget } 
      });
    } catch {
      setErrorMessage('An unexpected error occurred during sign-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-Workspace Modal Choice Handler
  const handleWorkspaceChoice = (type: 'personal' | 'brand', brandId?: string) => {
    if (!pendingUserSession) return;

    if (type === 'personal') {
      login(
        pendingUserSession.email,
        'user',
        undefined,
        pendingUserSession.isDemo,
        pendingUserSession.fullName,
        true,
        pendingUserSession.authorizedBrands
      );
      setShowWorkspaceModal(false);
      navigate('/dashboard', { replace: true, state: { pendingScanTarget } });
    } else {
      const selectedBrand = pendingUserSession.authorizedBrands?.find(b => b.brandId === brandId);
      login(
        pendingUserSession.email,
        'brand_owner',
        selectedBrand?.brandName || pendingUserSession.brandName,
        pendingUserSession.isDemo,
        pendingUserSession.fullName,
        true,
        pendingUserSession.authorizedBrands
      );
      if (brandId) {
        switchWorkspace(brandId);
      }
      setShowWorkspaceModal(false);
      navigate('/brand-dashboard', { replace: true });
    }
  };

  // Personal Account Registration Success
  const handlePersonalRegisterSuccess = (email: string, fullName: string) => {
    setVerifyEmailTarget(email);
    setVerifyUserName(fullName);
    transitionTo('verify_email');
  };

  // Email Verified Handler
  const handleEmailVerified = (email: string) => {
    verifyEmail(email);

    // If active user session in store or destination is brand_owner, route to brand-dashboard
    const activeRole = user?.role || (pendingUserSession?.role) || 'user';
    login(
      email,
      activeRole,
      user?.brandName || pendingUserSession?.brandName || undefined,
      false,
      verifyUserName || email.split('@')[0],
      true,
      user?.authorizedBrands || pendingUserSession?.authorizedBrands || []
    );

    if (pendingScanTarget) {
      setQuickScanTarget(pendingScanTarget);
    }
    const targetRoute = resolveDestination(activeRole);
    navigate(targetRoute, { 
      replace: true, 
      state: { pendingScanTarget } 
    });
  };

  // Brand Onboarding Complete Handler
  const handleBrandOnboardingComplete = (_brand: RegisteredBrand, _user: UserSession) => {
    navigate('/brand-dashboard', { replace: true });
  };

  // Showcase Curtain Direction
  const isFormOnRight = view === 'signin';

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#09090b] text-[#18181b] dark:text-[#f4f4f5] flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden selection:bg-brand-500 selection:text-white">
      {/* Ambient background glow */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-[130px] opacity-70" />
      </div>

      {/* Top Navbar Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between z-10">
        <Link 
          to="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-all">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#09090b] dark:text-white flex items-center gap-1 leading-tight">
              RiskShield <span className="text-brand-500">AI</span>
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-mono font-semibold">
              Digital Risk Protection
            </span>
          </div>
        </Link>

        {/* Right Header Nav: Theme Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 text-foreground transition-all duration-200 active:scale-95 shadow-sm backdrop-blur-md"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-brand-500" />
            )}
            <span className="text-xs font-mono font-medium hidden sm:inline text-gray-600 dark:text-gray-300">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Dual-Stage Interactive Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 z-10">
        {/* Full-width container for Brand Onboarding Flow */}
        {view === 'onboarding_brand' ? (
          <div className="w-full max-w-5xl bg-white dark:bg-[#121216] border border-gray-200/90 dark:border-zinc-800/90 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden relative p-6 sm:p-10 lg:p-12 animate-in fade-in duration-300">
            <BrandOnboardingFlow
              initialEmail={signInEmail}
              initialFullName={verifyUserName}
              onComplete={handleBrandOnboardingComplete}
              onCancel={() => transitionTo('select_account_type')}
              onRequiresVerification={(email, fullName) => {
                setVerifyEmailTarget(email);
                setVerifyUserName(fullName);
                transitionTo('verify_email');
              }}
            />
          </div>
        ) : (
          <div className="w-full max-w-5xl bg-white dark:bg-[#121216] border border-gray-200/90 dark:border-zinc-800/90 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden relative min-h-[640px] md:min-h-[660px]">
            
            {/* ========================================================= */}
            {/* DESKTOP SLIDING SHOWCASE CURTAIN (Transforms smoothly)   */}
            {/* ========================================================= */}
            <motion.div
              initial={false}
              animate={{ 
                x: isFormOnRight ? '0%' : '100%' 
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 240, 
                damping: 28, 
                mass: 0.9 
              }}
              className="hidden md:flex absolute top-0 bottom-0 left-0 w-1/2 z-20 bg-[#09090c] text-white p-8 lg:p-12 flex-col justify-between overflow-hidden shadow-2xl rounded-[32px] sm:rounded-[40px]"
            >
              {/* Subtle background radar circles and ambient lighting */}
              <div 
                aria-hidden="true" 
                className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden"
              >
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-orange-500/20" />
                <div className="absolute -top-12 -left-12 w-72 h-72 rounded-full border border-orange-500/15" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-brand-500/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
              </div>

              {/* Inner dynamic content with cross-fade animation */}
              <AnimatePresence mode="wait">
                {isFormOnRight ? (
                  /* --- Showcase: SIGN IN STATE --- */
                  <motion.div
                    key="showcase-signin"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="relative z-10 flex flex-col justify-between h-full"
                  >
                    <div>
                      <p className="text-xs font-mono text-zinc-400 tracking-wide max-w-sm">
                        Global threat intelligence made simple — online threat detection for you.
                      </p>
                      <h2 className="font-display font-extrabold text-3xl lg:text-4xl tracking-tight text-white mt-5 leading-[1.15]">
                        Defend your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-brand-400">
                          digital presence
                        </span>
                      </h2>
                    </div>

                    {/* Smartphone Security Mockup */}
                    <div className="my-auto py-4 flex items-center justify-center relative">
                      <div className="absolute w-56 h-56 rounded-full bg-brand-500/20 blur-2xl -z-10" />

                      <div className="w-[210px] lg:w-[225px] bg-[#141418] rounded-[36px] p-2.5 shadow-2xl border border-zinc-700/60 ring-1 ring-white/10 relative transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="w-16 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-zinc-800 ml-auto mr-1" />
                        </div>

                        <div className="bg-[#0b0b0e] rounded-[26px] p-3 text-white border border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                            <span>9:41</span>
                            <div className="flex items-center gap-1 text-[8px]">
                              <span>5G</span>
                              <div className="w-2 h-1.5 border border-zinc-400 rounded-xs" />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <div className="w-4 h-4 rounded-md bg-brand-500 flex items-center justify-center text-white">
                              <Shield className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[10px] font-bold tracking-tight">RiskShield AI</span>
                          </div>

                          <div className="bg-zinc-900/90 rounded-xl p-2 border border-zinc-800">
                            <div className="flex items-center justify-between text-[9px] text-zinc-400 mb-1">
                              <span>Threats Blocked</span>
                              <span className="text-emerald-400 font-bold font-mono">99.8%</span>
                            </div>
                            <div className="flex items-end gap-1 h-9 pt-1 px-1 justify-between">
                              {[40, 65, 30, 85, 95, 60, 45].map((h, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className={`w-3 rounded-t-sm transition-all ${
                                    i === 4
                                      ? 'bg-gradient-to-t from-brand-600 to-brand-400 shadow-sm shadow-orange-500/50'
                                      : 'bg-zinc-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="bg-zinc-900/90 rounded-xl p-2 border border-zinc-800 flex items-center gap-2">
                            <div className="relative w-8 h-8 rounded-full border border-brand-500/40 flex items-center justify-center shrink-0">
                              <div className="w-4 h-4 rounded-full border border-brand-500/60" />
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping absolute" />
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            </div>
                            <div className="text-[9px] leading-tight">
                              <span className="font-semibold text-zinc-200 block">Live Radar Active</span>
                              <span className="text-zinc-500 text-[8px]">0 Active Spoofs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-2">
                      <span>© {new Date().getFullYear()} RiskShield AI</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Zero-Knowledge
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  /* --- Showcase: REGISTRATION / VERIFY STATE --- */
                  <motion.div
                    key="showcase-register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="relative z-10 flex flex-col justify-between h-full"
                  >
                    <div>
                      <p className="text-xs font-mono text-zinc-400 tracking-wide max-w-sm">
                        AI-first threat triage and enterprise brand protection platform.
                      </p>
                      <h2 className="font-display font-extrabold text-3xl lg:text-4xl tracking-tight text-white mt-5 leading-[1.15]">
                        Continuous shield <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-brand-400">
                          for your assets
                        </span>
                      </h2>
                    </div>

                    <div className="my-auto py-4 flex items-center justify-center relative">
                      <div className="absolute w-56 h-56 rounded-full bg-brand-500/20 blur-2xl -z-10" />

                      <div className="w-[210px] lg:w-[225px] bg-[#141418] rounded-[36px] p-2.5 shadow-2xl border border-zinc-700/60 ring-1 ring-white/10 relative transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="w-16 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-zinc-800 ml-auto mr-1" />
                        </div>

                        <div className="bg-[#0b0b0e] rounded-[26px] p-3 text-white border border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                            <span>9:41</span>
                            <span className="text-emerald-400 font-semibold">SECURE</span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center text-white">
                              <Radio className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[10px] font-bold tracking-tight">Threat Radar</span>
                          </div>

                          <div className="bg-zinc-900/90 rounded-xl p-3 border border-zinc-800 flex flex-col items-center justify-center text-center">
                            <div className="relative w-16 h-16 rounded-full border border-brand-500/30 flex items-center justify-center my-1">
                              <div className="w-10 h-10 rounded-full border border-brand-500/50" />
                              <div className="w-4 h-4 rounded-full bg-brand-500/20" />
                              <div className="absolute inset-0 rounded-full border-t-2 border-brand-400 animate-spin" />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-300 font-bold mt-1">24/7 Threat Watch</span>
                            <span className="text-[8px] text-zinc-500">Autonomous Domain Defense</span>
                          </div>

                          <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-2 flex items-center justify-between text-[9px]">
                            <span className="text-zinc-300">Security Health</span>
                            <span className="font-mono font-bold text-brand-400">98 / 100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-2">
                      <span>SOC2 Type II • ISO 27001</span>
                      <span className="text-brand-400">Proactive Defense</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ========================================================= */}
            {/* THE DUAL FORMS GRID (Split Layout)                        */}
            {/* ========================================================= */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 min-h-[640px] md:min-h-[660px]">
              
              {/* ------------------------------------------------------- */}
              {/* LEFT STAGE: REGISTRATION & VERIFICATION VIEWS          */}
              {/* ------------------------------------------------------- */}
              <div 
                className={`p-6 sm:p-10 lg:p-12 flex flex-col justify-between transition-opacity duration-300 ${
                  !isFormOnRight ? 'opacity-100 z-10 pointer-events-auto' : 'md:pointer-events-none md:opacity-0'
                } ${isFormOnRight ? 'hidden md:flex' : 'flex'}`}
              >
                {/* View A: Account Type Selector */}
                {view === 'select_account_type' && (
                  <AccountTypeSelector
                    onSelect={(type) => {
                      if (type === 'personal') transitionTo('register_personal');
                      else transitionTo('onboarding_brand');
                    }}
                    onSwitchToSignIn={() => transitionTo('signin')}
                  />
                )}

                {/* View B: Personal Registration Form */}
                {view === 'register_personal' && (
                  <PersonalRegisterForm
                    onSuccess={handlePersonalRegisterSuccess}
                    onBack={() => transitionTo('select_account_type')}
                    onSwitchToSignIn={() => transitionTo('signin')}
                  />
                )}

                {/* View C: Email Verification Screen */}
                {view === 'verify_email' && (
                  <EmailVerificationScreen
                    email={verifyEmailTarget || 'you@example.com'}
                    fullName={verifyUserName}
                    onVerified={handleEmailVerified}
                    onBackToSignIn={() => transitionTo('signin')}
                    onChangeEmailRequested={(newEmail) => setVerifyEmailTarget(newEmail)}
                  />
                )}
              </div>

              {/* ------------------------------------------------------- */}
              {/* RIGHT STAGE: SIGN IN FORM (NO Role Dropdown Required)   */}
              {/* ------------------------------------------------------- */}
              <div 
                className={`p-6 sm:p-10 lg:p-12 flex flex-col justify-between transition-opacity duration-300 ${
                  isFormOnRight ? 'opacity-100 z-10 pointer-events-auto' : 'md:pointer-events-none md:opacity-0'
                } ${!isFormOnRight ? 'hidden md:flex' : 'flex'}`}
              >
                {/* Form Header */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/25">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-display font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
                        RiskShield AI
                      </span>
                    </div>

                    {/* Top-Right Toggle to Sign Up */}
                    <button
                      type="button"
                      onClick={() => transitionTo('select_account_type')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors py-1.5 px-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Sign Up</span>
                    </button>
                  </div>

                  {/* Heading & Subtitle per Phase 1 & Upgrade Specifications */}
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-white tracking-tight">
                    Welcome back
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Sign in to protect what matters.
                  </p>
                </div>

                {/* Queued Pending Target notice */}
                {pendingScanTarget && (
                  <div className="my-2 p-2.5 rounded-2xl bg-brand-500/10 border border-brand-500/25 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 font-mono">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                    <span className="truncate">Queued target: <strong className="text-zinc-900 dark:text-white">{pendingScanTarget}</strong></span>
                  </div>
                )}

                {/* Feedback Error Alert */}
                {errorMessage && (
                  <div className="my-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Email Sign In Form Header */}
                <div className="my-2">
                  <p className="text-xs text-muted-foreground font-sans">
                    Sign in with your email address and password to access your security workspace.
                  </p>
                </div>

                {/* Sign In Form Inputs */}
                <form onSubmit={handleSignIn} className="space-y-3.5" noValidate>
                  {/* Email */}
                  <div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-email"
                        type="email"
                        value={signInEmail}
                        onChange={(e) => {
                          setSignInEmail(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="you@example.com"
                        className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-sans"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showSignInPassword ? 'text' : 'password'}
                        value={signInPassword}
                        onChange={(e) => {
                          setSignInPassword(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="Enter your password"
                        className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-full pl-11 pr-11 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-sans"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        aria-label="Toggle password visibility"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Row: Remember me & Forgot Password */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-500 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-zinc-300 dark:border-zinc-700"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setErrorMessage('Password reset link is sent to registered email address.')}
                      className="text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Gradient Pill Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-brand-500 via-orange-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Bottom Switcher */}
                <div className="pt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => transitionTo('select_account_type')}
                    className="font-bold text-brand-500 hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Workspace Selection Modal for Multi-Workspace Accounts */}
      {showWorkspaceModal && pendingUserSession && (
        <WorkspaceSelectionModal
          isOpen={showWorkspaceModal}
          onClose={() => setShowWorkspaceModal(false)}
          userEmail={pendingUserSession.email}
          userName={pendingUserSession.fullName}
          authorizedBrands={pendingUserSession.authorizedBrands || []}
          onSelectWorkspace={handleWorkspaceChoice}
          onCreateNewBrand={() => {
            setShowWorkspaceModal(false);
            transitionTo('onboarding_brand');
          }}
        />
      )}

      {/* Page Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-500 z-10">
        <div>
          <span>© {new Date().getFullYear()} RiskShield AI Platform. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-brand-500 transition-colors">
            Home
          </Link>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            256-Bit SSL Secured
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
