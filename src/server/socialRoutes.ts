import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'node:crypto';
import {
  Post,
  Comment,
  VisualItem,
  Board,
  Notification,
  Report,
  Poll,
  TrendingTopic,
} from '../types';

export interface ServerUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar: string;
  coverBanner?: string;
  website?: string;
  location?: string;
  passwordHash: string;
  statusMessage: string;
  publicKeyFingerprint: string;
  createdAt: number;
  lastSeen: number | null;
  followers: string[];
  following: string[];
  blockedUsers: string[];
  mutedUsers: string[];
  isPrivate: boolean;
  role: 'user' | 'admin';
  savedPostIds: string[];
  isSuspended?: boolean;
}

// In-Memory Social Collections
export const posts: Map<string, Post> = new Map();
export const comments: Map<string, Comment[]> = new Map(); // postId -> Comment[]
export const visuals: Map<string, VisualItem> = new Map();
export const boards: Map<string, Board> = new Map();
export const notifications: Map<string, Notification[]> = new Map(); // recipientId -> Notification[]
export const reports: Map<string, Report> = new Map();

// Helper to extract hashtags from text
function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

// Helper to extract mentions from text
function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

// Send real-time notification
export function sendNotification(
  io: SocketIOServer,
  recipientId: string,
  actor: { id: string; username: string; displayName: string; avatar: string },
  type: Notification['type'],
  targetId?: string,
  targetType?: Notification['targetType'],
  message?: string
) {
  if (recipientId === actor.id) return; // Don't notify self

  const notifId = 'notif_' + crypto.randomUUID().slice(0, 8);
  const newNotif: Notification = {
    id: notifId,
    recipientId,
    actorId: actor.id,
    actorUsername: actor.username,
    actorDisplayName: actor.displayName,
    actorAvatar: actor.avatar,
    type,
    targetId,
    targetType,
    message,
    isRead: false,
    createdAt: Date.now(),
  };

  if (!notifications.has(recipientId)) {
    notifications.set(recipientId, []);
  }
  notifications.get(recipientId)!.unshift(newNotif);

  // Emit to user's real-time socket room
  io.to(`user:${recipientId}`).emit('notification:new', newNotif);
}

export function setupSocialRoutes(
  app: express.Express,
  io: SocketIOServer,
  context: {
    users: Map<string, ServerUser>;
    usersByUsername: Map<string, string>;
    sessions: Map<string, string>;
    getAuthUser: (req: express.Request) => ServerUser | null;
  }
) {
  const { users, usersByUsername, getAuthUser } = context;

  // --- POSTS ROUTES ---

  // Get Feed (for_you, following, latest, media)
  app.get('/api/posts/feed', (req, res) => {
    const user = getAuthUser(req);
    const tab = (req.query.tab as string) || 'for_you';
    const cursor = parseInt(req.query.cursor as string, 10) || Date.now();
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);

    let allPosts = Array.from(posts.values()).filter((p) => p.createdAt < cursor);

    // Filter out posts from blocked or muted users
    if (user) {
      allPosts = allPosts.filter(
        (p) =>
          !user.blockedUsers?.includes(p.authorId) &&
          !user.mutedUsers?.includes(p.authorId)
      );
    }

    if (tab === 'following') {
      if (!user) return res.status(401).json({ error: 'Sign in to view Following feed' });
      const followingIds = new Set(user.following || []);
      followingIds.add(user.id);
      allPosts = allPosts.filter((p) => followingIds.has(p.authorId));
      allPosts.sort((a, b) => b.createdAt - a.createdAt);
    } else if (tab === 'latest') {
      allPosts.sort((a, b) => b.createdAt - a.createdAt);
    } else if (tab === 'media') {
      allPosts = allPosts.filter((p) => p.mediaUrls && p.mediaUrls.length > 0);
      allPosts.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      // 'for_you' ranking: combination of recency, engagement score (likes * 2 + reposts * 3 + replies * 1.5)
      allPosts.sort((a, b) => {
        const scoreA =
          (a.likeCount * 2 + a.repostCount * 3 + a.repliesCount * 1.5) /
          Math.max(1, (Date.now() - a.createdAt) / (1000 * 60 * 60));
        const scoreB =
          (b.likeCount * 2 + b.repostCount * 3 + b.repliesCount * 1.5) /
          Math.max(1, (Date.now() - b.createdAt) / (1000 * 60 * 60));
        return scoreB - scoreA;
      });
    }

    const sliced = allPosts.slice(0, limit);
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].createdAt : null;

    // Attach user-specific flags
    const enriched = sliced.map((p) => ({
      ...p,
      isLiked: user ? p.likes.includes(user.id) : false,
      isReposted: user ? p.reposts.includes(user.id) : false,
      isBookmarked: user ? user.savedPostIds?.includes(p.id) : false,
    }));

    return res.json({ posts: enriched, nextCursor });
  });

  // Create Post
  app.post('/api/posts', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      content,
      mediaUrls,
      poll,
      category,
      visibility,
      locationTag,
      quotedPostId,
    } = req.body;

    if ((!content || !content.trim()) && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({ error: 'Post must have text or media attachment' });
    }

    const postId = 'post_' + crypto.randomUUID().slice(0, 8);
    const trimmed = (content || '').trim();
    const hashtags = extractHashtags(trimmed);
    const mentions = extractMentions(trimmed);

    let formattedPoll: Poll | undefined = undefined;
    if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
      formattedPoll = {
        question: poll.question.trim(),
        options: poll.options.map((opt: string, idx: number) => ({
          id: `opt_${idx}`,
          text: String(opt).trim(),
          votes: [],
        })),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * (poll.days || 3),
      };
    }

    let quotedPost: Post | undefined = undefined;
    if (quotedPostId) {
      quotedPost = posts.get(quotedPostId);
    }

    const newPost: Post = {
      id: postId,
      authorId: user.id,
      authorUsername: user.username,
      authorDisplayName: user.displayName,
      authorAvatar: user.avatar,
      content: trimmed,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      poll: formattedPoll,
      hashtags,
      mentions,
      likes: [],
      reposts: [],
      bookmarks: [],
      repliesCount: 0,
      repostCount: 0,
      likeCount: 0,
      quotedPostId: quotedPost ? quotedPost.id : undefined,
      quotedPost,
      category: category || 'General',
      visibility: visibility || 'public',
      locationTag: locationTag ? String(locationTag).trim() : undefined,
      createdAt: Date.now(),
    };

    posts.set(postId, newPost);
    comments.set(postId, []);

    // Notify mentioned users
    for (const mention of mentions) {
      const targetId = usersByUsername.get(mention);
      if (targetId) {
        sendNotification(io, targetId, user, 'mention', postId, 'post', `mentioned you in a post`);
      }
    }

    // Broadcast new post to real-time feed
    io.emit('post:new', newPost);

    return res.json({ post: { ...newPost, isLiked: false, isReposted: false, isBookmarked: false } });
  });

  // Get Single Post
  app.get('/api/posts/:id', (req, res) => {
    const user = getAuthUser(req);
    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let quoted: Post | undefined = undefined;
    if (post.quotedPostId) {
      quoted = posts.get(post.quotedPostId);
    }

    return res.json({
      post: {
        ...post,
        quotedPost: quoted,
        isLiked: user ? post.likes.includes(user.id) : false,
        isReposted: user ? post.reposts.includes(user.id) : false,
        isBookmarked: user ? user.savedPostIds?.includes(post.id) : false,
      },
    });
  });

  // Edit Owned Post
  app.patch('/api/posts/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { content, category } = req.body;
    if (content !== undefined) {
      post.content = String(content).trim();
      post.hashtags = extractHashtags(post.content);
      post.mentions = extractMentions(post.content);
    }
    if (category) {
      post.category = category;
    }
    post.updatedAt = Date.now();

    return res.json({ post });
  });

  // Delete Post
  app.delete('/api/posts/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    posts.delete(req.params.id);
    comments.delete(req.params.id);

    io.emit('post:deleted', { id: req.params.id });
    return res.json({ success: true, id: req.params.id });
  });

  // Toggle Like on Post
  app.post('/api/posts/:id/like', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const idx = post.likes.indexOf(user.id);
    let isLiked = false;

    if (idx > -1) {
      post.likes.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likes.push(user.id);
      post.likeCount += 1;
      isLiked = true;

      sendNotification(io, post.authorId, user, 'like', post.id, 'post', `liked your post`);
    }

    io.emit('post:like_updated', {
      postId: post.id,
      likeCount: post.likeCount,
      userId: user.id,
      isLiked,
    });

    return res.json({ isLiked, likeCount: post.likeCount });
  });

  // Toggle Repost
  app.post('/api/posts/:id/repost', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const idx = post.reposts.indexOf(user.id);
    let isReposted = false;

    if (idx > -1) {
      post.reposts.splice(idx, 1);
      post.repostCount = Math.max(0, post.repostCount - 1);
    } else {
      post.reposts.push(user.id);
      post.repostCount += 1;
      isReposted = true;

      sendNotification(io, post.authorId, user, 'repost', post.id, 'post', `reposted your post`);
    }

    io.emit('post:repost_updated', {
      postId: post.id,
      repostCount: post.repostCount,
      userId: user.id,
      isReposted,
    });

    return res.json({ isReposted, repostCount: post.repostCount });
  });

  // Toggle Bookmark
  app.post('/api/posts/:id/bookmark', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (!user.savedPostIds) user.savedPostIds = [];
    const idx = user.savedPostIds.indexOf(post.id);
    let isBookmarked = false;

    if (idx > -1) {
      user.savedPostIds.splice(idx, 1);
      const bIdx = post.bookmarks.indexOf(user.id);
      if (bIdx > -1) post.bookmarks.splice(bIdx, 1);
    } else {
      user.savedPostIds.push(post.id);
      if (!post.bookmarks.includes(user.id)) post.bookmarks.push(user.id);
      isBookmarked = true;
    }

    return res.json({ isBookmarked });
  });

  // Vote on Poll
  app.post('/api/posts/:id/poll/vote', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { optionId } = req.body;
    const post = posts.get(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ error: 'Poll not found' });

    if (Date.now() > post.poll.expiresAt) {
      return res.status(400).json({ error: 'This poll has ended' });
    }

    // Remove user's previous vote if any
    post.poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((uid) => uid !== user.id);
    });

    // Add new vote
    const targetOpt = post.poll.options.find((opt) => opt.id === optionId);
    if (!targetOpt) return res.status(404).json({ error: 'Poll option not found' });
    targetOpt.votes.push(user.id);

    io.emit('post:poll_updated', { postId: post.id, poll: post.poll });
    return res.json({ poll: post.poll });
  });

  // Get Comments for Post
  app.get('/api/posts/:id/comments', (req, res) => {
    const user = getAuthUser(req);
    const postComments = comments.get(req.params.id) || [];

    const enriched = postComments.map((c) => ({
      ...c,
      isLiked: user ? c.likes.includes(user.id) : false,
    }));

    return res.json({ comments: enriched });
  });

  // Add Comment to Post
  app.post('/api/posts/:id/comments', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { content, replyToCommentId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }

    const commentId = 'com_' + crypto.randomUUID().slice(0, 8);
    const newComment: Comment = {
      id: commentId,
      postId: post.id,
      authorId: user.id,
      authorUsername: user.username,
      authorDisplayName: user.displayName,
      authorAvatar: user.avatar,
      content: content.trim(),
      likes: [],
      replyToCommentId,
      createdAt: Date.now(),
    };

    if (!comments.has(post.id)) comments.set(post.id, []);
    comments.get(post.id)!.push(newComment);

    post.repliesCount += 1;

    // Send notification to post author or parent comment author
    if (replyToCommentId) {
      const parent = comments.get(post.id)?.find((c) => c.id === replyToCommentId);
      if (parent) {
        sendNotification(io, parent.authorId, user, 'comment', post.id, 'comment', `replied to your comment`);
      }
    } else {
      sendNotification(io, post.authorId, user, 'comment', post.id, 'post', `commented on your post`);
    }

    io.emit('post:comment_new', { postId: post.id, comment: newComment });

    return res.json({ comment: { ...newComment, isLiked: false }, repliesCount: post.repliesCount });
  });

  // --- VISUALS (PINTEREST-INSPIRED) ROUTES ---

  // Get Visuals with filters & search
  app.get('/api/visuals', (req, res) => {
    const user = getAuthUser(req);
    const category = (req.query.category as string) || '';
    const query = (req.query.q as string || '').toLowerCase().trim();
    const cursor = parseInt(req.query.cursor as string, 10) || Date.now();
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 24, 60);

    let allVisuals = Array.from(visuals.values()).filter((v) => v.createdAt < cursor);

    if (category && category !== 'All') {
      allVisuals = allVisuals.filter(
        (v) => v.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (query) {
      allVisuals = allVisuals.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query) ||
          v.tags.some((t) => t.toLowerCase().includes(query)) ||
          v.authorUsername.toLowerCase().includes(query)
      );
    }

    allVisuals.sort((a, b) => b.createdAt - a.createdAt);
    const sliced = allVisuals.slice(0, limit);
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].createdAt : null;

    const enriched = sliced.map((v) => ({
      ...v,
      isLiked: user ? v.likes.includes(user.id) : false,
      isSaved: user
        ? Array.from(boards.values()).some(
            (b) => b.ownerId === user.id && b.itemIds.includes(v.id)
          )
        : false,
    }));

    return res.json({ visuals: enriched, nextCursor });
  });

  // Get Visual Categories
  app.get('/api/visuals/categories', (_req, res) => {
    const categoriesMap: Record<string, number> = {};
    for (const v of visuals.values()) {
      categoriesMap[v.category] = (categoriesMap[v.category] || 0) + 1;
    }
    const standardCategories = [
      'Technology',
      'Design',
      'Photography',
      'Architecture',
      'Art',
      'Nature',
      'Travel',
      'Fashion',
      'Cars',
      'Lifestyle',
      'Gaming',
      'Food',
    ];

    const list = standardCategories.map((name) => ({
      name,
      count: categoriesMap[name] || 0,
    }));

    return res.json({ categories: list });
  });

  // Create / Upload Visual Pin
  app.post('/api/visuals', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, imageUrl, category, tags, aspectRatio, boardId } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL or upload is required' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const visualId = 'vis_' + crypto.randomUUID().slice(0, 8);
    const tagList: string[] = Array.isArray(tags)
      ? tags.map((t: string) => t.trim().replace(/^#/, ''))
      : extractHashtags(description || '');

    const newVisual: VisualItem = {
      id: visualId,
      authorId: user.id,
      authorUsername: user.username,
      authorDisplayName: user.displayName,
      authorAvatar: user.avatar,
      title: title.trim(),
      description: (description || '').trim(),
      imageUrl,
      aspectRatio: typeof aspectRatio === 'number' && aspectRatio > 0 ? aspectRatio : 1.0,
      category: category || 'Design',
      tags: tagList,
      savesCount: boardId ? 1 : 0,
      likesCount: 0,
      likes: [],
      boardIds: boardId ? [boardId] : [],
      commentsCount: 0,
      createdAt: Date.now(),
    };

    visuals.set(visualId, newVisual);

    // If added directly to a board
    if (boardId) {
      const b = boards.get(boardId);
      if (b && (b.ownerId === user.id || b.collaboratorIds.includes(user.id))) {
        if (!b.itemIds.includes(visualId)) b.itemIds.unshift(visualId);
        if (!b.coverImage) b.coverImage = imageUrl;
        b.updatedAt = Date.now();
      }
    }

    io.emit('visual:new', newVisual);
    return res.json({ visual: { ...newVisual, isLiked: false, isSaved: !!boardId } });
  });

  // Get Visual Details + Related Visuals
  app.get('/api/visuals/:id', (req, res) => {
    const user = getAuthUser(req);
    const visual = visuals.get(req.params.id);
    if (!visual) return res.status(404).json({ error: 'Visual pin not found' });

    // Find related visuals in same category
    const related = Array.from(visuals.values())
      .filter((v) => v.id !== visual.id && v.category === visual.category)
      .slice(0, 8)
      .map((v) => ({
        ...v,
        isLiked: user ? v.likes.includes(user.id) : false,
      }));

    return res.json({
      visual: {
        ...visual,
        isLiked: user ? visual.likes.includes(user.id) : false,
        isSaved: user
          ? Array.from(boards.values()).some(
              (b) => b.ownerId === user.id && b.itemIds.includes(visual.id)
            )
          : false,
      },
      related,
    });
  });

  // Toggle Like Visual
  app.post('/api/visuals/:id/like', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const visual = visuals.get(req.params.id);
    if (!visual) return res.status(404).json({ error: 'Visual pin not found' });

    const idx = visual.likes.indexOf(user.id);
    let isLiked = false;
    if (idx > -1) {
      visual.likes.splice(idx, 1);
      visual.likesCount = Math.max(0, visual.likesCount - 1);
    } else {
      visual.likes.push(user.id);
      visual.likesCount += 1;
      isLiked = true;

      sendNotification(io, visual.authorId, user, 'like', visual.id, 'board', `liked your visual: "${visual.title}"`);
    }

    return res.json({ isLiked, likesCount: visual.likesCount });
  });

  // Save / Unsave Visual to a Board
  app.post('/api/visuals/:id/save', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { boardId } = req.body;
    const visual = visuals.get(req.params.id);
    if (!visual) return res.status(404).json({ error: 'Visual pin not found' });

    let targetBoard: Board | undefined;

    if (boardId) {
      targetBoard = boards.get(boardId);
      if (!targetBoard || (targetBoard.ownerId !== user.id && !targetBoard.collaboratorIds.includes(user.id))) {
        return res.status(403).json({ error: 'Cannot save to this board' });
      }
    } else {
      // Find or create default "Saved Inspiration" board for this user
      targetBoard = Array.from(boards.values()).find(
        (b) => b.ownerId === user.id && b.name === 'Saved Inspiration'
      );
      if (!targetBoard) {
        const newBoardId = 'board_' + crypto.randomUUID().slice(0, 8);
        targetBoard = {
          id: newBoardId,
          ownerId: user.id,
          ownerUsername: user.username,
          ownerDisplayName: user.displayName,
          ownerAvatar: user.avatar,
          name: 'Saved Inspiration',
          description: 'Personal collection of saved visuals and ideas.',
          coverImage: visual.imageUrl,
          isPrivate: false,
          collaboratorIds: [],
          itemIds: [],
          followers: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        boards.set(newBoardId, targetBoard);
      }
    }

    const idx = targetBoard.itemIds.indexOf(visual.id);
    let isSaved = false;

    if (idx > -1) {
      targetBoard.itemIds.splice(idx, 1);
      const bIdx = visual.boardIds.indexOf(targetBoard.id);
      if (bIdx > -1) visual.boardIds.splice(bIdx, 1);
      visual.savesCount = Math.max(0, visual.savesCount - 1);
    } else {
      targetBoard.itemIds.unshift(visual.id);
      if (!targetBoard.coverImage) targetBoard.coverImage = visual.imageUrl;
      if (!visual.boardIds.includes(targetBoard.id)) visual.boardIds.push(targetBoard.id);
      visual.savesCount += 1;
      isSaved = true;

      sendNotification(io, visual.authorId, user, 'board_invite', visual.id, 'board', `saved your pin to "${targetBoard.name}"`);
    }

    targetBoard.updatedAt = Date.now();
    return res.json({ isSaved, boardId: targetBoard.id, savesCount: visual.savesCount });
  });

  // --- BOARDS & COLLECTIONS ROUTES ---

  // Get Boards (by user or public explore)
  app.get('/api/boards', (req, res) => {
    const user = getAuthUser(req);
    const userId = req.query.userId as string;

    let list = Array.from(boards.values());

    if (userId) {
      list = list.filter(
        (b) =>
          b.ownerId === userId ||
          b.collaboratorIds.includes(userId)
      );
      // Privacy check: hide private boards unless user is owner or collaborator
      if (!user || user.id !== userId) {
        list = list.filter((b) => !b.isPrivate || (user && b.collaboratorIds.includes(user.id)));
      }
    } else {
      // Explore public boards
      list = list.filter((b) => !b.isPrivate);
    }

    list.sort((a, b) => b.updatedAt - a.updatedAt);

    const enriched = list.map((b) => ({
      ...b,
      itemsCount: b.itemIds.length,
      isFollowing: user ? b.followers.includes(user.id) : false,
      isOwner: user ? b.ownerId === user.id : false,
    }));

    return res.json({ boards: enriched });
  });

  // Create Board
  app.post('/api/boards', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, coverImage, isPrivate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Board name is required' });

    const boardId = 'board_' + crypto.randomUUID().slice(0, 8);
    const newBoard: Board = {
      id: boardId,
      ownerId: user.id,
      ownerUsername: user.username,
      ownerDisplayName: user.displayName,
      ownerAvatar: user.avatar,
      name: name.trim(),
      description: (description || '').trim(),
      coverImage: coverImage || undefined,
      isPrivate: Boolean(isPrivate),
      collaboratorIds: [],
      itemIds: [],
      followers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    boards.set(boardId, newBoard);
    return res.json({ board: { ...newBoard, isOwner: true, itemsCount: 0, isFollowing: false } });
  });

  // Get Single Board Details + Populated Items
  app.get('/api/boards/:id', (req, res) => {
    const user = getAuthUser(req);
    const board = boards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    // Authorization check for private boards
    if (board.isPrivate && (!user || (user.id !== board.ownerId && !board.collaboratorIds.includes(user.id)))) {
      return res.status(403).json({ error: 'This board is private' });
    }

    // Populate items
    const populatedItems: VisualItem[] = [];
    for (const itemId of board.itemIds) {
      const v = visuals.get(itemId);
      if (v) {
        populatedItems.push({
          ...v,
          isLiked: user ? v.likes.includes(user.id) : false,
          isSaved: true,
        });
      }
    }

    // Populate collaborators
    const collabs = board.collaboratorIds.map((cid) => {
      const u = users.get(cid);
      return {
        id: cid,
        username: u?.username || 'user',
        displayName: u?.displayName || 'User',
        avatar: u?.avatar || '',
        isOnline: false,
        lastSeen: null,
        publicKeyFingerprint: '',
      };
    });

    return res.json({
      board: {
        ...board,
        items: populatedItems,
        collaborators: collabs,
        itemsCount: populatedItems.length,
        isOwner: user ? board.ownerId === user.id : false,
        isFollowing: user ? board.followers.includes(user.id) : false,
      },
    });
  });

  // Edit Board
  app.patch('/api/boards/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const board = boards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== user.id && !board.collaboratorIds.includes(user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, coverImage, isPrivate } = req.body;
    if (name && name.trim()) board.name = name.trim();
    if (description !== undefined) board.description = description.trim();
    if (coverImage !== undefined) board.coverImage = coverImage;
    if (isPrivate !== undefined && board.ownerId === user.id) {
      board.isPrivate = Boolean(isPrivate);
    }
    board.updatedAt = Date.now();

    return res.json({ board });
  });

  // Delete Board
  app.delete('/api/boards/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const board = boards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the board owner can delete it' });
    }

    boards.delete(req.params.id);
    return res.json({ success: true, id: req.params.id });
  });

  // Add / Remove Collaborator to Board
  app.post('/api/boards/:id/collaborators', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const board = boards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.ownerId !== user.id) return res.status(403).json({ error: 'Only board owner can invite collaborators' });

    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const targetId = usersByUsername.get(username.trim().toLowerCase());
    if (!targetId) return res.status(404).json({ error: 'User not found' });
    if (targetId === user.id) return res.status(400).json({ error: 'You are already the owner' });

    if (!board.collaboratorIds.includes(targetId)) {
      board.collaboratorIds.push(targetId);
      sendNotification(io, targetId, user, 'board_invite', board.id, 'board', `invited you to collaborate on "${board.name}"`);
    }

    return res.json({ success: true, collaboratorIds: board.collaboratorIds });
  });

  // Follow / Unfollow Board
  app.post('/api/boards/:id/follow', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const board = boards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.isPrivate) return res.status(403).json({ error: 'Cannot follow a private board' });

    const idx = board.followers.indexOf(user.id);
    let isFollowing = false;
    if (idx > -1) {
      board.followers.splice(idx, 1);
    } else {
      board.followers.push(user.id);
      isFollowing = true;
      sendNotification(io, board.ownerId, user, 'follow', board.id, 'board', `started following your board "${board.name}"`);
    }

    return res.json({ isFollowing, followersCount: board.followers.length });
  });

  // --- USERS & SOCIAL PROFILES ---

  // Get User Profile by @username
  app.get('/api/users/profile/:username', (req, res) => {
    const authUser = getAuthUser(req);
    const targetUsername = req.params.username.trim().toLowerCase().replace(/^@/, '');
    const userId = usersByUsername.get(targetUsername);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const targetUser = users.get(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Count user's posts
    let postCount = 0;
    for (const p of posts.values()) {
      if (p.authorId === targetUser.id) postCount++;
    }

    const isFollowing = authUser ? targetUser.followers?.includes(authUser.id) || false : false;
    const isBlocked = authUser ? authUser.blockedUsers?.includes(targetUser.id) || false : false;
    const isMuted = authUser ? authUser.mutedUsers?.includes(targetUser.id) || false : false;
    const isSelf = authUser ? authUser.id === targetUser.id : false;

    const { passwordHash: _, email: __, ...safeUser } = targetUser;

    return res.json({
      user: {
        ...safeUser,
        followersCount: targetUser.followers?.length || 0,
        followingCount: targetUser.following?.length || 0,
        postCount,
        isFollowing,
        isBlocked,
        isMuted,
        isSelf,
      },
    });
  });

  // Get Posts by User (for Profile Tabs: posts, replies, media, boards, likes)
  app.get('/api/users/:username/posts', (req, res) => {
    const authUser = getAuthUser(req);
    const targetUsername = req.params.username.trim().toLowerCase().replace(/^@/, '');
    const userId = usersByUsername.get(targetUsername);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const targetUser = users.get(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const tab = (req.query.tab as string) || 'posts';

    let userPosts: Post[] = [];

    if (tab === 'likes') {
      userPosts = Array.from(posts.values()).filter((p) => p.likes.includes(targetUser.id));
    } else if (tab === 'media') {
      userPosts = Array.from(posts.values()).filter(
        (p) => p.authorId === targetUser.id && p.mediaUrls && p.mediaUrls.length > 0
      );
    } else {
      userPosts = Array.from(posts.values()).filter((p) => p.authorId === targetUser.id);
    }

    userPosts.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = userPosts.map((p) => ({
      ...p,
      isLiked: authUser ? p.likes.includes(authUser.id) : false,
      isReposted: authUser ? p.reposts.includes(authUser.id) : false,
      isBookmarked: authUser ? authUser.savedPostIds?.includes(p.id) : false,
    }));

    return res.json({ posts: enriched });
  });

  // Follow / Unfollow User
  app.post('/api/users/:id/follow', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const targetUser = users.get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.id === user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    if (!user.following) user.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    const idx = user.following.indexOf(targetUser.id);
    let isFollowing = false;

    if (idx > -1) {
      user.following.splice(idx, 1);
      const fIdx = targetUser.followers.indexOf(user.id);
      if (fIdx > -1) targetUser.followers.splice(fIdx, 1);
    } else {
      user.following.push(targetUser.id);
      targetUser.followers.push(user.id);
      isFollowing = true;

      sendNotification(io, targetUser.id, user, 'follow', user.id, 'user', `started following you`);
    }

    return res.json({
      isFollowing,
      followersCount: targetUser.followers.length,
      followingCount: user.following.length,
    });
  });

  // Block / Unblock User
  app.post('/api/users/:id/block', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!user.blockedUsers) user.blockedUsers = [];
    const targetId = req.params.id;
    const idx = user.blockedUsers.indexOf(targetId);
    let isBlocked = false;

    if (idx > -1) {
      user.blockedUsers.splice(idx, 1);
    } else {
      user.blockedUsers.push(targetId);
      isBlocked = true;
      // Also remove follow relationships if any
      user.following = user.following?.filter((id) => id !== targetId) || [];
      const target = users.get(targetId);
      if (target) {
        target.followers = target.followers?.filter((id) => id !== user.id) || [];
      }
    }

    return res.json({ isBlocked });
  });

  // Mute / Unmute User
  app.post('/api/users/:id/mute', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!user.mutedUsers) user.mutedUsers = [];
    const targetId = req.params.id;
    const idx = user.mutedUsers.indexOf(targetId);
    let isMuted = false;

    if (idx > -1) {
      user.mutedUsers.splice(idx, 1);
    } else {
      user.mutedUsers.push(targetId);
      isMuted = true;
    }

    return res.json({ isMuted });
  });

  // Suggested Users
  app.get('/api/users/suggestions', (req, res) => {
    const user = getAuthUser(req);
    const all = Array.from(users.values());
    const suggestions = all
      .filter((u) => (!user || u.id !== user.id) && (!user || !user.following?.includes(u.id)))
      .slice(0, 6)
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        followersCount: u.followers?.length || 0,
        isFollowing: false,
      }));

    return res.json({ users: suggestions });
  });

  // Current User Saved Bookmarks
  app.get('/api/users/me/bookmarks', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const savedIds = user.savedPostIds || [];
    const bookmarkedPosts: Post[] = [];

    for (const id of savedIds) {
      const p = posts.get(id);
      if (p) {
        bookmarkedPosts.push({
          ...p,
          isLiked: p.likes.includes(user.id),
          isReposted: p.reposts.includes(user.id),
          isBookmarked: true,
        });
      }
    }

    bookmarkedPosts.sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ posts: bookmarkedPosts });
  });

  // --- EXPLORE, SEARCH & TRENDING ---

  // Trending Topics (calculated from actual post engagement & hashtags)
  app.get('/api/explore/trending', (_req, res) => {
    const tagCounts: Record<string, { count: number; category: string }> = {};

    for (const p of posts.values()) {
      for (const h of p.hashtags) {
        if (!tagCounts[h]) {
          tagCounts[h] = { count: 0, category: p.category || 'Trending' };
        }
        tagCounts[h].count += 1 + p.likeCount * 0.5 + p.repostCount * 1;
      }
    }

    // Default trending list if few hashtags yet
    const defaults = [
      { tag: 'Technology', count: 1420, category: 'Tech' },
      { tag: 'Minimalism', count: 980, category: 'Design' },
      { tag: 'Architecture', count: 850, category: 'Living' },
      { tag: 'PrivacyFirst', count: 720, category: 'Security' },
      { tag: 'AuraSocial', count: 640, category: 'Community' },
    ];

    const sortedTags: TrendingTopic[] = Object.entries(tagCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([tag, data], index) => ({
        tag,
        category: data.category,
        postCount: Math.round(data.count * 12 + 45),
        trendRank: index + 1,
      }));

    if (sortedTags.length < 5) {
      defaults.forEach((d, i) => {
        if (!sortedTags.some((st) => st.tag.toLowerCase() === d.tag.toLowerCase())) {
          sortedTags.push({
            tag: d.tag,
            category: d.category,
            postCount: d.count,
            trendRank: sortedTags.length + 1,
          });
        }
      });
    }

    return res.json({ trending: sortedTags.slice(0, 6) });
  });

  // Global Search across Posts, Users, Visuals, Boards
  app.get('/api/explore/search', (req, res) => {
    const user = getAuthUser(req);
    const query = (req.query.q as string || '').toLowerCase().trim();
    const type = (req.query.type as string) || 'all';

    const results: {
      posts: any[];
      users: any[];
      visuals: any[];
      boards: any[];
    } = {
      posts: [],
      users: [],
      visuals: [],
      boards: [],
    };

    if (!query) {
      return res.json({ results });
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      const matchedPosts = Array.from(posts.values()).filter(
        (p) =>
          p.content.toLowerCase().includes(query) ||
          p.hashtags.some((h) => h.includes(query)) ||
          p.authorUsername.toLowerCase().includes(query)
      );
      results.posts = matchedPosts.slice(0, 20).map((p) => ({
        ...p,
        isLiked: user ? p.likes.includes(user.id) : false,
        isReposted: user ? p.reposts.includes(user.id) : false,
        isBookmarked: user ? user.savedPostIds?.includes(p.id) : false,
      }));
    }

    // Search Users
    if (type === 'all' || type === 'people') {
      const matchedUsers = Array.from(users.values()).filter(
        (u) =>
          u.username.toLowerCase().includes(query) ||
          u.displayName.toLowerCase().includes(query) ||
          u.bio.toLowerCase().includes(query)
      );
      results.users = matchedUsers.slice(0, 15).map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        followersCount: u.followers?.length || 0,
        isFollowing: user ? u.followers?.includes(user.id) : false,
      }));
    }

    // Search Visuals
    if (type === 'all' || type === 'visuals') {
      const matchedVisuals = Array.from(visuals.values()).filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query) ||
          v.tags.some((t) => t.toLowerCase().includes(query))
      );
      results.visuals = matchedVisuals.slice(0, 20).map((v) => ({
        ...v,
        isLiked: user ? v.likes.includes(user.id) : false,
      }));
    }

    // Search Boards
    if (type === 'all' || type === 'boards') {
      const matchedBoards = Array.from(boards.values()).filter(
        (b) =>
          (!b.isPrivate || (user && (b.ownerId === user.id || b.collaboratorIds.includes(user.id)))) &&
          (b.name.toLowerCase().includes(query) || b.description.toLowerCase().includes(query))
      );
      results.boards = matchedBoards.slice(0, 15).map((b) => ({
        ...b,
        itemsCount: b.itemIds.length,
        isFollowing: user ? b.followers.includes(user.id) : false,
      }));
    }

    return res.json({ results });
  });

  // --- NOTIFICATIONS ---

  // Get notifications
  app.get('/api/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const userNotifs = notifications.get(user.id) || [];
    return res.json({ notifications: userNotifs.slice(0, 50) });
  });

  // Mark notifications read
  app.patch('/api/notifications/read', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id, all } = req.body;
    const userNotifs = notifications.get(user.id) || [];

    if (all) {
      userNotifs.forEach((n) => (n.isRead = true));
    } else if (id) {
      const found = userNotifs.find((n) => n.id === id);
      if (found) found.isRead = true;
    }

    return res.json({ success: true });
  });

  // --- REPORTS & MODERATION (ADMIN) ---

  // Submit Content Report
  app.post('/api/reports', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
    }

    const reportId = 'rep_' + crypto.randomUUID().slice(0, 8);
    const newReport: Report = {
      id: reportId,
      reporterId: user.id,
      reporterUsername: user.username,
      targetType,
      targetId,
      reason: String(reason).trim(),
      status: 'pending',
      createdAt: Date.now(),
    };

    reports.set(reportId, newReport);
    return res.json({ success: true, report: newReport });
  });

  // Admin Reports List
  app.get('/api/admin/reports', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return res.json({ reports: Array.from(reports.values()).sort((a, b) => b.createdAt - a.createdAt) });
  });

  // Admin Update Report Status
  app.patch('/api/admin/reports/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const report = reports.get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const { status } = req.body;
    if (status) report.status = status;

    return res.json({ report });
  });

  // Admin Platform Statistics
  app.get('/api/admin/stats', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return res.json({
      stats: {
        totalUsers: users.size,
        totalPosts: posts.size,
        totalVisuals: visuals.size,
        totalBoards: boards.size,
        totalReports: reports.size,
        pendingReports: Array.from(reports.values()).filter((r) => r.status === 'pending').length,
      },
    });
  });

  // Admin Moderate Post
  app.post('/api/admin/posts/:id/moderate', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action } = req.body; // 'delete' or 'hide'
    if (action === 'delete') {
      posts.delete(req.params.id);
      comments.delete(req.params.id);
      io.emit('post:deleted', { id: req.params.id });
    }

    return res.json({ success: true });
  });

  // Admin Suspend User
  app.post('/api/admin/users/:id/suspend', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const target = users.get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    target.isSuspended = true;
    return res.json({ success: true, user: target });
  });
}

// Seed Initial Aura Social Ecosystem
export function seedSocialData(context: {
  users: Map<string, ServerUser>;
  usersByUsername: Map<string, string>;
  usersByEmail: Map<string, string>;
  conversations: Map<string, any>;
  messages: Map<string, any[]>;
}) {
  const { users, usersByUsername, usersByEmail, conversations, messages: convMessages } = context;

  // Don't re-seed if already seeded
  if (usersByUsername.has('malak')) return;

  const demoUsers: ServerUser[] = [
    {
      id: 'user_malak',
      username: 'malak',
      email: 'malak@aura.social',
      displayName: 'Malak Al-Sayed',
      bio: 'Product Designer & Visual Curator. Building clean, quiet software. Exploring computational aesthetics and typography.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverBanner: 'linear-gradient(135deg, #5036FF 0%, #8B5CF6 50%, #EC4899 100%)',
      website: 'https://malak.design',
      location: 'Dubai & Remote',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin123'
      statusMessage: 'Designing Aura Social ✨',
      publicKeyFingerprint: 'A1B2-C3D4-E5F6',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
      lastSeen: null,
      followers: ['user_elena', 'user_kai', 'user_auradev'],
      following: ['user_elena', 'user_kai', 'user_auradev', 'user_marcus'],
      blockedUsers: [],
      mutedUsers: [],
      isPrivate: false,
      role: 'admin',
      savedPostIds: [],
    },
    {
      id: 'user_elena',
      username: 'elena',
      email: 'elena@aura.social',
      displayName: 'Elena Vance',
      bio: 'Architectural Photographer & Visual Thinker. Nordic light, raw concrete, and brutalist geometries. #minimalism',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      coverBanner: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
      website: 'https://elenavance.photo',
      location: 'Stockholm, Sweden',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      statusMessage: 'Shooting in Iceland 📷',
      publicKeyFingerprint: '94A2-B7C1-4D3E',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25,
      lastSeen: Date.now() - 1000 * 60 * 15,
      followers: ['user_malak', 'user_kai'],
      following: ['user_malak', 'user_auradev'],
      blockedUsers: [],
      mutedUsers: [],
      isPrivate: false,
      role: 'user',
      savedPostIds: [],
    },
    {
      id: 'user_kai',
      username: 'kai',
      email: 'kai@aura.social',
      displayName: 'Kai Tanaka',
      bio: 'Creative Technologist. Shaders, WebGL, cryptography, and distributed real-time systems. Building the decentralized web.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      coverBanner: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
      website: 'https://kaitanka.dev',
      location: 'Tokyo, Japan',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      statusMessage: 'Writing Web Crypto algorithms ⚡',
      publicKeyFingerprint: '38F1-79A2-D08E',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
      lastSeen: null,
      followers: ['user_malak', 'user_marcus'],
      following: ['user_malak', 'user_elena', 'user_auradev'],
      blockedUsers: [],
      mutedUsers: [],
      isPrivate: false,
      role: 'user',
      savedPostIds: [],
    },
    {
      id: 'user_auradev',
      username: 'aura',
      email: 'team@aura.social',
      displayName: 'Aura Official',
      bio: 'The next-generation social discovery platform. Sharing ideas, discovering visuals, and connecting privately with end-to-end encryption.',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      coverBanner: 'linear-gradient(135deg, #5036FF 0%, #4338CA 100%)',
      website: 'https://aura.social',
      location: 'Global',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      statusMessage: 'Welcome to Aura 💜',
      publicKeyFingerprint: '7777-8888-9999',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
      lastSeen: null,
      followers: ['user_malak', 'user_elena', 'user_kai'],
      following: [],
      blockedUsers: [],
      mutedUsers: [],
      isPrivate: false,
      role: 'admin',
      savedPostIds: [],
    },
    {
      id: 'user_marcus',
      username: 'marcus',
      email: 'marcus@aura.social',
      displayName: 'Marcus Thorne',
      bio: 'Design Director & Industrial Typographer. Exploring physical materials, tactile ergonomics, and spatial computing.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      coverBanner: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
      website: 'https://marcusthorne.design',
      location: 'London, UK',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      statusMessage: 'In the design studio 📐',
      publicKeyFingerprint: '55E4-12A8-99C0',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
      lastSeen: Date.now() - 1000 * 60 * 45,
      followers: ['user_malak'],
      following: ['user_malak', 'user_kai'],
      blockedUsers: [],
      mutedUsers: [],
      isPrivate: false,
      role: 'user',
      savedPostIds: [],
    },
  ];

  for (const u of demoUsers) {
    users.set(u.id, u);
    usersByUsername.set(u.username, u.id);
    usersByEmail.set(u.email, u.id);
  }

  // Seed Initial Posts
  const demoPosts: Post[] = [
    {
      id: 'post_1',
      authorId: 'user_auradev',
      authorUsername: 'aura',
      authorDisplayName: 'Aura Official',
      authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      content: 'Welcome to Aura — where social discovery meets private encrypted messaging. Share your thoughts, curate visual mood boards, and connect deeply without compromising your data privacy. #AuraSocial #privacy #technology',
      mediaUrls: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      ],
      hashtags: ['aurasocial', 'privacy', 'technology'],
      mentions: [],
      likes: ['user_malak', 'user_elena', 'user_kai'],
      reposts: ['user_malak', 'user_kai'],
      bookmarks: ['user_malak'],
      repliesCount: 3,
      repostCount: 14,
      likeCount: 42,
      category: 'Announcements',
      visibility: 'public',
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
    },
    {
      id: 'post_2',
      authorId: 'user_malak',
      authorUsername: 'malak',
      authorDisplayName: 'Malak Al-Sayed',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: 'Which visual design philosophy resonates most with modern user interfaces today? We are balancing structural clarity with tactile warmth. Cast your vote below! #design #minimalism #ux',
      mediaUrls: [],
      poll: {
        question: 'Preferred visual design direction for 2026:',
        options: [
          { id: 'opt_0', text: 'Clean Neo-Grotesque & Hairlines', votes: ['user_kai', 'user_marcus'] },
          { id: 'opt_1', text: 'Soft Tactile Warmth & Off-White', votes: ['user_elena'] },
          { id: 'opt_2', text: 'Deep Monochromatic Obsidian', votes: [] },
        ],
        expiresAt: Date.now() + 1000 * 60 * 60 * 48,
      },
      hashtags: ['design', 'minimalism', 'ux'],
      mentions: [],
      likes: ['user_elena', 'user_kai', 'user_marcus'],
      reposts: ['user_elena'],
      bookmarks: [],
      repliesCount: 4,
      repostCount: 8,
      likeCount: 35,
      category: 'Design',
      visibility: 'public',
      createdAt: Date.now() - 1000 * 60 * 60 * 5,
    },
    {
      id: 'post_3',
      authorId: 'user_elena',
      authorUsername: 'elena',
      authorDisplayName: 'Elena Vance',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      content: 'Early morning light piercing the brutalist concrete facades in northern Sweden. There is a sacred quietness when architecture embraces natural shadows. #architecture #nordic #photography',
      mediaUrls: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
      ],
      hashtags: ['architecture', 'nordic', 'photography'],
      mentions: ['malak'],
      likes: ['user_malak', 'user_kai'],
      reposts: ['user_malak'],
      bookmarks: ['user_malak'],
      repliesCount: 2,
      repostCount: 5,
      likeCount: 28,
      category: 'Architecture',
      locationTag: 'Stockholm, Sweden',
      visibility: 'public',
      createdAt: Date.now() - 1000 * 60 * 60 * 8,
    },
    {
      id: 'post_4',
      authorId: 'user_kai',
      authorUsername: 'kai',
      authorDisplayName: 'Kai Tanaka',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      content: 'Running zero-knowledge encryption directly inside the browser using SubtleCrypto AES-GCM and ECDH key agreements. The performance in 2026 is virtually instantaneous. True privacy should be the default, not a premium perk. #technology #crypto #privacy',
      mediaUrls: [],
      hashtags: ['technology', 'crypto', 'privacy'],
      mentions: [],
      likes: ['user_malak', 'user_auradev'],
      reposts: ['user_auradev'],
      bookmarks: [],
      repliesCount: 1,
      repostCount: 11,
      likeCount: 54,
      category: 'Technology',
      visibility: 'public',
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
    },
  ];

  for (const p of demoPosts) {
    posts.set(p.id, p);
    comments.set(p.id, [
      {
        id: 'com_' + p.id + '_1',
        postId: p.id,
        authorId: 'user_malak',
        authorUsername: 'malak',
        authorDisplayName: 'Malak Al-Sayed',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        content: 'This reflects exactly the balance we are striving for across the platform.',
        likes: ['user_kai'],
        createdAt: p.createdAt + 1000 * 60 * 15,
      },
    ]);
  }

  // Seed Initial Visual Pins (Pinterest Style)
  const demoVisuals: VisualItem[] = [
    {
      id: 'vis_1',
      authorId: 'user_malak',
      authorUsername: 'malak',
      authorDisplayName: 'Malak Al-Sayed',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: 'Minimalist Monolithic Glass & Concrete Villa',
      description: 'Clean architectural lines, expansive reflective infinity pool, and seamless indoor-outdoor transitions.',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 0.75, // 3:4 portrait
      category: 'Architecture',
      tags: ['minimalism', 'concrete', 'villa', 'architecture'],
      savesCount: 124,
      likesCount: 89,
      likes: ['user_elena', 'user_kai'],
      boardIds: ['board_arch_1'],
      commentsCount: 12,
      createdAt: Date.now() - 1000 * 60 * 60 * 18,
    },
    {
      id: 'vis_2',
      authorId: 'user_elena',
      authorUsername: 'elena',
      authorDisplayName: 'Elena Vance',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      title: 'Nordic Glacial River & Volcanic Sand',
      description: 'Abstract aerial patterns created by glacial mineral runoff flowing through deep Icelandic black sand.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 1.33, // 4:3
      category: 'Nature',
      tags: ['iceland', 'aerial', 'glacier', 'landscape'],
      savesCount: 96,
      likesCount: 142,
      likes: ['user_malak'],
      boardIds: ['board_photo_1'],
      commentsCount: 8,
      createdAt: Date.now() - 1000 * 60 * 60 * 22,
    },
    {
      id: 'vis_3',
      authorId: 'user_kai',
      authorUsername: 'kai',
      authorDisplayName: 'Kai Tanaka',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      title: 'Industrial Workspace & Tactile Mechanical Setup',
      description: 'A study in ergonomic workstation design with warm wood textures, bespoke custom audio gear, and soft daylight.',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 0.8,
      category: 'Design',
      tags: ['workspace', 'desksetup', 'minimal', 'hardware'],
      savesCount: 210,
      likesCount: 178,
      likes: ['user_malak', 'user_marcus'],
      boardIds: ['board_ui_1'],
      commentsCount: 15,
      createdAt: Date.now() - 1000 * 60 * 60 * 28,
    },
    {
      id: 'vis_4',
      authorId: 'user_marcus',
      authorUsername: 'marcus',
      authorDisplayName: 'Marcus Thorne',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      title: 'Tokyo Twilight Streetwear Editorial',
      description: 'Monochromatic tailored wool overcoat amidst the ambient neon reflections of Shibuya alleyways.',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 0.72,
      category: 'Fashion',
      tags: ['fashion', 'streetwear', 'tokyo', 'editorial'],
      savesCount: 88,
      likesCount: 95,
      likes: ['user_elena'],
      boardIds: [],
      commentsCount: 4,
      createdAt: Date.now() - 1000 * 60 * 60 * 36,
    },
    {
      id: 'vis_5',
      authorId: 'user_malak',
      authorUsername: 'malak',
      authorDisplayName: 'Malak Al-Sayed',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: 'Curated Typographic Book & Spatial Layout',
      description: 'Grid-based editorial publication design utilizing high-contrast Swiss typography and uncoated cotton paper.',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 1.25,
      category: 'Art',
      tags: ['typography', 'editorial', 'print', 'swiss'],
      savesCount: 145,
      likesCount: 110,
      likes: ['user_marcus'],
      boardIds: ['board_ui_1'],
      commentsCount: 9,
      createdAt: Date.now() - 1000 * 60 * 60 * 40,
    },
    {
      id: 'vis_6',
      authorId: 'user_kai',
      authorUsername: 'kai',
      authorDisplayName: 'Kai Tanaka',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      title: 'Futuristic Electric Mobility Concept',
      description: 'Sculptural aerodynamic curves and seamless flush glass surfaces in an open brutalist pavilion.',
      imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
      aspectRatio: 0.75,
      category: 'Cars',
      tags: ['electric', 'concept', 'automotive', 'design'],
      savesCount: 167,
      likesCount: 182,
      likes: ['user_malak'],
      boardIds: [],
      commentsCount: 11,
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
    },
  ];

  for (const v of demoVisuals) {
    visuals.set(v.id, v);
  }

  // Seed Boards
  const demoBoards: Board[] = [
    {
      id: 'board_ui_1',
      ownerId: 'user_malak',
      ownerUsername: 'malak',
      ownerDisplayName: 'Malak Al-Sayed',
      ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      name: 'UI/UX & Spatial Inspiration',
      description: 'Collection of thoughtful product interfaces, tactile hardware, and clean Swiss typography.',
      coverImage: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      isPrivate: false,
      collaboratorIds: ['user_kai'],
      itemIds: ['vis_3', 'vis_5'],
      followers: ['user_elena', 'user_marcus'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
      updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    },
    {
      id: 'board_arch_1',
      ownerId: 'user_elena',
      ownerUsername: 'elena',
      ownerDisplayName: 'Elena Vance',
      ownerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      name: 'Monolithic Architecture',
      description: 'Brutalist concrete, glass facades, and raw structural beauty from around the globe.',
      coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      isPrivate: false,
      collaboratorIds: ['user_malak'],
      itemIds: ['vis_1'],
      followers: ['user_malak', 'user_kai'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
      updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    },
    {
      id: 'board_photo_1',
      ownerId: 'user_elena',
      ownerUsername: 'elena',
      ownerDisplayName: 'Elena Vance',
      ownerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      name: 'Nordic Horizons',
      description: 'Aerial perspectives, volcanic terrain, and moody Scandinavian atmospheres.',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      isPrivate: false,
      collaboratorIds: [],
      itemIds: ['vis_2'],
      followers: ['user_malak'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
      updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    },
  ];

  for (const b of demoBoards) {
    boards.set(b.id, b);
  }

  // Seed Direct Conversation between @malak and @kai in Aura Messenger
  const convId = 'conv_demo_malak_kai';
  conversations.set(convId, {
    id: convId,
    type: 'direct',
    createdBy: 'user_malak',
    admins: ['user_malak', 'user_kai'],
    participantIds: ['user_malak', 'user_kai'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 30,
    lastMessage: {
      id: 'msg_init_1',
      senderUsername: 'kai',
      ciphertext: 'The new encrypted visual boards are ready to test. Check out the inspiration board!',
      type: 'text',
      createdAt: Date.now() - 1000 * 60 * 30,
    },
  });

  convMessages.set(convId, [
    {
      id: 'msg_init_1',
      conversationId: convId,
      senderId: 'user_kai',
      senderUsername: 'kai',
      senderDisplayName: 'Kai Tanaka',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      ciphertext: 'The new encrypted visual boards are ready to test. Check out the inspiration board!',
      iv: 'dGVzdC1pdi0yMDI2',
      keyFingerprint: 'AES-GCM-256',
      type: 'text',
      createdAt: Date.now() - 1000 * 60 * 30,
      reactions: [{ emoji: '🔥', userId: 'user_malak', username: 'malak' }],
      deliveredTo: ['user_malak', 'user_kai'],
      readBy: [{ userId: 'user_malak', readAt: Date.now() - 1000 * 60 * 20 }],
    },
  ]);
}
