import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import { isValidEmail, registerPersonalAccount } from '../../lib/auth';

interface PersonalRegisterFormProps {
  onSuccess: (email: string, fullName: string) => void;
  onBack: () => void;
  onSwitchToSignIn: () => void;
}

export const PersonalRegisterForm: React.FC<PersonalRegisterFormProps> = ({
  onSuccess,
  onBack,
  onSwitchToSignIn
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength calculation
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passScore = calculatePasswordStrength(password);
  const passLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const passColor = passScore <= 1 ? 'bg-red-500' : passScore === 2 ? 'bg-amber-500' : passScore === 3 ? 'bg-brand-500' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please create a password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must accept the Terms of Service & Privacy Policy to register.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerPersonalAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed. Please check your credentials.');
        return;
      }

      onSuccess(email.trim().toLowerCase(), fullName.trim());
    } catch {
      setErrorMessage('An unexpected error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Account Options</span>
        </button>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 font-bold">
          Personal Account
        </span>
      </div>

      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-zinc-900 dark:text-white tracking-tight">
          Create Personal Account
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Scan suspicious links and defend yourself against digital scams.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Full Name */}
        <div>
          <div className="relative">
            <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-sans"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-full pl-11 pr-11 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-sans"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password && (
            <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1 flex-1 max-w-[140px]">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      passScore >= step ? passColor : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-zinc-500 dark:text-zinc-400">
                Strength: <strong className="text-zinc-700 dark:text-zinc-200">{passLabels[passScore]}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-full pl-11 pr-11 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-sans"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label="Toggle confirm password visibility"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div className="flex items-center gap-2 pt-1 px-1">
          <input
            id="personal-terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-zinc-300 dark:border-zinc-700"
          />
          <label htmlFor="personal-terms" className="text-[11px] text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
            I agree to the <span className="text-brand-500 hover:underline">Terms of Service</span> and <span className="text-brand-500 hover:underline">Privacy Policy</span>.
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-brand-500 via-orange-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Continue to Verification</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

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
