import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Compass,
  LayoutGrid,
  Heart,
  Repeat2,
  Bookmark,
  ShieldCheck,
  CheckCircle2,
  Users,
  FolderOpen,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  PenTool,
  Smile,
  BadgeCheck,
  Menu,
  X,
  Send,
  Flame,
  Smartphone,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onEnterApp: () => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'forgot') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onEnterApp, onOpenAuth }) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<'feed' | 'visuals' | 'messages'>('feed');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);


  // Interactive Poll state in Feed Preview
  const [pollVotes, setPollVotes] = useState<{ opt1: number; opt2: number }>({
    opt1: 142,
    opt2: 67,
  });
  const [userVoted, setUserVoted] = useState<'opt1' | 'opt2' | null>(null);

  const totalPollVotes = pollVotes.opt1 + pollVotes.opt2;
  const opt1Percent = Math.round((pollVotes.opt1 / totalPollVotes) * 100);
  const opt2Percent = 100 - opt1Percent;

  const handleVote = (option: 'opt1' | 'opt2') => {
    if (userVoted) return;
    setUserVoted(option);
    setPollVotes((prev) => ({
      ...prev,
      [option]: prev[option] + 1,
    }));
  };

  // Interactive Post Like & Bookmark state in Feed Preview
  const [previewLiked, setPreviewLiked] = useState(false);
  const [previewLikeCount, setPreviewLikeCount] = useState(194);
  const [previewBookmarked, setPreviewBookmarked] = useState(false);

  const togglePreviewLike = () => {
    if (previewLiked) {
      setPreviewLiked(false);
      setPreviewLikeCount((c) => c - 1);
    } else {
      setPreviewLiked(true);
      setPreviewLikeCount((c) => c + 1);
    }
  };

  // Interactive Visuals Preview category filter
  const [visualCategory, setVisualCategory] = useState<string>('All');
  const previewVisuals = [
    {
      id: '1',
      category: 'Design',
      title: 'Minimalist Atelier',
      image:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
      aspect: 'aspect-[3/4]',
    },
    {
      id: '2',
      category: 'Architecture',
      title: 'Urban Light Well',
      image:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
      aspect: 'aspect-[3/5]',
    },
    {
      id: '3',
      category: 'Nature',
      title: 'Alpine Mountain Pass',
      image:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      aspect: 'aspect-[3/4]',
    },
    {
      id: '4',
      category: 'Art',
      title: 'Ethereal Geometry',
      image:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      aspect: 'aspect-[3/5]',
    },
  ];

  const filteredVisuals = previewVisuals.filter(
    (v) => visualCategory === 'All' || v.category.toLowerCase() === visualCategory.toLowerCase()
  );

  // Interactive Messenger Preview
  const [chatMessages, setChatMessages] = useState<
    { sender: 'them' | 'me'; text: string; time: string }[]
  >([
    {
      sender: 'them',
      text: 'Just saw your new architectural mood board on low-impact materials!',
      time: '10:42 AM',
    },
    {
      sender: 'me',
      text: 'Thank you! Saved them directly from the visual feed.',
      time: '10:44 AM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isKaiTyping, setIsKaiTyping] = useState(false);

  const handleSendPreviewMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: 'me' as const,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setIsKaiTyping(true);

    // Simulated authentic reply
    setTimeout(() => {
      setIsKaiTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'them',
          text: 'Love that perspective! Looking forward to co-curating the next collection ✨',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 950);
  };

  // Community Testimonials Filter
  const [reviewFilter, setReviewFilter] = useState<'all' | 'design' | 'writing' | 'art'>('all');
  const reviews = [
    {
      type: 'design',
      name: 'Elena Rostova',
      role: 'Architect & Spatial Researcher',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      comment:
        'On standard social media, I felt forced to post outrageous hooks to get noticed. On Aura, my architecture essays receive thoughtful replies and real conversations with colleagues.',
    },
    {
      type: 'art',
      name: 'Julian Vega',
      role: 'Visual Art Director',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      comment:
        'The visual mood boards combined with private messaging are a game changer. I share photo inspiration with creative directors and we chat immediately without switching apps.',
    },
    {
      type: 'writing',
      name: 'Sarah Al-Mansoor',
      role: 'Independent Writer & Journalist',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
      comment:
        'Knowing that every verified profile is an actual human makes an enormous difference. I haven’t encountered a single bot account or toxic thread since joining.',
    },
  ];

  const filteredReviews = reviews.filter(
    (r) => reviewFilter === 'all' || r.type === reviewFilter
  );

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: 'What is Aura and how is it different from other social networks?',
      answer:
        'Aura is a calm, authenticated creator platform designed for authentic humans. Unlike mainstream feeds dominated by algorithmic outrage and bots, Aura combines rich story writing, visual mood boards, and private messaging into one clean, distraction-free space where genuine creators and readers connect.',
    },
    {
      question: 'How do I earn the Verified Creator badge?',
      answer:
        'Any registered member can request a verified badge through Account Settings. Simply provide your real name, professional focus or creative portfolio, and a quick verification selfie or link. Our moderation team reviews requests to ensure verified profiles belong to real, authentic people.',
    },
    {
      question: 'Is Aura free to use for readers and writers?',
      answer:
        'Yes! Aura is 100% free to join, explore, write, curate moodboards, and converse. There are no paywalls for reading public stories and no hidden subscription traps.',
    },
    {
      question: 'How are my private messages protected?',
      answer:
        'Your conversations in Aura Messenger are strictly confidential. We do not scan your private chats for keyword advertising, we never sell your contact list, and our servers do not index personal messages. Your thoughts remain between you and your conversations.',
    },
    {
      question: 'Can I use Aura on my phone or tablet?',
      answer:
        'Absolutely. Aura is fully responsive and optimized for mobile browsers, iPads, and desktop screens with seamless instant navigation and touch-friendly controls.',
    },
    {
      question: 'What kind of topics and creative work can I share?',
      answer:
        'Aura welcomes photography, design, writing, architecture, technology insights, lifestyle inspiration, poetry, recipes, and personal perspectives. Both short updates and long-form articles with multi-image galleries are supported.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-[#5036FF] overflow-x-hidden">
      {/* --- Sticky Top Navigation Bar --- */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <AppLogo size={36} showText textClassName="text-xl" />
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#about" className="hover:text-[#5036FF] transition-colors py-2">
                About Aura
              </a>
              <a href="#features" className="hover:text-[#5036FF] transition-colors py-2">
                What You Can Do
              </a>
              <a href="#preview" className="hover:text-[#5036FF] transition-colors py-2">
                Live Preview
              </a>
              <a href="#how-it-works" className="hover:text-[#5036FF] transition-colors py-2">
                How It Works
              </a>
              <a href="#community" className="hover:text-[#5036FF] transition-colors py-2">
                Community
              </a>
              <a
                href="#download"
                className="hover:text-[#5036FF] transition-colors py-2 flex items-center gap-1.5 font-bold text-[#5036FF]"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile App</span>
              </a>
              <a href="#faq" className="hover:text-[#5036FF] transition-colors py-2">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-xs text-slate-600">
                  Welcome back, <strong className="text-slate-900">@{user.username}</strong>
                </span>
                <button
                  onClick={onEnterApp}
                  className="min-h-[44px] px-4 py-2 bg-[#5036FF] hover:bg-[#432bd9] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Open Feed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="hidden sm:inline-flex min-h-[44px] px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer items-center"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="min-h-[44px] px-4 py-2 bg-[#5036FF] hover:bg-[#432bd9] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Join Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile Navigation Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* --- Mobile Animated Dropdown Drawer Menu --- */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-3 duration-200">
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-700">
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                About Aura
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                What You Can Do
              </a>
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Live Preview
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#community"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Community
              </a>
              <a
                href="#download"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center gap-2 px-3 rounded-xl hover:bg-slate-100 transition-colors text-[#5036FF] font-bold"
              >
                <Smartphone className="w-4 h-4" />
                <span>Download Mobile App</span>
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Frequently Asked Questions
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="min-h-[44px] w-full py-2.5 px-4 text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('register');
                    }}
                    className="min-h-[44px] w-full py-2.5 px-4 text-center text-sm font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Create Your Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onEnterApp();
                  }}
                  className="min-h-[44px] w-full py-2.5 px-4 text-center text-sm font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Open Feed (@{user.username})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>



      {/* --- High-Impact Creative Ideas & Chat Banner Showcase (Top Directly Below Header) --- */}
      <section className="relative w-full overflow-hidden bg-slate-950">
        <div className="relative w-full overflow-hidden border-b border-slate-200/80 bg-slate-950 group shadow-lg">
          {/* Main Creative Ideas & Chat Banner Image (Fixed Height, Full Width) */}
          <div className="relative w-full h-[320px] sm:h-[420px] md:h-[480px] lg:h-[540px] overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
            <img
              src="/assets/aistudio/Futuristic_Social_Creativity_Banner_af067fcc.png"
              alt="Aura Creative Social Platform - Share Ideas, Visual Stories & Chat"
              className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
              loading="eager"
            />

            {/* Gentle ambient edge gradients */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />

            {/* Floating Highlight Badge Top Left */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl border border-white/70 text-slate-900 animate-float-slow">
              <img
                src="/assets/aistudio/Interwoven_Purple_Blue_Ribbon_Logo_baa92702.png"
                alt="Aura Ribbon"
                className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900">
                    Create & Connect
                  </span>
                  <BadgeCheck className="w-3.5 h-3.5 text-[#5036FF] fill-indigo-100" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Stories, Visuals & Private Chat
                </span>
              </div>
            </div>

            {/* Floating Interactive Badge Bottom Right */}
            <div className="absolute bottom-5 right-4 sm:bottom-6 sm:right-6 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/70 text-slate-900 hover:-translate-y-1 transition-transform">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5036FF]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-900 block">
                  Share Ideas in Real Time
                </span>
                <span className="text-[11px] text-slate-500">
                  Collaborate, curate & converse
                </span>
              </div>
            </div>

            {/* Bottom Banner Title / Editorial Callout */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 max-w-lg text-left text-white drop-shadow-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/90 backdrop-blur-md text-[10px] sm:text-[11px] font-semibold text-white mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Creativity · Inspiration · Connection</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-sm">
                Share Your Perspective. Exchange Real Ideas.
              </h2>
            </div>
          </div>

          {/* Banner Feature Sub-Bar (Full Width) */}
          <div className="w-full bg-slate-950 text-white border-t border-slate-800">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 p-3 sm:p-5">
              <div className="p-3 text-center sm:text-left hover:bg-slate-900/60 rounded-xl transition-colors">
                <div className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  <span>100% Human</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Strict verified creator standards
                </p>
              </div>
              <div className="p-3 text-center sm:text-left hover:bg-slate-900/60 rounded-xl transition-colors">
                <div className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  <span>Visual Boards</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Curate aesthetic inspiration
                </p>
              </div>
              <div className="p-3 text-center sm:text-left hover:bg-slate-900/60 rounded-xl transition-colors">
                <div className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  <span>Share Ideas & Chat</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Instant direct & group conversations
                </p>
              </div>
              <div className="p-3 text-center sm:text-left hover:bg-slate-900/60 rounded-xl transition-colors">
                <div className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  <span>True Privacy</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Zero ad tracking in direct chats
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Action Bar & Core Trust Strip (Directly Below Banner) --- */}
      <section className="py-8 sm:py-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto sm:max-w-none">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 bg-[#5036FF] hover:bg-[#432bd9] text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-95"
            >
              <span>Create Your Free Profile</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-2xl border border-slate-200/90 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Compass className="w-4 h-4 text-[#5036FF]" />
              <span>Explore Public Stories</span>
            </button>
          </div>

          {/* Core Values Strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Real Verified People
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Visual Mood Boards
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Private Ad-Free Chats
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Zero Bot Spam
            </span>
          </div>
        </div>
      </section>

      {/* --- About Section: What is Aura? --- */}
      <section id="about" className="py-16 sm:py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#5036FF]">
                <PenTool className="w-4 h-4" />
                <span>The Story Behind Aura</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug sm:leading-tight">
                Social media was supposed to connect us. We rebuilt it to fulfill that promise.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Traditional social platforms reward controversy, clickbait, and endless scrolling.
                Over time, real conversations were replaced by automated bots, aggressive ads, and
                exhausting feeds designed to keep you agitated.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Aura was founded on a simple belief: <strong>human expression is valuable</strong>.
                When you share a photo, an essay, or a creative project, you should be surrounded by
                real people who appreciate nuance. When you chat with someone, your conversation
                should stay completely private.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-1.5 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> For Thoughtful Readers
                  </h4>
                  <p className="text-xs text-slate-500">
                    A calm feed where you follow authors, thinkers, and topics that truly nourish
                    your curiosity.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-1.5 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> For Authentic Creators
                  </h4>
                  <p className="text-xs text-slate-500">
                    Get discovered for your genuine voice and portfolio, not by playing algorithmic
                    gimmicks.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Collage of Community Inspiration */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="rounded-3xl overflow-hidden shadow-md bg-white border border-slate-200 aspect-[4/5] relative group">
                  <img
                    src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
                    alt="Interior Architecture"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 sm:p-4 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Architecture
                    </span>
                    <p className="text-xs font-bold">Natural Light Studies</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#5036FF] flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Marcus Vance</p>
                      <p className="text-[10px] text-slate-500">Documentary Essayist</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "Finally, a place on the internet where long-form writing isn't buried under spam
                    comments."
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                <div className="p-4 sm:p-5 rounded-3xl bg-[#5036FF] text-white space-y-2.5 shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  <h4 className="text-xs sm:text-sm font-bold">The Verified Distinction</h4>
                  <p className="text-[11px] sm:text-xs text-indigo-100 leading-relaxed">
                    Every blue checkmark on Aura represents a real verified identity vetted by our
                    team. No bought bots.
                  </p>
                </div>

                <div className="rounded-3xl overflow-hidden shadow-md bg-white border border-slate-200 aspect-[4/5] relative group">
                  <img
                    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                    alt="Alpine Landscape"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 sm:p-4 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Photography
                    </span>
                    <p className="text-xs font-bold">Dolomite Mountain Passes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- What You Can Do Section --- */}
      <section id="features" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              Explore the Platform
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Everything you need to express, curate, and converse
            </h3>
            <p className="text-sm text-slate-600 mt-2 sm:mt-3">
              One seamless platform designed around human creativity and genuine relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1: Stories & Thoughtful Feed */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-xl hover:border-indigo-200 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF] group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">01. Stories & Discussions</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish thoughtful short updates, multi-photo essays, interactive community polls,
                and bookmarked threads. Experience genuine comments without harassment or spam.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Chronological 'Following' or curated 'For You'</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Interactive polls with instant community results</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Save posts to personal bookmarks anytime</span>
                </li>
              </ul>
            </div>

            {/* Feature 2: Visual Moodboards */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-xl hover:border-indigo-200 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF] group-hover:scale-110 transition-transform">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">02. Visual Mood Boards</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Curate aesthetic photography, design ideas, travel inspirations, and artwork into
                dynamic masonry boards. Share them publicly or collaborate with fellow curators.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Fluid masonry visual discovery feed</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>One-click pinning to custom categorized boards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Invite collaborators to co-curate collections</span>
                </li>
              </ul>
            </div>

            {/* Feature 3: Private Messenger */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-xl hover:border-indigo-200 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5036FF] group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">03. Private Messenger</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect directly with creators and friends in a private messaging space. Share posts
                seamlessly into chats, send voice notes, and talk without invasive ad tracking.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>One-on-one and group conversation channels</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Voice messages, photo sharing, and emoji reactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Native 'Share to Chat' from any post or visual</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Interactive Live Product Preview Sandbox --- */}
      <section id="preview" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fully Interactive Sandbox</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              Experience Aura Before You Sign Up
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Try voting in a live poll, clicking reactions, or typing in the chat below.
            </p>
          </div>

          {/* Switcher Tabs - Mobile scrollable */}
          <div className="flex items-center justify-start sm:justify-center gap-2 mb-6 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActivePreview('feed')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activePreview === 'feed'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Stories & Interactive Feed
            </button>
            <button
              onClick={() => setActivePreview('visuals')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activePreview === 'visuals'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Visual Mood Boards
            </button>
            <button
              onClick={() => setActivePreview('messages')}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activePreview === 'messages'
                  ? 'bg-[#5036FF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Private Messenger Demo
            </button>
          </div>

          {/* Mock Window Container */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-none">
                  aura.network/{activePreview}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Interactive Demo</span>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8 bg-slate-50/50">
              {/* TAB 1: Stories & Interactive Poll */}
              {activePreview === 'feed' && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                          alt="Elena"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">Elena Rostova</span>
                            <BadgeCheck className="w-3.5 h-3.5 text-[#5036FF] fill-indigo-50" />
                            <span className="text-[11px] text-slate-400">· 15m ago</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Lead Architectural Designer</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-[#5036FF]">
                        Story Poll
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      Just completed the design study for our low-impact urban library. Focused on
                      passive daylight illumination and locally sourced timber textures. Which
                      elements inspire you most in public architecture?
                    </p>

                    {/* Interactive Poll Box */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between text-slate-700 mb-1">
                        <span className="font-bold text-slate-900">Community Poll (Tap to Vote)</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {totalPollVotes} votes
                        </span>
                      </div>

                      {/* Option 1 */}
                      <button
                        type="button"
                        onClick={() => handleVote('opt1')}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                          userVoted === 'opt1'
                            ? 'border-[#5036FF] bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-[#5036FF]/10 transition-all duration-700 ease-out"
                          style={{ width: `${opt1Percent}%` }}
                        />
                        <div className="relative flex justify-between items-center z-10">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {userVoted === 'opt1' && (
                              <Check className="w-3.5 h-3.5 text-[#5036FF]" />
                            )}
                            Natural sunlight & acoustic calm
                          </span>
                          <span className="font-bold text-[#5036FF] ml-2">{opt1Percent}%</span>
                        </div>
                      </button>

                      {/* Option 2 */}
                      <button
                        type="button"
                        onClick={() => handleVote('opt2')}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                          userVoted === 'opt2'
                            ? 'border-[#5036FF] bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-300/30 transition-all duration-700 ease-out"
                          style={{ width: `${opt2Percent}%` }}
                        />
                        <div className="relative flex justify-between items-center z-10">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {userVoted === 'opt2' && (
                              <Check className="w-3.5 h-3.5 text-[#5036FF]" />
                            )}
                            Modern minimalist timber materials
                          </span>
                          <span className="font-bold text-slate-600 ml-2">{opt2Percent}%</span>
                        </div>
                      </button>

                      {userVoted && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 pt-1 animate-in fade-in">
                          <Check className="w-3 h-3 text-emerald-500" /> Your vote has been recorded
                          in real time!
                        </p>
                      )}
                    </div>

                    {/* Interactive Post Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={togglePreviewLike}
                        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer ${
                          previewLiked
                            ? 'text-rose-600 bg-rose-50 font-bold scale-105'
                            : 'hover:text-rose-600 hover:bg-slate-50'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            previewLiked ? 'fill-rose-500 text-rose-500 scale-125' : ''
                          }`}
                        />
                        <span>{previewLikeCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePreview('messages')}
                        className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-[#5036FF] hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>31 Replies</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewBookmarked(!previewBookmarked)}
                        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                          previewBookmarked
                            ? 'text-[#5036FF] bg-indigo-50 font-bold'
                            : 'hover:text-[#5036FF] hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            previewBookmarked ? 'fill-[#5036FF] text-[#5036FF]' : ''
                          }`}
                        />
                        <span>{previewBookmarked ? 'Saved' : 'Bookmark'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Visual Moodboards Preview */}
              {activePreview === 'visuals' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Category Filter Pills */}
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {['All', 'Design', 'Architecture', 'Nature', 'Art'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setVisualCategory(cat)}
                        className={`min-h-[36px] px-3.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          visualCategory === cat
                            ? 'bg-[#5036FF] text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Responsive Visual Grid: 2 columns on mobile, 4 on desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {filteredVisuals.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative rounded-2xl overflow-hidden shadow-xs bg-slate-100 ${item.aspect} hover:shadow-lg transition-all`}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <p className="text-xs font-bold truncate">{item.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Interactive Private Messenger Demo */}
              {activePreview === 'messages' && (
                <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5036FF] font-bold flex items-center justify-center text-xs">
                        K
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900">Kai Tanaka</p>
                          <BadgeCheck className="w-3.5 h-3.5 text-[#5036FF] fill-indigo-50" />
                        </div>
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online · Private Chat
                        </p>
                      </div>
                    </div>
                    <span className="p-1.5 text-slate-400 bg-slate-50 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </span>
                  </div>

                  {/* Message Bubbles Container */}
                  <div className="space-y-2.5 py-2 min-h-[160px] max-h-[240px] overflow-y-auto custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[80%] p-3 text-xs rounded-2xl ${
                          msg.sender === 'me'
                            ? 'ml-auto bg-[#5036FF] text-white rounded-tr-sm'
                            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span
                          className={`text-[9px] block text-right mt-1 ${
                            msg.sender === 'me' ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                    ))}

                    {isKaiTyping && (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 py-1">
                        <span className="w-2 h-2 rounded-full bg-[#5036FF] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[#5036FF] animate-bounce delay-100" />
                        <span className="w-2 h-2 rounded-full bg-[#5036FF] animate-bounce delay-200" />
                        <span>Kai is typing...</span>
                      </div>
                    )}
                  </div>

                  {/* Real-working Interactive Message Form */}
                  <form
                    onSubmit={handleSendPreviewMessage}
                    className="flex items-center gap-2 pt-2 border-t border-slate-100"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message (e.g. 'Love your new board!')..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#5036FF] rounded-xl outline-none text-slate-800 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="min-h-[38px] px-4 py-2 bg-[#5036FF] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- How It Works Section (3-Step Guide) --- */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              Simple & Intuitive
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How to get started on Aura in 3 steps
            </h3>
            <p className="text-sm text-slate-600 mt-2 sm:mt-3">
              Joining the community takes less than one minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 relative hover:-translate-y-1.5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
              <span className="w-10 h-10 rounded-2xl bg-[#5036FF] text-white font-extrabold flex items-center justify-center text-sm mb-5 shadow-sm">
                1
              </span>
              <h4 className="text-base font-bold text-slate-900 mb-2">Create Your Free Profile</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose a unique username and select your creative topics of interest—from
                photography and design to writing, science, and lifestyle.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 relative hover:-translate-y-1.5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
              <span className="w-10 h-10 rounded-2xl bg-[#5036FF] text-white font-extrabold flex items-center justify-center text-sm mb-5 shadow-sm">
                2
              </span>
              <h4 className="text-base font-bold text-slate-900 mb-2">Share & Curate</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish your own stories, ask questions with interactive polls, or organize inspiring
                visuals into aesthetic mood boards that showcase your perspective.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 relative hover:-translate-y-1.5 transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
              <span className="w-10 h-10 rounded-2xl bg-[#5036FF] text-white font-extrabold flex items-center justify-center text-sm mb-5 shadow-sm">
                3
              </span>
              <h4 className="text-base font-bold text-slate-900 mb-2">Get Verified & Connect</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Request the verified badge to certify your authenticity. Meet kindred spirits,
                collaborate on boards, and converse in ad-free private messages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Why Aura is Different (Side-by-Side Comparison) --- */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              The Aura Difference
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              A clear contrast with traditional social feeds
            </h3>
            <p className="text-sm text-slate-600 mt-2 sm:mt-3">
              See why writers, designers, and thoughtful readers are making the switch.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Conventional Networks */}
              <div className="p-6 sm:p-8 bg-slate-50/60 space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
                    Conventional Social Networks
                  </h4>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span>
                      <strong>Rampant bot accounts & impersonation:</strong> Thousands of anonymous
                      accounts dilute genuine conversations.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span>
                      <strong>Outrage-driven algorithms:</strong> Content optimized to provoke anger
                      and addiction rather than depth or joy.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span>
                      <strong>Invasive advertising & data trackers:</strong> Your chats and clicks
                      are monitored to sell targeted ads.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span>
                      <strong>Fragmented experiences:</strong> Forcing you to toggle across 3
                      separate apps for writing, moodboards, and messaging.
                    </span>
                  </li>
                </ul>
              </div>

              {/* The Aura Way */}
              <div className="p-6 sm:p-8 bg-white space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-[#5036FF]" />
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#5036FF]">
                    The Aura Experience
                  </h4>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong>Real, verified human profiles:</strong> Blue badges reserved strictly
                      for confirmed authentic creators.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong>Calm chronological & curated feeds:</strong> You choose what you see;
                      explore creators by genuine merit and craft.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong>Private & ad-free messenger:</strong> Conversations belong to you and
                      your friends alone, with zero profiling.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong>All-in-one creative home:</strong> Stories, visual mood boards, and
                      direct conversations in one unified space.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Creator & Community Voices --- */}
      <section id="community" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              Voices of Aura
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Loved by creators, designers, and readers worldwide
            </h3>
            <p className="text-sm text-slate-600 mt-2 sm:mt-3">
              Hear directly from people who have made Aura their primary creative home.
            </p>
          </div>

          {/* Testimonial Filter Chips */}
          <div className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', label: 'All Reviews' },
              { id: 'design', label: 'Designers & Architects' },
              { id: 'art', label: 'Visual Directors' },
              { id: 'writing', label: 'Writers & Authors' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReviewFilter(f.id as any)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  reviewFilter === f.id
                    ? 'bg-[#5036FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {filteredReviews.map((r, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">"{r.comment}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                  <img
                    src={r.avatar}
                    alt={r.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-slate-900">{r.name}</p>
                      <BadgeCheck className="w-3.5 h-3.5 text-[#5036FF] fill-indigo-50" />
                    </div>
                    <p className="text-[11px] text-slate-500">{r.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Mobile Application Download Section (Clean & Minimal) --- */}
      <section id="download" className="py-14 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left: Titles, QR Code & Store Buttons */}
            <div className="space-y-6 text-center md:text-left">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#5036FF] text-xs font-semibold mb-3">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Aura Mobile</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                  Download Aura App
                </h2>
                <p className="text-sm text-slate-600 mt-2">
                  Scan the QR code to install and launch directly on iOS & Android.
                </p>
              </div>

              {/* Pure QR Code Image */}
              <div className="flex justify-center md:justify-start">
                <img
                  src="/assets/aistudio/images_8bd1dcd7.png"
                  alt="Scan to Download Aura App"
                  className="w-32 h-32 object-contain"
                />
              </div>

              {/* Store Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={onEnterApp}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl transition-all shadow-xs flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186c-.378-.328-.61-.83-.61-1.423V3.237c0-.593.232-1.095.61-1.423zM15.207 13.414l2.84 2.84-12.756 7.37c-.309.18-.654.267-1.002.261l10.918-10.471zm0-2.828L4.289.115c.348-.006.693.081 1.002.261l12.756 7.37-2.84 2.84zm1.414 1.414l3.528-2.037c.758-.438.758-1.155 0-1.593l-3.528-2.037-1.414 1.414 1.414 1.414z" />
                  </svg>
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">GET IT ON</span>
                    <span className="text-xs font-bold text-white tracking-wide">Google Play</span>
                  </div>
                </button>

                <button
                  onClick={onEnterApp}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl transition-all shadow-xs flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.77 1.05-1.84.93-2.92-1 .04-2.16.67-2.84 1.46-.57.65-1.07 1.74-.93 2.8 1.11.09 2.22-.57 2.84-1.34z" />
                  </svg>
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Download on the</span>
                    <span className="text-xs font-bold text-white tracking-wide">App Store</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: The 3D Mockup Image */}
            <div className="flex items-center justify-center">
              <img
                src="/assets/aistudio/Aura_App_Social_Media_Promotion_935e6f90.png"
                alt="Aura Mobile App"
                className="w-full max-w-sm sm:max-w-md object-contain drop-shadow-xl hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- Frequently Asked Questions (FAQ) --- */}
      <section id="faq" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#5036FF] mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Questions & Answers</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Everything you need to know about getting started on Aura.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full min-h-[50px] px-5 sm:px-6 py-4 flex items-center justify-between text-left text-sm font-bold text-slate-900 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <span className="pr-2">{item.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#5036FF] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Bottom Final Invitation Banner --- */}
      <section className="py-16 sm:py-20 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 text-[#5036FF] mb-2 animate-float-slow">
            <AppLogo size={42} />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Ready to experience a better social network?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Create your username today in seconds. Explore inspiring stories, curate your visual
            world, and converse freely with genuine creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-md mx-auto sm:max-w-none">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#5036FF] hover:bg-[#432bd9] text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Join Aura Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Compass className="w-4 h-4 text-[#5036FF]" />
              <span>Browse Public Stories</span>
            </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="mt-auto py-8 bg-slate-100 border-t border-slate-200 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo size={24} showText textClassName="text-sm font-bold text-slate-800" />
            <span className="text-center sm:text-left">
              © {new Date().getFullYear()} Aura. Dedicated to authentic human connection.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-600">
            <a href="#about" className="hover:text-slate-900 transition-colors py-1">
              About
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors py-1">
              Features
            </a>
            <a href="#preview" className="hover:text-slate-900 transition-colors py-1">
              Preview
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors py-1">
              How It Works
            </a>
            <a href="#download" className="hover:text-[#5036FF] font-semibold transition-colors py-1">
              Mobile App
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors py-1">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
