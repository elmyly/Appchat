/**
 * Push Notification System for Mobile & Desktop
 * Combines Web Notifications API, Mobile Vibration, Audio Chimes, and In-App Push Toasts.
 */
import { sounds } from './sounds';

export interface PushAlert {
  id: string;
  title: string;
  body: string;
  avatar?: string;
  conversationId: string;
  timestamp: number;
}

type PushListener = (alerts: PushAlert[]) => void;

class PushNotificationManager {
  private listeners: Set<PushListener> = new Set();
  private alerts: PushAlert[] = [];
  private hasPermission: boolean = false;
  private isPushEnabled: boolean = true;

  constructor() {
    this.isPushEnabled = localStorage.getItem('cipherchat_push_enabled') !== 'false';
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public isEnabled(): boolean {
    return this.isPushEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isPushEnabled = enabled;
    localStorage.setItem('cipherchat_push_enabled', String(enabled));
  }

  public subscribe(listener: PushListener) {
    this.listeners.add(listener);
    listener([...this.alerts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener([...this.alerts]);
    }
  }

  public dismissAlert(id: string) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.notifyListeners();
  }

  /**
   * Dispatches a push notification to the user
   */
  public triggerNotification(opts: {
    title: string;
    body: string;
    avatar?: string;
    conversationId: string;
    playAudio?: boolean;
  }) {
    if (!this.isPushEnabled) return;

    const { title, body, avatar, conversationId, playAudio = true } = opts;

    // 1. Play audio chime
    if (playAudio) {
      sounds.playMessageReceived();
    }

    // 2. Mobile vibration feedback if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 120]);
      } catch {
        // Ignore vibration errors
      }
    }

    // 3. Web System Notification (when backgrounded or permitted)
    if (this.hasPermission && document.hidden) {
      try {
        new Notification(title, {
          body,
          icon: avatar || '/favicon.ico',
          badge: '/favicon.ico',
          tag: `chat_${conversationId}`,
        });
      } catch {
        // Ignore notification construction errors
      }
    }

    // 4. In-App Push Toast (slides in at top of UI)
    const alertId = 'alert_' + Math.random().toString(36).substring(2, 9);
    const newAlert: PushAlert = {
      id: alertId,
      title,
      body,
      avatar,
      conversationId,
      timestamp: Date.now(),
    };

    this.alerts = [newAlert, ...this.alerts.slice(0, 3)];
    this.notifyListeners();

    // Auto-dismiss in 4.5 seconds
    setTimeout(() => {
      this.dismissAlert(alertId);
    }, 4500);
  }
}

export const pushManager = new PushNotificationManager();
