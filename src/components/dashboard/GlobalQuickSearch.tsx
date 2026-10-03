"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Package, Users, FileText, LayoutDashboard, ShoppingCart, 
  RotateCcw, TrendingDown, Calculator, Wallet, PieChart, Pill, 
  Factory, ShieldCheck, Database, Lock, Settings, Palette, Layers, 
  Building, Truck, Tag, ArrowRight, CornerDownLeft, X, Loader2
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/lib/supabase/client";

interface NavigationItem {
  id: string;
  titleEn: string;
  titleUr: string;
  category: "navigation";
  href: string;
  icon: any;
  keywords: string[];
}

export function GlobalQuickSearch() {
  const router = useRouter();
  const { shopId } = useShop();
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Live dynamic data
  const [matchedProducts, setMatchedProducts] = useState<any[]>([]);
  const [matchedCustomers, setMatchedCustomers] = useState<any[]>([]);
  const [matchedInvoices, setMatchedInvoices] = useState<any[]>([]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // All static navigation pages
  const navigationItems: NavigationItem[] = [
    { id: "nav-dash", titleEn: "Dashboard Overview", titleUr: "ڈیش بورڈ اوور ویو", category: "navigation", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "stats", "revenue", "analytics", "dashboard"] },
    { id: "nav-pos", titleEn: "Point of Sale (POS)", titleUr: "پوائنٹ آف سیل (POS)", category: "navigation", href: "/dashboard/pos", icon: ShoppingCart, keywords: ["bill", "checkout", "counter", "sale", "pos"] },
    { id: "nav-sales", titleEn: "Sales Ledger & Invoices", titleUr: "سیلز لیجر اور انوائسز", category: "navigation", href: "/dashboard/sales", icon: FileText, keywords: ["bills", "invoices", "orders", "receipts", "sales"] },
    { id: "nav-products", titleEn: "Products & Stock Inventory", titleUr: "پروڈکٹس اور اسٹاک انوینٹری", category: "navigation", href: "/dashboard/products", icon: Package, keywords: ["items", "medicines", "stock", "catalog", "inventory", "products"] },
    { id: "nav-categories", titleEn: "Product Categories", titleUr: "پروڈکٹ کیٹیگریز", category: "navigation", href: "/dashboard/products?tab=categories", icon: Tag, keywords: ["categories", "groups", "types"] },
    { id: "nav-brands", titleEn: "Brands Management", titleUr: "برانڈز مینجمنٹ", category: "navigation", href: "/dashboard/products?tab=brands", icon: Building, keywords: ["brands", "companies", "manufacturers"] },
    { id: "nav-units", titleEn: "Units & Packaging", titleUr: "یونٹس اور پیکنگ مینجمنٹ", category: "navigation", href: "/dashboard/units", icon: Layers, keywords: ["units", "packing", "pieces", "boxes"] },
    { id: "nav-purchase", titleEn: "Purchase Orders & Stock In", titleUr: "پرچیز اور اسٹاک ان", category: "navigation", href: "/dashboard/purchase", icon: Truck, keywords: ["purchase", "suppliers", "stock in", "buying"] },
    { id: "nav-returns", titleEn: "Returns & Stock Adjustments", titleUr: "واپسی اور اسٹاک ایڈجسٹمنٹ", category: "navigation", href: "/dashboard/returns", icon: RotateCcw, keywords: ["returns", "damage", "adjustments", "refunds"] },
    { id: "nav-khata", titleEn: "Khata & Customer Ledger", titleUr: "کھاتہ اور کسٹمر لیجر", category: "navigation", href: "/dashboard/khata", icon: Users, keywords: ["khata", "udhaar", "credit", "customers", "parties", "ledger"] },
    { id: "nav-registers", titleEn: "Daily Cash Registers (Daybook)", titleUr: "کیش رجسٹر اور سیشنز", category: "navigation", href: "/dashboard/registers", icon: Calculator, keywords: ["cash", "drawer", "shift", "daybook", "register"] },
    { id: "nav-expenses", titleEn: "Daily Expenses Management", titleUr: "روزمرہ کے اخراجات", category: "navigation", href: "/dashboard/expenses", icon: TrendingDown, keywords: ["expenses", "costs", "kharcha", "bills", "spending"] },
    { id: "nav-accounts", titleEn: "Accounts & Financial Ledgers", titleUr: "اکاؤنٹس اور مالیاتی لیجر", category: "navigation", href: "/dashboard/accounts", icon: Wallet, keywords: ["accounts", "banks", "finance", "cash", "ledger"] },
    { id: "nav-reports", titleEn: "Financial & Sales Reports (PDF)", titleUr: "مالیاتی اور سیلز رپورٹس", category: "navigation", href: "/dashboard/reports", icon: PieChart, keywords: ["reports", "pdf", "profit", "loss", "balance sheet"] },
    { id: "nav-expiry", titleEn: "Pharmacy Medicine Expiry Tracker", titleUr: "میڈیسن ایکسپائری ٹریکر", category: "navigation", href: "/dashboard/pharmacy/expiry", icon: Pill, keywords: ["expiry", "batches", "medicine", "pharmacy", "expired"] },
    { id: "nav-formulas", titleEn: "Generic Formulations (Salts)", titleUr: "جنرک فارمولیشنز (سالٹس)", category: "navigation", href: "/dashboard/pharmacy/formulas", icon: Factory, keywords: ["formulas", "salts", "generics", "composition"] },
    { id: "nav-staff", titleEn: "HR & Staff Management", titleUr: "ایچ آر اور اسٹاف مینجمنٹ", category: "navigation", href: "/dashboard/staff", icon: ShieldCheck, keywords: ["staff", "employees", "salaries", "hr", "payroll"] },
    { id: "nav-roles", titleEn: "User Roles & Access Control (RBAC)", titleUr: "یوزر رولز اور اجازت نامے (RBAC)", category: "navigation", href: "/dashboard/roles", icon: ShieldCheck, keywords: ["roles", "permissions", "rbac", "security", "access"] },
    { id: "nav-database", titleEn: "Database Management & Backups", titleUr: "ڈیٹا بیس مینجمنٹ اور بیک اپ", category: "navigation", href: "/dashboard/database", icon: Database, keywords: ["database", "backup", "restore", "sql", "vacuum", "reset"] },
    { id: "nav-security", titleEn: "Login Security & Active Sessions", titleUr: "لاگ ان سیکیورٹی اور ایکٹو سیشنز", category: "navigation", href: "/dashboard/security", icon: Lock, keywords: ["security", "sessions", "login", "password", "lockout", "audit"] },
    { id: "nav-settings", titleEn: "System Settings & Business Profile", titleUr: "سسٹم سیٹنگز اور دکان کی تفصیلات", category: "navigation", href: "/dashboard/settings", icon: Settings, keywords: ["settings", "shop name", "phone", "address", "business"] },
    { id: "nav-colors", titleEn: "Color Themes & Dynamic Palette", titleUr: "کلر تھیمز اور برانڈنگ", category: "navigation", href: "/dashboard/settings/colors", icon: Palette, keywords: ["colors", "theme", "branding", "palette"] },
  ];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Keyboard shortcut: Ctrl + K or Cmd + K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced dynamic search across database tables
  useEffect(() => {
    if (!query.trim() || !shopId) {
      setMatchedProducts([]);
      setMatchedCustomers([]);
      setMatchedInvoices([]);
      return;
    }

    const trimmed = query.trim().toLowerCase();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [prodRes, custRes, invRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, code, sale_price_single, current_stock, unit")
            .eq("shop_id", shopId)
            .or(`name.ilike.%${trimmed}%,code.ilike.%${trimmed}%`)
            .limit(5),
          supabase
            .from("parties")
            .select("id, name, phone, current_balance, type")
            .eq("shop_id", shopId)
            .eq("type", "customer")
            .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
            .limit(4),
          supabase
            .from("invoices")
            .select("id, total_amount, payment_mode, created_at")
            .eq("shop_id", shopId)
            .ilike("id", `%${trimmed}%`)
            .limit(3),
        ]);

        setMatchedProducts(prodRes.data || []);
        setMatchedCustomers(custRes.data || []);
        setMatchedInvoices(invRes.data || []);
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, shopId]);

  // Filter static navigation pages
  const filteredNav = query.trim()
    ? navigationItems.filter((item) => {
        const q = query.trim().toLowerCase();
        return (
          item.titleEn.toLowerCase().includes(q) ||
          item.titleUr.includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      }).slice(0, 6)
    : navigationItems.slice(0, 5); // Default top shortcuts

  // Combine all items for keyboard navigation
  const allResults = [
    ...filteredNav.map((n) => ({ ...n, type: "nav" })),
    ...matchedProducts.map((p) => ({
      id: "prod-" + p.id,
      title: p.name,
      subtitle: `Code: ${p.code || "N/A"} • Stock: ${p.current_stock} ${p.unit || ""} • Price: Rs. ${p.sale_price_single}`,
      href: `/dashboard/products?search=${encodeURIComponent(p.name)}`,
      icon: Package,
      type: "product",
    })),
    ...matchedCustomers.map((c) => ({
      id: "cust-" + c.id,
      title: c.name,
      subtitle: `Phone: ${c.phone || "N/A"} • Balance: Rs. ${Number(c.current_balance || 0).toLocaleString()}`,
      href: `/dashboard/khata?search=${encodeURIComponent(c.name)}`,
      icon: Users,
      type: "customer",
    })),
    ...matchedInvoices.map((inv) => ({
      id: "inv-" + inv.id,
      title: `Invoice #${inv.id.slice(-6).toUpperCase()}`,
      subtitle: `Amount: Rs. ${Number(inv.total_amount || 0).toLocaleString()} • ${inv.payment_mode?.toUpperCase()}`,
      href: `/dashboard/sales?search=${encodeURIComponent(inv.id)}`,
      icon: FileText,
      type: "invoice",
    })),
  ];

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        handleSelect(selected.href);
      }
    }
  };

  return (
    <div ref={searchContainerRef} className="relative w-48 sm:w-64 md:w-80 lg:w-96">
      {/* Search Bar Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDownInput}
          placeholder={t("search_placeholder") || "Search pages, products, customers..."}
          className="w-full bg-[#faf9f7] pl-9 pr-14 py-1.5 border border-[#ddd8cf] rounded-lg text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-2xs"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 bg-stone-100 border border-stone-200 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dynamic Dropdown Search Palette */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-stone-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[480px] flex flex-col">
          {/* Header Status */}
          <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-[11px] font-semibold text-stone-500">
            <span>
              {query 
                ? (isUrdu ? `"${query}" کے لیے تلاش کے نتائج` : `Search results for "${query}"`) 
                : (isUrdu ? "فوری نیویگیشن اور شارٹ کٹس" : "Quick Navigation & Shortcuts")}
            </span>
            {loading ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <Loader2 size={12} className="animate-spin" /> {isUrdu ? "تلاش جاری ہے..." : "Searching..."}
              </span>
            ) : (
              <span>{allResults.length} {isUrdu ? "نتائج" : "items"}</span>
            )}
          </div>

          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-stone-100">
            {/* Pages & Modules Category */}
            {filteredNav.length > 0 && (
              <div className="pt-1 first:pt-0">
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  {isUrdu ? "پیجز اور سسٹمز" : "Pages & Modules"}
                </div>
                {filteredNav.map((item, idx) => {
                  const globalIdx = idx;
                  const isSelected = selectedIndex === globalIdx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-950 font-semibold"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-md ${isSelected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                          <Icon size={14} />
                        </span>
                        <div className="truncate">
                          <p className="truncate">{isUrdu ? item.titleUr : item.titleEn}</p>
                          <p className="text-[10px] text-stone-400 font-normal">{isUrdu ? item.titleEn : item.titleUr}</p>
                        </div>
                      </div>
                      <ArrowRight size={13} className={isSelected ? "text-emerald-700" : "text-stone-300"} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products Category */}
            {matchedProducts.length > 0 && (
              <div className="pt-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  {isUrdu ? "پروڈکٹس اور ادویات" : "Products & Stock"}
                </div>
                {matchedProducts.map((p, idx) => {
                  const globalIdx = filteredNav.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(`/dashboard/products?search=${encodeURIComponent(p.name)}`)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-950 font-semibold"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-md ${isSelected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                          <Package size={14} />
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-stone-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-stone-500">
                            {p.code ? `Code: ${p.code} • ` : ""}{isUrdu ? "اسٹاک: " : "Stock: "}{p.current_stock} {p.unit || ""} • Rs. {p.sale_price_single}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                        Rs. {p.sale_price_single}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Customers & Parties Category */}
            {matchedCustomers.length > 0 && (
              <div className="pt-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  {isUrdu ? "کسٹمرز اور کھاتہ" : "Customers & Khata"}
                </div>
                {matchedCustomers.map((c, idx) => {
                  const globalIdx = filteredNav.length + matchedProducts.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(`/dashboard/khata?search=${encodeURIComponent(c.name)}`)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-950 font-semibold"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-md ${isSelected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                          <Users size={14} />
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-stone-900 truncate">{c.name}</p>
                          <p className="text-[10px] text-stone-500">{c.phone || (isUrdu ? "کوئی فون نہیں" : "No phone")} • {isUrdu ? "بقایا: " : "Balance: "}Rs. {Number(c.current_balance || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ${Number(c.current_balance || 0) > 0 ? "text-amber-700" : "text-stone-500"}`}>
                        Rs. {Number(c.current_balance || 0).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Invoices Category */}
            {matchedInvoices.length > 0 && (
              <div className="pt-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  {isUrdu ? "انوائسز اور بل" : "Invoices & Bills"}
                </div>
                {matchedInvoices.map((inv, idx) => {
                  const globalIdx = filteredNav.length + matchedProducts.length + matchedCustomers.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <button
                      key={inv.id}
                      onClick={() => handleSelect(`/dashboard/sales?search=${encodeURIComponent(inv.id)}`)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-950 font-semibold"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-md ${isSelected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                          <FileText size={14} />
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-stone-900 truncate">{isUrdu ? "بل نمبر " : "Invoice #"}#{inv.id.slice(-6).toUpperCase()}</p>
                          <p className="text-[10px] text-stone-500">{inv.payment_mode?.toUpperCase()} • {new Date(inv.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-stone-800 shrink-0">
                        Rs. {Number(inv.total_amount || 0).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {allResults.length === 0 && !loading && (
              <div className="py-6 text-center text-stone-400 text-xs">
                <p>{isUrdu ? `"${query}" کے لیے کوئی نتیجہ نہیں ملا` : `No results found for "${query}"`}</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  {isUrdu ? "پروڈکٹ کا نام، کسٹمر، یا پیج تلاش کرنے کی کوشش کریں۔" : "Try searching for a product name, page title, or customer."}
                </p>
              </div>
            )}
          </div>

          {/* Footer Quick Tips */}
          <div className="px-3.5 py-2 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5"><kbd className="px-1 bg-white border border-stone-200 rounded">↑</kbd><kbd className="px-1 bg-white border border-stone-200 rounded">↓</kbd> {isUrdu ? "نیویگیٹ" : "navigate"}</span>
              <span className="flex items-center gap-0.5"><kbd className="px-1 bg-white border border-stone-200 rounded">↵</kbd> {isUrdu ? "منتخب کریں" : "select"}</span>
              <span className="flex items-center gap-0.5"><kbd className="px-1 bg-white border border-stone-200 rounded">esc</kbd> {isUrdu ? "بند کریں" : "close"}</span>
            </div>
            <span className="font-semibold text-stone-500">Falcon Swift PVT. LTD.</span>
          </div>
        </div>
      )}
    </div>
  );
}
