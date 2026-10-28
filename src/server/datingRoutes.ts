import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'node:crypto';
import { DatingProfile, DatingMatch, User, Conversation, Message } from '../types';

export interface DatingRoutesContext {
  users: Map<string, User>;
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>;
  getAuthUser: (req: express.Request) => User | null;
}

// In-Memory Dating Store
export const datingProfiles: Map<string, DatingProfile> = new Map();
export const userLikes: Map<string, Set<string>> = new Map(); // userId -> Set of targetUserIds
export const userPasses: Map<string, Set<string>> = new Map(); // userId -> Set of targetUserIds
export const userSuperLikes: Map<string, Set<string>> = new Map(); // userId -> Set of targetUserIds
export const userMatches: Map<string, Map<string, DatingMatch>> = new Map(); // userId -> Map<targetUserId, DatingMatch>
export const userSwipeHistory: Map<string, { targetUserId: string; action: 'like' | 'pass' | 'superlike' }[]> = new Map();
export const customUserProfiles: Map<string, DatingProfile> = new Map(); // userId -> custom dating profile

// Initial seed profiles
const SEED_PROFILES: DatingProfile[] = [
  {
    id: 'date_elena',
    userId: 'user_elena_d',
    username: 'elena_r',
    displayName: 'Elena Rostova',
    age: 24,
    gender: 'woman',
    intent: 'Long-term relationship',
    occupation: 'Architect & Minimalist Designer',
    bio: 'Designing peaceful spaces and exploring brutalist architecture. I make great pour-over coffee, shoot medium format film, and love spontaneous road trips to coastal towns.',
    location: 'San Francisco, CA',
    distanceKm: 4,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Architecture', 'Film Photography', 'Pour-over Coffee', 'Art Galleries', 'Brutalism'],
    compatibilityScore: 96,
    isVerified: true,
  },
  {
    id: 'date_maya',
    userId: 'user_maya_c',
    username: 'maya_codes',
    displayName: 'Maya Chen',
    age: 26,
    gender: 'woman',
    intent: 'Coffee & conversation',
    occupation: 'Creative Technologist',
    bio: 'Bridging generative art, analog synthesizers, and shaders. Let’s find the best match latte in town or talk about ambient electronic music and philosophy.',
    location: 'Brooklyn, NY',
    distanceKm: 9,
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Generative Art', 'Synths', 'Matcha', 'Sci-Fi', 'Creative Coding'],
    compatibilityScore: 94,
    isVerified: true,
  },
  {
    id: 'date_julian',
    userId: 'user_julian_v',
    username: 'julian_v',
    displayName: 'Julian Vance',
    age: 27,
    gender: 'man',
    intent: 'Creative collaborator',
    occupation: 'Product Designer & Ceramicist',
    bio: 'Working with clay on weekends and pixels on weekdays. Big fan of Japanese woodwork, natural wine, and cycling around the city without a destination.',
    location: 'Austin, TX',
    distanceKm: 12,
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Ceramics', 'Product Design', 'Cycling', 'Natural Wine', 'Typography'],
    compatibilityScore: 91,
    isVerified: true,
  },
  {
    id: 'date_chloe',
    userId: 'user_chloe_l',
    username: 'chloe_laurent',
    displayName: 'Chloé Laurent',
    age: 25,
    gender: 'woman',
    intent: 'Casual dating',
    occupation: 'Editorial Stylist & Curator',
    bio: 'Life is too short for bad typography or boring dinners. Passionate about 90s cinema, curated flea markets, and vintage leather jackets.',
    location: 'Paris & Remote',
    distanceKm: 15,
    photos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Fashion', 'Museums', 'Cinema', 'Travel', 'Vinyl Records'],
    compatibilityScore: 95,
    isVerified: true,
  },
  {
    id: 'date_leo',
    userId: 'user_leo_k',
    username: 'leo_k',
    displayName: 'Leo Kova',
    age: 28,
    gender: 'man',
    intent: 'Long-term relationship',
    occupation: 'AI Researcher & Sound Designer',
    bio: 'Exploring neural audio and mathematical beauty. When not training models, I am bouldering outdoors or brewing espresso with single-origin beans.',
    location: 'Berlin & Remote',
    distanceKm: 18,
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Machine Learning', 'Bouldering', 'Espresso', 'Soundscapes', 'Philosophy'],
    compatibilityScore: 89,
    isVerified: true,
  },
  {
    id: 'date_sora',
    userId: 'user_sora_t',
    username: 'sora_art',
    displayName: 'Sora Tanaka',
    age: 24,
    gender: 'non-binary',
    intent: 'New friends',
    occupation: 'Concept Artist & Illustrator',
    bio: 'Drawing fantasy landscapes, collecting rare house plants, and hunting for quiet tea houses. Let’s share playlists and sketch in a sunlit park.',
    location: 'Tokyo & Remote',
    distanceKm: 22,
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Digital Art', 'Tea Culture', 'Plants', 'Indie Games', 'Anime'],
    compatibilityScore: 93,
    isVerified: false,
  },
  {
    id: 'date_marcus',
    userId: 'user_marcus_b',
    username: 'marcus_brody',
    displayName: 'Marcus Brody',
    age: 29,
    gender: 'man',
    intent: 'Coffee & conversation',
    occupation: 'Landscape Photographer',
    bio: 'Living out of a camera bag and chasing mountain sunrises. Looking for someone who enjoys campfire conversations and early morning hikes.',
    location: 'Boulder, CO',
    distanceKm: 8,
    photos: [
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['National Parks', 'Hiking', 'Astrophotography', 'Campfires', 'Coffee'],
    compatibilityScore: 92,
    isVerified: true,
  },
  {
    id: 'date_aria',
    userId: 'user_aria_t',
    username: 'aria_t',
    displayName: 'Aria Thorne',
    age: 26,
    gender: 'woman',
    intent: 'Long-term relationship',
    occupation: 'Music Producer & Vinyl DJ',
    bio: 'Finding rhythm in everyday noise. I collect rare 70s funk vinyl and love discovering hidden speakeasies. Teach me something you are deeply passionate about.',
    location: 'London & Remote',
    distanceKm: 25,
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    ],
    passions: ['Music Production', 'Vinyl Records', 'Concerts', 'Cocktails', 'Night Drives'],
    compatibilityScore: 97,
    isVerified: true,
  },
];

// Initialize seed profiles
for (const p of SEED_PROFILES) {
  datingProfiles.set(p.id, p);
}

export function setupDatingRoutes(
  app: express.Express,
  io: SocketIOServer,
  context: DatingRoutesContext
) {
  const { users, conversations, messages, getAuthUser } = context;

  // Ensure matching users exist in users map so messenger works seamlessly
  for (const p of SEED_PROFILES) {
    if (!users.has(p.userId)) {
      users.set(p.userId, {
        id: p.userId,
        username: p.username,
        email: `${p.username}@aura.net`,
        displayName: p.displayName,
        bio: p.bio,
        avatar: p.photos[0],
        statusMessage: `Available on Aura Meet ✨`,
        publicKeyFingerprint: crypto.createHash('sha256').update(p.username).digest('hex').slice(0, 16).toUpperCase(),
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
        lastSeen: null, // Online
        followers: [],
        following: [],
      });
    }
  }

  // Helper to ensure user maps exist
  const ensureUserDatingState = (userId: string) => {
    if (!userLikes.has(userId)) userLikes.set(userId, new Set());
    if (!userPasses.has(userId)) userPasses.set(userId, new Set());
    if (!userSuperLikes.has(userId)) userSuperLikes.set(userId, new Set());
    if (!userMatches.has(userId)) userMatches.set(userId, new Map());
    if (!userSwipeHistory.has(userId)) userSwipeHistory.set(userId, []);
  };

  // Get Profiles for Discovery
  app.get('/api/dating/profiles', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    ensureUserDatingState(user.id);
    const likes = userLikes.get(user.id)!;
    const passes = userPasses.get(user.id)!;

    const genderFilter = (req.query.gender as string) || 'all'; // all, man, woman, non-binary
    const minAge = parseInt(req.query.minAge as string, 10) || 18;
    const maxAge = parseInt(req.query.maxAge as string, 10) || 60;
    const intentFilter = (req.query.intent as string) || 'all';

    const results: DatingProfile[] = [];

    for (const profile of datingProfiles.values()) {
      // Don't show self
      if (profile.userId === user.id) continue;
      // Don't show already swiped unless rewound
      if (likes.has(profile.userId) || passes.has(profile.userId)) continue;

      // Filter checks
      if (genderFilter !== 'all' && profile.gender !== genderFilter) continue;
      if (profile.age < minAge || profile.age > maxAge) continue;
      if (intentFilter !== 'all' && profile.intent !== intentFilter) continue;

      results.push(profile);
    }

    return res.json({ profiles: results });
  });

  // Action: Swipe Like, Pass, or Superlike
  app.post('/api/dating/action', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { targetUserId, action } = req.body;
    if (!targetUserId || !['like', 'pass', 'superlike'].includes(action)) {
      return res.status(400).json({ error: 'Invalid swipe action parameters' });
    }

    ensureUserDatingState(user.id);
    const likes = userLikes.get(user.id)!;
    const passes = userPasses.get(user.id)!;
    const superLikes = userSuperLikes.get(user.id)!;
    const history = userSwipeHistory.get(user.id)!;

    // Record swipe
    history.push({ targetUserId, action });

    if (action === 'pass') {
      passes.add(targetUserId);
      return res.json({ success: true, isMatch: false });
    }

    if (action === 'like') {
      likes.add(targetUserId);
    } else if (action === 'superlike') {
      superLikes.add(targetUserId);
      likes.add(targetUserId);
    }

    // Determine if mutual match
    // In our rich social platform, seeded profiles have mutual affinity for high engagement!
    const targetProfile = Array.from(datingProfiles.values()).find((p) => p.userId === targetUserId);
    const isMutual = targetProfile !== undefined; // Seeded profiles reciprocate!

    let matchRecord: DatingMatch | null = null;

    if (isMutual && targetProfile) {
      const matchId = 'match_' + crypto.randomUUID().slice(0, 8);

      matchRecord = {
        id: matchId,
        matchedUserId: targetProfile.userId,
        matchedUsername: targetProfile.username,
        matchedDisplayName: targetProfile.displayName,
        matchedAvatar: targetProfile.photos[0],
        matchedBio: targetProfile.bio,
        matchedPhotos: targetProfile.photos,
        matchedAt: Date.now(),
      };

      // Save match for current user
      userMatches.get(user.id)!.set(targetProfile.userId, matchRecord);

      // Save match for target user as well
      ensureUserDatingState(targetProfile.userId);
      userMatches.get(targetProfile.userId)!.set(user.id, {
        id: matchId,
        matchedUserId: user.id,
        matchedUsername: user.username,
        matchedDisplayName: user.displayName,
        matchedAvatar: user.avatar,
        matchedBio: user.bio,
        matchedPhotos: [user.avatar],
        matchedAt: Date.now(),
      });

      // Emit real-time match notification
      io.to(`user:${user.id}`).emit('dating:match', matchRecord);
    }

    return res.json({
      success: true,
      isMatch: !!matchRecord,
      match: matchRecord,
      matchCount: userMatches.get(user.id)!.size,
    });
  });

  // Rewind last swipe
  app.post('/api/dating/rewind', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    ensureUserDatingState(user.id);
    const history = userSwipeHistory.get(user.id)!;
    if (history.length === 0) {
      return res.status(400).json({ error: 'No recent swipes to undo' });
    }

    const last = history.pop()!;
    userLikes.get(user.id)?.delete(last.targetUserId);
    userPasses.get(user.id)?.delete(last.targetUserId);
    userSuperLikes.get(user.id)?.delete(last.targetUserId);
    userMatches.get(user.id)?.delete(last.targetUserId);

    return res.json({ success: true, rewoundTargetId: last.targetUserId });
  });

  // Get User's Matches
  app.get('/api/dating/matches', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    ensureUserDatingState(user.id);
    const matchesMap = userMatches.get(user.id)!;
    const list = Array.from(matchesMap.values()).sort((a, b) => b.matchedAt - a.matchedAt);

    return res.json({ matches: list });
  });

  // Start encrypted chat with a match
  app.post('/api/dating/start-chat', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { matchUserId } = req.body;
    if (!matchUserId) return res.status(400).json({ error: 'matchUserId is required' });

    // Look for existing 1-on-1 direct conversation
    let existingConv: Conversation | null = null;
    for (const conv of conversations.values()) {
      if (
        conv.type === 'direct' &&
        conv.participantIds.includes(user.id) &&
        conv.participantIds.includes(matchUserId)
      ) {
        existingConv = conv;
        break;
      }
    }

    if (existingConv) {
      return res.json({ conversationId: existingConv.id });
    }

    // Create a new direct conversation
    const targetUser = users.get(matchUserId);
    if (!targetUser) return res.status(404).json({ error: 'Matched user not found' });

    const newConvId = 'conv_' + crypto.randomUUID().slice(0, 8);
    const newConv: Conversation = {
      id: newConvId,
      type: 'direct',
      createdBy: user.id,
      admins: [user.id, targetUser.id],
      participantIds: [user.id, targetUser.id],
      participants: [
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isOnline: true,
          lastSeen: null,
          publicKeyFingerprint: user.publicKeyFingerprint,
        },
        {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          avatar: targetUser.avatar,
          isOnline: true,
          lastSeen: null,
          publicKeyFingerprint: targetUser.publicKeyFingerprint,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      unreadCount: 0,
      lastMessage: {
        id: 'msg_init_' + crypto.randomUUID().slice(0, 6),
        senderUsername: 'System',
        ciphertext: `You matched on Aura Meet! Start your end-to-end encrypted chat ✨`,
        type: 'system',
        createdAt: Date.now(),
      },
    };

    conversations.set(newConvId, newConv);
    messages.set(newConvId, [
      {
        id: 'msg_init_' + crypto.randomUUID().slice(0, 6),
        conversationId: newConvId,
        senderId: 'system',
        senderUsername: 'System',
        senderDisplayName: 'Aura Meet Match',
        senderAvatar: '',
        ciphertext: `✨ You and ${targetUser.displayName} liked each other on Aura Meet! Say hello.`,
        iv: '',
        keyFingerprint: '',
        type: 'system',
        createdAt: Date.now(),
        reactions: [],
        deliveredTo: [user.id, targetUser.id],
        readBy: [{ userId: user.id, readAt: Date.now() }],
      },
    ]);

    // Emit to both users
    io.to(`user:${user.id}`).emit('conversation:new', newConv);
    io.to(`user:${targetUser.id}`).emit('conversation:new', newConv);

    return res.json({ conversationId: newConvId });
  });

  // Get My Dating Profile
  app.get('/api/dating/profile/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    let myProfile = customUserProfiles.get(user.id);
    if (!myProfile) {
      myProfile = {
        id: 'date_' + user.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        age: 25,
        gender: 'non-binary',
        intent: 'Coffee & conversation',
        occupation: 'Aura Member',
        bio: user.bio || 'Exploring Aura Meet, design, and inspiring conversations.',
        location: user.location || 'Global / Remote',
        distanceKm: 0,
        photos: [
          user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
        ],
        passions: ['Design', 'Specialty Coffee', 'Technology', 'Art'],
        compatibilityScore: 100,
        isVerified: true,
      };
      customUserProfiles.set(user.id, myProfile);
      datingProfiles.set(myProfile.id, myProfile);
    }

    return res.json({ profile: myProfile });
  });

  // Update My Dating Profile
  app.put('/api/dating/profile/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { age, gender, intent, occupation, bio, location, photos, passions } = req.body;

    let myProfile = customUserProfiles.get(user.id);
    if (!myProfile) {
      myProfile = {
        id: 'date_' + user.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        age: Number(age) || 25,
        gender: gender || 'non-binary',
        intent: intent || 'Coffee & conversation',
        occupation: occupation || 'Creator',
        bio: bio || user.bio,
        location: location || user.location || 'Online',
        distanceKm: 0,
        photos: Array.isArray(photos) && photos.length > 0 ? photos : [user.avatar],
        passions: Array.isArray(passions) ? passions : ['Design', 'Coffee', 'Music'],
        compatibilityScore: 100,
        isVerified: true,
      };
    } else {
      if (age) myProfile.age = Number(age);
      if (gender) myProfile.gender = gender;
      if (intent) myProfile.intent = intent;
      if (occupation !== undefined) myProfile.occupation = occupation;
      if (bio !== undefined) myProfile.bio = bio;
      if (location !== undefined) myProfile.location = location;
      if (Array.isArray(photos) && photos.length > 0) myProfile.photos = photos;
      if (Array.isArray(passions)) myProfile.passions = passions;
    }

    customUserProfiles.set(user.id, myProfile);
    datingProfiles.set(myProfile.id, myProfile);

    return res.json({ success: true, profile: myProfile });
  });
}
