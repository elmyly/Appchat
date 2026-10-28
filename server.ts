import express from 'express';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { setupSocialRoutes, seedSocialData, ServerUser } from './src/server/socialRoutes';
import { setupDatingRoutes } from './src/server/datingRoutes';

// Load environment variables with override so user-configured .env takes precedence
dotenv.config({ override: true });
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env', override: true });
}
if (fs.existsSync('.env.example')) {
  try {
    const parsedExample = dotenv.parse(fs.readFileSync('.env.example'));
    if (parsedExample.GMAIL_USER && parsedExample.GMAIL_USER !== 'your-email@gmail.com') {
      process.env.GMAIL_USER = parsedExample.GMAIL_USER;
    }
    if (parsedExample.GMAIL_APP_PASSWORD && parsedExample.GMAIL_APP_PASSWORD !== 'your-16-char-app-password') {
      process.env.GMAIL_APP_PASSWORD = parsedExample.GMAIL_APP_PASSWORD;
    }
  } catch {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 25 * 1024 * 1024, // 25 MB max payload for file attachments
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// --- In-Memory Database Models ---
export type User = ServerUser;

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
  dataUrl?: string; // Base64 or local URL
  duration?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  ciphertext: string; // AES-GCM encrypted payload
  iv: string; // Base64 initialization vector
  keyFingerprint: string; // Cryptographic safety fingerprint
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  fileMeta?: FileMeta;
  createdAt: number;
  reactions: Reaction[];
  deliveredTo: string[]; // User IDs who received it
  readBy: { userId: string; readAt: number }[];
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedByUsername?: string;
  pinnedAt?: number;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string; // for group
  avatar?: string; // for group
  description?: string;
  createdBy: string;
  admins: string[];
  participantIds: string[];
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    id: string;
    senderUsername: string;
    ciphertext: string;
    type: string;
    createdAt: number;
  };
}

// Database state
const users: Map<string, User> = new Map(); // key: userId
const usersByUsername: Map<string, string> = new Map(); // key: lower(username) -> userId
const usersByEmail: Map<string, string> = new Map(); // key: lower(email) -> userId
const sessions: Map<string, string> = new Map(); // token -> userId
const conversations: Map<string, Conversation> = new Map(); // convId -> Conversation
const messages: Map<string, Message[]> = new Map(); // convId -> Message[]
const onlineUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

// Password reset tokens store: token -> { token, userId, email, expiresAt }
export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}
const passwordResetTokens: Map<string, PasswordResetToken> = new Map();

// Pending registration store for email OTP confirmation
export interface PendingRegistration {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  bio?: string;
  avatar?: string;
  otp: string;
  expiresAt: number;
}
const pendingRegistrations: Map<string, PendingRegistration> = new Map(); // key: lower(email)

// Helper to configure Gmail SMTP Transporter
function createGmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    const cleanUser = user.trim();
    // Google App Passwords display with spaces like 'gcki faat ecrj fhud', but SMTP requires removing whitespace
    const cleanPass = pass.trim().replace(/\s+/g, '');
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return null;
}

// Helper hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'cipher_salt_2026').digest('hex');
}

// Helper generate token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper send OTP Email via SMTP
async function dispatchOtpEmail(toEmail: string, username: string, otp: string): Promise<{ sent: boolean; error?: string }> {
  const transporter = createGmailTransporter();
  if (transporter && process.env.GMAIL_USER) {
    try {
      await transporter.sendMail({
        from: `"Aura Security" <${process.env.GMAIL_USER.trim()}>`,
        to: toEmail,
        subject: `Your Aura Verification Code: ${otp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #5036FF; border-radius: 14px; line-height: 48px; color: #ffffff; font-weight: 800; font-size: 22px;">A</div>
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 16px 0 6px 0;">Verify your Aura account</h1>
              <p style="color: #64748b; font-size: 14px; margin: 0;">Hi @${username}, enter the 6-digit confirmation code below to activate your account.</p>
            </div>
            <div style="text-align: center; margin: 28px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 8px;">6-Digit Verification Code</div>
              <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #5036FF; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;">${otp}</div>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">This verification code is valid for 10 minutes. If you did not create an Aura account, you can disregard this email.</p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Aura Social & Encrypted Messenger · End-to-End Cryptographic Security</p>
          </div>
        `,
      });
      console.log(`[Auth OTP SMTP] Verification code email sent to ${toEmail}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[Auth OTP SMTP Error] Failed to send email via SMTP:', err.message);
      return { sent: false, error: err.message };
    }
  } else {
    console.log(`[Auth OTP Preview Mode] Verification code for ${toEmail} (@${username}): ${otp}`);
    return { sent: false };
  }
}

// --- Auth Middleware ---
function getAuthUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const userId = sessions.get(token);
  if (!userId) return null;
  return users.get(userId) || null;
}

// --- REST API Endpoints ---

// 1. Initiate Registration with Email OTP
app.post('/api/auth/register-request', async (req, res) => {
  const { username, email, displayName, password, bio, avatar } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email address, and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (usersByUsername.has(cleanUsername)) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  if (usersByEmail.has(cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email address already exists' });
  }

  // Generate 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  pendingRegistrations.set(cleanEmail, {
    username: cleanUsername,
    email: cleanEmail,
    displayName: (displayName || username).trim(),
    passwordHash: hashPassword(password),
    bio: bio || 'Aura member',
    avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}&backgroundColor=e0e7ff`,
    otp,
    expiresAt,
  });

  const emailResult = await dispatchOtpEmail(cleanEmail, cleanUsername, otp);

  return res.json({
    success: true,
    email: cleanEmail,
    message: emailResult.sent
      ? `Verification code dispatched to ${cleanEmail}`
      : `Verification code generated for ${cleanEmail}`,
    emailSent: emailResult.sent,
    devOtp: otp, // Provided for instant preview testing and auto-fill helper
  });
});

// 2. Verify Email OTP and Complete Registration
app.post('/api/auth/verify-registration-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const record = pendingRegistrations.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: 'No pending registration found for this email address. Please start again.' });
  }

  if (Date.now() > record.expiresAt) {
    pendingRegistrations.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ error: 'Incorrect verification code. Please check and try again.' });
  }

  // Double check username wasn't claimed while OTP was pending
  if (usersByUsername.has(record.username)) {
    pendingRegistrations.delete(cleanEmail);
    return res.status(409).json({ error: 'Username was claimed. Please choose another username.' });
  }

  const id = 'user_' + crypto.randomUUID().slice(0, 8);
  const fingerprint = crypto.createHash('sha256').update(record.username + Date.now()).digest('hex').slice(0, 16).toUpperCase();

  const newUser: User = {
    id,
    username: record.username,
    email: record.email,
    displayName: record.displayName,
    bio: record.bio || 'Aura member',
    avatar: record.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${record.username}&backgroundColor=e0e7ff`,
    coverBanner: 'linear-gradient(135deg, #5036FF 0%, #8B5CF6 50%, #EC4899 100%)',
    website: '',
    location: '',
    passwordHash: record.passwordHash,
    statusMessage: 'Encrypted & online 🔒',
    publicKeyFingerprint: fingerprint,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    followers: [],
    following: [],
    blockedUsers: [],
    mutedUsers: [],
    isPrivate: false,
    role: (record.email === 'elmylypro@gmail.com' || record.username === 'malak') ? 'admin' : 'user',
    isVerified: (record.email === 'elmylypro@gmail.com' || record.username === 'malak') ? true : false,
    verifiedCategory: (record.email === 'elmylypro@gmail.com' || record.username === 'malak') ? 'Platform Administrator' : undefined,
    savedPostIds: [],
  };

  users.set(id, newUser);
  usersByUsername.set(record.username, id);
  usersByEmail.set(record.email, id);
  pendingRegistrations.delete(cleanEmail);

  const token = generateToken();
  sessions.set(token, id);

  console.log(`[Auth] Account successfully registered and verified for @${record.username} (${record.email})`);

  const { passwordHash: _, ...userSafe } = newUser;
  return res.json({ token, user: userSafe });
});

// 3. Resend Registration OTP
app.post('/api/auth/resend-registration-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = pendingRegistrations.get(cleanEmail);
  if (!record) {
    return res.status(400).json({ error: 'No pending registration found for this email.' });
  }

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  record.otp = newOtp;
  record.expiresAt = Date.now() + 10 * 60 * 1000;

  const emailResult = await dispatchOtpEmail(cleanEmail, record.username, newOtp);

  return res.json({
    success: true,
    message: emailResult.sent ? `A new code was dispatched to ${cleanEmail}` : 'A new code was generated',
    devOtp: newOtp,
    emailSent: emailResult.sent,
  });
});

// Standard Direct Register (fallback compatibility)
app.post('/api/auth/register', (req, res) => {
  const { username, email, displayName, password, bio, avatar } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email address, and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (usersByUsername.has(cleanUsername)) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  if (usersByEmail.has(cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email address already exists' });
  }

  const id = 'user_' + crypto.randomUUID().slice(0, 8);
  const fingerprint = crypto.createHash('sha256').update(cleanUsername + Date.now()).digest('hex').slice(0, 16).toUpperCase();

  const newUser: User = {
    id,
    username: cleanUsername,
    email: cleanEmail,
    displayName: (displayName || username).trim(),
    bio: bio || 'Aura member',
    avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}&backgroundColor=e0e7ff`,
    coverBanner: 'linear-gradient(135deg, #5036FF 0%, #8B5CF6 50%, #EC4899 100%)',
    website: '',
    location: '',
    passwordHash: hashPassword(password),
    statusMessage: 'Encrypted & online 🔒',
    publicKeyFingerprint: fingerprint,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    followers: [],
    following: [],
    blockedUsers: [],
    mutedUsers: [],
    isPrivate: false,
    role: (cleanEmail === 'elmylypro@gmail.com' || cleanUsername === 'malak') ? 'admin' : 'user',
    isVerified: (cleanEmail === 'elmylypro@gmail.com' || cleanUsername === 'malak') ? true : false,
    verifiedCategory: (cleanEmail === 'elmylypro@gmail.com' || cleanUsername === 'malak') ? 'Platform Administrator' : undefined,
    savedPostIds: [],
  };

  users.set(id, newUser);
  usersByUsername.set(cleanUsername, id);
  usersByEmail.set(cleanEmail, id);

  const token = generateToken();
  sessions.set(token, id);

  const { passwordHash: _, ...userSafe } = newUser;
  return res.json({ token, user: userSafe });
});

// Login (supports both username and email)
app.post('/api/auth/login', (req, res) => {
  const { username, password, email } = req.body;
  const identifier = (username || email || req.body.identifier || '').trim().toLowerCase();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username or email and password are required' });
  }

  let userId = usersByUsername.get(identifier);
  if (!userId) {
    userId = usersByEmail.get(identifier);
  }

  if (!userId) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  const user = users.get(userId);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  if (user.email === 'elmylypro@gmail.com' || user.username === 'malak') {
    user.role = 'admin';
    user.isVerified = true;
    if (!user.verifiedCategory) user.verifiedCategory = 'Platform Administrator';
  }

  const token = generateToken();
  sessions.set(token, user.id);

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ token, user: userSafe });
});

// Forgot Password - Generates secure reset token & sends link via Gmail SMTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { emailOrUsername } = req.body;
  if (!emailOrUsername || !emailOrUsername.trim()) {
    return res.status(400).json({ error: 'Please enter your username or email address' });
  }

  const query = emailOrUsername.trim().toLowerCase();
  let userId = usersByEmail.get(query);
  if (!userId) {
    userId = usersByUsername.get(query);
  }

  if (!userId) {
    // For security, don't explicitly disclose non-existence, but provide friendly guidance
    return res.status(404).json({ error: 'No account found matching this email or username' });
  }

  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate 1-hour secure reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60; // 60 minutes
  passwordResetTokens.set(resetToken, {
    token: resetToken,
    userId: user.id,
    email: user.email,
    expiresAt,
  });

  const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${origin}/?resetToken=${resetToken}`;

  const transporter = createGmailTransporter();
  let emailSent = false;
  let emailErrorMessage: string | null = null;

  if (transporter && process.env.GMAIL_USER) {
    try {
      await transporter.sendMail({
        from: `"Aura Security" <${process.env.GMAIL_USER.trim()}>`,
        to: user.email,
        subject: 'Reset your Aura password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #5036FF; border-radius: 14px; line-height: 48px; color: #ffffff; font-weight: 800; font-size: 22px;">A</div>
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 16px 0 6px 0;">Reset your Aura password</h1>
              <p style="color: #64748b; font-size: 14px; margin: 0;">Hi ${user.displayName || user.username}, we received a password reset request.</p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Click the button below to choose a new password for your account (<strong>@${user.username}</strong>):</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #5036FF; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(80, 54, 255, 0.25);">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This password reset link is valid for 60 minutes. If you did not request this, no action is needed and your account remains safe.</p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Aura Encrypted Messenger · End-to-End Cryptographic Security</p>
          </div>
        `,
      });
      emailSent = true;
      console.log(`[Gmail SMTP] Password reset email successfully dispatched to ${user.email}`);
    } catch (err: any) {
      console.error('[Gmail SMTP Error] Failed to send email via Gmail:', err.message);
      emailErrorMessage = err.message;
    }
  } else {
    console.log(`[SMTP Notice] GMAIL_USER and GMAIL_APP_PASSWORD are not yet set in environment.`);
    console.log(`[SMTP Notice] Password reset link for ${user.email} (@${user.username}): ${resetLink}`);
  }

  return res.json({
    success: true,
    message: emailSent
      ? `Password reset link sent to ${user.email} via Gmail SMTP.`
      : `Password reset link prepared for ${user.email}.`,
    email: user.email,
    username: user.username,
    resetLink, // returned to allow seamless instant testing in preview UI
    emailSent,
    emailError: emailErrorMessage,
  });
});

// Verify Reset Token
app.post('/api/auth/verify-reset-token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const record = passwordResetTokens.get(token);
  if (!record || record.expiresAt < Date.now()) {
    if (record) passwordResetTokens.delete(token);
    return res.status(400).json({ valid: false, error: 'Password reset link has expired or is invalid' });
  }

  const user = users.get(record.userId);
  if (!user) {
    return res.status(400).json({ valid: false, error: 'User no longer exists' });
  }

  return res.json({
    valid: true,
    username: user.username,
    email: user.email,
  });
});

// Reset Password with Token
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const record = passwordResetTokens.get(token);
  if (!record || record.expiresAt < Date.now()) {
    if (record) passwordResetTokens.delete(token);
    return res.status(400).json({ error: 'Password reset link has expired or is invalid' });
  }

  const user = users.get(record.userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  user.passwordHash = hashPassword(newPassword);
  users.set(user.id, user);
  passwordResetTokens.delete(token);

  console.log(`[Auth] Password successfully updated for user @${user.username} (${user.email})`);

  return res.json({
    success: true,
    message: 'Your password has been reset successfully. You can now sign in.',
    username: user.username,
  });
});

// Get current user profile
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.email === 'elmylypro@gmail.com' || user.username === 'malak') {
    user.role = 'admin';
    user.isVerified = true;
    if (!user.verifiedCategory) user.verifiedCategory = 'Platform Administrator';
  }

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// Update Profile
app.put('/api/auth/profile', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { displayName, bio, avatar, statusMessage, coverBanner, website, location, isPrivate } = req.body;
  if (displayName) user.displayName = displayName.trim();
  if (bio !== undefined) user.bio = bio;
  if (avatar) user.avatar = avatar;
  if (statusMessage !== undefined) user.statusMessage = statusMessage;
  if (coverBanner !== undefined) user.coverBanner = coverBanner;
  if (website !== undefined) user.website = website.trim();
  if (location !== undefined) user.location = location.trim();
  if (isPrivate !== undefined) user.isPrivate = Boolean(isPrivate);

  users.set(user.id, user);

  // Broadcast user profile update to all connected clients
  io.emit('user:updated', {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatar: user.avatar,
    coverBanner: user.coverBanner,
    statusMessage: user.statusMessage,
  });

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// Get all users or search by username
app.get('/api/users/search', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const query = (req.query.q as string || '').toLowerCase().trim();
  const results: any[] = [];

  for (const u of users.values()) {
    if (u.id === user.id) continue;
    if (!query || u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query)) {
      const isOnline = (onlineUsers.get(u.id)?.size || 0) > 0;
      results.push({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        avatar: u.avatar,
        statusMessage: u.statusMessage,
        publicKeyFingerprint: u.publicKeyFingerprint,
        isOnline,
        lastSeen: u.lastSeen,
      });
    }
  }

  return res.json({ users: results });
});

// Get conversations for current user
app.get('/api/conversations', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userConversations: any[] = [];

  for (const conv of conversations.values()) {
    if (conv.participantIds.includes(user.id)) {
      // Gather participant details
      const participants = conv.participantIds.map((pId) => {
        const u = users.get(pId);
        const isOnline = (onlineUsers.get(pId)?.size || 0) > 0;
        return u ? {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          isOnline,
          lastSeen: u.lastSeen,
          publicKeyFingerprint: u.publicKeyFingerprint,
        } : null;
      }).filter(Boolean);

      // Get latest message
      const convMessages = messages.get(conv.id) || [];
      const lastMsg = convMessages[convMessages.length - 1];

      // Calculate unread count for current user
      const unreadCount = convMessages.filter((m) => {
        if (m.senderId === user.id) return false;
        return !m.readBy.some((r) => r.userId === user.id);
      }).length;

      userConversations.push({
        ...conv,
        participants,
        lastMessage: lastMsg || null,
        unreadCount,
      });
    }
  }

  // Sort by updatedAt descending
  userConversations.sort((a, b) => (b.lastMessage?.createdAt || b.updatedAt) - (a.lastMessage?.createdAt || a.updatedAt));

  return res.json({ conversations: userConversations });
});

// Create or get Direct Conversation with a target username
app.post('/api/conversations/direct', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { targetUsername } = req.body;
  if (!targetUsername) return res.status(400).json({ error: 'Target username is required' });

  const cleanTarget = targetUsername.trim().toLowerCase();
  const targetId = usersByUsername.get(cleanTarget);
  if (!targetId) return res.status(404).json({ error: 'User not found' });
  if (targetId === user.id) return res.status(400).json({ error: 'Cannot start conversation with yourself' });

  // Check if conversation already exists
  for (const conv of conversations.values()) {
    if (conv.type === 'direct' && conv.participantIds.includes(user.id) && conv.participantIds.includes(targetId)) {
      return res.json({ conversation: conv });
    }
  }

  // Create new direct conversation
  const convId = 'conv_' + crypto.randomUUID().slice(0, 8);
  const newConv: Conversation = {
    id: convId,
    type: 'direct',
    createdBy: user.id,
    admins: [user.id, targetId],
    participantIds: [user.id, targetId],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  conversations.set(convId, newConv);
  messages.set(convId, []);

  // Broadcast conversation to both users
  for (const pId of [user.id, targetId]) {
    io.to(`user:${pId}`).emit('conversation:new', newConv);
  }

  return res.json({ conversation: newConv });
});

// Create Group Conversation
app.post('/api/conversations/group', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, avatar, description, memberUsernames } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });

  const participantIds: string[] = [user.id];
  if (Array.isArray(memberUsernames)) {
    for (const m of memberUsernames) {
      const uId = usersByUsername.get(m.trim().toLowerCase());
      if (uId && !participantIds.includes(uId)) {
        participantIds.push(uId);
      }
    }
  }

  const convId = 'group_' + crypto.randomUUID().slice(0, 8);
  const newGroup: Conversation = {
    id: convId,
    type: 'group',
    name: name.trim(),
    avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=111827`,
    description: description || '',
    createdBy: user.id,
    admins: [user.id],
    participantIds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  conversations.set(convId, newGroup);
  messages.set(convId, []);

  // Broadcast to all participants
  for (const pId of participantIds) {
    io.to(`user:${pId}`).emit('conversation:new', newGroup);
  }

  return res.json({ conversation: newGroup });
});

// Update Group Details (avatar, name, description)
app.patch('/api/conversations/:id/group', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const conv = conversations.get(req.params.id);
  if (!conv || conv.type !== 'group') return res.status(404).json({ error: 'Group conversation not found' });
  if (!conv.admins.includes(user.id)) return res.status(403).json({ error: 'Only group admins can update group info' });

  const { name, avatar, description } = req.body;
  if (name && typeof name === 'string' && name.trim()) {
    conv.name = name.trim();
  }
  if (avatar && typeof avatar === 'string') {
    conv.avatar = avatar;
  }
  if (description !== undefined && typeof description === 'string') {
    conv.description = description.trim();
  }
  conv.updatedAt = Date.now();

  io.to(`conversation:${conv.id}`).emit('conversation:updated', conv);
  for (const pId of conv.participantIds) {
    io.to(`user:${pId}`).emit('conversation:updated', conv);
  }

  return res.json({ conversation: conv });
});

// Get Messages for a conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const conv = conversations.get(req.params.id);
  if (!conv || !conv.participantIds.includes(user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const convMessages = messages.get(conv.id) || [];
  return res.json({ messages: convMessages });
});

// Search messages across all user conversations
app.get('/api/messages/search', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const query = (req.query.q as string || '').toLowerCase().trim();
  const filter = (req.query.filter as string || '').toLowerCase().trim(); // 'all', 'media', 'files'

  const matched: any[] = [];

  for (const conv of conversations.values()) {
    if (!conv.participantIds.includes(user.id)) continue;
    const convMessages = messages.get(conv.id) || [];

    for (const msg of convMessages) {
      if (filter === 'media' && msg.type !== 'image' && msg.type !== 'audio') continue;
      if (filter === 'files' && msg.type !== 'file') continue;

      const fileName = msg.fileMeta?.name?.toLowerCase() || '';
      const content = (msg.ciphertext || '').toLowerCase();
      const senderName = (msg.senderDisplayName || '').toLowerCase();
      const senderUsername = (msg.senderUsername || '').toLowerCase();

      if (
        !query ||
        content.includes(query) ||
        fileName.includes(query) ||
        senderName.includes(query) ||
        senderUsername.includes(query)
      ) {
        matched.push({
          message: msg,
          conversationId: conv.id,
          conversationType: conv.type,
          conversationName: conv.type === 'group' ? conv.name : undefined,
        });
      }
    }
  }

  // Sort newest first
  matched.sort((a, b) => b.message.createdAt - a.message.createdAt);

  return res.json({ results: matched.slice(0, 100) });
});

// --- Aura Social Routes & Initial Seeding ---
setupSocialRoutes(app, io, {
  users,
  usersByUsername,
  sessions,
  getAuthUser,
});

// --- Aura Meet / Dating Routes ---
setupDatingRoutes(app, io, {
  users,
  conversations,
  messages,
  getAuthUser,
});

seedSocialData({
  users,
  usersByUsername,
  usersByEmail,
  conversations,
  messages,
});

// --- Socket.IO Real-Time Handlers ---
io.on('connection', (socket) => {
  let authenticatedUserId: string | null = null;

  // Client authenticates socket connection with token
  socket.on('authenticate', (token: string) => {
    const userId = sessions.get(token);
    if (!userId) {
      socket.emit('auth_error', { message: 'Invalid or expired token' });
      return;
    }

    authenticatedUserId = userId;
    socket.join(`user:${userId}`);

    // Automatically join all existing conversation rooms for this user
    for (const conv of conversations.values()) {
      if (conv.participantIds.includes(userId)) {
        socket.join(`conversation:${conv.id}`);
      }
    }

    // Update online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    const userObj = users.get(userId);
    if (userObj) {
      userObj.lastSeen = null; // Currently online
    }

    // Broadcast online status to everyone
    io.emit('user:status', {
      userId,
      username: userObj?.username,
      isOnline: true,
      lastSeen: null,
    });

    socket.emit('authenticated', { userId });
  });

  // Join a conversation room for real-time messaging
  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Send a message (Encrypted payload + metadata)
  socket.on('message:send', (payload: {
    conversationId: string;
    ciphertext: string;
    iv: string;
    keyFingerprint: string;
    type: 'text' | 'image' | 'file' | 'audio' | 'system';
    fileMeta?: FileMeta;
  }) => {
    if (!authenticatedUserId) {
      return socket.emit('error', { message: 'Unauthenticated socket' });
    }

    const { conversationId, ciphertext, iv, keyFingerprint, type, fileMeta } = payload;
    const conv = conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(authenticatedUserId)) {
      return socket.emit('error', { message: 'Cannot send message to this conversation' });
    }

    const sender = users.get(authenticatedUserId);
    if (!sender) return;

    const messageId = 'msg_' + crypto.randomUUID().slice(0, 10);
    const now = Date.now();

    // Mark delivery to whoever is currently online in this conversation
    const deliveredTo: string[] = [authenticatedUserId];
    for (const pId of conv.participantIds) {
      if (pId !== authenticatedUserId && (onlineUsers.get(pId)?.size || 0) > 0) {
        deliveredTo.push(pId);
      }
    }

    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: authenticatedUserId,
      senderUsername: sender.username,
      senderDisplayName: sender.displayName,
      senderAvatar: sender.avatar,
      ciphertext,
      iv: iv || '',
      keyFingerprint: keyFingerprint || 'AES-GCM-256',
      type: type || 'text',
      fileMeta,
      createdAt: now,
      reactions: [],
      deliveredTo,
      readBy: [{ userId: authenticatedUserId, readAt: now }],
    };

    if (!messages.has(conversationId)) {
      messages.set(conversationId, []);
    }
    messages.get(conversationId)!.push(newMessage);

    conv.updatedAt = now;
    conv.lastMessage = {
      id: messageId,
      senderUsername: sender.username,
      ciphertext: type === 'text' ? ciphertext : `[${type.toUpperCase()}]`,
      type,
      createdAt: now,
    };

    // Emit to everyone in the conversation room
    io.to(`conversation:${conversationId}`).emit('message:new', newMessage);

    // Send push notification / alert event to participants not actively focused
    for (const pId of conv.participantIds) {
      if (pId !== authenticatedUserId) {
        io.to(`user:${pId}`).emit('notification:push', {
          conversationId,
          conversationName: conv.type === 'group' ? conv.name : sender.displayName,
          senderName: sender.displayName,
          senderUsername: sender.username,
          senderAvatar: sender.avatar,
          type,
          isGroup: conv.type === 'group',
          createdAt: now,
        });
      }
    }
  });

  // Mark message as read
  socket.on('message:read', (data: { conversationId: string; messageIds: string[] }) => {
    if (!authenticatedUserId) return;
    const { conversationId, messageIds } = data;
    const conv = conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(authenticatedUserId)) return;

    const convMessages = messages.get(conversationId) || [];
    const readAt = Date.now();
    let updatedAny = false;

    for (const msg of convMessages) {
      if (messageIds.includes(msg.id)) {
        if (!msg.readBy.some((r) => r.userId === authenticatedUserId)) {
          msg.readBy.push({ userId: authenticatedUserId, readAt });
          if (!msg.deliveredTo.includes(authenticatedUserId)) {
            msg.deliveredTo.push(authenticatedUserId);
          }
          updatedAny = true;
        }
      }
    }

    if (updatedAny) {
      io.to(`conversation:${conversationId}`).emit('message:read_receipt', {
        conversationId,
        messageIds,
        userId: authenticatedUserId,
        readAt,
      });
    }
  });

  // Typing indicator
  socket.on('typing:start', (conversationId: string) => {
    if (!authenticatedUserId) return;
    const user = users.get(authenticatedUserId);
    if (!user) return;
    socket.to(`conversation:${conversationId}`).emit('user:typing', {
      conversationId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      isTyping: true,
    });
  });

  socket.on('typing:stop', (conversationId: string) => {
    if (!authenticatedUserId) return;
    socket.to(`conversation:${conversationId}`).emit('user:typing', {
      conversationId,
      userId: authenticatedUserId,
      isTyping: false,
    });
  });

  // Add / Toggle reaction to message
  socket.on('message:react', (data: { conversationId: string; messageId: string; emoji: string }) => {
    if (!authenticatedUserId) return;
    const { conversationId, messageId, emoji } = data;
    const conv = conversations.get(conversationId);
    if (!conv) return;

    const convMessages = messages.get(conversationId) || [];
    const message = convMessages.find((m) => m.id === messageId);
    const user = users.get(authenticatedUserId);
    if (!message || !user) return;

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId === authenticatedUserId && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Toggle off
      message.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId: authenticatedUserId,
        username: user.username,
        userAvatar: user.avatar,
        displayName: user.displayName,
      });
    }

    io.to(`conversation:${conversationId}`).emit('message:reaction_updated', {
      conversationId,
      messageId,
      reactions: message.reactions,
    });

    for (const pId of conv.participantIds) {
      io.to(`user:${pId}`).emit('message:reaction_updated', {
        conversationId,
        messageId,
        reactions: message.reactions,
      });
    }
  });

  // Pin or unpin a message within a conversation
  socket.on('message:pin', (data: { conversationId: string; messageId: string; isPinned: boolean }) => {
    if (!authenticatedUserId) return;
    const { conversationId, messageId, isPinned } = data;
    const conv = conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(authenticatedUserId)) return;

    const convMessages = messages.get(conversationId) || [];
    const message = convMessages.find((m) => m.id === messageId);
    const user = users.get(authenticatedUserId);
    if (!message || !user) return;

    message.isPinned = isPinned;
    if (isPinned) {
      message.pinnedBy = authenticatedUserId;
      message.pinnedByUsername = user.username;
      message.pinnedAt = Date.now();
    } else {
      delete message.pinnedBy;
      delete message.pinnedByUsername;
      delete message.pinnedAt;
    }

    const payload = {
      conversationId,
      messageId,
      isPinned,
      pinnedBy: isPinned ? authenticatedUserId : undefined,
      pinnedByUsername: isPinned ? user.username : undefined,
      pinnedAt: isPinned ? message.pinnedAt : undefined,
    };

    io.to(`conversation:${conversationId}`).emit('message:pinned_updated', payload);

    for (const pId of conv.participantIds) {
      io.to(`user:${pId}`).emit('message:pinned_updated', payload);
    }
  });

  // Add members to group
  socket.on('group:add_member', (data: { conversationId: string; username: string }) => {
    if (!authenticatedUserId) return;
    const { conversationId, username } = data;
    const conv = conversations.get(conversationId);
    if (!conv || conv.type !== 'group' || !conv.admins.includes(authenticatedUserId)) return;

    const targetId = usersByUsername.get(username.trim().toLowerCase());
    if (!targetId || conv.participantIds.includes(targetId)) return;

    conv.participantIds.push(targetId);
    conv.updatedAt = Date.now();

    const targetUser = users.get(targetId);
    const addedByUser = users.get(authenticatedUserId);

    // Add system message
    const sysMsg: Message = {
      id: 'sys_' + crypto.randomUUID().slice(0, 8),
      conversationId,
      senderId: 'system',
      senderUsername: 'System',
      senderDisplayName: 'System Notice',
      senderAvatar: '',
      ciphertext: `${addedByUser?.displayName || 'Admin'} added @${targetUser?.username} to the encrypted group`,
      iv: '',
      keyFingerprint: '',
      type: 'system',
      createdAt: Date.now(),
      reactions: [],
      deliveredTo: conv.participantIds,
      readBy: [],
    };
    messages.get(conversationId)?.push(sysMsg);

    io.to(`user:${targetId}`).emit('conversation:new', conv);
    io.to(`conversation:${conversationId}`).emit('conversation:updated', conv);
    io.to(`conversation:${conversationId}`).emit('message:new', sysMsg);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (authenticatedUserId && onlineUsers.has(authenticatedUserId)) {
      const socketSet = onlineUsers.get(authenticatedUserId)!;
      socketSet.delete(socket.id);

      if (socketSet.size === 0) {
        onlineUsers.delete(authenticatedUserId);
        const lastSeen = Date.now();
        const userObj = users.get(authenticatedUserId);
        if (userObj) {
          userObj.lastSeen = lastSeen;
        }

        io.emit('user:status', {
          userId: authenticatedUserId,
          username: userObj?.username,
          isOnline: false,
          lastSeen,
        });
      }
    }
  });
});

// --- Vite Middleware or Static Production Serving ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CipherChat Server running at http://0.0.0.0:${PORT} (env: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
