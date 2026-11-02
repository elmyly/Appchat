import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lock,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useAuth, ForgotPasswordResult } from '../context/AuthContext';
import { AppLogo } from './AppLogo';
import { signInWithGoogle } from '../services/googleAuth';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot';
  onSuccess: () => void;
  onBack: () => void;
  onOpenResetWithToken?: (token: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onBack,
  onOpenResetWithToken,
}) => {
  const {
    login,
    loginWithGoogle,
    register,
    requestRegistrationOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    forgotPassword,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify-otp'>(initialMode);

  // Form states (Simple & Streamlined: Email, Username, Password)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gmail / Google Sign-In states
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [customGmail, setCustomGmail] = useState('');
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // OTP Verification states
  const [otp, setOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Forgot password states
  const [forgotQuery, setForgotQuery] = useState('');
  const [forgotResult, setForgotResult] = useState<ForgotPasswordResult | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'verify-otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpTimer]);

  // Standard Login & Register Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const ok = await login(username, password);
        if (ok) onSuccess();
      } else if (mode === 'register') {
        const result = await requestRegistrationOtp({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          displayName: username.trim(),
          password,
        });

        if (result.success) {
          setEmailSent(!!result.emailSent);
          setOtpTimer(60);
          setMode('verify-otp');
        }
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Fast-Track Registration (creates account instantly)
  const handleDirectRegister = async () => {
    if (!email.trim() || !username.trim() || !password) {
      return;
    }
    clearError();
    setIsSubmitting(true);
    try {
      const ok = await register({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        displayName: username.trim(),
        password,
      });
      if (ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Direct register failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      const verifySuccess = await verifyRegistrationOtp(email.trim(), otp.trim());
      if (verifySuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP Handler
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    clearError();
    setResendStatus('Sending new code...');

    try {
      const res = await resendRegistrationOtp(email);
      if (res.success) {
        setOtpTimer(60);
        setResendStatus('New code sent to your email!');
        setTimeout(() => setResendStatus(null), 4000);
      }
    } catch (err: any) {
      setResendStatus(null);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    setForgotResult(null);

    try {
      const result = await forgotPassword(forgotQuery.trim());
      setForgotResult(result);
    } catch (err: any) {
      console.error('Forgot password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real Google OAuth Popup Trigger (with project 'elmyly' consent screen)
  const handleTriggerGoogleOAuth = async () => {
    clearError();
    setGmailError(null);
    setIsGmailLoading(true);

    try {
      const profile = await signInWithGoogle();
      if (profile.email) {
        const ok = await loginWithGoogle(profile.email, profile.displayName, profile.avatar);
        if (ok) {
          setShowGmailModal(false);
          onSuccess();
          return;
        }
      }
    } catch (popupErr: any) {
      console.warn('Google OAuth popup notice:', popupErr);
      if (popupErr.code === 'auth/popup-closed-by-user') {
        setIsGmailLoading(false);
        return;
      }
      if (popupErr.code === 'auth/popup-blocked') {
        setGmailError('Popup was blocked by your browser. You can select your account below or allow popups:');
        setShowGmailModal(true);
      } else {
        setGmailError(popupErr.message || 'Unable to open Google consent screen.');
        setShowGmailModal(true);
      }
    } finally {
      setIsGmailLoading(false);
    }
  };

  // Gmail Single Sign-On Execution
  const handleGmailLogin = async (gmailAddress: string) => {
    setGmailError(null);
    setIsGmailLoading(true);
    try {
      const success = await loginWithGoogle(gmailAddress);
      if (success) {
        setShowGmailModal(false);
        onSuccess();
      } else {
        setGmailError('Failed to sign in with this Gmail address. Please try again.');
      }
    } catch (err: any) {
      setGmailError(err.message || 'Gmail login encountered an issue.');
    } finally {
      setIsGmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-500/20 selection:text-[#5036FF]">
      {/* Top Header Bar with Back Button & Branding */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center gap-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>

          <AppLogo size={34} showText textClassName="text-lg" />

          {/* Quick Mode Toggle on Top */}
          <div className="flex items-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('register');
                }}
                className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold text-[#5036FF] hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
              >
                Create Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('login');
                }}
                className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold text-[#5036FF] hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Body */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 relative">
          {/* Brand Icon & Heading */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <img
                src="/assets/aistudio/Interwoven_Purple_Blue_Ribbon_Logo_baa92702.png"
                alt="Aura"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Quick Account Creation'}
              {mode === 'verify-otp' && 'Verify Your Email'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login' && 'Sign in to access your feed, visual boards, and chats.'}
              {mode === 'register' && 'Get started in seconds. No lengthy profile forms.'}
              {mode === 'verify-otp' && `We sent a 6-digit confirmation code to ${email}.`}
              {mode === 'forgot' && 'Enter your username or email to recover your credentials.'}
            </p>
          </div>

          {/* Mode Switcher Tabs (Sign In vs Create Account) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('login');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('register');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Prominent Login via Gmail / Google Button */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mb-5">
              <button
                type="button"
                disabled={isGmailLoading}
                onClick={handleTriggerGoogleOAuth}
                className="w-full min-h-[48px] py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99] disabled:opacity-60"
              >
                {isGmailLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#5036FF]" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.41 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  or continue with credentials
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Authentication Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Resend Status Banner */}
          {resendStatus && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* --- VIEW 1: FORGOT PASSWORD FLOW --- */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {forgotResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {forgotResult.message}
                    </p>
                    {forgotResult.resetLink && (
                      <div className="pt-2 border-t border-emerald-200/80 space-y-2">
                        <p className="text-[11px] text-slate-600">
                          Click below to reset your password immediately:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const tokenMatch = forgotResult.resetLink?.match(/resetToken=([^&]+)/);
                            const token = tokenMatch ? tokenMatch[1] : '';
                            if (onOpenResetWithToken && token) {
                              onOpenResetWithToken(token);
                            }
                          }}
                          className="w-full py-2.5 px-3 bg-[#5036FF] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#432bdb] transition-colors cursor-pointer"
                        >
                          Proceed to Reset Password
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setForgotResult(null);
                      setMode('login');
                    }}
                    className="w-full py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Username or Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={forgotQuery}
                        onChange={(e) => setForgotQuery(e.target.value)}
                        placeholder="elmylypro@gmail.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !forgotQuery.trim()}
                    className="w-full min-h-[48px] py-3 bg-[#5036FF] hover:bg-[#432bdb] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Finding Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Instructions</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('login');
                    }}
                    className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- VIEW 2: OTP VERIFICATION FLOW --- */}
          {mode === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length < 6}
                className="w-full min-h-[48px] py-3 bg-[#5036FF] hover:bg-[#432bdb] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Complete Sign Up</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0}
                  className="text-slate-500 hover:text-[#5036FF] disabled:text-slate-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Edit Registration
                </button>
              </div>
            </form>
          )}

          {/* --- VIEW 3: LOGIN & SIMPLE 3-FIELD REGISTER FORM --- */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informative reassurance banner for simple account creation */}
              {mode === 'register' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
                  <Sparkles className="w-4 h-4 text-[#5036FF] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold block text-indigo-950">
                      Zero-Friction Sign Up
                    </strong>
                    A modern default avatar is assigned automatically. You can upload a custom
                    profile photo and bio anytime later in Profile Settings.
                  </div>
                </div>
              )}

              {/* Email Address (Shown in Register Mode) */}
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="elmylypro@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {mode === 'login' ? 'Username or Email' : 'Choose a Username *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'login' ? 'username or email address' : 'e.g. alex_rivera'}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setMode('forgot');
                      }}
                      className="text-[11px] text-[#5036FF] hover:underline cursor-pointer font-bold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3 bg-[#5036FF] hover:bg-[#432bdb] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer mt-3 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {mode === 'login' ? 'Signing In...' : 'Creating Your Account...'}
                    </span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Create Account & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Direct Instant Sign Up option if user has filled fields */}
              {mode === 'register' && (
                <button
                  type="button"
                  onClick={handleDirectRegister}
                  disabled={isSubmitting || !email.trim() || !username.trim() || !password}
                  className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-[#5036FF] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instant 1-Click Fast Track</span>
                </button>
              )}
            </form>
          )}

          {/* Security & Verification Assurance */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Authenticated Creator Network · Zero Spam Guarantee</span>
          </div>
        </div>
      </main>

      {/* --- Google / Gmail Account Chooser Modal --- */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden p-6 relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowGmailModal(false);
                setGmailError(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Header */}
            <div className="text-center mb-5">
              <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-2.5">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.41 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an account to continue to Aura
              </p>
            </div>

            {gmailError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {gmailError}
              </div>
            )}

            {/* Account List & OAuth Trigger */}
            <div className="space-y-2.5 mb-4">
              {/* Authentic Google Consent Popup Button */}
              <button
                type="button"
                disabled={isGmailLoading}
                onClick={handleTriggerGoogleOAuth}
                className="w-full py-2.5 px-4 bg-[#5036FF] hover:bg-[#432bd9] text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGmailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Launch Google Consent Screen</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100" />
                <span className="flex-shrink mx-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  or quick select account
                </span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              {/* Primary User Gmail Account */}
              <button
                type="button"
                disabled={isGmailLoading}
                onClick={() => handleGmailLogin('elmylypro@gmail.com')}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-[#5036FF] hover:bg-indigo-50/50 flex items-center justify-between text-left transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5036FF] to-indigo-400 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    E
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-[#5036FF]">
                      Elmyly Pro
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      elmylypro@gmail.com
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#5036FF] bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                  Admin
                </span>
              </button>
            </div>

            {/* Custom Gmail Input */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Or enter another Gmail address:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customGmail}
                  onChange={(e) => setCustomGmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5036FF] focus:bg-white text-slate-900"
                />
                <button
                  type="button"
                  disabled={isGmailLoading || !customGmail.trim()}
                  onClick={() => handleGmailLogin(customGmail.trim())}
                  className="px-3.5 py-2 bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {isGmailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
                </button>
              </div>
            </div>

            {/* Google Notice Footer */}
            <p className="mt-4 text-[10px] text-center text-slate-400">
              To continue, Google will share your name and email address with Aura.
            </p>
          </div>
        </div>
      )}

      {/* Simple Clean Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} Aura. Dedicated to authentic human connection.
      </footer>
    </div>
  );
};
