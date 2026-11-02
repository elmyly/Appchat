import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Conversation, Message, TypingIndicator, FileMeta, User, ActiveCall } from '../types';
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
  // Voice & Video Calling Features
  activeCall: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallMuted: boolean;
  isCameraOff: boolean;
  isRemoteCameraOff: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  isCallMinimized: boolean;
  setIsCallMinimized: (minimized: boolean) => void;
  startVoiceCall: (targetUserId: string, conversationId: string) => Promise<boolean>;
  startVideoCall: (targetUserId: string, conversationId: string) => Promise<boolean>;
  startCall: (targetUserId: string, conversationId: string, type: 'voice' | 'video') => Promise<boolean>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  toggleScreenShare: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// STUN is enough for many desktop connections, but mobile carriers and
// restrictive Wi-Fi often require a TURN relay. Configure TURN in the
// frontend build environment (VITE_TURN_URL, VITE_TURN_USERNAME,
// VITE_TURN_CREDENTIAL) for reliable calls across different networks.
const staticTurnUrl = (import.meta.env.VITE_TURN_URL || '').trim();
const staticTurnUsername = (import.meta.env.VITE_TURN_USERNAME || '').trim();
const staticTurnCredential = (import.meta.env.VITE_TURN_CREDENTIAL || '').trim();

const BASE_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    ...(staticTurnUrl && staticTurnUsername && staticTurnCredential
      ? [{ urls: staticTurnUrl, username: staticTurnUsername, credential: staticTurnCredential }]
      : []),
  ],
  iceCandidatePoolSize: 10,
};

const getRtcConfig = async (): Promise<RTCConfiguration> => {
  try {
    const response = await fetch('/api/webrtc/ice-servers');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return { ...BASE_RTC_CONFIG, iceServers: data.iceServers };
      }
    }
  } catch (error) {
    console.warn('[WebRTC] Could not load TURN credentials:', error);
  }
  return BASE_RTC_CONFIG;
};

const attachRemoteStream = (
  event: RTCTrackEvent,
  setStream: React.Dispatch<React.SetStateAction<MediaStream | null>>,
  audioElement: HTMLAudioElement | null
) => {
  const stream = event.streams?.[0] || new MediaStream([event.track]);
  setStream((current) => current || stream);
  if (audioElement && audioElement.srcObject !== stream) {
    audioElement.srcObject = stream;
    audioElement.play().catch(() => {
      // Mobile browsers may require the first playback to follow a user tap.
    });
  }
};

const getMediaStream = async (type: 'voice' | 'video'): Promise<MediaStream> => {
  // If video is requested, attempt audio + video
  if (type === 'video') {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'user',
          },
        });
      }
    } catch (videoErr) {
      console.warn('Video camera access denied or device missing, falling back to voice audio stream:', videoErr);
    }
  }

  // Voice call or fallback: audio only
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  } catch (err) {
    console.warn('Microphone access unavailable or denied, generating synthesized stream fallback:', err);
  }

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (AudioCtx) {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001; // soft carrier
    osc.connect(gain);
    const dst = ctx.createMediaStreamDestination();
    gain.connect(dst);
    osc.start();
    return dst.stream;
  }
  throw new Error('WebRTC Media not supported on this browser');
};

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

  // Call states (voice & video)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallMuted, setIsCallMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isCallMinimized, setIsCallMinimized] = useState<boolean>(false);

  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingOfferRef = useRef<any>(null);
  const queuedCandidatesRef = useRef<any[]>([]);
  const callTimerRef = useRef<any>(null);

  // Initialize hidden audio element for remote audio playback
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    remoteAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  }, []);

  const cleanupCall = useCallback(() => {
    sounds.stopRingtone();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
      } catch {}
      screenTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    incomingOfferRef.current = null;
    queuedCandidatesRef.current = [];
    activeCallRef.current = null;
    setActiveCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallMuted(false);
    setIsCameraOff(false);
    setIsRemoteCameraOff(false);
    setIsSpeakerOn(true);
    setIsScreenSharing(false);
    setCallDuration(0);
    setIsCallMinimized(false);
  }, []);

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

    // System-wide administrator announcements
    s.on('announcement:new', (data: { message: string }) => {
      pushManager.triggerNotification({
        title: 'Aura announcement',
        body: data.message,
      });
    });

    // --- WebRTC Voice & Video Call Signaling Events ---
    s.on('call:incoming', (data: any) => {
      if (activeCallRef.current) {
        s.emit('call:busy', { callId: data.callId, callerId: data.callerId });
        return;
      }

      incomingOfferRef.current = data.offer;
      queuedCandidatesRef.current = [];

      const callType: 'voice' | 'video' = data.callType === 'video' ? 'video' : 'voice';
      const incomingCall: ActiveCall = {
        callId: data.callId,
        conversationId: data.conversationId,
        conversationName: data.conversationName,
        callType,
        caller: data.caller,
        targetUserId: user?.id || '',
        status: 'incoming_ringing',
        startedAt: Date.now(),
        isMuted: false,
        isSpeaker: true,
        isCameraOff: callType === 'voice',
        isRemoteCameraOff: false,
      };

      activeCallRef.current = incomingCall;
      setActiveCall(incomingCall);
      setIsCallMinimized(false);
      sounds.startRingtone('incoming');
    });

    s.on('call:media_state', (data: { callId: string; isCameraOff?: boolean; isMuted?: boolean; isScreenSharing?: boolean }) => {
      if (data.isCameraOff !== undefined) {
        setIsRemoteCameraOff(data.isCameraOff);
        setActiveCall((prev) => (prev ? { ...prev, isRemoteCameraOff: data.isCameraOff } : null));
      }
    });

    s.on('call:accepted', async (data: any) => {
      sounds.stopRingtone();
      if (peerConnectionRef.current && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          for (const cand of queuedCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(cand).catch(() => {});
          }
          queuedCandidatesRef.current = [];
        } catch (e) {
          console.warn('Error setting remote description on accepted:', e);
        }
      }

      setActiveCall((prev) => {
        if (!prev) return null;
        const updated: ActiveCall = {
          ...prev,
          status: 'connected',
          connectedAt: Date.now(),
          targetUser: data.receiver,
        };
        activeCallRef.current = updated;
        return updated;
      });

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    });

    s.on('call:rejected', () => {
      sounds.stopRingtone();
      sounds.playCallEnded();
      cleanupCall();
    });

    s.on('call:busy', () => {
      sounds.stopRingtone();
      sounds.playCallEnded();
      cleanupCall();
    });

    s.on('call:ended', () => {
      sounds.stopRingtone();
      sounds.playCallEnded();
      cleanupCall();
    });

    s.on('call:signal', async (data: any) => {
      if (data.signal?.type === 'candidate' && data.signal?.candidate) {
        try {
          const candidate = new RTCIceCandidate(data.signal.candidate);
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          } else {
            queuedCandidatesRef.current.push(candidate);
          }
        } catch {
          // Ignore candidate race error
        }
      }
    });

    setSocket(s);

    return () => {
      cleanupCall();
      s.disconnect();
    };
  }, [token, user?.id, refreshConversations, cleanupCall]);

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

      if (!conv) {
        setMessages([]);
        return;
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
      const cleanTarget = targetUsername.trim().replace(/^@/, '');
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername: cleanTarget }),
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

  // --- WebRTC Voice & Video Call Action Methods ---
  const startCall = useCallback(
    async (
      targetUserId: string,
      conversationId: string,
      type: 'voice' | 'video' = 'voice'
    ): Promise<boolean> => {
      if (!socket || !user) return false;

      try {
        const stream = await getMediaStream(type);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const hasVideo = stream.getVideoTracks().length > 0;
        const initialCameraOff = type === 'voice' || !hasVideo;
        setIsCameraOff(initialCameraOff);

        const pc = new RTCPeerConnection(await getRtcConfig());
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          attachRemoteStream(event, setRemoteStream, remoteAudioRef.current);
        };

        pc.oniceconnectionstatechange = () => {
          console.info('[WebRTC] caller ICE state:', pc.iceConnectionState);
        };

        const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call:signal', {
              callId,
              targetUserId,
              signal: { type: 'candidate', candidate: event.candidate.toJSON() },
            });
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'video',
        });
        await pc.setLocalDescription(offer);

        const conv = conversations.find((c) => c.id === conversationId);
        const targetParticipant = conv?.participants?.find((p) => p.id === targetUserId);

        const newCall: ActiveCall = {
          callId,
          conversationId,
          conversationName: conv?.type === 'group' ? conv.name : undefined,
          callType: type,
          caller: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
          },
          targetUserId,
          targetUser: targetParticipant
            ? {
                id: targetParticipant.id,
                username: targetParticipant.username,
                displayName: targetParticipant.displayName,
                avatar: targetParticipant.avatar,
              }
            : undefined,
          status: 'outgoing_ringing',
          startedAt: Date.now(),
          isMuted: false,
          isSpeaker: true,
          isCameraOff: initialCameraOff,
          isRemoteCameraOff: false,
        };

        activeCallRef.current = newCall;
        setActiveCall(newCall);
        setIsCallMinimized(false);
        setCallDuration(0);

        sounds.startRingtone('outgoing');

        socket.emit('call:initiate', {
          callId,
          conversationId,
          targetUserId,
          callType: type,
          caller: newCall.caller,
          conversationName: newCall.conversationName,
          offer: pc.localDescription,
        });

        return true;
      } catch (err) {
        console.error('Failed to start call:', err);
        sounds.stopRingtone();
        return false;
      }
    },
    [socket, user, conversations]
  );

  const startVoiceCall = useCallback(
    (targetUserId: string, conversationId: string) => {
      return startCall(targetUserId, conversationId, 'voice');
    },
    [startCall]
  );

  const startVideoCall = useCallback(
    (targetUserId: string, conversationId: string) => {
      return startCall(targetUserId, conversationId, 'video');
    },
    [startCall]
  );

  const rejectCall = useCallback(() => {
    const call = activeCallRef.current;
    sounds.stopRingtone();
    sounds.playCallEnded();

    if (socket && call) {
      socket.emit('call:reject', {
        callId: call.callId,
        conversationId: call.conversationId,
        callerId: call.caller.id,
        reason: 'declined',
      });
    }

    cleanupCall();
  }, [socket, cleanupCall]);

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!socket || !user || !call) return;
    sounds.stopRingtone();

    try {
      const stream = await getMediaStream(call.callType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const hasVideo = stream.getVideoTracks().length > 0;
      const initialCameraOff = call.callType === 'voice' || !hasVideo;
      setIsCameraOff(initialCameraOff);

      const pc = new RTCPeerConnection(await getRtcConfig());
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          attachRemoteStream(event, setRemoteStream, remoteAudioRef.current);
        };

        pc.oniceconnectionstatechange = () => {
          console.info('[WebRTC] receiver ICE state:', pc.iceConnectionState);
        };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:signal', {
            callId: call.callId,
            targetUserId: call.caller.id,
            signal: { type: 'candidate', candidate: event.candidate.toJSON() },
          });
        }
      };

      if (incomingOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
        for (const cand of queuedCandidatesRef.current) {
          await pc.addIceCandidate(cand).catch(() => {});
        }
        queuedCandidatesRef.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:accept', {
        callId: call.callId,
        conversationId: call.conversationId,
        callerId: call.caller.id,
        answer: pc.localDescription,
        receiver: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
        },
      });

      const updated: ActiveCall = {
        ...call,
        status: 'connected',
        connectedAt: Date.now(),
        isCameraOff: initialCameraOff,
      };
      activeCallRef.current = updated;
      setActiveCall(updated);
      setCallDuration(0);

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to accept call:', err);
      rejectCall();
    }
  }, [socket, user, rejectCall]);

  const endCall = useCallback(() => {
    const call = activeCallRef.current;
    sounds.stopRingtone();
    sounds.playCallEnded();

    if (socket && call) {
      const targetId = call.caller.id === user?.id ? call.targetUserId : call.caller.id;
      socket.emit('call:end', {
        callId: call.callId,
        conversationId: call.conversationId,
        targetUserId: targetId,
        duration: callDuration,
      });

      if (call.conversationId) {
        const durationText =
          callDuration > 0
            ? `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`
            : '0s';
        const callTypeLabel = call.callType === 'video' ? 'Video' : 'Voice';
        const icon = call.callType === 'video' ? '📹' : '📞';
        const notice =
          callDuration > 0
            ? `${icon} ${callTypeLabel} call ended • ${durationText}`
            : `${icon} Missed ${callTypeLabel.toLowerCase()} call`;
        sendMessage(notice, 'text');
      }
    }

    cleanupCall();
  }, [socket, user?.id, callDuration, cleanupCall, sendMessage]);

  const toggleCallMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMuted = !isCallMuted;
      audioTracks.forEach((t) => {
        t.enabled = isCallMuted; // if previously muted, enable; else disable
      });
      setIsCallMuted(nextMuted);
    }
  }, [isCallMuted]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextEnabled = !videoTracks[0].enabled;
        videoTracks.forEach((t) => {
          t.enabled = nextEnabled;
        });
        const cameraOff = !nextEnabled;
        setIsCameraOff(cameraOff);
        setActiveCall((prev) => (prev ? { ...prev, isCameraOff: cameraOff } : null));

        if (socket && activeCallRef.current) {
          const targetId =
            activeCallRef.current.caller.id === user?.id
              ? activeCallRef.current.targetUserId
              : activeCallRef.current.caller.id;
          socket.emit('call:media_state', {
            callId: activeCallRef.current.callId,
            targetUserId: targetId,
            isCameraOff: cameraOff,
          });
        }
      }
    }
  }, [socket, user?.id]);

  const toggleScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !activeCallRef.current) return;
    try {
      if (isScreenSharing) {
        // Revert to camera
        if (screenTrackRef.current) {
          try {
            screenTrackRef.current.stop();
          } catch {}
          screenTrackRef.current = null;
        }

        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const camTrack = camStream.getVideoTracks()[0];
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender && camTrack) {
          await videoSender.replaceTrack(camTrack);
        }
        if (localStreamRef.current) {
          const oldTracks = localStreamRef.current.getVideoTracks();
          oldTracks.forEach((t) => localStreamRef.current?.removeTrack(t));
          if (camTrack) localStreamRef.current.addTrack(camTrack);
        }
        setIsScreenSharing(false);
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          console.warn('Screen sharing not supported on this device/browser');
          return;
        }
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const displayTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = displayTrack;

        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender && displayTrack) {
          await videoSender.replaceTrack(displayTrack);
        }
        if (localStreamRef.current && displayTrack) {
          const oldTracks = localStreamRef.current.getVideoTracks();
          oldTracks.forEach((t) => localStreamRef.current?.removeTrack(t));
          localStreamRef.current.addTrack(displayTrack);
        }

        displayTrack.onended = () => {
          toggleScreenShare();
        };
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn('Screen share toggle failed or cancelled:', err);
    }
  }, [isScreenSharing]);

  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerOn(!remoteAudioRef.current.muted);
    } else {
      setIsSpeakerOn((prev) => !prev);
    }
  }, []);

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
        // Voice & Video Calling Features
        activeCall,
        localStream,
        remoteStream,
        isCallMuted,
        isCameraOff,
        isRemoteCameraOff,
        isSpeakerOn,
        isScreenSharing,
        callDuration,
        isCallMinimized,
        setIsCallMinimized,
        startVoiceCall,
        startVideoCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleCallMute,
        toggleCamera,
        toggleSpeaker,
        toggleScreenShare,
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
