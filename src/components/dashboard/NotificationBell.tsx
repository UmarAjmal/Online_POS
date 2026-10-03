"use client";

import React, { useState, useEffect, useRef } from "react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  Bell, Check, CheckCheck, Trash2, ShieldAlert, ShoppingCart, 
  Truck, TrendingDown, AlertTriangle, Clock, Layers, Filter,
  CheckCircle2, Info, X, ExternalLink, Flame
} from "lucide-react";
import { SystemNotification } from "@/lib/notifications";
import { toast } from "sonner";

export function NotificationBell() {
  const { shopId, userRole, permissions, userName } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "transactions" | "audits" | "alerts">("all");
  const [selectedNotif, setSelectedNotif] = useState<SystemNotification | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!shopId) return;
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "notifications",
          filters: [{ col: "shop_id", op: "eq", val: shopId }],
          orderBy: { column: "created_at", ascending: false },
          limit: 40,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [shopId]);

  // Filter based on User's RBAC Permissions
  const rbacFilteredNotifications = notifications.filter((n) => {
    const isSuperAdmin = userRole === "superadmin" || userRole?.toLowerCase().includes("admin");
    if (isSuperAdmin) return true; // Superadmins see everything

    const panelPerms = permissions?.panels || {};

    if (n.type.startsWith("audit_")) {
      // Audit notifications only visible if user has staff/admin permissions
      return panelPerms.staff === true || panelPerms.roles === true;
    }
    if (n.module === "pos" || n.module === "sales") {
      return panelPerms.pos === true || panelPerms.sales === true;
    }
    if (n.module === "purchase" || n.module === "products" || n.type === "stock_alert" || n.type === "expiry_alert") {
      return panelPerms.purchase === true || panelPerms.products === true || panelPerms.pharmacy_expiry === true;
    }
    if (n.module === "expenses" || n.module === "accounts") {
      return panelPerms.expenses === true || panelPerms.accounts === true;
    }
    return true;
  });

  // Tab Filtering
  const tabFiltered = rbacFilteredNotifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "transactions") {
      return n.type.startsWith("transaction_");
    }
    if (activeFilter === "audits") {
      return n.type.startsWith("audit_");
    }
    if (activeFilter === "alerts") {
      return n.type.includes("alert") || n.severity === "warning" || n.severity === "danger";
    }
    return true;
  });

  const unreadCount = rbacFilteredNotifications.filter((n) => n.is_read === 0).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    try {
      await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "notifications",
          data: { is_read: 1 },
          filters: [{ col: "id", op: "eq", val: id }],
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    try {
      await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "notifications",
          data: { is_read: 1 },
          filters: [{ col: "shop_id", op: "eq", val: shopId }],
        }),
      });
      toast.success(isUrdu ? "تمام نوٹیفیکیشنز پڑھ لیے گئے" : "All notifications marked as read");
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (notif: SystemNotification) => {
    if (notif.type === "transaction_sale") return <ShoppingCart size={15} className="text-emerald-600" />;
    if (notif.type === "transaction_purchase") return <Truck size={15} className="text-blue-600" />;
    if (notif.type === "transaction_expense") return <TrendingDown size={15} className="text-amber-600" />;
    if (notif.type === "audit_delete") return <ShieldAlert size={15} className="text-red-600" />;
    if (notif.type === "audit_edit") return <AlertTriangle size={15} className="text-amber-600" />;
    if (notif.type === "stock_alert" || notif.type === "expiry_alert") return <Flame size={15} className="text-rose-600" />;
    return <Info size={15} className="text-slate-600" />;
  };

  const getSeverityBg = (severity: string, isRead: boolean) => {
    if (isRead) return "bg-white hover:bg-slate-50 border-slate-100";
    if (severity === "danger") return "bg-red-50/60 hover:bg-red-50 border-red-100";
    if (severity === "warning") return "bg-amber-50/60 hover:bg-amber-50 border-amber-100";
    if (severity === "success") return "bg-emerald-50/60 hover:bg-emerald-50 border-emerald-100";
    return "bg-blue-50/50 hover:bg-blue-50 border-blue-100";
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return isUrdu ? "ابھی" : "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
        title={isUrdu ? "نوٹیفیکیشنز" : "Notifications & RBAC Audits"}
        aria-label="Open notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-xs"
            style={{ backgroundColor: "#e11d48" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-800">
                {isUrdu ? "نوٹیفیکیشنز اور آڈٹ لاگز" : "Notifications & Audits"}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <CheckCheck size={12} />
                  {isUrdu ? "سب پڑھیں" : "Mark all read"}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-white overflow-x-auto text-[11px] shrink-0 custom-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isUrdu ? "تمام" : "All"} ({rbacFilteredNotifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("transactions")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeFilter === "transactions" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isUrdu ? "لین دین" : "Transactions"}
            </button>
            <button
              onClick={() => setActiveFilter("audits")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeFilter === "audits" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              🛡️ {isUrdu ? "آڈٹ اور ترامیم" : "Audits & Edits"}
            </button>
            <button
              onClick={() => setActiveFilter("alerts")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
                activeFilter === "alerts" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              ⚠️ {isUrdu ? "انتباہات" : "Alerts"}
            </button>
          </div>

          {/* Notification Items List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 custom-scrollbar max-h-96">
            {tabFiltered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <Bell size={28} className="mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold text-slate-600">{isUrdu ? "کوئی نیا نوٹیفیکیشن نہیں ہے" : "No Notifications"}</p>
                <p className="text-[11px] text-slate-400">{isUrdu ? "آپ کی تمام سرگرمیاں اپ ٹو ڈیٹ ہیں۔" : "You're all caught up with activities."}</p>
              </div>
            ) : (
              tabFiltered.map((notif) => {
                const isRead = notif.is_read === 1;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!isRead) markAsRead(notif.id);
                      setSelectedNotif(notif);
                    }}
                    className={`p-3 transition-colors cursor-pointer border-l-3 ${getSeverityBg(
                      notif.severity,
                      isRead
                    )} ${!isRead ? "border-l-blue-600 font-medium" : "border-l-transparent"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200/60">
                        {getNotificationIcon(notif)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                          {notif.actor_name && (
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-mono">
                              {isUrdu ? "بذریعہ: " : "By: "}{notif.actor_name}
                            </span>
                          )}
                          <span className="uppercase text-[9px] font-bold tracking-wider text-slate-400">
                            {notif.module}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-500 font-medium">
            {isUrdu ? `RBAC آڈٹ لاگر • فلٹر برائے ${userRole || "صارف"}` : `RBAC Audit Logger • Filtered for ${userRole || "User"}`}
          </div>

        </div>
      )}

      {/* Detail Dialog */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100">
                  {getNotificationIcon(selectedNotif)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedNotif.title}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{formatRelativeTime(selectedNotif.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {selectedNotif.message}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">{isUrdu ? "صارف / ایڈمن:" : "Actor / User:"}</span>
                <span className="font-semibold">{selectedNotif.actor_name || (isUrdu ? "سسٹم" : "System")} ({selectedNotif.actor_role || "Admin"})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isUrdu ? "ماڈیول:" : "Module:"}</span>
                <span className="font-semibold uppercase">{selectedNotif.module}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                {isUrdu ? "بند کریں" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
