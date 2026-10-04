"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useSystemSettings } from "@/context/SystemSettingsContext";
import {
  Building, Calculator, Factory, FileText, Layers, LayoutDashboard, Package, Pill,
  LogOut, PieChart, RotateCcw, ShieldCheck, Shield, ShoppingCart, Tag, TrendingDown, Truck,
  Users, Wallet, X, Pin, PinOff, Settings, Palette, Sliders, Database, Lock
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ARGroupLogo } from "@/components/ARGroupLogo";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  isOpen = false,
  onClose = () => { },
}: SidebarProps) {
  const pathname = usePathname();
  const { industryType, userName, shopName, userRole, loading, permissions, hasPayroll, hasAssetsRec } = useShop();
  const { settings: systemSettings } = useSystemSettings();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isUrdu = language === "ur";
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const savedPin = localStorage.getItem("sidebar_pinned");
    if (savedPin === "true") setIsPinned(true);
  }, []);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_pinned", String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm(t("logout_confirm"));
    if (!confirmLogout) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  const isActive = (path: string) => {
    const currentUrl = pathname + search;
    if (path.includes("?")) {
      return currentUrl === path;
    }
    if (path === "/dashboard/settings") {
      return pathname === "/dashboard/settings";
    }
    if (path.includes("/products")) {
      return currentUrl.includes("/products") && !search.includes("tab=");
    }
    return pathname === path || (pathname.startsWith(path + "/") && path !== "/dashboard");
  };

  const sidebarSections = [
    {
      titleKey: "core_sales" as const,
      links: [
        { nameKey: "overview" as const, path: "/dashboard", icon: LayoutDashboard, permissionKey: "dashboard" },
        { nameKey: "pos" as const, path: "/dashboard/pos", icon: ShoppingCart, permissionKey: "pos" },
        { nameKey: "sales_ledger" as const, path: "/dashboard/sales", icon: FileText, permissionKey: "sales" },
        { nameKey: "khata_ledger" as const, path: "/dashboard/khata", icon: Users, permissionKey: "khata" },
        { nameKey: "reports_pdf" as const, path: "/dashboard/reports", icon: PieChart, permissionKey: "dashboard" },
      ],
    },
    {
      titleKey: "inventory_catalog" as const,
      links: [
        { nameKey: "products_stock" as const, path: "/dashboard/products", icon: Package, permissionKey: "products" },
        { nameKey: "categories" as const, path: "/dashboard/products?tab=categories", icon: Tag, permissionKey: "categories" },
        { nameKey: "brands" as const, path: "/dashboard/products?tab=brands", icon: Building, permissionKey: "brands" },
        { nameKey: "units_packings" as const, path: "/dashboard/units", icon: Layers, permissionKey: "units" },
      ],
    },
    {
      titleKey: "procurement_expenses" as const,
      links: [
        { nameKey: "purchase_stock_in" as const, path: "/dashboard/purchase", icon: Truck, permissionKey: "purchase" },
        { nameKey: "returns_adjustments" as const, path: "/dashboard/returns", icon: RotateCcw, permissionKey: "returns" },
        { nameKey: "expenses" as const, path: "/dashboard/expenses", icon: TrendingDown, permissionKey: "expenses" },
      ],
    },
    {
      titleKey: "financials_khata" as const,
      links: [
        { nameKey: "khata_ledger" as const, path: "/dashboard/khata", icon: Users, permissionKey: "khata" },
        { nameKey: "register_ledger" as const, path: "/dashboard/registers", icon: Calculator, permissionKey: "registers" },
        { nameKey: "accounts_ledger" as const, path: "/dashboard/accounts", icon: Wallet, permissionKey: "accounts" },
      ],
    },
    {
      titleKey: "pharmacy_title" as const,
      links: [
        { nameKey: "pharmacy_expiry" as const, path: "/dashboard/pharmacy/expiry", icon: Pill, permissionKey: "pharmacy" },
        { nameKey: "pharmacy_formulas" as const, path: "/dashboard/pharmacy/formulas", icon: Factory, permissionKey: "pharmacy" },
      ],
    },
    ...(hasPayroll || hasAssetsRec
      ? [{
        titleKey: "enterprise_modules" as const,
        links: [
          ...(hasPayroll ? [{ nameKey: "payroll_module" as const, path: "/dashboard/staff?tab=payroll", icon: Users, permissionKey: "staff" }] : []),
          ...(hasAssetsRec ? [{ nameKey: "assets_module" as const, path: "/dashboard/accounts?tab=assets", icon: Building, permissionKey: "accounts" }] : []),
        ],
      }]
      : []),
  ];

  const hasPermission = (key?: string) => {
    if (!key) return true;
    if (loading || !permissions) return true;
    return permissions.panels?.[key] === true;
  };

  // On desktop: expanded if hovered or pinned
  const isDesktopExpanded = isPinned || isHovered;

  // Active display shop name
  const currentShopName = systemSettings.shopName || shopName || "Falcon Swift PVT. LTD. Pharmacy";

  const renderContent = (isExpanded: boolean, isMobileView: boolean) => (
    <div
      className="flex flex-col h-full select-none transition-colors duration-200"
      style={{ backgroundColor: theme.sidebarBg, color: theme.sidebarText }}
    >
      {/* Sidebar Header / Branding */}
      <div
        className={`flex items-center justify-between shrink-0 transition-all duration-300 border-b ${isExpanded ? "h-[4.75rem] px-4" : "h-16 justify-center px-0"
          }`}
        style={{ borderColor: theme.sidebarBorder }}
      >
        <div className={`flex items-center gap-3 min-w-0 ${!isExpanded ? "justify-center w-full" : ""}`}>
          {systemSettings.logoUrl ? (
            <div className={`rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden ${isExpanded ? "h-11 w-11" : "h-9 w-9"
              }`}>
              <img src={systemSettings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <ARGroupLogo
              className={`shrink-0 transition-all duration-300 ${isExpanded ? "h-11 w-11" : "h-9 w-9"}`}
            />
          )}
          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="text-white font-bold text-xs sm:text-sm leading-tight truncate">
                {currentShopName}
              </span>
              {loading || !mounted ? (
                <div className="h-2.5 w-16 bg-white/10 rounded mt-1"></div>
              ) : (
                <span className="text-stone-300/80 text-[10px] uppercase tracking-wide mt-0.5 truncate font-medium">
                  {systemSettings.industryType === "pharmacy" ? t("pharmacy_title") : (systemSettings.industryType || "Pharmacy")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop Pin or Mobile Close */}
        {isExpanded && (
          <div className="flex items-center gap-1 shrink-0">
            {!isMobileView ? (
              <button
                onClick={togglePin}
                className="p-1.5 rounded-md transition-colors cursor-pointer text-stone-300 hover:text-white"
                style={{
                  backgroundColor: isPinned ? theme.sidebarActive : "transparent",
                }}
                title={isPinned ? "Unpin Sidebar (Auto-collapse on mouse leave)" : "Pin Sidebar (Keep always open)"}
              >
                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="p-1.5 text-stone-300 hover:text-white rounded-md transition-colors"
                aria-label="Close Sidebar"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Navigation Area */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar ${isExpanded ? "px-3" : "px-2"}`}>
        {sidebarSections.map((section) => {
          const filteredLinks = section.links.filter(link => hasPermission(link.permissionKey));
          if (filteredLinks.length === 0) return null;
          return (
            <div key={section.titleKey} className="space-y-1">
              {isExpanded ? (
                <p className="px-2.5 text-[9px] font-semibold text-stone-300/70 uppercase tracking-wider leading-normal">
                  {t(section.titleKey)}
                </p>
              ) : (
                <div className="border-t my-2 mx-1" style={{ borderColor: theme.sidebarBorder }} />
              )}
              <div className="space-y-0.5">
                {filteredLinks.map((link) => {
                  const active = (isActive(link.path) && link.path !== '/dashboard') || (pathname === '/dashboard' && link.path === '/dashboard');
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      onClick={() => {
                        if (isMobileView) onClose();
                      }}
                      className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                        } ${active
                          ? 'text-white font-semibold shadow-xs'
                          : 'text-stone-300 hover:text-white'
                        }`}
                      style={{
                        backgroundColor: active ? theme.sidebarActive : "transparent",
                      }}
                    >
                      <link.icon size={17} className={`shrink-0 ${active ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
                      {isExpanded && <span className="truncate whitespace-nowrap">{t(link.nameKey)}</span>}

                      {/* Tooltip in Desktop Collapsed State */}
                      {!isExpanded && !isMobileView && (
                        <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                          {t(link.nameKey)}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* System Management & Settings */}
        <div className="space-y-1">
          {isExpanded ? (
            <p className="px-2.5 text-[9px] font-semibold text-stone-300/70 uppercase tracking-wider leading-normal">
              {t("system")}
            </p>
          ) : (
            <div className="border-t my-2 mx-1" style={{ borderColor: theme.sidebarBorder }} />
          )}
          <div className="space-y-0.5">
            {/* System Settings */}
            <Link
              href="/dashboard/settings"
              onClick={() => {
                if (isMobileView) onClose();
              }}
              className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                } ${isActive('/dashboard/settings')
                  ? 'text-white font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white'
                }`}
              style={{
                backgroundColor: isActive('/dashboard/settings') ? theme.sidebarActive : "transparent",
              }}
            >
              <Settings size={17} className={`shrink-0 ${isActive('/dashboard/settings') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
              {isExpanded && <span className="truncate whitespace-nowrap">{t("system_settings")}</span>}
              {!isExpanded && !isMobileView && (
                <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                  {t("system_settings")}
                </div>
              )}
            </Link>

            {/* Color Themes */}
            <Link
              href="/dashboard/settings/colors"
              onClick={() => {
                if (isMobileView) onClose();
              }}
              className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                } ${isActive('/dashboard/settings/colors')
                  ? 'text-white font-semibold shadow-xs'
                  : 'text-stone-300 hover:text-white'
                }`}
              style={{
                backgroundColor: isActive('/dashboard/settings/colors') ? theme.sidebarActive : "transparent",
              }}
            >
              <Palette size={17} className={`shrink-0 ${isActive('/dashboard/settings/colors') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
              {isExpanded && <span className="truncate whitespace-nowrap">{t("color_settings")}</span>}
              {!isExpanded && !isMobileView && (
                <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                  {t("color_settings")}
                </div>
              )}
            </Link>

            {hasPermission("staff") && (
              <Link
                href="/dashboard/staff"
                onClick={() => {
                  if (isMobileView) onClose();
                }}
                className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                  } ${isActive('/dashboard/staff')
                    ? 'text-white font-semibold shadow-xs'
                    : 'text-stone-300 hover:text-white'
                  }`}
                style={{
                  backgroundColor: isActive('/dashboard/staff') ? theme.sidebarActive : "transparent",
                }}
              >
                <ShieldCheck size={17} className={`shrink-0 ${isActive('/dashboard/staff') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
                {isExpanded && <span className="truncate whitespace-nowrap">{t("staff_management")}</span>}
                {!isExpanded && !isMobileView && (
                  <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                    {t("staff_management")}
                  </div>
                )}
              </Link>
            )}

            {/* User Roles & RBAC */}
            {(hasPermission("staff") || hasPermission("roles")) && (
              <Link
                href="/dashboard/roles"
                onClick={() => {
                  if (isMobileView) onClose();
                }}
                className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                  } ${isActive('/dashboard/roles')
                    ? 'text-white font-semibold shadow-xs'
                    : 'text-stone-300 hover:text-white'
                  }`}
                style={{
                  backgroundColor: isActive('/dashboard/roles') ? theme.sidebarActive : "transparent",
                }}
              >
                <Shield size={17} className={`shrink-0 ${isActive('/dashboard/roles') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
                {isExpanded && <span className="truncate whitespace-nowrap">{isUrdu ? "یوزر رولز اور اجازت نامے" : "User Roles (RBAC)"}</span>}
                {!isExpanded && !isMobileView && (
                  <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                    {isUrdu ? "یوزر رولز اور اجازت نامے" : "User Roles (RBAC)"}
                  </div>
                )}
              </Link>
            )}

            {/* Database Management */}
            {(hasPermission("staff") || hasPermission("settings")) && (
              <Link
                href="/dashboard/database"
                onClick={() => {
                  if (isMobileView) onClose();
                }}
                className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                  } ${isActive('/dashboard/database')
                    ? 'text-white font-semibold shadow-xs'
                    : 'text-stone-300 hover:text-white'
                  }`}
                style={{
                  backgroundColor: isActive('/dashboard/database') ? theme.sidebarActive : "transparent",
                }}
              >
                <Database size={17} className={`shrink-0 ${isActive('/dashboard/database') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
                {isExpanded && <span className="truncate whitespace-nowrap">{isUrdu ? "ڈیٹا بیس مینجمنٹ اور بیک اپ" : "Database Management"}</span>}
                {!isExpanded && !isMobileView && (
                  <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                    {isUrdu ? "ڈیٹا بیس مینجمنٹ اور بیک اپ" : "Database Management"}
                  </div>
                )}
              </Link>
            )}

            {/* Login Security Management */}
            {(hasPermission("staff") || hasPermission("settings")) && (
              <Link
                href="/dashboard/security"
                onClick={() => {
                  if (isMobileView) onClose();
                }}
                className={`group relative flex items-center rounded-xl transition-all duration-200 text-xs font-semibold ${isExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"
                  } ${isActive('/dashboard/security')
                    ? 'text-white font-semibold shadow-xs'
                    : 'text-stone-300 hover:text-white'
                  }`}
                style={{
                  backgroundColor: isActive('/dashboard/security') ? theme.sidebarActive : "transparent",
                }}
              >
                <Lock size={17} className={`shrink-0 ${isActive('/dashboard/security') ? 'text-white' : 'text-stone-400 group-hover:text-white transition-colors'}`} />
                {isExpanded && <span className="truncate whitespace-nowrap">{isUrdu ? "لاگ ان سیکیورٹی مینجمنٹ" : "Login Security"}</span>}
                {!isExpanded && !isMobileView && (
                  <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                    {isUrdu ? "لاگ ان سیکیورٹی مینجمنٹ" : "Login Security"}
                  </div>
                )}
              </Link>
            )}

            <button
              onClick={handleLogout}
              className={`group relative w-full flex items-center rounded-xl transition-all duration-200 text-xs font-semibold text-stone-300 hover:text-white cursor-pointer ${isExpanded ? "gap-3 px-3 py-2.5 text-left" : "justify-center p-2.5"
                }`}
            >
              <LogOut size={17} className="shrink-0 text-stone-400 group-hover:text-white transition-colors" />
              {isExpanded && <span className="truncate whitespace-nowrap">{t("logout")}</span>}
              {!isExpanded && !isMobileView && (
                <div className="fixed left-[76px] px-2.5 py-1.5 bg-zinc-900 text-white text-[11px] rounded-lg border border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap shadow-xl z-50 font-medium">
                  {t("logout")}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          className="px-4 py-1.5 border-t shrink-0"
          style={{ borderColor: theme.sidebarBorder }}
        >
          <p className="text-[9px] text-center text-stone-400 tracking-wide truncate">
            Software by <span className="text-white font-medium">Falcon Swift PVT. LTD.</span>
          </p>
        </div>
      )}

      {/* User Profile Section */}
      <div
        className={`p-3 border-t shrink-0 transition-all duration-300 ${!isExpanded ? "flex justify-center" : ""
          }`}
        style={{
          borderColor: theme.sidebarBorder,
          backgroundColor: theme.sidebarHover || theme.sidebarBorder,
        }}
      >
        <div className={`flex items-center justify-between gap-2.5 ${!isExpanded ? "justify-center" : "px-1"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center border shrink-0 shadow-sm"
              style={{ backgroundColor: theme.sidebarActive, borderColor: theme.sidebarBorder }}
            >
              <span className="text-white font-bold text-sm">{mounted ? (userName?.charAt(0) || 'U') : 'U'}</span>
            </div>
            {isExpanded && (
              <div className="flex-1 min-w-0">
                {loading || !mounted ? (
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-white/20 rounded animate-pulse"></div>
                    <div className="h-2 w-20 bg-white/20 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-white truncate">{currentShopName}</p>
                    <p className="text-[10px] text-stone-300 truncate capitalize leading-tight mt-0.5">{userRole} • {userName}</p>
                  </>
                )}
              </div>
            )}
          </div>
          {mounted && isExpanded && !loading && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-stone-300 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
              title={t("logout")}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── MOBILE VIEW (< md): Traditional Slide-in Drawer ─── */}
      <div className="md:hidden">
        {/* Mobile Backdrop Overlay */}
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          onClick={onClose}
        />

        {/* Mobile Drawer (Always full width w-72 when opened) */}
        <aside
          className={`fixed inset-y-0 left-0 w-72 z-50 shadow-2xl transition-transform duration-300 ease-out flex flex-col border-r ${isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          style={{ backgroundColor: theme.sidebarBg, borderColor: theme.sidebarBorder }}
        >
          {renderContent(true, true)}
        </aside>
      </div>

      {/* ─── DESKTOP VIEW (>= md): Auto-Collapse / Hover Expand Rail ─── */}
      <div
        className={`hidden md:block relative shrink-0 transition-all duration-300 ease-in-out ${isPinned ? "w-64" : "w-20"
          }`}
      >
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`h-screen flex flex-col border-r absolute inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${isDesktopExpanded
            ? "w-64 shadow-2xl backdrop-blur-md"
            : "w-20 shadow-sm"
            }`}
          style={{
            backgroundColor: theme.sidebarBg,
            borderColor: theme.sidebarBorder,
            color: theme.sidebarText
          }}
        >
          {renderContent(isDesktopExpanded, false)}
        </aside>
      </div>
    </>
  );
}
