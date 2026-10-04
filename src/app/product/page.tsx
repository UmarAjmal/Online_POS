"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Package,
  BookOpen,
  DollarSign,
  FileText,
  Shield,
  Database,
  Printer,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock,
  Layers,
  Search,
  MessageCircle,
  HelpCircle,
  Tablet,
  Barcode,
  Truck,
  Building2,
  Languages,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { WhatsAppFloatingAgent } from "@/components/WhatsAppFloatingAgent";
import { useTheme } from "@/context/ThemeContext";

export default function ProductPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("all");

  const modules = [
    {
      id: "pos",
      category: "sales",
      title: "Point of Sale (POS) & Billing",
      tagline: "Lightning-fast cashier billing designed for rush hours",
      icon: ShoppingCart,
      color: "#16a34a",
      features: [
        "Instant barcode scanning with zero input lag",
        "Hold / Park bills to handle multiple waiting customers",
        "Split & flexible payment options (Cash, Card, Khata / Baqi, Online)",
        "Thermal receipt (80mm & 58mm) and standard A4 invoice printing",
        "Item-level and invoice-level custom discounts",
        "Fast return / exchange refund processing",
      ],
      urduDesc: "انتہائی تیز رفتار بلنگ، بارکوڈ اسکینر سپورٹ، بل ہولڈ اور کسٹمر کھاتہ بلنگ",
    },
    {
      id: "inventory",
      category: "pharmacy",
      title: "Pharmacy Inventory & Expiry Tracker",
      tagline: "Total stock visibility with batch and formula intelligence",
      icon: Package,
      color: "#0d9488",
      features: [
        "Batch number and expiry date tracking for every stock batch",
        "Color-coded near-expiry alerts (30, 60, and 90 days prior)",
        "Multi-pack unit conversion: Box ⇄ Strip ⇄ Tablet automatically calculated",
        "Generic salt & formula search for instant alternative medicine lookup",
        "Low stock and re-order level triggers to prevent out-of-stock losses",
        "Bulk inventory import/export via Excel/CSV",
      ],
      urduDesc: "میڈیسن بیچ نمبر، تاریخ تنسیخ (ایکسپائری) الرٹس اور ڈبہ/پتا/گولی خودکار حساب",
    },
    {
      id: "khata",
      category: "accounts",
      title: "Customer & Supplier Khata Ledgers",
      tagline: "End manual registers with a modern digital Baqi / Udhaar khata",
      icon: BookOpen,
      color: "#2563eb",
      features: [
        "Individual customer and supplier ledgers with complete transaction history",
        "1-Click balance statement sharing directly to customer's WhatsApp",
        "Credit limit enforcement to prevent bad debts and unpaid balances",
        "Partial payments, advance deposits, and settlement logs",
        "Aging analysis report for overdue khata receivables",
        "Printable account statements and ledger PDFs",
      ],
      urduDesc: "کسٹمر اور سپلائر کا مکمل ڈیجیٹل کھاتہ اور ایک کلک پر واٹس ایپ بل اسٹیٹمنٹ",
    },
    {
      id: "cash",
      category: "accounts",
      title: "Cash Registers & Daily Shift Management",
      tagline: "Eliminate cash discrepancies with foolproof drawer audits",
      icon: DollarSign,
      color: "#d97706",
      features: [
        "Opening and closing shift balances with automated drawer cash counting",
        "Petty cash and daily shop expense logging directly from the register",
        "Cash in / cash out audit trail with cashier verification",
        "Automated Z-Report generation at end-of-day closing",
        "Surplus / shortage calculation to detect theft or miscalculations",
        "Cashier handover receipts with timestamped records",
      ],
      urduDesc: "کیش دراز کا یومیہ حساب کتاب، اوپننگ/کلوزنگ بیلنس اور روزمرہ اخراجات کا اندراج",
    },
    {
      id: "purchase",
      category: "pharmacy",
      title: "Purchase Orders & Vendor Receiving",
      tagline: "Streamline procurement from pharma distributors and suppliers",
      icon: Truck,
      color: "#4f46e5",
      features: [
        "Purchase order (PO) generation with automatic supplier ledger sync",
        "Inward delivery verification against invoices and bonus pack tracking",
        "Trade price (TP), maximum retail price (MRP), and margin calculations",
        "Purchase return handling with credit note adjustments",
        "Supplier payment records and upcoming payment reminders",
        "Historical purchase cost tracking for price change insights",
      ],
      urduDesc: "ڈسٹری بیوٹرز سے خریداری، انوائس ویریفکیشن، بونس پیک اور سپلائر کی ادائیگیاں",
    },
    {
      id: "reports",
      category: "reports",
      title: "12+ Financial & Audit Reports",
      tagline: "Real-time actionable business intelligence at your fingertips",
      icon: FileText,
      color: "#e11d48",
      features: [
        "Profit & Loss (P&L) statements with gross and net margin breakdown",
        "Comprehensive Stock Valuation report (by cost price & retail price)",
        "Daily, weekly, and monthly sales trend analytics",
        "Fast-moving vs. dead/slow-moving inventory ranking",
        "Supplier statement and Customer receivable registers",
        "1-Click PDF and Excel data export with official shop branding",
      ],
      urduDesc: "نفع و نقصان کی تفصیلی رپورٹ، اسٹاک ویلیو اور یومیہ سیلز کا مکمل تجزیہ",
    },
    {
      id: "roles",
      category: "security",
      title: "User Roles, Permissions & Security",
      tagline: "Complete control over what each staff member can see and do",
      icon: Shield,
      color: "#0891b2",
      features: [
        "Pre-built roles: Admin, Store Manager, Senior Cashier, Pharmacist",
        "Granular permission switches for price modification, discounts, and voids",
        "Audit logs tracking every critical activity, deletion, or modification",
        "Secure PIN / password authentication for sensitive actions",
        "Cashier-specific sales tracking to review individual performance",
        "Multi-user concurrent access on local network",
      ],
      urduDesc: "کیشیئر اور ملازمین کے اختیارات کا کنٹرول، سیکورٹی لاگز اور ایکشن ٹریکنگ",
    },
    {
      id: "database",
      category: "security",
      title: "Offline SQLite Engine & 1-Click Backups",
      tagline: "100% data ownership with zero cloud subscription hostage risk",
      icon: Database,
      color: "#059669",
      features: [
        "Local SQLite database engine running independently on your computer",
        "No internet required for billing, stock search, or reports",
        "Instant 1-Click offline backup to USB drive or local hard drive",
        "Safe database VACUUM & optimization tools for peak performance",
        "Fast restore facility in case of computer hardware change",
        "Encrypted local session management to safeguard business data",
      ],
      urduDesc: "انٹرنیٹ کے بغیر 100 فیصد آف لائن چلنے والا محفوظ ڈیٹا بیس اور یو ایس بی بیک اپ",
    },
  ];

  const filteredModules =
    activeTab === "all"
      ? modules
      : modules.filter((m) => m.category === activeTab);

  const pillars = [
    {
      title: "100% Offline Independence",
      desc: "Operates seamlessly without active internet. No cloud downtime or subscription lockouts.",
      icon: Database,
    },
    {
      title: "Multi-Pack Unit Math",
      desc: "Sell medicines in full boxes, blister strips, or loose tablets with accurate fractional stock deduction.",
      icon: Tablet,
    },
    {
      title: "Bilingual Urdu & English",
      desc: "Full Urdu Nastaliq interface allows staff of any background to operate the system comfortably.",
      icon: Languages,
    },
    {
      title: "Universal Hardware Support",
      desc: "Works with any standard USB barcode scanner, 80mm/58mm thermal printers, and cash drawers.",
      icon: Printer,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbfbfa] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative">
      
      {/* ─── NAVIGATION ─── */}
      <PublicNavbar phoneNumber="03263392082" />

      {/* ─── AMBIENT GLOW ─── */}
      <div 
        className="fixed -top-40 -left-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
      />
      <div 
        className="fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: theme.sidebarBg || "#1b2d19" }}
      />

      <main className="flex-1 z-10 relative">
        
        {/* ─── HERO HEADER ─── */}
        <section className="px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 max-w-6xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Universal Business & Pharmacy ERP</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Everything your shop needs to run{" "}
            <span 
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.primaryColor || "#16a34a"} 0%, #047857 100%)`,
              }}
            >
              faster, smarter, and offline
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A comprehensive, high-speed retail and pharmacy operating system built to streamline cashier billing, expiry management, khata ledgers, and accounts.
          </p>

          {/* Quick CTA row */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/plan"
              className="px-6 py-3.5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
            >
              <span>View Subscription Plan (Rs. 3,000/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/923263392082?text=${encodeURIComponent("Assalam-o-Alaikum! I want to request a live demo of the AR Group Pharmacy POS.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-white text-stone-800 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
              <span>Request Free Demo on WhatsApp</span>
            </a>
          </div>
        </section>

        {/* ─── 4 CORE ARCHITECTURE PILLARS ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-stone-900">{p.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── MODULES SHOWCASE SECTION ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto space-y-8">
          
          {/* Section Heading & Category Filter */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                Feature Matrix
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Software Modules & Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Explore the modular architecture powering day-to-day pharmacy and retail workflows.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: "All Modules" },
                { key: "sales", label: "POS & Billing" },
                { key: "pharmacy", label: "Pharmacy Stock" },
                { key: "accounts", label: "Khata & Cash" },
                { key: "reports", label: "Reports" },
                { key: "security", label: "Security & Backup" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === tab.key
                      ? "text-white shadow-xs"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                  style={
                    activeTab === tab.key
                      ? { backgroundColor: theme.primaryColor || "#16a34a" }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredModules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: m.color }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-stone-900 group-hover:text-emerald-700 transition-colors">
                            {m.title}
                          </h3>
                          <p className="text-xs text-stone-500 font-medium">
                            {m.tagline}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Urdu subtitle badge */}
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-right font-['Noto_Nastaliq_Urdu',sans-serif] text-xs text-stone-700 leading-loose" dir="rtl">
                      {m.urduDesc}
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2 pt-2">
                      {m.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-xs text-stone-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card bottom indicator */}
                  <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                    <span className="font-semibold uppercase text-[10px] tracking-wider text-emerald-700">
                      Offline Ready • Full Access
                    </span>
                    <Link
                      href="/plan"
                      className="text-stone-700 hover:text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-all"
                    >
                      <span>In Plan (Rs. 3,000/mo)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

        </section>

        {/* ─── INDUSTRY SUITABILITY ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto">
          <div className="p-8 sm:p-10 rounded-3xl bg-linear-to-br from-stone-900 to-stone-950 text-white space-y-6 relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Universal Versatility
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                Designed for Pharmacies, Adaptable to Any Retail Counter
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Whether you operate a small community medical store, a busy hospital pharmacy, a cosmetic outlet, or a grocery mart, the system configures in minutes to match your shop’s exact workflow.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {[
                { title: "Retail Pharmacies", sub: "Medicine expiry & units" },
                { title: "Clinics & Dispensaries", sub: "Doctor & patient khata" },
                { title: "Cosmetics & Care", sub: "Barcode billing & brands" },
                { title: "General Supermarts", sub: "Fast cashier counters" },
                { title: "Wholesale Dealers", sub: "Bulk cartons & ledgers" },
              ].map((ind, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1">
                  <p className="font-bold text-xs text-white">{ind.title}</p>
                  <p className="text-[11px] text-stone-300">{ind.sub}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 pt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/plan"
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Get Started for Rs. 3,000 / month
              </Link>
              <a
                href="https://wa.me/923263392082?text=Assalam-o-Alaikum!%20I%20want%20to%20know%20if%20AR%20Group%20POS%20is%20suitable%20for%20my%20business."
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                <span>Discuss Your Shop Needs (0326 3392082)</span>
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ─── WHATSAPP AGENT & FOOTER ─── */}
      <WhatsAppFloatingAgent phoneNumber="03263392082" />
      <PublicFooter />

    </div>
  );
}
