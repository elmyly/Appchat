import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  ArrowLeft,
  Camera,
  Check,
  AlertCircle,
  Send,
  Sparkles,
  KeyRound,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, ForgotPasswordResult } from '../context/AuthContext';
import { AppLogo } from './AppLogo';
import { compressImage } from '../utils/imageCompression';

interface AuthModalProps {
  onSuccess?: () => void;
  onOpenResetWithToken?: (token: string) => void;
  initialMode?: 'login' | 'register' | 'forgot';
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onOpenResetWithToken,
  initialMode = 'login',
  onClose,
}) => {
  const {
    login,
    register,
    requestRegistrationOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    forgotPassword,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify-otp'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Verification states
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Forgot password states
  const [forgotQuery, setForgotQuery] = useState('');
  const [forgotResult, setForgotResult] = useState<ForgotPasswordResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    try {
      const result = await compressImage(file, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.82,
        mimeType: 'image/jpeg',
      });
      setAvatar(result.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1: Submit Login or Request Registration OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    if (mode === 'login') {
      if (!username.trim() || !password.trim()) {
        setIsSubmitting(false);
        return;
      }
      const success = await login(username.trim(), password);
      setIsSubmitting(false);
      if (success && onSuccess) {
        onSuccess();
      }
    } else if (mode === 'register') {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setIsSubmitting(false);
        return;
      }

      // Request 6-digit OTP verification code to ensure valid email address
      const res = await requestRegistrationOtp({
        username: username.trim(),
        email: email.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        bio: bio.trim(),
        avatar: avatar || undefined,
      });

      setIsSubmitting(false);
      if (res.success) {
        setDevOtp(res.devOtp || '');
        setEmailSent(!!res.emailSent);
        setOtp('');
        setOtpTimer(60);
        setMode('verify-otp');
      }
    }
  };

  // Step 2: Verify 6-digit OTP to complete account activation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    clearError();
    setIsSubmitting(true);
    const success = await verifyRegistrationOtp(email.trim(), otp.trim());
    setIsSubmitting(false);

    if (success && onSuccess) {
      onSuccess();
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setIsSubmitting(true);
    setResendStatus(null);
    const res = await resendRegistrationOtp(email.trim());
    setIsSubmitting(false);

    if (res.success) {
      if (res.devOtp) setDevOtp(res.devOtp);
      setOtpTimer(60);
      setResendStatus('A fresh verification code has been dispatched.');
      setTimeout(() => setResendStatus(null), 4000);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotQuery.trim()) return;

    setIsSubmitting(true);
    const res = await forgotPassword(forgotQuery.trim());
    setIsSubmitting(false);
    setForgotResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-2xl text-slate-800 relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-sm font-semibold p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Glow backdrop subtle accents */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#5036FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center mb-6">
          <div className="flex justify-center mb-3">
            <AppLogo size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Aura</h2>
          <p className="text-xs text-slate-500 mt-1">
            Private, Sovereign & Encrypted Social Network
          </p>
        </div>

        {/* Tab switch (only if not in forgot password or verify-otp mode) */}
        {mode !== 'forgot' && mode !== 'verify-otp' ? (
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => {
                clearError();
                setMode('login');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#5036FF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-[#5036FF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : null}

        {/* Error message banner */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resend success notice */}
        {resendStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {/* --- VIEW 1: EMAIL OTP VERIFICATION --- */}
        {mode === 'verify-otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1.5 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Verify Your Email Address</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                We sent a 6-digit verification code to <strong className="text-slate-800">{email}</strong> to ensure your email is valid.
              </p>
            </div>

            {/* Instant Demo Auto-Fill Banner */}
            {devOtp && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200/90 rounded-2xl flex items-center justify-between text-xs text-indigo-950 shadow-2xs animate-in zoom-in-95">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5036FF] shrink-0" />
                  <div>
                    <span className="block text-[11px] text-slate-500 font-medium">Demo Preview Code</span>
                    <span className="font-mono text-sm font-bold text-[#5036FF] tracking-wider">{devOtp}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="px-3 py-1.5 bg-[#5036FF] text-white font-bold rounded-xl hover:bg-[#432bdb] transition-colors cursor-pointer text-xs shadow-xs"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* 6-Digit OTP Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 text-center">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                autoFocus
                className="w-full text-center tracking-[12px] text-2xl font-mono font-black py-3 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-2xl text-slate-900 placeholder:text-slate-300 focus:outline-none transition-all"
                required
              />
            </div>

            {/* Submit Verification */}
            <button
              type="submit"
              disabled={otp.length !== 6 || isSubmitting}
              className={`w-full py-3 font-bold text-xs rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 ${
                otp.length === 6 && !isSubmitting
                  ? 'bg-[#5036FF] hover:bg-[#432bdb] text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Verify & Create Account</span>
                </>
              )}
            </button>

            {/* Resend & Back controls */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('register');
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit details</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpTimer > 0 || isSubmitting}
                className={`font-semibold flex items-center gap-1 ${
                  otpTimer > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-[#5036FF] hover:underline cursor-pointer'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{otpTimer > 0 ? `Resend code (${otpTimer}s)` : 'Resend code'}</span>
              </button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          /* --- VIEW 2: FORGOT PASSWORD FORM --- */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('login');
                  setForgotResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500">
                Enter your username or email address and we'll dispatch a secure reset link.
              </p>
            </div>

            {forgotResult?.success ? (
              <div className="space-y-3 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Reset link generated!
                  </div>
                  <p className="text-emerald-700 leading-relaxed">{forgotResult.message}</p>
                </div>

                {forgotResult.resetLink && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Instant Preview Test Link:</span>
                      <span className="text-[10px] text-slate-400 font-mono">Dev Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const token = new URL(forgotResult.resetLink!).searchParams.get('resetToken');
                        if (token && onOpenResetWithToken) {
                          onOpenResetWithToken(token);
                        }
                      }}
                      className="w-full py-2 px-3 bg-[#5036FF] text-white font-bold text-xs rounded-xl hover:bg-[#432bdb] transition-colors cursor-pointer text-center"
                    >
                      Open Password Reset Screen Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Username or Email
                  </label>
                  <input
                    type="text"
                    value={forgotQuery}
                    onChange={(e) => setForgotQuery(e.target.value)}
                    placeholder="user@example.com or username"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#5036FF] hover:bg-[#432bdb] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* --- VIEW 3: LOGIN OR REGISTER FORM --- */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Custom Avatar Upload in Registration */}
            {mode === 'register' && (
              <div className="flex flex-col items-center justify-center mb-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="Click to upload profile photo"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5036FF] shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-[#5036FF] group-hover:bg-indigo-100 transition-colors">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  {avatar ? 'Profile photo selected (compressed)' : 'Upload profile photo (optional)'}
                </span>
              </div>
            )}

            {/* Username / Identifier */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {mode === 'login' ? 'Username or Email' : 'Username Handle *'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                  {mode === 'login' ? '👤' : '@'}
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'username or email' : 'username'}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Email Address (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address (OTP will be sent) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elmylypro@gmail.com"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {/* Display Name (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Malak"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Bio (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Bio (optional)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Designing clean software & visual stories"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
              </div>
            )}

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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5036FF] focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#5036FF] hover:bg-[#432bdb] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Sending Verification Code...'}</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security footer guarantee */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Client-Side AES-GCM-256 Encrypted Platform</span>
        </div>
      </div>
    </div>
  );
};
