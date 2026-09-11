"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, X, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const POLL_INTERVAL_MS = 60_000; // poll every 60 s

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore — bell is non-critical
    }
  }, []);

  // Initial load + interval polling
  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function markRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      // Re-fetch to reconcile if PATCH failed
      fetchNotifications();
    }
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  }

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <div className="relative" id="notification-bell-container">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        id="notification-bell-btn"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95"
      >
        <Bell
          size={20}
          className={open ? "text-cyan-400" : ""}
          aria-hidden="true"
        />
        {badgeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse"
          >
            {badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-[calc(100%+12px)] w-[380px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-[100] animate-in"
          style={{
            animation: "fadeSlideIn 0.18s ease-out forwards",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-cyan-400" />
              <span className="font-semibold text-white text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={markAllRead}
                  disabled={markingAll}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
                >
                  <CheckCheck size={13} className="text-cyan-400" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.05]">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="h-5 w-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin mb-3" />
                <span className="text-xs">Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                <Inbox size={36} className="text-slate-700" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-400">
                    All caught up!
                  </p>
                  <p className="text-xs mt-0.5">
                    No notifications yet
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationRow
                  key={notif.id}
                  notification={notif}
                  onRead={async () => {
                    if (!notif.isRead) await markRead(notif.id);
                    if (notif.link) setOpen(false);
                  }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/40">
              <p className="text-[11px] text-slate-500 text-center">
                Showing last {notifications.length} notification
                {notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSS keyframe for dropdown animation injected inline */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>
    </div>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: () => void;
}) {
  const isUnread = !notification.isRead;

  const content = (
    <div
      className={`flex items-start gap-3 px-5 py-4 transition-colors duration-150 cursor-pointer ${
        isUnread
          ? "bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]"
          : "hover:bg-white/[0.025]"
      }`}
      onClick={onRead}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onRead()}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        <span
          className={`block h-2 w-2 rounded-full transition-colors ${
            isUnread ? "bg-cyan-400" : "bg-transparent"
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold leading-tight truncate ${
              isUnread ? "text-white" : "text-slate-300"
            }`}
          >
            {notification.title}
          </p>
          {notification.link && (
            <ExternalLink
              size={12}
              className="text-slate-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <span className="text-[11px] text-slate-600 mt-1 block">
          {timeAgo(notification.createdAt)}
        </span>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={onRead} tabIndex={-1}>
        {content}
      </Link>
    );
  }

  return content;
}
