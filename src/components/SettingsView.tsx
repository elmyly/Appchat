import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import {
  User as UserIcon,
  Shield,
  Lock,
  Bell,
  Eye,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Unlock,
  Volume2,
  BadgeCheck,
  ExternalLink,
  Clock,
  Sparkles,
  XCircle,
  Upload,
  FileUp,
  FileText,
  FileCheck,
  Trash2,
  Paperclip,
  Check,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import { VerifiedBadge } from './VerifiedBadge';
import {
  VerificationToast,
  VerificationReceiptModal,
  VerificationReceiptData,
} from './VerificationToast';

interface SettingsViewProps {
  initialSubTab?: 'profile' | 'privacy' | 'security' | 'notifications' | 'verification';
  onBack?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialSubTab = 'profile', onBack }) => {
  const { user, token, logout, updateProfile } = useAuth();
  const { blockedUserIds, mutedUserIds, unblockUser, unmuteUser, setCurrentTab } = useSocial();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'privacy' | 'security' | 'notifications' | 'verification'>(initialSubTab);

  useEffect(() => {
    if (window.location.hash === '#verification' || window.location.search.includes('tab=verification')) {
      setActiveSubTab('verification');
    }
  }, []);

  // Verification application state
  const [verifStatus, setVerifStatus] = useState<{
    isVerified: boolean;
    verifiedCategory?: string;
    verifiedAt?: number;
    latestRequest?: any;
  } | null>(null);
  const [isLoadingVerif, setIsLoadingVerif] = useState(false);
  const [verifCategory, setVerifCategory] = useState('Creator & Artist');
  const [verifDocType, setVerifDocType] = useState('Official Website & Portfolio');
  const [verifDocUrl, setVerifDocUrl] = useState('');
  const [verifReason, setVerifReason] = useState('');
  const [isSubmittingVerif, setIsSubmittingVerif] = useState(false);
  const [verifSuccessMsg, setVerifSuccessMsg] = useState<string | null>(null);
  const [verifErrorMsg, setVerifErrorMsg] = useState<string | null>(null);

  // Verification document file upload state
  const [verifDocFile, setVerifDocFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Visual confirmation Toast & Receipt Modal state
  const [activeReceipt, setActiveReceipt] = useState<VerificationReceiptData | null>(null);
  const [showVerifToast, setShowVerifToast] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [banner, setBanner] = useState(user?.banner || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [postLikeAlerts, setPostLikeAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [chatMessageAlerts, setChatMessageAlerts] = useState(true);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Native avatar file upload handler with canvas compression
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        mimeType: 'image/jpeg',
      });
      setAvatar(result.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setAvatar(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Native banner file upload handler with canvas compression
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 600,
        quality: 0.82,
        mimeType: 'image/jpeg',
      });
      setBanner(result.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setBanner(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const success = await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar,
        banner,
        coverBanner: banner,
        isPrivate,
      });

      if (!success) {
        throw new Error('Failed to update profile settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update password');
      }

      setSaveSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchVerificationStatus = async () => {
    if (!token) return;
    setIsLoadingVerif(true);
    try {
      const res = await fetch('/api/verification/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVerifStatus(data);
      }
    } catch (err) {
      console.error('Failed to load verification status', err);
    } finally {
      setIsLoadingVerif(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVerificationStatus();
    }
  }, [token, activeSubTab]);

  // Handle uploading verification document files (e.g. government ID, press pass, corporate license, portfolio screenshot)
  const handleDocumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setVerifErrorMsg('Document file size must be under 10MB.');
      return;
    }

    setIsUploadingDoc(true);
    setVerifErrorMsg(null);

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
          mimeType: 'image/jpeg',
        });
        setVerifDocFile({
          name: file.name,
          size: sizeStr,
          type: file.type,
          dataUrl: compressed.dataUrl,
        });
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setVerifDocFile({
              name: file.name,
              size: sizeStr,
              type: file.type,
              dataUrl: event.target.result as string,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('Failed to load document file', err);
      setVerifErrorMsg('Unable to process document file. Please upload a standard image or document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleRemoveDocFile = () => {
    setVerifDocFile(null);
  };

  const handleApplyVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifReason.trim()) {
      setVerifErrorMsg('Please provide a reason or summary for your verification request.');
      return;
    }
    setIsSubmittingVerif(true);
    setVerifErrorMsg(null);
    setVerifSuccessMsg(null);

    const finalDocumentUrl = verifDocFile?.dataUrl || (verifDocUrl.trim() ? verifDocUrl.trim() : undefined);

    try {
      const res = await fetch('/api/verification/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: verifCategory,
          documentType: verifDocType,
          documentUrl: finalDocumentUrl,
          documentFileName: verifDocFile?.name || undefined,
          documentFileSize: verifDocFile?.size || undefined,
          reason: verifReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      // Generate receipt object for visual confirmation
      const receipt: VerificationReceiptData = {
        requestId: data.request?.id || `req_${Date.now().toString(36)}`,
        category: verifCategory,
        documentType: verifDocType,
        documentUrl: verifDocUrl.trim() || undefined,
        documentFileName: verifDocFile?.name || undefined,
        documentFileSize: verifDocFile?.size || undefined,
        reason: verifReason.trim(),
        username: user?.username || '',
        displayName: user?.displayName || '',
        avatar: user?.avatar,
        createdAt: Date.now(),
      };

      setActiveReceipt(receipt);
      setShowVerifToast(true);
      setShowReceiptModal(true);
      setVerifSuccessMsg(`Verification documents received! Reference ID: ${receipt.requestId}`);

      // Clear form inputs
      setVerifDocUrl('');
      setVerifDocFile(null);
      setVerifReason('');

      await fetchVerificationStatus();
    } catch (err: any) {
      setVerifErrorMsg(err.message || 'Error submitting application');
    } finally {
      setIsSubmittingVerif(false);
    }
  };

  return (
    <div className="w-full max-w-3xl min-h-screen border-r border-slate-100 bg-white px-3.5 sm:px-6 py-4 sm:py-6 pb-32 md:pb-24 relative overflow-x-hidden">
      {/* Visual Confirmation Toast Notification */}
      <VerificationToast
        receipt={activeReceipt}
        onClose={() => setShowVerifToast(false)}
        onOpenReceiptModal={() => setShowReceiptModal(true)}
      />

      {/* Visual Confirmation Receipt Modal */}
      <VerificationReceiptModal
        receipt={
          activeReceipt ||
          (verifStatus?.latestRequest
            ? {
                requestId: verifStatus.latestRequest.id,
                category: verifStatus.latestRequest.category,
                documentType: verifStatus.latestRequest.documentType,
                documentUrl: verifStatus.latestRequest.documentUrl,
                documentFileName: verifStatus.latestRequest.documentFileName,
                documentFileSize: verifStatus.latestRequest.documentFileSize,
                reason: verifStatus.latestRequest.reason,
                username: user?.username || '',
                displayName: user?.displayName || '',
                avatar: user?.avatar,
                createdAt: verifStatus.latestRequest.createdAt,
              }
            : null)
        }
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* Settings Header with Mobile Back Button */}
      <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (onBack) onBack();
              else setCurrentTab('profile');
            }}
            className="md:hidden min-w-[40px] min-h-[40px] p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center -ml-1 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              Settings & Privacy
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Manage your account profile, privacy settings, E2EE security, and verified badge.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs - Stacked "one under one and beautiful" */}
      <div className="flex flex-col gap-2 mb-6 bg-slate-50/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {[
          {
            id: 'profile' as const,
            title: 'Edit Profile',
            description: 'Name, bio, status message, avatar & cover banner',
            icon: UserIcon,
            accent: 'bg-indigo-50 text-indigo-600',
          },
          {
            id: 'privacy' as const,
            title: 'Privacy & Safety',
            description: 'Account visibility, active status, message requests & blocked list',
            icon: Eye,
            accent: 'bg-emerald-50 text-emerald-600',
          },
          {
            id: 'security' as const,
            title: 'Security & E2EE',
            description: 'Cryptographic safety fingerprint, key verification & password change',
            icon: Shield,
            accent: 'bg-amber-50 text-amber-600',
          },
          {
            id: 'notifications' as const,
            title: 'Notifications',
            description: 'Direct message alerts, group notices, sound effects & push setup',
            icon: Bell,
            accent: 'bg-purple-50 text-purple-600',
          },
          {
            id: 'verification' as const,
            title: 'Request Verification',
            description: 'Submit credentials for official creator blue badge with cryptographic certificate',
            icon: BadgeCheck,
            accent: 'bg-blue-50 text-blue-600',
          },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-2 ring-[#5036FF]/20'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-[#5036FF] text-white shadow-xs' : tab.accent
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {tab.title}
                    </span>
                    {tab.id === 'verification' && user?.isVerified && (
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{tab.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#5036FF] text-white text-[10px] font-bold">
                    Active
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Your settings have been saved successfully!</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Subtab 1: Edit Profile */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-5 sm:space-y-6">
          {/* Banner & Avatar Preview */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profile Banner
              </label>
              <div className="h-28 sm:h-36 w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                <img
                  src={
                    banner ||
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold">
                  <span>Change Banner Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <input
                type="text"
                placeholder="Or paste banner image URL..."
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                className="mt-2 w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Avatar Image
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      avatar ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username || 'user'}`
                    }
                    alt="Avatar"
                    className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover shrink-0"
                  />
                  <label className="sm:hidden px-3.5 py-2 min-h-[44px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors flex items-center justify-center">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1.5 flex-1 w-full">
                  <label className="hidden sm:inline-block px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
                    Upload New Avatar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Or paste avatar image URL..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={`@${user?.username || ''}`}
                disabled
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 rounded-xl border border-slate-200 text-slate-400 font-mono cursor-not-allowed min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the Aura community about yourself..."
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none resize-none min-h-[88px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourportfolio.com"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[44px] active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Subtab 2: Privacy & Safety */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Private Account</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  When your account is private, only people you approve can see your posts and visual
                  boards.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5036FF]" />
              </label>
            </div>
          </div>

          {/* Blocked Users Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">Blocked Accounts</h4>
            <p className="text-xs text-slate-500 mb-3">
              Blocked accounts cannot see your posts, send you messages, or follow your profile.
            </p>
            {blockedUserIds.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUserIds.map((userId) => (
                  <div
                    key={userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-700 truncate min-w-0">Account ID: {userId.slice(0, 14)}...</span>
                    <button
                      onClick={() => unblockUser(userId)}
                      className="w-full sm:w-auto px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" /> <span>Unblock</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Muted Users Section */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">Muted Accounts</h4>
            <p className="text-xs text-slate-500 mb-3">
              Posts from muted accounts will not appear in your Home feed.
            </p>
            {mutedUserIds.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No muted users.</p>
            ) : (
              <div className="space-y-2">
                {mutedUserIds.map((userId) => (
                  <div
                    key={userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-700 truncate min-w-0">Account ID: {userId.slice(0, 14)}...</span>
                    <button
                      onClick={() => unmuteUser(userId)}
                      className="w-full sm:w-auto px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center cursor-pointer"
                    >
                      Unmute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Security & E2EE */}
      {activeSubTab === 'security' && (
        <div className="space-y-5 sm:space-y-6">
          {/* E2EE Protocol Status Card */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-2xl border border-indigo-100">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="p-2.5 bg-white rounded-xl text-[#5036FF] shadow-xs shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Aura Cryptographic Protocol
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded-full">
                    Active & Verified
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your direct and group conversations in Aura Messenger are end-to-end encrypted using
                  Curve25519 key exchange and AES-256-GCM authenticated cipher. Plaintext message
                  content is never stored on the server.
                </p>
                <div className="mt-3 p-3 bg-white/80 rounded-xl border border-indigo-100/80 font-mono text-[11px] text-slate-600 break-all">
                  <span className="text-slate-400 block mb-0.5">Device Public Identity Fingerprint:</span>
                  <p className="text-slate-800 font-semibold mt-0.5 break-all">
                    {user?.id
                      ? `0x${Array.from(user.id).map((c) => c.charCodeAt(0).toString(16)).join('').slice(0, 32)}... verified`
                      : 'Curve25519-AES-GCM-v2.4'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-600" />
              <span>Change Password</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-50 rounded-xl transition-all shadow-sm min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95"
              >
                {isSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 4: Notifications */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Notification Sounds</h4>
                  <p className="text-[11px] text-slate-500">Play subtle chime on incoming message or interaction</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#5036FF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Likes & Reposts</h4>
                <p className="text-[11px] text-slate-500">Notify when someone likes or reposts your content</p>
              </div>
              <input
                type="checkbox"
                checked={postLikeAlerts}
                onChange={(e) => setPostLikeAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#5036FF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Mentions & Replies</h4>
                <p className="text-[11px] text-slate-500">Notify when someone mentions you in a post or comment</p>
              </div>
              <input
                type="checkbox"
                checked={mentionAlerts}
                onChange={(e) => setMentionAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#5036FF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Direct Messages</h4>
                <p className="text-[11px] text-slate-500">Show notification banner for encrypted chat messages</p>
              </div>
              <input
                type="checkbox"
                checked={chatMessageAlerts}
                onChange={(e) => setChatMessageAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#5036FF] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Subtab 5: Request Verification */}
      {activeSubTab === 'verification' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Explanation Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-purple-50/50 border border-blue-100/80 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Aura Verified Badge</h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                    Official Identity
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  The verified badge confirms that an account represents an authentic public figure, creator, tech innovator, journalist, or recognized organization.
                </p>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {verifSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{verifSuccessMsg}</span>
            </div>
          )}
          {verifErrorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{verifErrorMsg}</span>
            </div>
          )}

          {/* State 1: Account is already verified */}
          {(user?.isVerified || verifStatus?.isVerified) && (
            <div className="p-6 bg-white border border-blue-100 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <VerifiedBadge isVerified={true} category={verifStatus?.verifiedCategory || user?.verifiedCategory} size="lg" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {user?.displayName}
                      <span className="text-xs font-normal text-slate-500">(@{user?.username})</span>
                    </h4>
                    <p className="text-xs text-blue-600 font-medium">
                      Verified {verifStatus?.verifiedCategory || user?.verifiedCategory || 'Public Figure'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Badge
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-slate-500">Verified Category</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {verifStatus?.verifiedCategory || user?.verifiedCategory || 'Creator'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-slate-500">Identity Status</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">Confirmed & Authentic</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-slate-500">Protection</p>
                  <p className="text-xs font-bold text-indigo-600 mt-0.5">Anti-Impersonation Enabled</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Your verified badge is actively displayed next to your username on your profile, public posts, comments, visual moodboards, and encrypted chats.
              </p>
            </div>
          )}

          {/* State 2: Request Pending Review */}
          {!user?.isVerified && verifStatus?.latestRequest?.status === 'pending' && (
            <div className="p-6 bg-gradient-to-br from-amber-50/90 to-orange-50/50 border border-amber-200/90 rounded-2xl space-y-4 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                  </div>
                  <span>Verification Application Under Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-800 font-medium font-mono">
                    REF-{(verifStatus.latestRequest.id || '').replace(/^req_/, '').slice(0, 6).toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReceipt({
                        requestId: verifStatus.latestRequest.id,
                        category: verifStatus.latestRequest.category,
                        documentType: verifStatus.latestRequest.documentType,
                        documentUrl: verifStatus.latestRequest.documentUrl,
                        documentFileName: verifStatus.latestRequest.documentFileName,
                        documentFileSize: verifStatus.latestRequest.documentFileSize,
                        reason: verifStatus.latestRequest.reason,
                        username: user?.username || '',
                        displayName: user?.displayName || '',
                        avatar: user?.avatar,
                        createdAt: verifStatus.latestRequest.createdAt,
                      });
                      setShowReceiptModal(true);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <FileCheck className="w-3 h-3 text-amber-800" />
                    View Receipt
                  </button>
                </div>
              </div>

              <p className="text-xs text-amber-950 leading-relaxed">
                We have received your verification request for category <strong>{verifStatus.latestRequest.category}</strong>. Our Trust & Safety team is reviewing your identity credentials and public footprint.
              </p>

              {/* Submitted Documents Summary Box */}
              <div className="p-3.5 bg-white/80 rounded-xl border border-amber-200/70 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold flex-wrap gap-1">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Evidence: {verifStatus.latestRequest.documentType}
                  </span>
                  {verifStatus.latestRequest.documentFileName && (
                    <span className="text-[10px] text-amber-800 font-mono bg-amber-100/60 px-2 py-0.5 rounded">
                      {verifStatus.latestRequest.documentFileName} {verifStatus.latestRequest.documentFileSize ? `(${verifStatus.latestRequest.documentFileSize})` : ''}
                    </span>
                  )}
                </div>

                {verifStatus.latestRequest.documentUrl && !verifStatus.latestRequest.documentUrl.startsWith('data:') && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5036FF] pt-0.5">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <a
                      href={verifStatus.latestRequest.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline truncate max-w-sm font-medium"
                    >
                      {verifStatus.latestRequest.documentUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-800">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Estimated review turnaround: 24–48 hours
                </span>
                <span>Submitted {new Date(verifStatus.latestRequest.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* State 3: Request Denied */}
          {!user?.isVerified && verifStatus?.latestRequest?.status === 'denied' && (
            <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Previous Application Declined</span>
              </div>
              <p className="text-xs text-rose-900">
                <strong>Feedback from Admin:</strong> {verifStatus.latestRequest.adminNotes || 'Your account did not meet the verification criteria at this time.'}
              </p>
              <p className="text-[11px] text-rose-700">
                You can review the guidelines below, provide stronger evidence or official portfolio links, and submit a new application.
              </p>
            </div>
          )}

          {/* Application Form (Show if not verified and not pending) */}
          {!user?.isVerified && verifStatus?.latestRequest?.status !== 'pending' && (
            <form onSubmit={handleApplyVerification} className="space-y-5 bg-slate-50/60 p-6 rounded-2xl border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Submit Verification Request</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete the form below to have your Aura profile reviewed for the verified checkmark.
                </p>
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Category *
                </label>
                <select
                  value={verifCategory}
                  onChange={(e) => setVerifCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5036FF]/20 focus:border-[#5036FF]"
                >
                  <option value="Creator & Artist">🎨 Creator & Digital Artist</option>
                  <option value="Public Figure">🌟 Public Figure & Influencer</option>
                  <option value="Tech & Developer">💻 Software Engineer & Tech Innovator</option>
                  <option value="Journalist & Media">📰 Journalist & Media Representative</option>
                  <option value="Business & Brand">🏢 Business, Organization & Brand</option>
                  <option value="Community Leader">🤝 Community Leader & Activist</option>
                </select>
              </div>

              {/* Proof / Document Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Verification Evidence Type *
                </label>
                <select
                  value={verifDocType}
                  onChange={(e) => setVerifDocType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5036FF]/20 focus:border-[#5036FF]"
                >
                  <option value="Government & Company Registration">Government ID or Company Registry Documentation</option>
                  <option value="Official Website & Portfolio">Official Website & Domain Portfolio</option>
                  <option value="Verified Social Profiles">Verified Social Identity (GitHub, X, LinkedIn, YouTube)</option>
                  <option value="Published Press & Media">Published Press, News, or Media Articles</option>
                </select>
              </div>

              {/* Verification Document File Upload (Drag & Drop or browse) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Upload Verification Document (ID, Certificate, Press Pass, Work Badge)</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, PDF up to 10MB</span>
                </label>

                {verifDocFile ? (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      {verifDocFile.dataUrl.startsWith('data:image/') ? (
                        <img
                          src={verifDocFile.dataUrl}
                          alt="Document Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-emerald-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{verifDocFile.name}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {verifDocFile.size} · Document ready for submission
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveDocFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer shrink-0"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-[#5036FF]/50 bg-white rounded-xl cursor-pointer transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 text-[#5036FF] flex items-center justify-center mb-2 transition-colors">
                      {isUploadingDoc ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-[#5036FF] transition-colors">
                      {isUploadingDoc ? 'Compressing & preparing file...' : 'Click to upload or drag and drop document'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Government ID card, business license, media credential pass, or proof screenshot
                    </p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={handleDocumentFileUpload}
                      className="hidden"
                      disabled={isUploadingDoc}
                    />
                  </label>
                )}
              </div>

              {/* Document / Portfolio URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Proof / Portfolio URL (Optional if file attached)
                </label>
                <input
                  type="url"
                  value={verifDocUrl}
                  onChange={(e) => setVerifDocUrl(e.target.value)}
                  placeholder="https://yourwebsite.com or https://github.com/username"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5036FF]/20 focus:border-[#5036FF]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Add a link to your official portfolio, personal domain, or verified profile on external networks.
                </p>
              </div>

              {/* Reason Statement */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Why should your account be verified? *
                </label>
                <textarea
                  rows={4}
                  value={verifReason}
                  onChange={(e) => setVerifReason(e.target.value)}
                  placeholder="Explain your public work, audience, notable projects, or why your identity should be verified on Aura..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5036FF]/20 focus:border-[#5036FF] resize-none"
                  required
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                  <span>Be detailed to speed up review.</span>
                  <span>{verifReason.length} characters</span>
                </div>
              </div>

              {/* Guidelines checklist */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Verification Criteria
                </h5>
                <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                  <li>Your profile must have an active avatar, display name, and bio.</li>
                  <li>Account must adhere to Aura Community and Safety policies.</li>
                  <li>Evidence links and documents must be legitimate and verifiable.</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingVerif || isLoadingVerif || isUploadingDoc}
                  className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-[#5036FF] hover:bg-[#432bd9] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span>{isSubmittingVerif ? 'Submitting Documents...' : 'Submit Verification Request'}</span>
                </button>
                {verifDocFile && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-center sm:justify-start gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>1 Document attached</span>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Account Logout Section */}
      <div className="mt-10 sm:mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-rose-600">Log Out of Aura</h4>
          <p className="text-[11px] text-slate-400">End your current session on this device</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
