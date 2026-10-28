import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share2,
  MoreHorizontal,
  Trash2,
  Flag,
  Check,
  Send,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Post, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';

interface PostCardProps {
  post: Post;
  onOpenReport?: (type: 'post', id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpenReport }) => {
  const { user } = useAuth();
  const {
    likePost,
    repostPost,
    bookmarkPost,
    deletePost,
    addComment,
    votePoll,
    setViewingUsername,
    setCurrentTab,
    followUser,
    suggestedUsers,
    openShareToChat,
  } = useSocial();

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isOwner = user?.id === post.authorId;
  const isSuggested = suggestedUsers.find((u) => u.id === post.authorId);
  const canFollow = user && !isOwner && isSuggested && !isSuggested.isFollowing;

  // Format relative timestamp
  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Load comments on expand
  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setIsLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = await addComment(post.id, commentText.trim());
    if (newComment) {
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setShowMenu(false);
  };

  const handleAuthorClick = () => {
    setViewingUsername(post.authorUsername);
    setCurrentTab('profile');
  };

  // Text formatter for hashtags and mentions
  const renderFormattedText = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('#') && word.length > 1) {
        return (
          <span
            key={i}
            onClick={() => setCurrentTab('explore')}
            className="text-[#5036FF] font-medium hover:underline cursor-pointer"
          >
            {word}
          </span>
        );
      }
      if (word.startsWith('@') && word.length > 1) {
        return (
          <span
            key={i}
            onClick={() => {
              setViewingUsername(word.slice(1).replace(/[^a-zA-Z0-9_]/g, ''));
              setCurrentTab('profile');
            }}
            className="text-[#5036FF] font-medium hover:underline cursor-pointer"
          >
            {word}
          </span>
        );
      }
      return word;
    });
  };

  // Calculate poll votes total
  const pollTotalVotes = post.poll
    ? post.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)
    : 0;

  return (
    <article className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all mb-3.5">
      {/* Lightbox for media zoom */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Header: Author + Meta + Menu */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={post.authorAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + post.authorUsername}
            alt=""
            onClick={handleAuthorClick}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 hover:ring-[#5036FF] transition-all cursor-pointer shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={handleAuthorClick}
                className="text-sm font-bold text-slate-900 hover:text-[#5036FF] transition-colors cursor-pointer truncate"
              >
                {post.authorDisplayName || post.authorUsername}
              </span>
              <span
                onClick={handleAuthorClick}
                className="text-xs text-slate-400 font-mono hover:text-slate-600 cursor-pointer"
              >
                @{post.authorUsername}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400 font-mono">{formatTime(post.createdAt)}</span>
              {post.category && post.category !== 'General' && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-[11px] text-[#5036FF] font-medium">{post.category}</span>
                </>
              )}
            </div>

            {post.locationTag && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {post.locationTag}
              </span>
            )}
          </div>
        </div>

        {/* Follow button & More options */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          {canFollow && (
            <button
              type="button"
              onClick={() => followUser(post.authorId)}
              className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-[#5036FF] hover:text-white rounded-xl text-slate-700 transition-all cursor-pointer"
            >
              Follow
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* More options menu */}
          {showMenu && (
            <div className="absolute top-8 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 w-44 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  openShareToChat({
                    type: 'post',
                    id: post.id,
                    title: `Post by @${post.authorUsername}`,
                    preview: post.content.slice(0, 100) || 'Media attachment',
                  });
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#5036FF]" />
                <span>Share to Chat</span>
              </button>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Delete this post?')) deletePost(post.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenReport?.('post', post.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      {post.content && (
        <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap select-text mb-3">
          {renderFormattedText(post.content)}
        </p>
      )}

      {/* Media Gallery */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className={`grid gap-2 mb-3.5 rounded-2xl overflow-hidden ${
            post.mediaUrls.length === 1
              ? 'grid-cols-1'
              : post.mediaUrls.length === 2
              ? 'grid-cols-2 aspect-2/1'
              : post.mediaUrls.length === 3
              ? 'grid-cols-2'
              : 'grid-cols-2 aspect-square'
          }`}
        >
          {post.mediaUrls.map((url, i) => (
            <div
              key={i}
              onClick={() => setLightboxImage(url)}
              className={`relative overflow-hidden cursor-zoom-in group bg-slate-100 ${
                post.mediaUrls.length === 3 && i === 0 ? 'row-span-2' : ''
              }`}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 max-h-96"
              />
            </div>
          ))}
        </div>
      )}

      {/* Interactive Poll */}
      {post.poll && (
        <div className="mb-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
          <span className="text-xs font-bold text-slate-900 block">{post.poll.question}</span>

          <div className="space-y-1.5">
            {post.poll.options.map((opt) => {
              const hasVoted = user && opt.votes.includes(user.id);
              const percentage =
                pollTotalVotes > 0 ? Math.round((opt.votes.length / pollTotalVotes) * 100) : 0;

              return (
                <div
                  key={opt.id}
                  onClick={() => votePoll(post.id, opt.id)}
                  className={`relative overflow-hidden p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    hasVoted
                      ? 'border-[#5036FF] bg-indigo-50/50'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Progress fill bar */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      hasVoted ? 'bg-[#5036FF]/15' : 'bg-slate-100'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      {opt.text}
                      {hasVoted && <Check className="w-3.5 h-3.5 text-[#5036FF]" />}
                    </span>
                    <span className="font-mono text-slate-500">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span>{pollTotalVotes} total votes</span>
            <span>
              {Date.now() > post.poll.expiresAt ? 'Final results' : 'Poll open'}
            </span>
          </div>
        </div>
      )}

      {/* Quoted Post Preview */}
      {post.quotedPost && (
        <div className="mb-3.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
          <div className="flex items-center gap-2">
            <img
              src={post.quotedPost.authorAvatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="text-xs font-bold text-slate-800">
              {post.quotedPost.authorDisplayName}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              @{post.quotedPost.authorUsername}
            </span>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2">{post.quotedPost.content}</p>
        </div>
      )}

      {/* Interaction Controls */}
      <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100">
        {/* Like Button */}
        <button
          type="button"
          onClick={() => likePost(post.id)}
          className={`flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-xl transition-all cursor-pointer ${
            post.isLiked
              ? 'text-rose-600 bg-rose-50'
              : 'hover:text-rose-600 hover:bg-rose-50/60'
          }`}
          title="Like"
        >
          <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
          <span className="font-mono">{post.likeCount > 0 ? post.likeCount : ''}</span>
        </button>

        {/* Comment Button */}
        <button
          type="button"
          onClick={toggleComments}
          className={`flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-xl transition-all cursor-pointer ${
            showComments
              ? 'text-[#5036FF] bg-[#5036FF]/10'
              : 'hover:text-[#5036FF] hover:bg-[#5036FF]/10'
          }`}
          title="Comments"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-mono">{post.repliesCount > 0 ? post.repliesCount : ''}</span>
        </button>

        {/* Repost Button */}
        <button
          type="button"
          onClick={() => repostPost(post.id)}
          className={`flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-xl transition-all cursor-pointer ${
            post.isReposted
              ? 'text-emerald-600 bg-emerald-50'
              : 'hover:text-emerald-600 hover:bg-emerald-50/60'
          }`}
          title="Repost"
        >
          <Repeat2 className="w-4 h-4" />
          <span className="font-mono">{post.repostCount > 0 ? post.repostCount : ''}</span>
        </button>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={() => bookmarkPost(post.id)}
          className={`flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-xl transition-all cursor-pointer ${
            post.isBookmarked
              ? 'text-amber-600 bg-amber-50'
              : 'hover:text-amber-600 hover:bg-amber-50/60'
          }`}
          title="Bookmark"
        >
          <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
        </button>

        {/* Share Button (opens Share to Chat modal) */}
        <button
          type="button"
          onClick={() =>
            openShareToChat({
              type: 'post',
              id: post.id,
              title: `Post by @${post.authorUsername}`,
              preview: post.content.slice(0, 100) || 'Media attachment',
            })
          }
          className="flex items-center gap-1 text-xs font-semibold p-1.5 text-slate-500 hover:text-[#5036FF] hover:bg-[#5036FF]/10 rounded-xl transition-colors cursor-pointer"
          title="Share to encrypted chat"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Comments Thread */}
      {showComments && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Reply to this post..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                commentText.trim()
                  ? 'bg-[#5036FF] text-white hover:bg-[#432bdb]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Reply
            </button>
          </form>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="text-center py-4 text-xs text-slate-400">Loading replies...</div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No replies yet. Be the first!</p>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 p-2 rounded-2xl bg-slate-50/70 border border-slate-200/60">
                  <img
                    src={c.authorAvatar}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.authorDisplayName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        @{c.authorUsername}
                      </span>
                      <span className="text-slate-300 text-xs">·</span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatTime(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
