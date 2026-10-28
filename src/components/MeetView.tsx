import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Sparkles,
  MapPin,
  Briefcase,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  SlidersHorizontal,
  User as UserIcon,
  ShieldCheck,
  Compass,
  ArrowRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { DatingProfile, DatingMatch } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useSocket } from '../context/SocketContext';
import { compressImage } from '../utils/imageCompression';

interface MeetViewProps {
  onOpenChatWithUser?: (userId: string) => void;
}

export const MeetView: React.FC<MeetViewProps> = ({ onOpenChatWithUser }) => {
  const { user, token } = useAuth();
  const { setCurrentTab } = useSocial();
  const { selectConversation, conversations } = useSocket();

  const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover');
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [matches, setMatches] = useState<DatingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeAnimation, setSwipeAnimation] = useState<'like' | 'pass' | 'superlike' | null>(null);

  // Match celebration modal state
  const [celebrationMatch, setCelebrationMatch] = useState<DatingMatch | null>(null);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'woman' | 'man' | 'non-binary'>('all');
  const [intentFilter, setIntentFilter] = useState('all');

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [myDatingProfile, setMyDatingProfile] = useState<DatingProfile | null>(null);
  const [editAge, setEditAge] = useState(25);
  const [editIntent, setEditIntent] = useState('Coffee & conversation');
  const [editOccupation, setEditOccupation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  });

  // Fetch profiles
  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (genderFilter !== 'all') query.set('gender', genderFilter);
      if (intentFilter !== 'all') query.set('intent', intentFilter);

      const res = await fetch(`/api/dating/profiles?${query.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setCurrentIndex(0);
        setCurrentPhotoIndex(0);
      }
    } catch (err) {
      console.error('Error loading dating profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch matches
  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/dating/matches', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Error loading matches:', err);
    }
  };

  // Fetch my dating profile
  const fetchMyProfile = async () => {
    try {
      const res = await fetch('/api/dating/profile/me', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        setMyDatingProfile(p);
        setEditAge(p.age || 25);
        setEditIntent(p.intent || 'Coffee & conversation');
        setEditOccupation(p.occupation || '');
        setEditBio(p.bio || '');
        setEditLocation(p.location || '');
      }
    } catch (err) {
      console.error('Error fetching my dating profile:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchMatches();
    fetchMyProfile();
  }, [genderFilter, intentFilter]);

  // Handle Swipe Action
  const handleSwipe = async (action: 'like' | 'pass' | 'superlike') => {
    const current = profiles[currentIndex];
    if (!current) return;

    setSwipeAnimation(action);

    try {
      const res = await fetch('/api/dating/action', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUserId: current.userId, action }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isMatch && data.match) {
          setCelebrationMatch(data.match);
          fetchMatches();
        }
      }
    } catch (err) {
      console.error('Swipe error:', err);
    }

    setTimeout(() => {
      setSwipeAnimation(null);
      setCurrentIndex((prev) => prev + 1);
      setCurrentPhotoIndex(0);
    }, 280);
  };

  // Handle Rewind
  const handleRewind = async () => {
    if (currentIndex <= 0) return;
    try {
      const res = await fetch('/api/dating/rewind', {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setCurrentPhotoIndex(0);
      }
    } catch (err) {
      console.error('Rewind error:', err);
    }
  };

  // Start chat with match
  const handleStartChatWithMatch = async (matchUserId: string) => {
    setCelebrationMatch(null);
    try {
      const res = await fetch('/api/dating/start-chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ matchUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        const conversationId = data.conversationId;

        // Switch to messages tab and select conversation
        setCurrentTab('messages');

        // Look up conversation in context or trigger selection
        const conv = conversations.find((c) => c.id === conversationId);
        if (conv) {
          selectConversation(conv);
        } else if (onOpenChatWithUser) {
          onOpenChatWithUser(matchUserId);
        }
      }
    } catch (err) {
      console.error('Error starting match chat:', err);
    }
  };

  // Photo uploading for profile
  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myDatingProfile) return;

    try {
      const result = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.85,
      });

      const updatedPhotos = [...myDatingProfile.photos, result.dataUrl].slice(0, 5);
      setMyDatingProfile({ ...myDatingProfile, photos: updatedPhotos });
    } catch (err) {
      console.error('Photo upload error:', err);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myDatingProfile) return;

    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/dating/profile/me', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          age: editAge,
          intent: editIntent,
          occupation: editOccupation,
          bio: editBio,
          location: editLocation,
          photos: myDatingProfile.photos,
          passions: myDatingProfile.passions,
        }),
      });

      if (res.ok) {
        setShowEditProfile(false);
        fetchMyProfile();
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const currentProfile = profiles[currentIndex];
  const photos = currentProfile?.photos || [];

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-4 space-y-4 pb-20 md:pb-6">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/90 -mx-2 sm:-mx-4 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-xs">
              <Flame className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Aura Meet</span>
              </h1>
              <p className="text-xs text-slate-500">Discover & match with verified creators</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showFilters || genderFilter !== 'all' || intentFilter !== 'all'
                  ? 'bg-[#5036FF]/10 border-[#5036FF]/30 text-[#5036FF]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Discovery Preferences"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Preferences</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="My Dating Card"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">My Profile</span>
            </button>
          </div>
        </div>

        {/* Tab switch: Discover vs Matches */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#5036FF]" />
            <span>Discover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'matches'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Matches</span>
            {matches.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {matches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Flyout */}
      {showFilters && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Discovery Filters</span>
            <button
              type="button"
              onClick={() => {
                setGenderFilter('all');
                setIntentFilter('all');
              }}
              className="text-[11px] font-semibold text-[#5036FF] hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Interested in</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5036FF]"
              >
                <option value="all">Everyone</option>
                <option value="woman">Women</option>
                <option value="man">Men</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Looking for</label>
              <select
                value={intentFilter}
                onChange={(e) => setIntentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5036FF]"
              >
                <option value="all">Any Intent</option>
                <option value="Long-term relationship">Long-term relationship</option>
                <option value="Coffee & conversation">Coffee & conversation</option>
                <option value="Casual dating">Casual dating</option>
                <option value="Creative collaborator">Creative collaborator</option>
                <option value="New friends">New friends</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: DISCOVER / SWIPE DECK */}
      {activeTab === 'discover' && (
        <div className="flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="h-[520px] max-w-sm w-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-3xl text-center p-6 animate-pulse">
              <Loader2 className="w-8 h-8 text-[#5036FF] animate-spin mb-3" />
              <span className="text-xs font-bold text-slate-700">Loading verified Aura profiles...</span>
            </div>
          ) : currentProfile ? (
            <div className="max-w-sm w-full flex flex-col items-center">
              {/* Profile Card Container */}
              <div
                className={`w-full aspect-[3/4.2] rounded-3xl overflow-hidden relative shadow-2xl border border-slate-200 bg-slate-950 transition-all duration-300 select-none ${
                  swipeAnimation === 'like'
                    ? 'translate-x-[110%] rotate-12 opacity-0'
                    : swipeAnimation === 'pass'
                    ? '-translate-x-[110%] -rotate-12 opacity-0'
                    : swipeAnimation === 'superlike'
                    ? '-translate-y-[110%] scale-105 opacity-0'
                    : ''
                }`}
              >
                {/* Photo Carousel */}
                <img
                  src={photos[currentPhotoIndex] || photos[0]}
                  alt={currentProfile.displayName}
                  className="w-full h-full object-cover"
                />

                {/* Multiple Photos Indicator Pills */}
                {photos.length > 1 && (
                  <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
                    {photos.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i === currentPhotoIndex ? 'bg-white shadow-sm' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Left / Right tap zones to switch photos */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                      }}
                      className="absolute left-0 top-12 bottom-36 w-1/3 z-10 cursor-pointer"
                      title="Previous Photo"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-0 top-12 bottom-36 w-1/3 z-10 cursor-pointer"
                      title="Next Photo"
                    />
                  </>
                )}

                {/* Compatibility match pill */}
                <div className="absolute top-6 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[11px] font-bold flex items-center gap-1 border border-white/10 z-10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{currentProfile.compatibilityScore}% Compatibility</span>
                </div>

                {/* Bottom Scrim & Info Details */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-16 p-5 text-white z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {currentProfile.displayName}, {currentProfile.age}
                    </h2>
                    {currentProfile.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-[#5036FF] fill-white" />
                    )}
                  </div>

                  {currentProfile.occupation && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                      <span>{currentProfile.occupation}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      {currentProfile.location} • {currentProfile.distanceKm} km away
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed mb-3">
                    {currentProfile.bio}
                  </p>

                  {/* Intent & Passions tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-[#5036FF]/30 border border-[#5036FF]/50 text-indigo-200 text-[10px] font-bold">
                      {currentProfile.intent}
                    </span>
                    {currentProfile.passions.slice(0, 3).map((passion) => (
                      <span
                        key={passion}
                        className="px-2 py-0.5 rounded-lg bg-white/15 backdrop-blur-xs text-slate-200 text-[10px] font-medium"
                      >
                        {passion}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Dock (Tinder style) */}
              <div className="flex items-center justify-center gap-4 mt-5">
                {/* Rewind */}
                <button
                  type="button"
                  onClick={handleRewind}
                  disabled={currentIndex === 0}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                    currentIndex > 0
                      ? 'border-amber-200 bg-amber-50 text-amber-600 hover:scale-110 active:scale-95 shadow-xs cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                  title="Undo previous swipe"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Pass */}
                <button
                  type="button"
                  onClick={() => handleSwipe('pass')}
                  className="w-14 h-14 rounded-full border-2 border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:scale-110 active:scale-95 shadow-md flex items-center justify-center transition-all cursor-pointer"
                  title="Pass"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>

                {/* Super Like */}
                <button
                  type="button"
                  onClick={() => handleSwipe('superlike')}
                  className="w-11 h-11 rounded-full border border-sky-200 bg-sky-50 text-sky-500 hover:scale-110 active:scale-95 shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  title="Super Like"
                >
                  <Star className="w-5 h-5 fill-sky-400 stroke-none" />
                </button>

                {/* Like */}
                <button
                  type="button"
                  onClick={() => handleSwipe('like')}
                  className="w-14 h-14 rounded-full border-2 border-emerald-200 bg-white text-emerald-500 hover:bg-emerald-50 hover:scale-110 active:scale-95 shadow-md flex items-center justify-center transition-all cursor-pointer"
                  title="Like"
                >
                  <Heart className="w-6 h-6 fill-emerald-500 stroke-none" />
                </button>
              </div>

              {/* Keyboard shortcuts tip */}
              <div className="mt-3 text-[11px] text-slate-400 font-medium">
                Tap card sides for photos • Like with 💚 or Pass with ✕
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="max-w-sm w-full bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-4 my-8">
              <div className="w-16 h-16 rounded-3xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
                <Compass className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No More Profiles</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  You have reviewed all available profiles for your current filters. Check back soon for new creators joining Aura!
                </p>
              </div>
              <button
                type="button"
                onClick={fetchProfiles}
                className="px-5 py-2.5 bg-[#5036FF] text-white font-bold text-xs rounded-xl hover:bg-[#432bdb] transition-all cursor-pointer shadow-xs"
              >
                Explore Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MATCHES LIST */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-3 max-w-md mx-auto my-6">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-2xs">
                <Heart className="w-6 h-6 fill-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Matches Yet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Keep exploring and liking profiles in the Discover feed to meet your match!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-[#5036FF] text-white font-bold text-xs rounded-xl hover:bg-[#432bdb] transition-colors cursor-pointer"
              >
                Start Swiping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Your Matches ({matches.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-white border border-slate-200 hover:border-[#5036FF]/50 rounded-3xl shadow-xs transition-all flex items-center gap-3.5 group"
                  >
                    <img
                      src={m.matchedAvatar}
                      alt={m.matchedDisplayName}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {m.matchedDisplayName}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5036FF] fill-white shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">@{m.matchedUsername}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">{m.matchedBio}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartChatWithMatch(m.matchedUserId)}
                      className="px-3.5 py-2 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- IT'S A MATCH CELEBRATION MODAL --- */}
      {celebrationMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Double Avatar Lockup */}
            <div className="flex items-center justify-center -space-x-4 pt-2">
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=me'}
                alt="You"
                className="w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover ring-2 ring-emerald-400 z-10"
              />
              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center z-30 shadow-lg border-2 border-white -mx-2">
                <Heart className="w-5 h-5 fill-white stroke-none animate-pulse" />
              </div>
              <img
                src={celebrationMatch.matchedAvatar}
                alt={celebrationMatch.matchedDisplayName}
                className="w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover ring-2 ring-rose-400 z-10"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest font-mono">
                ✨ It's a Mutual Match! ✨
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                You & {celebrationMatch.matchedDisplayName}
              </h3>
              <p className="text-xs text-slate-500">
                You both liked each other on Aura Meet. Start an encrypted conversation now!
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleStartChatWithMatch(celebrationMatch.matchedUserId)}
                className="w-full py-3 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Encrypted Message</span>
              </button>

              <button
                type="button"
                onClick={() => setCelebrationMatch(null)}
                className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MY DATING PROFILE MODAL --- */}
      {showEditProfile && myDatingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900">Edit Dating Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Photos Gallery */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Photos (Up to 5)
                </label>
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handleAddPhoto}
                  accept="image/*"
                  className="hidden"
                />
                <div className="grid grid-cols-3 gap-2">
                  {myDatingProfile.photos.map((p, idx) => (
                    <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = myDatingProfile.photos.filter((_, i) => i !== idx);
                            setMyDatingProfile({ ...myDatingProfile, photos: filtered });
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {myDatingProfile.photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#5036FF] flex flex-col items-center justify-center text-slate-400 hover:text-[#5036FF] transition-colors cursor-pointer bg-slate-50"
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Add Photo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Age & Intent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Age</label>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={editAge}
                    onChange={(e) => setEditAge(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#5036FF]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Intent</label>
                  <select
                    value={editIntent}
                    onChange={(e) => setEditIntent(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#5036FF]"
                  >
                    <option value="Long-term relationship">Long-term relationship</option>
                    <option value="Coffee & conversation">Coffee & conversation</option>
                    <option value="Casual dating">Casual dating</option>
                    <option value="Creative collaborator">Creative collaborator</option>
                    <option value="New friends">New friends</option>
                  </select>
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Occupation / Craft</label>
                <input
                  type="text"
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  placeholder="e.g. Visual Artist, Software Architect"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#5036FF]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#5036FF]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dating Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell potential matches about your passions, philosophy, and ideal Sunday..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#5036FF] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 text-xs font-bold bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
