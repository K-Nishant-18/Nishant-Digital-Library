'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bell, Flame, BookOpen, Trophy, X, CheckCheck, Trash2, Loader2,
} from 'lucide-react';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
} from '@/lib/notifications-actions';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: string;
  createdAt: Date;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  streak: { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  reminder: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  milestone: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/15' },
};

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    loadNotifications();
  }, [open]);

  // Close on outside click (desktop dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    const result = await getNotificationsAction();
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount || 0);
    }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleDismiss = async (id: string) => {
    await dismissNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => {
      const wasUnread = notifications.find((n) => n.id === id && !n.read);
      return wasUnread ? Math.max(0, prev - 1) : prev;
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Desktop: dropdown anchored below bell */}
      <div
        ref={panelRef}
        className="notification-panel hidden md:block absolute right-0 top-12 w-[380px] max-h-[500px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        <PanelContent
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDismiss={handleDismiss}
          onClose={onClose}
        />
      </div>

      {/* Mobile: full-screen slide-in panel */}
      <div className="md:hidden fixed inset-0 z-[65]" role="dialog" aria-label="Notifications">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="notification-mobile-panel absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-slate-900 flex flex-col">
          <PanelContent
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={handleDismiss}
            onClose={onClose}
            mobile
          />
        </div>
      </div>
    </>
  );
}

function PanelContent({
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClose,
  mobile = false,
}: {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              className="text-[10px] text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1"
              onClick={onMarkAllRead}
            >
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
          <button
            className="icon-button !p-1.5"
            onClick={onClose}
            aria-label="Close notifications"
          >
            {mobile ? <X size={18} /> : <X size={16} />}
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-amber-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bell size={28} className="mx-auto text-slate-600 mb-3" />
            <p className="text-xs text-slate-400 font-medium">All caught up!</p>
            <p className="text-[10px] text-slate-500 mt-1">No notifications right now.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.milestone;
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group ${
                    !n.read ? 'bg-amber-500/[0.03]' : ''
                  }`}
                  onClick={() => !n.read && onMarkRead(n.id)}
                >
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all shrink-0 mt-1 p-1 rounded hover:bg-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(n.id);
                    }}
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
