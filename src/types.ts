export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar: string;
  coverBanner?: string;
  banner?: string;
  website?: string;
  location?: string;
  statusMessage: string;
  publicKeyFingerprint: string;
  createdAt: number;
  lastSeen: number | null;
  isOnline?: boolean;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  blockedUsers?: string[];
  mutedUsers?: string[];
  isPrivate?: boolean;
  role?: 'user' | 'admin';
  isVerified?: boolean;
  verifiedCategory?: string;
  verifiedAt?: number;
  isSuspended?: boolean;
  savedPostIds?: string[];
}

export interface Reaction {
  emoji: string;
  userId: string;
  username: string;
  userAvatar?: string;
  displayName?: string;
}

export interface FileMeta {
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  duration?: number; // for audio files
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  ciphertext: string;
  iv: string;
  keyFingerprint: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  fileMeta?: FileMeta;
  createdAt: number;
  reactions: Reaction[];
  deliveredTo: string[];
  readBy: { userId: string; readAt: number }[];
  decryptedContent?: string; // Cache for client
  isDecrypted?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedByUsername?: string;
  pinnedAt?: number;
}

export interface ParticipantInfo {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: number | null;
  publicKeyFingerprint: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  description?: string;
  createdBy: string;
  admins: string[];
  participantIds: string[];
  participants?: ParticipantInfo[];
  createdAt: number;
  updatedAt: number;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    senderUsername: string;
    ciphertext: string;
    type: string;
    createdAt: number;
  } | null;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userIds
}

export interface Poll {
  question: string;
  options: PollOption[];
  expiresAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorIsVerified?: boolean;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  mediaUrls: string[];
  poll?: Poll;
  hashtags: string[];
  mentions: string[];
  likes: string[]; // userIds
  reposts: string[]; // userIds
  bookmarks: string[]; // userIds
  repliesCount: number;
  repostCount: number;
  likeCount: number;
  replyToId?: string;
  quotedPostId?: string;
  quotedPost?: Post;
  category?: string;
  visibility: 'public' | 'followers' | 'private';
  locationTag?: string;
  createdAt: number;
  updatedAt?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorIsVerified?: boolean;
  content: string;
  likes: string[];
  replyToCommentId?: string;
  createdAt: number;
  isLiked?: boolean;
}

export interface VisualItem {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  title: string;
  description: string;
  imageUrl: string;
  aspectRatio: number; // e.g. 1.33 for landscape, 0.75 for portrait
  category: string;
  tags: string[];
  savesCount: number;
  likesCount: number;
  likes: string[];
  boardIds: string[];
  originalPostId?: string;
  commentsCount: number;
  createdAt: number;
  isSaved?: boolean;
  isLiked?: boolean;
}

export interface Board {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatar: string;
  name: string;
  description: string;
  coverImage?: string;
  isPrivate: boolean;
  collaboratorIds: string[];
  collaborators?: ParticipantInfo[];
  itemIds: string[];
  items?: VisualItem[];
  followers: string[];
  itemCount?: number;
  followersCount?: number;
  createdAt: number;
  updatedAt: number;
  isFollowing?: boolean;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatar: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'mention' | 'board_invite' | 'system';
  targetId?: string;
  targetType?: 'post' | 'comment' | 'board' | 'user';
  message?: string;
  isRead: boolean;
  createdAt: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'post' | 'user' | 'comment' | 'visual';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: number;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  email: string;
  category: string; // e.g. 'Creator', 'Journalist', 'Brand/Business', 'Public Figure', 'Developer'
  documentType: string;
  documentUrl?: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  adminNotes?: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface TrendingTopic {
  tag: string;
  category: string;
  postCount: number;
  trendRank: number;
}

export type MainViewTab =
  | 'feed'
  | 'explore'
  | 'visuals'
  | 'boards'
  | 'messages'
  | 'meet'
  | 'notifications'
  | 'bookmarks'
  | 'profile'
  | 'settings'
  | 'admin';

export interface DatingProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  age: number;
  gender: 'man' | 'woman' | 'non-binary';
  intent: string; // e.g. 'Long-term relationship', 'Casual dating', 'New friends', 'Coffee & chats'
  occupation?: string;
  bio: string;
  location: string;
  distanceKm: number;
  photos: string[];
  passions: string[];
  compatibilityScore: number;
  isVerified?: boolean;
}

export interface DatingMatch {
  id: string;
  matchedUserId: string;
  matchedUsername: string;
  matchedDisplayName: string;
  matchedAvatar: string;
  matchedBio: string;
  matchedPhotos: string[];
  matchedAt: number;
  lastMessage?: string;
  conversationId?: string;
}
