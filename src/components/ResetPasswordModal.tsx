import React, { useState, useEffect } from 'react';
import { Lock, Check, KeyRound, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppLogo } from './AppLogo';

interface ResetPasswordModalProps {
  token: string;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token,
  onClose,
  onSuccess,
}) => {
  const { verifyResetToken, resetPassword } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ username: string; email: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    async function checkToken() {
      setIsValidating(true);
      const res = await verifyResetToken(token);
      setIsValidating(false);
      if (res.valid && res.username && res.email) {
        setAccountInfo({ username: res.username, email: res.email });
      } else {
        setTokenError(res.error || 'This password reset link is invalid or has expired.');
      }
    }
    checkToken();
  }, [token, verifyResetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(token, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setIsDone(true);
      setTimeout(() => {
        onSuccess(accountInfo?.username || '');
      }, 1500);
    } else {
      setSubmitError(res.error || res.message || 'Failed to reset password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-2xl text-slate-800 relative">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <AppLogo size={44} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a strong, private password for your account
          </p>
        </div>

        {isValidating ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs text-slate-500 font-mono">Verifying secure cryptographic token...</span>
          </div>
        ) : tokenError ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-800 mb-0.5">Link Expired or Invalid</p>
                <p>{tokenError}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : isDone ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Password Updated!</h3>
            <p className="text-xs text-slate-500">
              Your password has been changed. Logging you into @{accountInfo?.username}...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {accountInfo && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Account</span>
                  <span className="font-bold text-slate-900 font-mono">@{accountInfo.username}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                  {accountInfo.email}
                </span>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
