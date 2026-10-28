import React, { useState, useRef } from 'react';
import { User as UserIcon, X, Check, Camera, Shield, Bell, Volume2, VolumeX, LogOut, Upload, Trash2, Mail, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../lib/sounds';
import { pushManager } from '../lib/notifications';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [isPushEnabled, setIsPushEnabled] = useState(pushManager.isEnabled());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetAvatar = () => {
    setAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}&backgroundColor=e0e7ff`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      statusMessage: statusMessage.trim(),
      avatar,
    });
    setIsSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const handleTogglePush = () => {
    const next = !isPushEnabled;
    pushManager.setEnabled(next);
    setIsPushEnabled(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-indigo-600" /> User Profile & Security
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Upload Section - Custom photo upload replaces old preset images */}
          <div className="flex flex-col items-center justify-center gap-3 py-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
              title="Click to upload custom profile photo"
            >
              <img
                src={avatar || user.avatar}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100 shadow-md transition-all group-hover:ring-indigo-300"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-semibold">Change</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
              <button
                type="button"
                onClick={handleResetAvatar}
                className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                title="Reset to default avatar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Account Identity Card (Username, Email, Safety Fingerprint) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block font-semibold">
                  Username Handle
                </span>
                <span className="text-sm font-bold text-indigo-700 font-mono">@{user.username}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                <Shield className="w-3 h-3" /> E2EE Identity
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Account Email:
              </span>
              <span className="font-mono text-slate-800 font-medium">{user.email}</span>
            </div>

            <div className="pt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" /> Key Fingerprint:
              </span>
              <span className="font-mono text-emerald-700 font-semibold">{user.publicKeyFingerprint}</span>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none transition-colors"
              placeholder="Your Name"
            />
          </div>

          {/* Status Message */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Status Message</label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none transition-colors"
              placeholder="Available, busy, encrypting..."
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none transition-colors resize-none"
              placeholder="Tell others a bit about you"
            />
          </div>

          {/* App Preferences */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Preferences</span>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                <span className="text-xs font-medium text-slate-700">Sound Effects</span>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  !isMuted ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {!isMuted ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-medium text-slate-700">Push Notifications</span>
              </div>
              <button
                type="button"
                onClick={handleTogglePush}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isPushEnabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isPushEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" /> Saved!
                </>
              ) : isSaving ? (
                'Saving...'
              ) : (
                'Save Profile'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
