import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useSocket } from '../context/SocketContext';
import { User, Post, Board } from '../types';
import { PostCard } from './PostCard';
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  MessageSquare,
  UserPlus,
  UserCheck,
  Share2,
  MoreHorizontal,
  FolderOpen,
  Image as ImageIcon,
  Heart,
  Lock,
  Shield,
  Edit3,
} from 'lucide-react';

interface ProfileViewProps {
  username?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ username }) => {
  const { user: currentUser, token } = useAuth();
  const {
    viewingUsername,
    followUser,
    setCurrentTab,
    setViewingBoardId,
    blockUser,
    muteUser,
  } = useSocial();
  const { startDirectConversation, selectConversation } = useSocket();

  const targetUsername = (username || viewingUsername || currentUser?.username || '').replace(
    /^@/,
    ''
  );
  const isSelf = currentUser?.username?.toLowerCase() === targetUsername.toLowerCase();

  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'boards' | 'likes'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [likes, setLikes] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!targetUsername) return;

    let isMounted = true;
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Fetch User Info
        const userRes = await fetch(`/api/users/profile/${targetUsername}`, { headers });
        if (userRes.ok) {
          const resData = await userRes.json();
          const userData = resData.user || resData;
          if (isMounted) {
            setProfile(userData);
            setIsFollowing(userData.isFollowing || false);
          }

          // Fetch User Boards
          if (userData.id) {
            const boardsRes = await fetch(`/api/boards?userId=${userData.id}`, { headers });
            if (boardsRes.ok) {
              const boardsData = await boardsRes.json();
              if (isMounted) setBoards(boardsData.boards || boardsData || []);
            }
          }
        }

        // Fetch User Posts
        const postsRes = await fetch(`/api/users/${targetUsername}/posts?tab=posts`, { headers });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (isMounted) setPosts(postsData.posts || postsData || []);
        }

        // Fetch Liked posts if self
        if (isSelf) {
          const likesRes = await fetch(`/api/users/${targetUsername}/posts?tab=likes`, { headers });
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            if (isMounted) setLikes(likesData.posts || likesData || []);
          }
        }
      } catch (err) {
        console.error('Error fetching profile data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfileData();

    return () => {
      isMounted = false;
    };
  }, [targetUsername, token, isSelf]);

  const handleFollowClick = async () => {
    if (!profile) return;
    setIsActionLoading(true);
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followersCount: Math.max(0, (prev.followersCount || 0) + (newStatus ? 1 : -1)),
            isFollowing: newStatus,
          }
        : null
    );

    await followUser(profile.id);
    setIsActionLoading(false);
  };

  const handleStartMessage = async () => {
    if (!profile) return;
    try {
      const conv = await startDirectConversation(profile.username);
      if (conv) {
        await selectConversation(conv);
      }
      setCurrentTab('messages');
    } catch (err) {
      console.error('Failed to start chat from profile', err);
    }
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/u/${targetUsername}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const mediaPosts = posts.filter((p) => p.mediaUrls && p.mediaUrls.length > 0);

  if (isLoading) {
    return (
      <div className="flex-1 max-w-3xl min-h-screen border-r border-slate-100 bg-white p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-44 bg-slate-100 rounded-2xl w-full" />
          <div className="flex justify-between items-end px-4">
            <div className="w-24 h-24 -mt-12 rounded-full bg-slate-200 border-4 border-white" />
            <div className="w-28 h-9 bg-slate-200 rounded-xl" />
          </div>
          <div className="space-y-2 px-4 pt-2">
            <div className="w-48 h-5 bg-slate-200 rounded" />
            <div className="w-32 h-4 bg-slate-100 rounded" />
            <div className="w-full h-12 bg-slate-50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 max-w-3xl min-h-screen border-r border-slate-100 bg-white p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">User Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          The profile @{targetUsername} does not exist or has been removed.
        </p>
      </div>
    );
  }

  const avatarUrl =
    profile.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`;
  const bannerUrl =
    profile.banner ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="flex-1 max-w-3xl min-h-screen border-r border-slate-100 bg-white pb-20">
      {/* Cover Banner */}
      <div className="h-48 md:h-56 w-full relative bg-slate-100 overflow-hidden">
        <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Profile Header Bar */}
      <div className="px-6 relative">
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={avatarUrl}
              alt={profile.displayName}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md bg-white object-cover"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {isSelf ? (
              <button
                onClick={() => setCurrentTab('settings')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartMessage}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4 text-[#5036FF]" />
                  <span className="hidden sm:inline">Message</span>
                </button>

                <button
                  onClick={handleFollowClick}
                  disabled={isActionLoading}
                  className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-800 hover:bg-rose-50 hover:text-rose-600'
                      : 'bg-[#5036FF] text-white hover:bg-[#432bd9]'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                {/* More Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 animate-fade-in text-xs font-medium">
                      <button
                        onClick={() => {
                          handleShareProfile();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        {copyFeedback ? 'Link Copied!' : 'Copy Profile Link'}
                      </button>
                      <button
                        onClick={() => {
                          muteUser(profile.id);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        Mute @{profile.username}
                      </button>
                      <button
                        onClick={() => {
                          blockUser(profile.id);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50"
                      >
                        Block @{profile.username}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Identity Details */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{profile.displayName}</h1>
              {profile.role === 'admin' && (
                <span
                  title="Aura Core Team"
                  className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-indigo-50 text-[#5036FF] rounded-md flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" /> Core
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-slate-800 leading-relaxed max-w-xl">{profile.bio}</p>
          )}

          {/* Meta (Location, Website, Join Date) */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#5036FF] hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#5036FF]" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Joined {new Date(profile.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 text-xs text-slate-700 py-2 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-900">{profile.followingCount || 0}</span>{' '}
              <span className="text-slate-500">Following</span>
            </div>
            <div>
              <span className="font-bold text-slate-900">{profile.followersCount || 0}</span>{' '}
              <span className="text-slate-500">Followers</span>
            </div>
            <div>
              <span className="font-bold text-slate-900">{posts.length}</span>{' '}
              <span className="text-slate-500">Posts</span>
            </div>
            <div>
              <span className="font-bold text-slate-900">{boards.length}</span>{' '}
              <span className="text-slate-500">Boards</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-100 mt-2">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
              activeTab === 'posts' ? 'text-[#5036FF]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Posts ({posts.length})
            {activeTab === 'posts' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#5036FF] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
              activeTab === 'media' ? 'text-[#5036FF]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Media ({mediaPosts.length})
            {activeTab === 'media' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#5036FF] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
              activeTab === 'boards' ? 'text-[#5036FF]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Boards ({boards.length})
            {activeTab === 'boards' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#5036FF] rounded-full" />
            )}
          </button>
          {isSelf && (
            <button
              onClick={() => setActiveTab('likes')}
              className={`flex-1 py-3 text-xs font-semibold transition-all relative ${
                activeTab === 'likes' ? 'text-[#5036FF]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Likes ({likes.length})
              {activeTab === 'likes' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#5036FF] rounded-full" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Streams */}
      <div className="divide-y divide-slate-100">
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div>
            {posts.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-xs">@{profile.username} hasn't posted anything yet.</p>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div>
            {mediaPosts.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No media posts found.</p>
              </div>
            ) : (
              mediaPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {/* Boards Tab */}
        {activeTab === 'boards' && (
          <div className="p-6">
            {boards.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No visual boards created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setViewingBoardId(b.id)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:shadow-md hover:border-[#5036FF]/30 transition-all cursor-pointer group"
                  >
                    <div className="h-32 rounded-xl bg-slate-200 overflow-hidden mb-3 relative">
                      <img
                        src={
                          b.coverImage ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={b.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {b.isPrivate && (
                        <span className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-sm rounded-lg text-white">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 truncate">{b.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {b.description || 'Curated visual collection'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{b.itemCount || 0} items</span>
                      <span>{b.followersCount || 0} followers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Likes Tab */}
        {activeTab === 'likes' && (
          <div>
            {likes.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No liked posts to show.</p>
              </div>
            ) : (
              likes.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
};
