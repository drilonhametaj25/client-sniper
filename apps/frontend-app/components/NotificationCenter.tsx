"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Mail,
  MailOpen,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Info,
  Star,
  Search,
  User,
  FileText,
  RefreshCw,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  priority: string;
  icon: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, React.ComponentType<any>> = {
  mail: Mail,
  "mail-open": MailOpen,
  calendar: Calendar,
  "calendar-clock": Calendar,
  "trending-up": TrendingUp,
  alert: AlertTriangle,
  info: Info,
  star: Star,
  search: Search,
  user: User,
  file: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  email_opened: "text-green-500 bg-green-50 dark:bg-green-900/30",
  email_bounced: "text-red-500 bg-red-50 dark:bg-red-900/30",
  follow_up_reminder: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30",
  lead_score_updated: "text-blue-500 bg-blue-50 dark:bg-blue-900/30",
  saved_search_match: "text-purple-500 bg-purple-50 dark:bg-purple-900/30",
  credits_low: "text-orange-500 bg-orange-50 dark:bg-orange-900/30",
  team_invite: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30",
  default: "text-gray-500 bg-gray-50 dark:bg-gray-700",
};

export default function NotificationCenter() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;

    try {
      setLoading(true);
      const token = getAccessToken();
      const offset = reset ? 0 : notifications.length;

      const response = await fetch(
        `/api/notifications?limit=10&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }
        setUnreadCount(data.unreadCount);
        setHasMore(data.notifications.length === 10);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user, getAccessToken, notifications.length]);

  // Fetch unread count periodically
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`/api/notifications?limit=1&unread=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, getAccessToken]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications(true);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = getAccessToken();
      await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = getAccessToken();
      await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAllRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = getAccessToken();
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
      setIsOpen(false);
    }
  };

  // Get icon component
  const getIcon = (notification: Notification) => {
    const iconName = notification.icon || "info";
    const IconComponent = NOTIFICATION_ICONS[iconName] || Info;
    return IconComponent;
  };

  // Get color class
  const getColorClass = (type: string) => {
    return TYPE_COLORS[type] || TYPE_COLORS.default;
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Adesso";
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString("it-IT");
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Notifiche"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notifiche
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Segna tutte come lette
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nessuna notifica
                </p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => {
                  const Icon = getIcon(notification);
                  const colorClass = getColorClass(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={`relative group border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                        !notification.is_read
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-medium truncate ${
                                  notification.is_read
                                    ? "text-gray-700 dark:text-gray-300"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {notification.title}
                              </p>
                              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>

                          {/* Unread indicator */}
                          {!notification.is_read && (
                            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </button>

                      {/* Delete button (appears on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Load More */}
                {hasMore && (
                  <button
                    onClick={() => fetchNotifications()}
                    disabled={loading}
                    className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Carica altre"
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => {
                router.push("/notifications");
                setIsOpen(false);
              }}
              className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
            >
              Vedi tutte le notifiche
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
