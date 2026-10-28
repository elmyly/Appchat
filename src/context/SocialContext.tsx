import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  Post,
  Comment,
  VisualItem,
  Board,
  Notification,
  TrendingTopic,
  MainViewTab,
} from '../types';

interface ShareItemPayload {
  type: 'post' | 'visual';
  id: string;
  title: string;
  preview: string;
}

interface SocialContextType {
  // Navigation State
  currentTab: MainViewTab;
  setCurrentTab: (tab: MainViewTab) => void;
  viewingUsername: string | null;
  setViewingUsername: (username: string | null) => void;
  viewingVisualId: string | null;
  setViewingVisualId: (id: string | null) => void;
  viewingBoardId: string | null;
  setViewingBoardId: (id: string | null) => void;

  // Share to chat modal state
  shareToChatPayload: ShareItemPayload | null;
  openShareToChat: (payload: ShareItemPayload) => void;
  closeShareToChat: () => void;

  // Feed State & Actions
  feedTab: 'for_you' | 'following' | 'latest' | 'media';
  setFeedTab: (tab: 'for_you' | 'following' | 'latest' | 'media') => void;
  posts: Post[];
  isLoadingFeed: boolean;
  refreshFeed: () => Promise<void>;
  createPost: (data: {
    content: string;
    mediaUrls?: string[];
    poll?: { question: string; options: string[]; days?: number };
    category?: string;
    visibility?: 'public' | 'followers' | 'private';
    locationTag?: string;
    quotedPostId?: string;
  }) => Promise<Post | null>;
  likePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<boolean>;
  addComment: (postId: string, content: string, replyToCommentId?: string) => Promise<Comment | null>;
  votePoll: (postId: string, optionId: string) => Promise<void>;

  // Visuals State & Actions
  visuals: VisualItem[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  isLoadingVisuals: boolean;
  refreshVisuals: (category?: string, query?: string) => Promise<void>;
  createVisual: (data: {
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    tags?: string[];
    aspectRatio?: number;
    boardId?: string;
  }) => Promise<VisualItem | null>;
  likeVisual: (visualId: string) => Promise<void>;
  saveVisualToBoard: (visualId: string, boardId?: string) => Promise<void>;

  // Boards State & Actions
  boards: Board[];
  isLoadingBoards: boolean;
  refreshBoards: (userId?: string) => Promise<void>;
  createBoard: (data: {
    name: string;
    description?: string;
    coverImage?: string;
    isPrivate?: boolean;
  }) => Promise<Board | null>;
  followBoard: (boardId: string) => Promise<void>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationsAsRead: (id?: string) => Promise<void>;

  // Trends & Suggestions
  trendingTopics: TrendingTopic[];
  suggestedUsers: any[];
  refreshTrendsAndSuggestions: () => Promise<void>;
  followUser: (targetUserId: string) => Promise<boolean>;

  // Block & Mute
  blockedUserIds: string[];
  mutedUserIds: string[];
  blockUser: (targetUserId: string) => Promise<boolean>;
  unblockUser: (targetUserId: string) => Promise<boolean>;
  muteUser: (targetUserId: string) => Promise<boolean>;
  unmuteUser: (targetUserId: string) => Promise<boolean>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();

  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<MainViewTab>('feed');
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);
  const [viewingVisualId, setViewingVisualId] = useState<string | null>(null);
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);
  const [shareToChatPayload, setShareToChatPayload] = useState<ShareItemPayload | null>(null);

  // Feed
  const [feedTab, setFeedTab] = useState<'for_you' | 'following' | 'latest' | 'media'>('for_you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Visuals
  const [visuals, setVisuals] = useState<VisualItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoadingVisuals, setIsLoadingVisuals] = useState(false);

  // Boards
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Trends & Suggestions
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Block & Mute
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);

  const openShareToChat = (payload: ShareItemPayload) => {
    setShareToChatPayload(payload);
  };

  const closeShareToChat = () => {
    setShareToChatPayload(null);
  };

  // Helper auth headers
  const getHeaders = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token]);

  // Fetch Feed
  const refreshFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const res = await fetch(`/api/posts/feed?tab=${feedTab}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [feedTab, getHeaders]);

  // Create Post
  const createPost = async (data: any): Promise<Post | null> => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        const newPost = json.post;
        setPosts((prev) => [newPost, ...prev]);
        return newPost;
      }
      return null;
    } catch (err) {
      console.error('Failed to create post:', err);
      return null;
    }
  };

  // Like / Unlike Post (optimistic)
  const likePost = async (postId: string) => {
    // Optimistic toggle
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const willLike = !p.isLiked;
        return {
          ...p,
          isLiked: willLike,
          likeCount: willLike ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
        };
      })
    );

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: data.isLiked, likeCount: data.likeCount }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to like post:', err);
      // rollback
      refreshFeed();
    }
  };

  // Repost / Unrepost (optimistic)
  const repostPost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const willRepost = !p.isReposted;
        return {
          ...p,
          isReposted: willRepost,
          repostCount: willRepost ? p.repostCount + 1 : Math.max(0, p.repostCount - 1),
        };
      })
    );

    try {
      const res = await fetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isReposted: data.isReposted, repostCount: data.repostCount }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to repost:', err);
      refreshFeed();
    }
  };

  // Bookmark / Unbookmark (optimistic)
  const bookmarkPost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p))
    );

    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isBookmarked: data.isBookmarked } : p))
        );
      }
    } catch (err) {
      console.error('Failed to bookmark:', err);
    }
  };

  // Delete Post
  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete post:', err);
      return false;
    }
  };

  // Add Comment
  const addComment = async (
    postId: string,
    content: string,
    replyToCommentId?: string
  ): Promise<Comment | null> => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content, replyToCommentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, repliesCount: data.repliesCount || p.repliesCount + 1 } : p
          )
        );
        return data.comment;
      }
      return null;
    } catch (err) {
      console.error('Failed to add comment:', err);
      return null;
    }
  };

  // Vote on Poll
  const votePoll = async (postId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/poll/vote`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ optionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, poll: data.poll } : p))
        );
      }
    } catch (err) {
      console.error('Failed to vote on poll:', err);
    }
  };

  // Fetch Visuals
  const refreshVisuals = useCallback(
    async (category?: string, query?: string) => {
      setIsLoadingVisuals(true);
      try {
        const cat = category || selectedCategory;
        const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
        const url = `/api/visuals?category=${cat === 'All' ? '' : encodeURIComponent(cat)}${qParam}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setVisuals(data.visuals || []);
        }
      } catch (err) {
        console.error('Failed to load visuals:', err);
      } finally {
        setIsLoadingVisuals(false);
      }
    },
    [selectedCategory, getHeaders]
  );

  // Create Visual
  const createVisual = async (data: any): Promise<VisualItem | null> => {
    try {
      const res = await fetch('/api/visuals', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        const newVis = json.visual;
        setVisuals((prev) => [newVis, ...prev]);
        return newVis;
      }
      return null;
    } catch (err) {
      console.error('Failed to upload visual pin:', err);
      return null;
    }
  };

  // Like Visual
  const likeVisual = async (visualId: string) => {
    setVisuals((prev) =>
      prev.map((v) => {
        if (v.id !== visualId) return v;
        const willLike = !v.isLiked;
        return {
          ...v,
          isLiked: willLike,
          likesCount: willLike ? v.likesCount + 1 : Math.max(0, v.likesCount - 1),
        };
      })
    );

    try {
      await fetch(`/api/visuals/${visualId}/like`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (err) {
      console.error('Failed to like visual:', err);
    }
  };

  // Save Visual to Board
  const saveVisualToBoard = async (visualId: string, boardId?: string) => {
    try {
      const res = await fetch(`/api/visuals/${visualId}/save`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ boardId }),
      });
      if (res.ok) {
        const data = await res.json();
        setVisuals((prev) =>
          prev.map((v) =>
            v.id === visualId ? { ...v, isSaved: data.isSaved, savesCount: data.savesCount } : v
          )
        );
      }
    } catch (err) {
      console.error('Failed to save to board:', err);
    }
  };

  // Fetch Boards
  const refreshBoards = useCallback(
    async (userId?: string) => {
      setIsLoadingBoards(true);
      try {
        const url = userId ? `/api/boards?userId=${userId}` : '/api/boards';
        const res = await fetch(url, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards || []);
        }
      } catch (err) {
        console.error('Failed to load boards:', err);
      } finally {
        setIsLoadingBoards(false);
      }
    },
    [getHeaders]
  );

  // Create Board
  const createBoard = async (data: any): Promise<Board | null> => {
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        setBoards((prev) => [json.board, ...prev]);
        return json.board;
      }
      return null;
    } catch (err) {
      console.error('Failed to create board:', err);
      return null;
    }
  };

  // Follow Board
  const followBoard = async (boardId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/follow`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? { ...b, isFollowing: data.isFollowing } : b))
        );
      }
    } catch (err) {
      console.error('Failed to follow board:', err);
    }
  };

  // Fetch Notifications
  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [token, getHeaders]);

  // Mark notifications read
  const markNotificationsAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ id, all: !id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (!id || n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  // Trends & Suggestions
  const refreshTrendsAndSuggestions = useCallback(async () => {
    try {
      const [trendRes, suggRes] = await Promise.all([
        fetch('/api/explore/trending'),
        fetch('/api/users/suggestions', { headers: getHeaders() }),
      ]);
      if (trendRes.ok) {
        const tData = await trendRes.json();
        setTrendingTopics(tData.trending || []);
      }
      if (suggRes.ok) {
        const sData = await suggRes.json();
        setSuggestedUsers(sData.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch trends or suggestions:', err);
    }
  }, [getHeaders]);

  // Follow User
  const followUser = async (targetUserId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: data.isFollowing } : u))
        );
        refreshTrendsAndSuggestions();
        return data.isFollowing;
      }
      return false;
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      return false;
    }
  };

  const blockUser = async (targetUserId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/social/users/${targetUserId}/block`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUserIds((prev) =>
          data.isBlocked ? [...prev, targetUserId] : prev.filter((id) => id !== targetUserId)
        );
        refreshFeed();
        return data.isBlocked;
      }
      return false;
    } catch (err) {
      console.error('Failed to block user:', err);
      return false;
    }
  };

  const unblockUser = async (targetUserId: string): Promise<boolean> => {
    return blockUser(targetUserId);
  };

  const muteUser = async (targetUserId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/social/users/${targetUserId}/mute`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMutedUserIds((prev) =>
          data.isMuted ? [...prev, targetUserId] : prev.filter((id) => id !== targetUserId)
        );
        refreshFeed();
        return data.isMuted;
      }
      return false;
    } catch (err) {
      console.error('Failed to mute user:', err);
      return false;
    }
  };

  const unmuteUser = async (targetUserId: string): Promise<boolean> => {
    return muteUser(targetUserId);
  };

  // Initial load on mount or tab change
  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    refreshVisuals();
  }, [refreshVisuals]);

  useEffect(() => {
    refreshBoards();
  }, [refreshBoards]);

  useEffect(() => {
    refreshTrendsAndSuggestions();
  }, [refreshTrendsAndSuggestions]);

  useEffect(() => {
    if (token) {
      refreshNotifications();
    }
  }, [token, refreshNotifications]);

  // Socket real-time event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming real-time notification
    const handleNotification = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    // Incoming new post
    const handleNewPost = (newPost: Post) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    // Post deleted
    const handlePostDeleted = (data: { id: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== data.id));
    };

    socket.on('notification:new', handleNotification);
    socket.on('post:new', handleNewPost);
    socket.on('post:deleted', handlePostDeleted);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('post:new', handleNewPost);
      socket.off('post:deleted', handlePostDeleted);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SocialContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        viewingUsername,
        setViewingUsername,
        viewingVisualId,
        setViewingVisualId,
        viewingBoardId,
        setViewingBoardId,
        shareToChatPayload,
        openShareToChat,
        closeShareToChat,
        feedTab,
        setFeedTab,
        posts,
        isLoadingFeed,
        refreshFeed,
        createPost,
        likePost,
        repostPost,
        bookmarkPost,
        deletePost,
        addComment,
        votePoll,
        visuals,
        selectedCategory,
        setSelectedCategory,
        isLoadingVisuals,
        refreshVisuals,
        createVisual,
        likeVisual,
        saveVisualToBoard,
        boards,
        isLoadingBoards,
        refreshBoards,
        createBoard,
        followBoard,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationsAsRead,
        trendingTopics,
        suggestedUsers,
        refreshTrendsAndSuggestions,
        followUser,
        blockedUserIds,
        mutedUserIds,
        blockUser,
        unblockUser,
        muteUser,
        unmuteUser,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within a SocialProvider');
  return context;
};
