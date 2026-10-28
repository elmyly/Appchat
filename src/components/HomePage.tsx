import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Compass,
  LayoutGrid,
  Heart,
  Repeat2,
  Bookmark,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  FolderOpen,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onEnterApp: () => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'forgot') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onEnterApp, onOpenAuth }) => {
  const { user } = useAuth();
  const [activePreview, setActivePreview] = useState<'feed' | 'visuals' | 'messages'>('feed');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-[#5036FF]">
      {/* --- Sticky Navigation Bar --- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <AppLogo size={36} showText textClassName="text-xl" />
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#feed" className="hover:text-[#5036FF] transition-colors">
                Social Feed
              </a>
              <a href="#visuals" className="hover:text-[#5036FF] transition-colors">
                Visual Discovery
              </a>
              <a href="#boards" className="hover:text-[#5036FF] transition-colors">
                Boards
              </a>
              <a href="#messenger" className="hover:text-[#5036FF] transition-colors">
                Encrypted Messenger
              </a>
              <a href="#security" className="hover:text-[#5036FF] transition-colors">
                Privacy
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-slate-600">
                  Signed in as <strong className="text-slate-900">@{user.username}</strong>
                </span>
                <button
                  onClick={onEnterApp}
                  className="px-4 py-2 bg-[#5036FF] hover:bg-[#432bd9] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Open Aura</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 bg-[#5036FF] hover:bg-[#432bd9] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-[#5036FF] text-xs font-semibold mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Unified Social Network — X meets Pinterest meets Signal</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 max-w-4xl mx-auto leading-tight sm:leading-tight">
            Share your world. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5036FF] to-indigo-500">
              Discover new ideas.
            </span>{' '}
            Connect privately.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Aura brings real-time microblogging discussions, Pinterest-style visual discovery boards,
            and military-grade end-to-end encrypted messaging together into one beautiful platform.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#5036FF] hover:bg-[#432bd9] text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Join Aura Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-2xl border border-slate-200/80 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#5036FF]" />
              <span>Explore Public Platform</span>
            </button>
          </div>

          {/* Quick Pillars Trust Strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Public Microblogging & Feed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Visual Masonry Mood Boards
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Curve25519 E2E Encrypted Chat
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero Ad Tracking
            </span>
          </div>
        </div>

        {/* --- Interactive Live Product Preview Showcase --- */}
        <div className="mt-14 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActivePreview('feed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activePreview === 'feed'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              01. Social Feed (X-Style)
            </button>
            <button
              onClick={() => setActivePreview('visuals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activePreview === 'visuals'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              02. Visual Discovery (Pinterest-Style)
            </button>
            <button
              onClick={() => setActivePreview('messages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activePreview === 'messages'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              03. Encrypted Messenger (Aura Chat)
            </button>
          </div>

          {/* Mock Window Container */}
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Window bar */}
            <div className="px-5 py-3.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  aura.network/{activePreview}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Demo Preview
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-6 md:p-8 bg-slate-50/50">
              {/* Feed Preview */}
              {activePreview === 'feed' && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                        alt="Elena"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Elena Rostova</span>
                          <span className="text-[11px] text-slate-500">@elena · 12m</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Lead Architectural Designer</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      Just launched the complete design system for our new minimalist pavilion.
                      Focusing on bioclimatic ventilation and natural travertine stone textures.
                      What matters more in modern public spaces? #Architecture #Design
                    </p>
                    {/* Poll Preview */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Acoustic comfort & natural airflow</span>
                        <span className="font-bold text-[#5036FF]">64%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#5036FF] w-[64%]" />
                      </div>
                      <div className="flex justify-between items-center text-slate-700 pt-1">
                        <span>Pure minimalist aesthetic form</span>
                        <span className="font-bold text-slate-500">36%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 w-[36%]" />
                      </div>
                    </div>
                    {/* Interaction row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 hover:text-rose-600 transition-colors cursor-pointer">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> 184
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-[#5036FF] transition-colors cursor-pointer">
                        <Repeat2 className="w-4 h-4" /> 42
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-pointer">
                        <MessageSquare className="w-4 h-4" /> 29
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-[#5036FF] transition-colors cursor-pointer">
                        <Bookmark className="w-4 h-4" /> Save
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Visuals Preview */}
              {activePreview === 'visuals' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
                  <div className="group relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 aspect-[3/4]">
                    <img
                      src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80"
                      alt="Interior"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                        Design
                      </span>
                      <p className="text-xs font-bold truncate">Minimalist Atelier</p>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 aspect-[3/5]">
                    <img
                      src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
                      alt="Technology"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                        Technology
                      </span>
                      <p className="text-xs font-bold truncate">Quantum Photonic Chip</p>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 aspect-[3/4]">
                    <img
                      src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
                      alt="Nature"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                        Nature
                      </span>
                      <p className="text-xs font-bold truncate">Dolomites Alpine Peak</p>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 aspect-[3/5]">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
                      alt="Art"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                        Art
                      </span>
                      <p className="text-xs font-bold truncate">Ethereal Geometry</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Preview */}
              {activePreview === 'messages' && (
                <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5036FF] font-bold flex items-center justify-center text-xs">
                        K
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Kai Tanaka</p>
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online · Curve25519 E2EE
                        </p>
                      </div>
                    </div>
                    <span className="p-1.5 text-slate-400 bg-slate-50 rounded-lg">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    </span>
                  </div>

                  <div className="space-y-2.5 py-2">
                    <div className="max-w-[75%] p-3 bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm text-xs">
                      Just saw your new Pinterest mood board on Neural Architecture!
                    </div>
                    <div className="max-w-[75%] ml-auto p-3 bg-[#5036FF] text-white rounded-2xl rounded-tr-sm text-xs">
                      Thanks! All saved from the visual discovery feed. Here is the direct link.
                    </div>
                    <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5036FF] animate-pulse" />
                      Kai is typing...
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      disabled
                      placeholder="Send encrypted message..."
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 rounded-xl outline-none"
                    />
                    <button
                      onClick={onEnterApp}
                      className="px-3.5 py-1.5 bg-[#5036FF] text-white text-xs font-semibold rounded-xl"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- The Three Pillars Section --- */}
      <section id="features" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              Three Worlds. One Identity.
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything you need in a modern social network
            </h3>
            <p className="text-sm text-slate-600 mt-3">
              Why switch between three separate apps when you can express, curate, and converse in
              one unified privacy-first ecosystem?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">01. Microblogging Feed</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Post short updates, multi-photo galleries, interactive live polls, and trending
                hashtags. Repost, bookmark, and engage in threaded nested discussions with custom
                mentions.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> For You, Following & Latest tabs
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Real-time poll voting & statistics
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Trending topics & creator suggestions
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF]">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">02. Visuals & Boards</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pinterest-inspired visual discovery. Organize aesthetic photography, architectural
                gems, tech concepts, and art into public or secret collaborative boards with friends.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dynamic masonry layout gallery
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1-Click pin to board collection
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Collaborative board contributors
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF]">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">03. Encrypted Messenger</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The full Aura Messenger protocol: 1-on-1 and encrypted group chats, voice notes,
                emoji reactions, message pinning, and native "Share to Chat" from any public post.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Curve25519 authenticated cipher
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Typing indicators & read receipts
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Voice notes & encrypted attachments
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Privacy & Trust Section --- */}
      <section id="security" className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-8 md:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">
                Architected with Genuine Cryptographic Security
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Public social content is shared for discovery, but your private conversations remain
                strictly yours. Private keys never leave your browser device; messages in transit
                cannot be read by servers, administrators, or third-party advertisers.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-slate-500">
                <span>Curve25519 Key Exchange</span>
                <span>·</span>
                <span>AES-256-GCM Cipher</span>
                <span>·</span>
                <span>Zero Telemetry</span>
                <span>·</span>
                <span>No Third-Party Cookies</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Bottom CTA Bar --- */}
      <section className="py-16 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-3xl font-extrabold text-slate-950">
            Ready to experience social media redefined?
          </h2>
          <p className="text-sm text-slate-600">
            Create your username today. Connect with creators, curate your visual worlds, and chat
            freely with end-to-end encryption.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-3.5 bg-[#5036FF] hover:bg-[#432bd9] text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Create Aura Account
            </button>
            <button
              onClick={onEnterApp}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-2xl transition-all cursor-pointer"
            >
              Browse Public Feed
            </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="mt-auto py-8 bg-slate-100 border-t border-slate-200 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo size={24} showText textClassName="text-sm font-bold text-slate-800" />
            <span>© {new Date().getFullYear()} Aura Social. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#feed" className="hover:text-slate-800">Feed</a>
            <a href="#visuals" className="hover:text-slate-800">Visuals</a>
            <a href="#boards" className="hover:text-slate-800">Boards</a>
            <a href="#messenger" className="hover:text-slate-800">Messenger</a>
            <span className="text-slate-400">#5036FF</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
