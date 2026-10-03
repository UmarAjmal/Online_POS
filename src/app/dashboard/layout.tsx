"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShopProvider, useShop } from "@/context/ShopContext";
import { ModuleProvider, useModule } from "@/context/ModuleContext";
import { isRetailPath } from "@/lib/moduleRoutes";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  Bell, Search, Menu, Megaphone, Loader2,
  LayoutDashboard, ShoppingCart, FileText, Package, Layers,
  Truck, RotateCcw, TrendingDown, Users, Calculator, Wallet,
  PieChart, Pill, Factory, ShieldCheck, Tag, Building,
  Settings, Palette, Database, Lock, RefreshCw, HardDriveDownload
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { GlobalQuickSearch } from "@/components/dashboard/GlobalQuickSearch";
import { invalidateClientCache } from "@/lib/sqliteClient";
import { toast } from "sonner";

function getPageInfo(pathname: string, search: string, language: "en" | "ur") {
  const isUrdu = language === "ur";

  if (pathname === "/dashboard") {
    return {
      title: isUrdu ? "ڈیش بورڈ اوور ویو" : "Dashboard Overview",
      icon: LayoutDashboard,
    };
  }
  if (pathname.startsWith("/dashboard/sales")) {
    return {
      title: isUrdu ? "سیلز لیجر اور انوائسز" : "Sales Ledger & Invoices",
      icon: FileText,
    };
  }
  if (pathname.startsWith("/dashboard/pos")) {
    return {
      title: isUrdu ? "پوائنٹ آف سیل (POS)" : "Point of Sale (POS)",
      icon: ShoppingCart,
    };
  }
  if (pathname.startsWith("/dashboard/products")) {
    if (search.includes("tab=categories")) {
      return {
        title: isUrdu ? "پروڈکٹ کیٹیگریز" : "Product Categories",
        icon: Tag,
      };
    }
    if (search.includes("tab=brands")) {
      return {
        title: isUrdu ? "برانڈز مینجمنٹ" : "Brands Management",
        icon: Building,
      };
    }
    return {
      title: isUrdu ? "پروڈکٹس اور اسٹاک انوینٹری" : "Products & Stock Inventory",
      icon: Package,
    };
  }
  if (pathname.startsWith("/dashboard/units")) {
    return {
      title: isUrdu ? "یونٹس اور پیکنگ مینجمنٹ" : "Units & Packaging Management",
      icon: Layers,
    };
  }
  if (pathname.startsWith("/dashboard/purchase")) {
    return {
      title: isUrdu ? "پرچیز اور اسٹاک ان" : "Purchase Orders & Stock In",
      icon: Truck,
    };
  }
  if (pathname.startsWith("/dashboard/returns")) {
    return {
      title: isUrdu ? "واپسی اور اسٹاک ایڈجسٹمنٹ" : "Returns & Stock Adjustments",
      icon: RotateCcw,
    };
  }
  if (pathname.startsWith("/dashboard/khata")) {
    return {
      title: isUrdu ? "کھاتہ اور کسٹمر لیجر" : "Khata & Customer Ledger",
      icon: Users,
    };
  }
  if (pathname.startsWith("/dashboard/registers")) {
    return {
      title: isUrdu ? "کیش رجسٹر اور سیشنز" : "Daily Cash Registers (Daybook)",
      icon: Calculator,
    };
  }
  if (pathname.startsWith("/dashboard/accounts")) {
    if (search.includes("tab=assets")) {
      return {
        title: isUrdu ? "کمپنی کے اثاثہ جات" : "Company Assets",
        icon: Building,
      };
    }
    return {
      title: isUrdu ? "اکاؤنٹس اور مالیاتی لیجر" : "Accounts & Financial Ledgers",
      icon: Wallet,
    };
  }
  if (pathname.startsWith("/dashboard/expenses")) {
    return {
      title: isUrdu ? "روزمرہ کے اخراجات" : "Daily Expenses Management",
      icon: TrendingDown,
    };
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return {
      title: isUrdu ? "مالیاتی اور سیلز رپورٹس (PDF)" : "Financial & Sales Reports (PDF)",
      icon: PieChart,
    };
  }
  if (pathname.startsWith("/dashboard/pharmacy/expiry")) {
    return {
      title: isUrdu ? "فارمیسی میڈیسن ایکسپائری ٹریکر" : "Pharmacy Medicine Expiry Tracker",
      icon: Pill,
    };
  }
  if (pathname.startsWith("/dashboard/pharmacy/formulas")) {
    return {
      title: isUrdu ? "جنرک فارمولیشنز (سالٹس)" : "Generic Formulations (Salts)",
      icon: Factory,
    };
  }
  if (pathname.startsWith("/dashboard/roles")) {
    return {
      title: isUrdu ? "یوزر رولز اور اجازت نامے (RBAC)" : "User Roles & Access Control (RBAC)",
      icon: ShieldCheck,
    };
  }
  if (pathname.startsWith("/dashboard/settings/colors")) {
    return {
      title: isUrdu ? "کلر تھیمز اور برانڈنگ" : "Color Themes & Dynamic Palette",
      icon: Palette,
    };
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return {
      title: isUrdu ? "سسٹم سیٹنگز اور دکان کی تفصیلات" : "System Settings & Business Profile",
      icon: Settings,
    };
  }
  if (pathname.startsWith("/dashboard/database")) {
    return {
      title: isUrdu ? "ڈیٹا بیس مینجمنٹ اور بیک اپ" : "Database Management & Backups",
      icon: Database,
    };
  }
  if (pathname.startsWith("/dashboard/security")) {
    return {
      title: isUrdu ? "لاگ ان سیکیورٹی اور ایکٹو سیشنز" : "Login Security & Active Sessions",
      icon: Lock,
    };
  }
  if (pathname.startsWith("/dashboard/staff")) {
    if (search.includes("tab=payroll")) {
      return {
        title: isUrdu ? "اسٹاف پے رول اور تنخواہیں" : "Staff Payroll & Salaries",
        icon: Users,
      };
    }
    return {
      title: isUrdu ? "ایچ آر اور اسٹاف مینجمنٹ" : "HR & Staff Management",
      icon: ShieldCheck,
    };
  }

  return {
    title: isUrdu ? "ڈیش بورڈ" : "Dashboard",
    icon: LayoutDashboard,
  };
}

function SystemAnnouncementBanner() {
  const { systemAnnouncement, loading } = useShop();

  if (loading || !systemAnnouncement || !systemAnnouncement.active || !systemAnnouncement.message) return null;

  const type = systemAnnouncement.type || "warning";
  const bgClass =
    type === "danger"
      ? "bg-red-600 border-red-700 text-white"
      : type === "success"
        ? "bg-emerald-600 border-emerald-700 text-white"
        : type === "info"
          ? "bg-blue-600 border-blue-700 text-white"
          : "bg-amber-500 border-amber-600 text-stone-900";

  return (
    <div className={`px-6 py-2 text-center text-xs font-semibold border-b flex items-center justify-center gap-2 ${bgClass}`}>
      <Megaphone size={14} className="shrink-0" />
      <span>{systemAnnouncement.message}</span>
    </div>
  );
}

function TrialBanner() {
  return null;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { ready, shopId, userName, shopName } = useShop();
  const { activeModule, ready: moduleReady, setActiveModule } = useModule();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    setMounted(true);
    setCurrentSearch(window.location.search);
  }, [pathname]);

  useEffect(() => {
    if (!moduleReady || !ready) return;

    if (isRetailPath(pathname) && activeModule !== "retail") {
      setActiveModule("retail");
    }
  }, [moduleReady, ready, activeModule, pathname, setActiveModule]);

  useEffect(() => {
    if (!mounted || !ready || shopId) return;
    if (pathname.startsWith("/dashboard")) {
      window.location.href = "/login";
    }
  }, [mounted, ready, shopId, pathname]);

  useEffect(() => {
    const handleOpenSidebar = () => setSidebarOpen(true);
    window.addEventListener("open-sidebar", handleOpenSidebar);
    return () => window.removeEventListener("open-sidebar", handleOpenSidebar);
  }, []);

  const isPosPage = pathname === "/dashboard/pos";
  const isUrdu = language === "ur";
  const { theme } = useTheme();
  const pageInfo = getPageInfo(pathname, currentSearch, language);
  const PageIcon = pageInfo.icon;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    invalidateClientCache();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-refresh"));
    }
    toast.success(
      isUrdu ? "سسٹم ڈیٹا اور کیشے ریفریش ہو گیا ہے" : "System cache and data refreshed successfully",
      { duration: 2500 }
    );
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const handleQuickBackupSql = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "db_export_sql",
          actorName: userName || "Admin",
          shopName: shopName || ""
        }),
      });
      const json = await res.json();
      const sqlContent = json.data?.sqlDump || json.data?.sql;
      if (sqlContent) {
        const blob = new Blob([sqlContent], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const cleanName = (shopName || "pharmacy").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "pharmacy";
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const fallbackFilename = `backup_${cleanName}_${dateStr}.sql`;
        const filename = json.data?.filename || fallbackFilename;
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(
          isUrdu ? "ڈیٹا بیس بیک اپ فائل (.sql) ڈاؤن لوڈ ہو گئی ہے" : "Database .sql backup downloaded successfully!",
          { duration: 3000 }
        );
      } else {
        toast.error(json.error || "Backup export failed");
      }
    } catch (err: any) {
      toast.error("Backup failed: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f3ef] overflow-hidden font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {!isPosPage && (
          <header className="h-16 bg-white border-b border-[#ddd8cf] flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-xs gap-3">
            {/* Left: Mobile Hamburger + Dynamic Page Title & Icon in H1 tag */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-1 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              
              <div className="flex items-center gap-2.5 min-w-0">
                <span 
                  className="p-1.5 rounded-lg border hidden sm:flex items-center justify-center shrink-0 shadow-xs"
                  style={{ 
                    backgroundColor: theme.badgeBg || "#f5f3ef", 
                    color: theme.badgeText || theme.headerAccent,
                    borderColor: theme.headerAccent + "40"
                  }}
                >
                  <PageIcon size={18} />
                </span>
                <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
                  {pageInfo.title}
                </h1>
              </div>
            </div>

            {/* Right: Dynamic Search Bar + Instant SQL Backup + Global Refresh + Language Switch + Notifications */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <GlobalQuickSearch />

              {/* Instant .SQL Backup Download Button */}
              <button
                onClick={handleQuickBackupSql}
                disabled={isBackingUp}
                title={isUrdu ? "فوری ڈیٹا بیس بیک اپ (.sql)" : "Download Database Backup (.sql)"}
                className="p-2 rounded-lg border border-[#ddd8cf] bg-[#faf9f7] hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-60 flex items-center justify-center"
              >
                {isBackingUp ? (
                  <Loader2 size={16} className="animate-spin text-emerald-700" />
                ) : (
                  <HardDriveDownload size={16} className="text-stone-700 hover:text-emerald-800" />
                )}
              </button>

              {/* Global Refresh Button (Before Bell Icon) */}
              <button
                onClick={handleGlobalRefresh}
                disabled={isRefreshing}
                title={isUrdu ? "سسٹم اور کیشے ریفریش کریں" : "Refresh System Cache & Data"}
                className="p-2 rounded-lg border border-[#ddd8cf] bg-[#faf9f7] hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-60 flex items-center justify-center"
              >
                <RefreshCw size={16} className={`text-stone-700 hover:text-emerald-800 transition-transform ${isRefreshing ? "animate-spin text-emerald-700" : ""}`} />
              </button>

              {/* Language Switch */}
              <div className="flex items-center bg-[#f5f3ef] border border-[#ddd8cf] rounded-lg p-0.5 text-xs shrink-0">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    language === "en" ? "text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                  }`}
                  style={{
                    backgroundColor: language === "en" ? theme.sidebarActive || theme.primaryColor : "transparent"
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ur")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    language === "ur" ? "text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                  }`}
                  style={{
                    backgroundColor: language === "ur" ? theme.sidebarActive || theme.primaryColor : "transparent"
                  }}
                >
                  اردو
                </button>
              </div>

              {/* Notifications */}
              <NotificationBell />
            </div>
          </header>
        )}

        {!isPosPage && (
          <>
            <SystemAnnouncementBanner />
            <TrialBanner />
          </>
        )}

        <div className={`flex-1 overflow-auto ${isPosPage ? "p-0" : "p-4 sm:p-6"}`}>
          {!mounted || !ready || !shopId ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-stone-500 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#2c3e2a]" />
              <p className="text-sm">{isUrdu ? "ڈیش بورڈ لوڈ ہو رہا ہے..." : "Loading dashboard..."}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider>
      <ModuleProvider>
        <DashboardShell>{children}</DashboardShell>
      </ModuleProvider>
    </ShopProvider>
  );
}
