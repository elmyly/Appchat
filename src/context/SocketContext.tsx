import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Conversation, Message, TypingIndicator, FileMeta, User } from '../types';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { sounds } from '../lib/sounds';
import { pushManager } from '../lib/notifications';

interface OnlineStatus {
  isOnline: boolean;
  lastSeen: number | null;
}

export interface SearchMessageResult {
  message: Message;
  conversationId: string;
  conversationType: 'direct' | 'group';
  conversationTitle: string;
  conversationAvatar: string;
  matchedText: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingIndicator[];
  onlineStatusMap: Record<string, OnlineStatus>;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  selectConversation: (conversation: Conversation, targetMessageId?: string) => Promise<void>;
  sendMessage: (text: string, type?: 'text' | 'image' | 'file' | 'audio', fileMeta?: FileMeta) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;
  setTyping: (isTyping: boolean) => void;
  sendReaction: (messageId: string, emoji: string) => void;
  pinMessage: (messageId: string, isPinned: boolean) => void;
  createGroup: (name: string, memberUsernames: string[], avatar?: string, description?: string) => Promise<Conversation | null>;
  updateGroupDetails: (conversationId: string, updates: { name?: string; avatar?: string; description?: string }) => Promise<boolean>;
  startDirectConversation: (targetUsername: string) => Promise<Conversation | null>;
  addGroupMember: (conversationId: string, username: string) => void;
  refreshConversations: () => Promise<void>;
  searchAllMessages: (query: string, filter?: string) => Promise<SearchMessageResult[]>;
  forwardMessage: (targetConversationId: string, message: Message, extraComment?: string) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, OnlineStatus>>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const activeConversationRef = useRef<Conversation | null>(null);
  activeConversationRef.current = activeConversation;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations from API
  const refreshConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const convs: Conversation[] = data.conversations || [];
        
        // Decrypt last messages if present
        for (const c of convs) {
          if (c.lastMessage && c.lastMessage.ciphertext) {
            try {
              c.lastMessage.ciphertext = await decryptMessage(c.lastMessage.ciphertext, '', c.id);
            } catch {
              // fallback
            }
          }
        }
        
        setConversations(convs);

        // Update online statuses from participants
        const statuses: Record<string, OnlineStatus> = {};
        for (const c of convs) {
          c.participants?.forEach((p) => {
            statuses[p.id] = { isOnline: p.isOnline, lastSeen: p.lastSeen };
          });
        }
        setOnlineStatusMap((prev) => ({ ...prev, ...statuses }));
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [token]);

  // Connect socket
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    const s = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('authenticate', token);
    });

    s.on('authenticated', () => {
      refreshConversations();
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time user online/offline status
    s.on('user:status', (data: { userId: string; username?: string; isOnline: boolean; lastSeen: number | null }) => {
      setOnlineStatusMap((prev) => ({
        ...prev,
        [data.userId]: {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        },
      }));
    });

    // Real-time user profile update
    s.on('user:updated', (updatedUser: Partial<User>) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.participants) {
            const updatedParticipants = c.participants.map((p) =>
              p.id === updatedUser.id ? { ...p, ...updatedUser } : p
            );
            return { ...c, participants: updatedParticipants };
          }
          return c;
        })
      );
    });

    // New conversation created or added to
    s.on('conversation:new', (newConv: Conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
      s.emit('join:conversation', newConv.id);
    });

    // Conversation updated
    s.on('conversation:updated', (updatedConv: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c))
      );
      if (activeConversationRef.current?.id === updatedConv.id) {
        setActiveConversation((prev) => (prev ? { ...prev, ...updatedConv } : null));
      }
    });

    // Incoming new message
    s.on('message:new', async (msg: Message) => {
      // Decrypt message in client
      try {
        msg.decryptedContent = await decryptMessage(msg.ciphertext, msg.iv, msg.conversationId);
        msg.isDecrypted = true;
      } catch {
        msg.decryptedContent = msg.ciphertext;
      }

      // If this message belongs to currently open conversation
      if (activeConversationRef.current?.id === msg.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If from another user, send read receipt
        if (msg.senderId !== user.id) {
          s.emit('message:read', {
            conversationId: msg.conversationId,
            messageIds: [msg.id],
          });
          sounds.playMessageReceived();
        }
      } else {
        // Increment unread count in conversation list
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversationId) {
              return {
                ...c,
                unreadCount: (c.unreadCount || 0) + 1,
                lastMessage: {
                  id: msg.id,
                  senderUsername: msg.senderUsername,
                  ciphertext: msg.decryptedContent || msg.ciphertext,
                  type: msg.type,
                  createdAt: msg.createdAt,
                },
              };
            }
            return c;
          })
        );
      }
    });

    // Read receipt updates
    s.on('message:read_receipt', (data: { conversationId: string; messageIds: string[]; userId: string; readAt: number }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (data.messageIds.includes(m.id)) {
              const alreadyRead = m.readBy.some((r) => r.userId === data.userId);
              if (!alreadyRead) {
                return {
                  ...m,
                  readBy: [...m.readBy, { userId: data.userId, readAt: data.readAt }],
                };
              }
            }
            return m;
          })
        );
      }
    });

    // Reactions updated
    s.on('message:reaction_updated', (data: { conversationId: string; messageId: string; reactions: any[] }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    });

    // Pinned messages updated
    s.on('message:pinned_updated', (data: { conversationId: string; messageId: string; isPinned: boolean; pinnedBy?: string; pinnedByUsername?: string; pinnedAt?: number }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? {
                  ...m,
                  isPinned: data.isPinned,
                  pinnedBy: data.pinnedBy,
                  pinnedByUsername: data.pinnedByUsername,
                  pinnedAt: data.pinnedAt,
                }
              : m
          )
        );
      }
    });

    // Typing indicators
    s.on('user:typing', (data: { conversationId: string; userId: string; username: string; displayName: string; avatar?: string; isTyping: boolean }) => {
      if (activeConversationRef.current?.id === data.conversationId) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            const exists = prev.some((u) => u.userId === data.userId);
            if (exists) {
              return prev.map((u) => (u.userId === data.userId ? { ...u, ...data } : u));
            }
            return [...prev, data];
          } else {
            return prev.filter((u) => u.userId !== data.userId);
          }
        });
      }
    });

    // Push notification event for offline or unselected chats
    s.on('notification:push', (data: any) => {
      if (activeConversationRef.current?.id !== data.conversationId) {
        pushManager.triggerNotification({
          title: data.isGroup ? `${data.conversationName}` : `${data.senderName}`,
          body: data.type === 'text' ? 'New encrypted message' : `Sent a ${data.type}`,
          avatar: data.senderAvatar,
          conversationId: data.conversationId,
        });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id, refreshConversations]);

  // Load messages when active conversation changes
  const selectConversation = useCallback(
    async (conv: Conversation, targetMessageId?: string) => {
      setActiveConversation(conv);
      setTypingUsers([]);
      if (targetMessageId) {
        setHighlightedMessageId(targetMessageId);
      } else {
        setHighlightedMessageId(null);
      }

      if (!token) return;

      try {
        const res = await fetch(`/api/conversations/${conv.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const rawMsgs: Message[] = data.messages || [];

          // Decrypt all messages
          const decryptedList: Message[] = await Promise.all(
            rawMsgs.map(async (m) => {
              try {
                const dec = await decryptMessage(m.ciphertext, m.iv, conv.id);
                return { ...m, decryptedContent: dec, isDecrypted: true };
              } catch {
                return { ...m, decryptedContent: m.ciphertext, isDecrypted: false };
              }
            })
          );

          setMessages(decryptedList);

          // Mark unread messages as read
          const unreadIds = decryptedList
            .filter((m) => m.senderId !== user?.id && !m.readBy.some((r) => r.userId === user?.id))
            .map((m) => m.id);

          if (unreadIds.length > 0 && socket) {
            socket.emit('message:read', {
              conversationId: conv.id,
              messageIds: unreadIds,
            });
          }

          // Clear local unread count
          setConversations((prev) =>
            prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
          );
        }

        // Join conversation room
        if (socket) {
          socket.emit('join:conversation', conv.id);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      }
    },
    [token, user?.id, socket]
  );

  // Send a message with end-to-end encryption
  const sendMessage = async (
    text: string,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    fileMeta?: FileMeta
  ) => {
    if (!activeConversation || !user || !socket) return;

    // Encrypt using Web Crypto AES-GCM
    const { ciphertext, iv, keyFingerprint } = await encryptMessage(text, activeConversation.id);

    // Play instant sound feedback
    sounds.playMessageSent();

    socket.emit('message:send', {
      conversationId: activeConversation.id,
      ciphertext,
      iv,
      keyFingerprint,
      type,
      fileMeta,
    });

    // Stop typing immediately when sending
    setTyping(false);
  };

  // Mark messages as read
  const markConversationAsRead = (conversationId: string) => {
    if (!socket || !user) return;
    const unreadIds = messages
      .filter((m) => m.conversationId === conversationId && m.senderId !== user.id && !m.readBy.some((r) => r.userId === user.id))
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      socket.emit('message:read', {
        conversationId,
        messageIds: unreadIds,
      });
    }
  };

  // Typing event handler with debounce
  const setTyping = (isTyping: boolean) => {
    if (!socket || !activeConversation) return;

    if (isTyping) {
      socket.emit('typing:start', activeConversation.id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', activeConversation.id);
      }, 2500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', activeConversation.id);
    }
  };

  // React to a message with instant optimistic update
  const sendReaction = (messageId: string, emoji: string) => {
    if (!socket || !activeConversation || !user) return;
    sounds.playReaction();

    // Optimistically update message reactions locally for instant tactile feedback
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = m.reactions || [];
        const existingIdx = currentReactions.findIndex(
          (r) => r.userId === user.id && r.emoji === emoji
        );
        let newReactions;
        if (existingIdx > -1) {
          newReactions = currentReactions.filter((_, i) => i !== existingIdx);
        } else {
          newReactions = [
            ...currentReactions,
            {
              emoji,
              userId: user.id,
              username: user.username,
              userAvatar: user.avatar,
              displayName: user.displayName,
            },
          ];
        }
        return { ...m, reactions: newReactions };
      })
    );

    socket.emit('message:react', {
      conversationId: activeConversation.id,
      messageId,
      emoji,
    });
  };

  // Pin or unpin a message within the current conversation
  const pinMessage = (messageId: string, isPinned: boolean) => {
    if (!socket || !activeConversation || !user) return;

    // Optimistically update message pin status locally
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isPinned,
              pinnedBy: isPinned ? user.id : undefined,
              pinnedByUsername: isPinned ? user.username : undefined,
              pinnedAt: isPinned ? Date.now() : undefined,
            }
          : m
      )
    );

    socket.emit('message:pin', {
      conversationId: activeConversation.id,
      messageId,
      isPinned,
    });
  };

  // Forward a message to another conversation
  const forwardMessage = async (
    targetConversationId: string,
    message: Message,
    extraComment?: string
  ): Promise<boolean> => {
    if (!socket || !user) return false;

    try {
      const content = message.decryptedContent || message.ciphertext;
      const type = message.type;
      const fileMeta = message.fileMeta;

      // Encrypt for target conversation
      const { ciphertext, iv, keyFingerprint } = await encryptMessage(content, targetConversationId);

      socket.emit('message:send', {
        conversationId: targetConversationId,
        ciphertext,
        iv,
        keyFingerprint,
        type,
        fileMeta,
      });

      // If user also attached a comment to the forward
      if (extraComment && extraComment.trim()) {
        const commentEnc = await encryptMessage(extraComment.trim(), targetConversationId);
        socket.emit('message:send', {
          conversationId: targetConversationId,
          ciphertext: commentEnc.ciphertext,
          iv: commentEnc.iv,
          keyFingerprint: commentEnc.keyFingerprint,
          type: 'text',
        });
      }

      sounds.playMessageSent();
      return true;
    } catch (err) {
      console.error('Failed to forward message:', err);
      return false;
    }
  };

  // Create new group
  const createGroup = async (
    name: string,
    memberUsernames: string[],
    avatar?: string,
    description?: string
  ): Promise<Conversation | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, memberUsernames, avatar, description }),
      });

      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        setConversations((prev) => [conv, ...prev]);
        selectConversation(conv);
        return conv;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Update group details (avatar, name, description)
  const updateGroupDetails = async (
    conversationId: string,
    updates: { name?: string; avatar?: string; description?: string }
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/group`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.conversation;
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );
        if (activeConversationRef.current?.id === updated.id) {
          setActiveConversation((prev) => (prev ? { ...prev, ...updated } : null));
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Start 1-on-1 direct conversation with a username
  const startDirectConversation = async (targetUsername: string): Promise<Conversation | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername }),
      });

      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        await refreshConversations();
        selectConversation(conv);
        return conv;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Add member to group
  const addGroupMember = (conversationId: string, username: string) => {
    if (!socket) return;
    socket.emit('group:add_member', { conversationId, username });
  };

  // Search through all message histories across conversations
  const searchAllMessages = useCallback(
    async (query: string, filter: string = 'all'): Promise<SearchMessageResult[]> => {
      if (!token || !user) return [];
      const cleanQ = query.trim().toLowerCase();

      try {
        const res = await fetch(
          `/api/messages/search?q=${encodeURIComponent(cleanQ)}&filter=${encodeURIComponent(filter)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) return [];
        const data = await res.json();
        const rawResults: any[] = data.results || [];

        const decryptedResults: SearchMessageResult[] = [];

        for (const item of rawResults) {
          const rawMsg: Message = item.message;
          const convId = item.conversationId;

          let decryptedText = '';
          try {
            decryptedText = await decryptMessage(rawMsg.ciphertext, rawMsg.iv, convId);
          } catch {
            decryptedText = rawMsg.ciphertext;
          }

          const conv = conversations.find((c) => c.id === convId);
          const isGroup = conv?.type === 'group';
          const otherParticipant = !isGroup
            ? conv?.participants?.find((p) => p.id !== user.id)
            : null;

          const title = isGroup
            ? conv?.name || item.conversationName || 'Group Chat'
            : otherParticipant?.displayName || otherParticipant?.username || 'Direct Message';

          const avatar = isGroup
            ? conv?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group'
            : otherParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';

          const fileName = rawMsg.fileMeta?.name || '';
          const senderName = rawMsg.senderDisplayName || rawMsg.senderUsername || '';

          if (
            !cleanQ ||
            decryptedText.toLowerCase().includes(cleanQ) ||
            fileName.toLowerCase().includes(cleanQ) ||
            senderName.toLowerCase().includes(cleanQ)
          ) {
            decryptedResults.push({
              message: {
                ...rawMsg,
                decryptedContent: decryptedText,
                isDecrypted: true,
              },
              conversationId: convId,
              conversationType: conv?.type || 'direct',
              conversationTitle: title,
              conversationAvatar: avatar,
              matchedText: decryptedText || fileName,
            });
          }
        }

        return decryptedResults;
      } catch (err) {
        console.error('Failed to search messages:', err);
        return [];
      }
    },
    [token, user, conversations]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        conversations,
        activeConversation,
        messages,
        typingUsers,
        onlineStatusMap,
        highlightedMessageId,
        setHighlightedMessageId,
        selectConversation,
        sendMessage,
        markConversationAsRead,
        setTyping,
        sendReaction,
        pinMessage,
        createGroup,
        updateGroupDetails,
        startDirectConversation,
        addGroupMember,
        refreshConversations,
        searchAllMessages,
        forwardMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
