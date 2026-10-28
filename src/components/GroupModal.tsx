import React, { useState, useEffect, useRef } from 'react';
import { Users, X, Check, Search, Shield, Plus, Upload, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface GroupModalProps {
  onClose: () => void;
}

const getGeneratedAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed || 'group')}&backgroundColor=e0e7ff`;

export const GroupModal: React.FC<GroupModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { createGroup } = useSocket();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState(getGeneratedAvatar('group'));
  const [customImageUploaded, setCustomImageUploaded] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [searchQuery]);

  const fetchUsers = async (q: string) => {
    try {
      const token = localStorage.getItem('aurachat_token') || localStorage.getItem('cipherchat_token');
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch {
      // Ignore
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!customImageUploaded) {
      setAvatar(getGeneratedAvatar(val.trim() || 'group'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      setCustomImageUploaded(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetAvatar = () => {
    setCustomImageUploaded(false);
    setAvatar(getGeneratedAvatar(name.trim() || 'group'));
  };

  const toggleMember = (username: string) => {
    if (selectedMembers.includes(username)) {
      setSelectedMembers((prev) => prev.filter((u) => u !== username));
    } else {
      setSelectedMembers((prev) => [...prev, username]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const conv = await createGroup(name.trim(), selectedMembers, avatar, description.trim());
    setIsSubmitting(false);

    if (conv) {
      onClose();
    } else {
      setError('Failed to create encrypted group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-800 relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create Encrypted Group</h3>
            <p className="text-xs text-slate-500">Multi-party real-time encrypted messaging channel</p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden space-y-4">
          {/* Group Icon Upload Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Clickable Image Preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer shrink-0"
              title="Click to choose group icon"
            >
              <img
                src={avatar}
                alt="Group icon"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 group-hover:ring-indigo-400 shadow-sm transition-all"
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-semibold">Change</span>
              </div>
            </div>

            {/* Action buttons and info */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900 block mb-0.5">Group Icon</span>
              <p className="text-[11px] text-slate-500 mb-2">
                Upload a custom photo or logo from your device
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Image
                </button>
                {customImageUploaded && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Reset to default icon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Design & Engineering"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Topic / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Selected Member Chips */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Add Members ({selectedMembers.length} selected)</span>
              <span className="text-[11px] text-indigo-600">You (@{user?.username}) + members</span>
            </div>

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-16 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                {selectedMembers.map((mUsername) => (
                  <span
                    key={mUsername}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 shadow-xs"
                  >
                    @{mUsername}
                    <button
                      type="button"
                      onClick={() => toggleMember(mUsername)}
                      className="hover:text-rose-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Member search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username to invite..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* Member list to toggle */}
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {availableUsers.map((u) => {
                const isSelected = selectedMembers.includes(u.username);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.username)}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 text-slate-900'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate text-slate-900">{u.displayName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">@{u.username}</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4" /> {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
