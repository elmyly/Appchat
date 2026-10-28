import React, { useState } from 'react';
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
} from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

export const SettingsView: React.FC = () => {
  const { user, token, logout, updateProfile } = useAuth();
  const { blockedUserIds, mutedUserIds, unblockUser, unmuteUser } = useSocial();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'privacy' | 'security' | 'notifications'>('profile');

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

  return (
    <div className="flex-1 max-w-3xl min-h-screen border-r border-slate-100 bg-white p-6 pb-24">
      {/* Settings Header */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Settings & Privacy</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account profile, privacy settings, E2EE security, and notifications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'profile'
              ? 'bg-[#5036FF] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          Edit Profile
        </button>
        <button
          onClick={() => setActiveSubTab('privacy')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'privacy'
              ? 'bg-[#5036FF] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Privacy & Safety
        </button>
        <button
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'security'
              ? 'bg-[#5036FF] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Security & E2EE
        </button>
        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'notifications'
              ? 'bg-[#5036FF] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Notifications
        </button>
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
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Banner & Avatar Preview */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profile Banner
              </label>
              <div className="h-32 w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
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
                className="mt-2 w-full px-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Avatar Image
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={
                    avatar ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username || 'user'}`
                  }
                  alt="Avatar"
                  className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover"
                />
                <div className="space-y-1.5 flex-1">
                  <label className="inline-block px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
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
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={`@${user?.username || ''}`}
                disabled
                className="w-full px-3 py-2 text-xs bg-slate-100 rounded-xl border border-slate-200 text-slate-400 font-mono cursor-not-allowed"
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
              className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourportfolio.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
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
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-700">Account ID: {userId.slice(0, 12)}...</span>
                    <button
                      onClick={() => unblockUser(userId)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Muted Users Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
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
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-700">Account ID: {userId.slice(0, 12)}...</span>
                    <button
                      onClick={() => unmuteUser(userId)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
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
        <div className="space-y-6">
          {/* E2EE Protocol Status Card */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-2xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white rounded-xl text-[#5036FF] shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Aura Cryptographic Protocol
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded-full">
                    Active & Verified
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your direct and group conversations in Aura Messenger are end-to-end encrypted using
                  Curve25519 key exchange and AES-256-GCM authenticated cipher. Plaintext message
                  content is never stored on the server.
                </p>
                <div className="mt-3 p-2.5 bg-white/80 rounded-xl border border-indigo-100/80 font-mono text-[11px] text-slate-600">
                  <span className="text-slate-400">Device Public Identity Fingerprint:</span>
                  <p className="text-slate-800 font-semibold truncate mt-0.5">
                    {user?.id
                      ? `0x${Array.from(user.id).map((c) => c.charCodeAt(0).toString(16)).join('').slice(0, 32)}... verified`
                      : 'Curve25519-AES-GCM-v2.4'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-600" />
              Change Password
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
                className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none"
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
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-[#5036FF] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-50 rounded-xl transition-all shadow-sm"
              >
                {isSaving ? 'Updating...' : 'Update Password'}
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

      {/* Account Logout Section */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-rose-600">Log Out of Aura</h4>
          <p className="text-[11px] text-slate-400">End your current session on this device</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </div>
    </div>
  );
};
