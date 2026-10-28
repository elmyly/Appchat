import React, { useEffect, useState } from 'react';
import { pushManager, PushAlert } from '../lib/notifications';
import { Bell, X, ShieldCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const PushNotificationBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<PushAlert[]>([]);
  const [permission, setPermission] = useState<string>('default');
  const [showPermPrompt, setShowPermPrompt] = useState<boolean>(false);
  const { conversations, selectConversation } = useSocket();

  useEffect(() => {
    const unsubscribe = pushManager.subscribe((newAlerts) => {
      setAlerts(newAlerts);
    });

    const status = pushManager.getPermissionStatus();
    setPermission(status);
    if (status === 'default') {
      const dismissed = sessionStorage.getItem('dismiss_push_perm');
      if (!dismissed) {
        setShowPermPrompt(true);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await pushManager.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    setShowPermPrompt(false);
  };

  const handleDismissPrompt = () => {
    setShowPermPrompt(false);
    sessionStorage.setItem('dismiss_push_perm', 'true');
  };

  const handleAlertClick = (alert: PushAlert) => {
    const targetConv = conversations.find((c) => c.id === alert.conversationId);
    if (targetConv) {
      selectConversation(targetConv);
    }
    pushManager.dismissAlert(alert.id);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {/* Mobile/Browser Push Permission Prompt */}
      {showPermPrompt && (
        <div className="pointer-events-auto bg-white/95 border border-indigo-200/90 backdrop-blur-md rounded-2xl p-4 shadow-xl shadow-slate-300/40 text-slate-800 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">Enable Push Notifications</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Stay updated in real-time when friends and team members send encrypted messages.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  Enable Notifications
                </button>
                <button
                  onClick={handleDismissPrompt}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissPrompt}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Push Notification Toasts */}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          onClick={() => handleAlertClick(alert)}
          className="pointer-events-auto bg-white/95 border border-slate-200 backdrop-blur-md rounded-2xl p-3.5 shadow-xl shadow-slate-300/30 text-slate-800 cursor-pointer hover:border-indigo-300 hover:shadow-indigo-100/50 transition-all transform hover:-translate-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            {alert.avatar ? (
              <img
                src={alert.avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                {alert.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 truncate">{alert.title}</span>
                <span className="flex items-center text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-mono">
                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline" /> E2EE
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">{alert.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                pushManager.dismissAlert(alert.id);
              }}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
