import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { SocialProvider, useSocial } from './context/SocialContext';
import { NewChatModal } from './components/NewChatModal';
import { GroupModal } from './components/GroupModal';
import { ProfileModal } from './components/ProfileModal';
import { AuthPage } from './components/AuthPage';
import { PushNotificationBanner } from './components/PushNotificationBanner';
import { HomePage } from './components/HomePage';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AppSidebar } from './components/AppSidebar';
import { RightSidebar } from './components/RightSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { FeedView } from './components/FeedView';
import { ExploreView } from './components/ExploreView';
import { VisualsView } from './components/VisualsView';
import { BoardsView } from './components/BoardsView';
import { MeetView } from './components/MeetView';
import { MessagesView } from './components/MessagesView';
import { NotificationsView } from './components/NotificationsView';
import { BookmarksView } from './components/BookmarksView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { AdminView } from './components/AdminView';
import { PostComposer } from './components/PostComposer';
import { ShareToChatModal } from './components/ShareToChatModal';
import { ReportModal } from './components/ReportModal';
import { BoardDetailModal } from './components/BoardDetailModal';
import { VisualDetailModal } from './components/VisualDetailModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { selectConversation, conversations, activeConversation, startDirectConversation } = useSocket();
  const {
    currentTab,
    setCurrentTab,
    viewingUsername,
    viewingVisualId,
    setViewingVisualId,
    viewingBoardId,
    setViewingBoardId,
    shareToChatPayload,
    closeShareToChat,
    posts,
    visuals,
  } = useSocial();

  // Navigation view: 'home' (public landing) vs 'auth' (dedicated sign in/up page) vs 'app' (main platform)
  const [currentView, setCurrentView] = useState<'home' | 'app' | 'auth'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthMode(mode);
    setCurrentView('auth');
  };

  // Messenger modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Social modals state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [reportingItem, setReportingItem] = useState<{
    id: string;
    type: 'post' | 'comment' | 'user' | 'visual';
    preview?: string;
  } | null>(null);

  // Reset password token modal state
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Detect ?resetToken=... parameter in query URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
    }
  }, []);

  // When user signs in, switch to app view
  const handleAuthSuccess = () => {
    setCurrentView('app');
  };

  const handleOpenChatWithUser = async (targetUserIdOrUsername: string) => {
    setCurrentTab('messages');
    const clean = targetUserIdOrUsername.replace(/^@/, '').trim();
    const existing = conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.participantIds.includes(clean) ||
          c.participants?.some(
            (p) =>
              p.id === clean ||
              p.username.toLowerCase() === clean.toLowerCase()
          ))
    );
    if (existing) {
      await selectConversation(existing);
      return;
    }

    try {
      const conv = await startDirectConversation(clean);
      if (conv) {
        await selectConversation(conv);
      }
    } catch (e) {
      console.error('Failed to open chat with user:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-[#5036FF]/10 border border-[#5036FF]/20 flex items-center justify-center animate-pulse mb-4 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-[#5036FF]" />
        </div>
        <span className="text-xs font-semibold tracking-wider font-mono text-slate-500 uppercase">
          Initializing Aura Network Protocol...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Mobile & Web Push Notification alerts */}
      <PushNotificationBanner />

      {/* Reset Password Modal (when ?resetToken= is present or triggered) */}
      {resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => {
            setResetToken(null);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
          onSuccess={() => {
            setResetToken(null);
            window.history.replaceState({}, document.title, window.location.pathname);
            handleOpenAuth('login');
          }}
        />
      )}

      {/* Global Modals for Social Features */}
      {/* 1. Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden p-4 sm:p-6 relative max-h-[92vh] flex flex-col my-auto">
            <button
              onClick={() => setShowCreatePostModal(false)}
              className="absolute top-3.5 right-3.5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-3 sm:mb-4">Compose Aura Post</h3>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <PostComposer isModal onSuccess={() => setShowCreatePostModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 2. Share to Chat Modal */}
      {shareToChatPayload && (
        <ShareToChatModal
          post={
            shareToChatPayload.type === 'post'
              ? posts.find((p) => p.id === shareToChatPayload.id) || null
              : null
          }
          visual={
            shareToChatPayload.type === 'visual'
              ? visuals.find((v) => v.id === shareToChatPayload.id) || null
              : null
          }
          onClose={closeShareToChat}
        />
      )}

      {/* 3. Community Report Modal */}
      {reportingItem && (
        <ReportModal
          targetId={reportingItem.id}
          targetType={reportingItem.type}
          targetPreview={reportingItem.preview}
          onClose={() => setReportingItem(null)}
        />
      )}

      {/* 4. Visual Detail Modal (Pinterest Pin View) */}
      {viewingVisualId && (
        <VisualDetailModal
          visualId={viewingVisualId}
          onClose={() => setViewingVisualId(null)}
        />
      )}

      {/* 5. Board Detail Modal */}
      {viewingBoardId && (
        <BoardDetailModal
          boardId={viewingBoardId}
          onClose={() => setViewingBoardId(null)}
        />
      )}

      {/* Chat Modals */}
      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} />
      )}

      {showGroupModal && (
        <GroupModal onClose={() => setShowGroupModal(false)} />
      )}

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Real-time WebRTC Voice Call Modal */}
      <VoiceCallModal />

      {/* View routing: Public Landing Page vs Dedicated Auth Page vs Unified Platform Application */}
      {currentView === 'home' && !user ? (
        <HomePage
          onEnterApp={() => setCurrentView('app')}
          onOpenAuth={(mode = 'login') => {
            handleOpenAuth(mode);
          }}
        />
      ) : (currentView === 'auth' || !user) && !user ? (
        <AuthPage
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
          onBack={() => setCurrentView('home')}
          onOpenResetWithToken={(token) => setResetToken(token)}
        />
      ) : (
        /* --- UNIFIED PLATFORM LAYOUT --- */
        /* h-screen + overflow-hidden prevents page-level scrolling so sidebars stay stationary */
        <div className="h-screen w-screen flex bg-white text-slate-900 overflow-hidden font-sans">
          {/* Column 1: Desktop Left Navigation Sidebar (Stationary & Sticky) */}
          <AppSidebar
            onOpenCreatePost={() => setShowCreatePostModal(true)}
            onOpenAuth={() => handleOpenAuth('login')}
          />

          {/* Column 2: Center Content Area (Independently Scrolls) */}
          {currentTab === 'messages' ? (
            /* Merged Messenger: Fills remaining window space inside platform */
            <main className="flex-1 h-screen flex bg-white overflow-hidden">
              <MessagesView
                onOpenNewChat={() => setShowNewChatModal(true)}
                onOpenGroupModal={() => setShowGroupModal(true)}
                onOpenProfile={() => setShowProfileModal(true)}
              />
            </main>
          ) : (
            /* Social Views: Independently scrollable, sidebars remain locked */
            <main className="flex-1 h-screen flex justify-center bg-white border-r border-slate-100 overflow-y-auto custom-scrollbar">
              {currentTab === 'feed' && (
                <FeedView
                  onOpenReport={(type, id) =>
                    setReportingItem({ type, id, preview: 'Reported Post' })
                  }
                />
              )}
              {currentTab === 'explore' && <ExploreView />}
              {currentTab === 'visuals' && <VisualsView />}
              {currentTab === 'boards' && <BoardsView />}
              {currentTab === 'meet' && (
                <MeetView onOpenChatWithUser={handleOpenChatWithUser} />
              )}
              {currentTab === 'notifications' && <NotificationsView />}
              {currentTab === 'bookmarks' && <BookmarksView />}
              {currentTab === 'profile' && (
                <ProfileView username={viewingUsername || user.username} />
              )}
              {currentTab === 'settings' && (
                <SettingsView onBack={() => setCurrentTab('profile')} />
              )}
              {currentTab === 'admin' && <AdminView />}
            </main>
          )}

          {/* Column 3: Desktop Right Sidebar (Stationary & Sticky, hidden in Messages) */}
          {currentTab !== 'messages' && <RightSidebar />}

          {/* Mobile Bottom Navigation Bar - hidden during active conversation in chat */}
          {(!activeConversation || currentTab !== 'messages') && (
            <MobileNavigation onOpenCreatePost={() => setShowCreatePostModal(true)} />
          )}
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SocialProvider>
          <MainAppContent />
        </SocialProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
