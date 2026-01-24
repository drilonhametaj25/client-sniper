"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  RefreshCw,
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
  Filter,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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

const TYPE_LABELS: Record<string, string> = {
  email_opened: "Email Aperte",
  email_bounced: "Email Rimbalzate",
  follow_up_reminder: "Follow-up",
  lead_score_updated: "Score Aggiornati",
  saved_search_match: "Match Ricerche",
  credits_low: "Crediti",
  team_invite: "Team",
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

export default function NotificationsPage() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchNotifications = async (reset = false) => {
    if (!user) return;

    try {
      setLoading(true);
      const token = getAccessToken();
      const offset = reset ? 0 : notifications.length;

      let url = `/api/notifications?limit=20&offset=${offset}`;
      if (filter === "unread") {
        url += "&unread=true";
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredNotifications = data.notifications;

        // Client-side type filter
        if (typeFilter) {
          filteredNotifications = filteredNotifications.filter(
            (n: Notification) => n.type === typeFilter
          );
        }

        if (reset) {
          setNotifications(filteredNotifications);
        } else {
          setNotifications((prev) => [...prev, ...filteredNotifications]);
        }
        setHasMore(data.notifications.length === 20);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
  }, [user, filter, typeFilter]);

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
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

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
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = getAccessToken();
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const getIcon = (notification: Notification) => {
    const iconName = notification.icon || "info";
    return NOTIFICATION_ICONS[iconName] || Info;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return `Oggi alle ${date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `Ieri alle ${date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Oggi";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Ieri";
    } else {
      groupKey = date.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-600" />
              Notifiche
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unreadCount} non lette
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Segna tutte come lette
            </button>
          )}
          <Link
            href="/settings/notifications"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Impostazioni notifiche"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === "unread"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Non lette
          </button>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
            typeFilter
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Filter className="h-4 w-4" />
          {typeFilter ? TYPE_LABELS[typeFilter] || typeFilter : "Tipo"}
          <ChevronDown className="h-4 w-4" />
        </button>

        {showFilters && (
          <div className="absolute mt-24 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
            <button
              onClick={() => {
                setTypeFilter(null);
                setShowFilters(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
            >
              Tutti i tipi
            </button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTypeFilter(key);
                  setShowFilters(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  typeFilter === key
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile mark all as read */}
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="sm:hidden w-full mb-4 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <CheckCheck className="h-4 w-4" />
          Segna tutte come lette
        </button>
      )}

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nessuna notifica
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === "unread"
              ? "Non hai notifiche non lette."
              : "Le tue notifiche appariranno qui."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 capitalize">
                {date}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                {items.map((notification) => {
                  const Icon = getIcon(notification);
                  const colorClass =
                    TYPE_COLORS[notification.type] || TYPE_COLORS.default;

                  return (
                    <div
                      key={notification.id}
                      className={`group relative ${
                        !notification.is_read
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex gap-4">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p
                                className={`font-medium ${
                                  notification.is_read
                                    ? "text-gray-700 dark:text-gray-300"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                            title="Segna come letta"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={() => fetchNotifications()}
              disabled={loading}
              className="w-full py-3 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                "Carica altre notifiche"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
