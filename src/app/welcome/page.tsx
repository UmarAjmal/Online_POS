"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Package,
  BookOpen,
  Settings,
  CheckCircle2,
  Store,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { NATechHubBadge } from "@/components/NATechHubBadge";

export default function WelcomePage() {
  const router = useRouter();
  const { shopId, shopName, userName, industryType, loading } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";
  const [mounted, setMounted] = useState(false);
  const [cachedUser, setCachedUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("argroup_user");
      if (saved) {
        setCachedUser(JSON.parse(saved));
      } else {
        // If not logged in, redirect to login page after brief moment
        const timer = setTimeout(() => {
          router.replace("/login");
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const activeShopId = shopId || cachedUser?.shop_id;
  const activeShopName = shopName || cachedUser?.shop_name || "My Business";
  const activeUserName = userName || cachedUser?.name || "Business Owner";
  const activeIndustry = industryType || cachedUser?.industry_type || "Retail POS";

  const handleLaunchDashboard = () => {
    if (typeof window !== "undefined" && activeShopId) {
      localStorage.setItem(`argroup_welcome_seen_${activeShopId}`, "true");
    }
    router.push("/dashboard");
  };

  // Only show loading spinner on initial client hydration if we don't have user yet
  if (!mounted && !activeShopId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const quickSteps = [
    {
      icon: ShoppingCart,
      title: isUrdu ? "فوری بارکوڈ بلنگ (POS)" : "Fast Cashier Billing (POS)",
      desc: isUrdu
        ? "بارکوڈ اسکینر کی مدد سے بجلی کی رفتار سے کسٹمر کے بل بنائیں اور رسید پرنٹ کریں۔"
        : "Sub-second barcode scanning, hold bills, and 80mm/58mm thermal receipt printing.",
      color: "#16a34a",
    },
    {
      icon: Package,
      title: isUrdu ? "پروڈکٹس اور اسٹاک انوینٹری" : "Products & Stock Inventory",
      desc: isUrdu
        ? "اپنی اشیاء، بیچ نمبر، قیمت خرید و فروخت اور ایکسپائری الرٹس درج کریں۔"
        : "Manage your inventory, batch numbers, selling prices, and reorder levels.",
      color: "#0d9488",
    },
    {
      icon: BookOpen,
      title: isUrdu ? "کسٹمر و سپلائر ڈیجیٹل کھاتہ" : "Customer & Supplier Khata",
      desc: isUrdu
        ? "ادھار و باقی کا مکمل کھاتہ رکھیں اور ایک کلک پر واٹس ایپ بل اسٹیٹمنٹ بھیجیں۔"
        : "Track customer balances, supplier ledgers, and share WhatsApp statements with 1-click.",
      color: "#2563eb",
    },
    {
      icon: Settings,
      title: isUrdu ? "رسید اور بزنس برانڈنگ" : "Receipt & Business Settings",
      desc: isUrdu
        ? "رسید پر اپنی دکان کا لوگو، نام، ہیڈر و فوٹر نوٹ اور پرنٹر سیٹ کریں۔"
        : "Personalize your invoice branding, receipt footer notes, and thermal printer setup.",
      color: "#d97706",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f8f7f5] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* ─── AMBIENT GLOW EFFECTS ─── */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 transition-colors duration-700"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, ${theme.primaryColor || "#16a34a"}18 0%, transparent 45%), radial-gradient(circle at 85% 80%, ${theme.sidebarBg || "#1b2d19"}15 0%, transparent 50%)`,
        }}
      />
      <div 
        className="fixed -top-40 -left-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-30 animate-pulse"
        style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
      />
      <div 
        className="fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20 animate-pulse"
        style={{ backgroundColor: theme.sidebarBg || "#1b2d19" }}
      />

      {/* ─── TOP BAR ─── */}
      <header className="px-6 py-5 sm:px-12 max-w-6xl mx-auto w-full flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          <span className="font-extrabold text-sm text-stone-900 tracking-tight">
            Falcon Swift POS
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 bg-white/80 px-3 py-1.5 rounded-xl border border-stone-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{activeUserName} • {activeShopName}</span>
        </div>
      </header>

      {/* ─── MAIN ONBOARDING CARD ─── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 z-10 relative">
        <div className="w-full max-w-3xl bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-3xl sm:rounded-4xl p-7 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
          
          {/* Top theme accent line */}
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          />

          {/* Celebratory Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isUrdu ? "مبارک ہو! آپ کا سیٹ اپ مکمل ہو گیا" : "Setup Complete • Welcome Aboard!"}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
              {isUrdu ? "خوش آمدید، " : "Welcome to Falcon Swift, "}
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${theme.primaryColor || "#16a34a"} 0%, #047857 100%)`,
                }}
              >
                {activeUserName}! 🎉
              </span>
            </h1>

            <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
              {isUrdu
                ? `آپ کا بزنس پروفائل "${activeShopName}" کامیابی سے ایکٹیویٹ ہو چکا ہے۔ اب آپ کا تمام ڈیٹا صرف آپ کے اکاؤنٹ کے ساتھ محفوظ رہے گا۔`
                : `Your business profile "${activeShopName}" is successfully configured and completely isolated to your account. Everything is ready for operation.`}
            </p>
          </div>

          {/* Business Summary Pill */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                {isUrdu ? "بزنس کا نام" : "Business Name"}
              </span>
              <span className="text-xs font-extrabold text-stone-900 truncate block mt-0.5">
                {activeShopName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                {isUrdu ? "کاروبار کی نوعیت" : "Category"}
              </span>
              <span className="text-xs font-extrabold text-stone-900 capitalize block mt-0.5">
                {activeIndustry}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                {isUrdu ? "کرنسی" : "Currency"}
              </span>
              <span className="text-xs font-extrabold text-stone-900 block mt-0.5">
                PKR (Rs.)
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                {isUrdu ? "سیکیورٹی اسٹیٹس" : "Data Isolation"}
              </span>
              <span className="text-xs font-extrabold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Protected</span>
              </span>
            </div>
          </div>

          {/* 4 Feature Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 text-center">
              {isUrdu ? "آپ کے اہم ترین فیچرز ایک نظر میں" : "Quick Start Overview"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {quickSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-stone-900">{step.title}</h4>
                      <p className="text-[11px] text-stone-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 text-center space-y-3">
            <Button
              onClick={handleLaunchDashboard}
              className="w-full sm:w-auto px-10 h-12 text-white font-bold text-sm rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
              style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
            >
              <span>{isUrdu ? "ڈیش بورڈ شروع کریں 🚀" : "Launch My Dashboard 🚀"}</span>
              <ArrowRight size={16} />
            </Button>

            <p className="text-[11px] text-stone-400">
              {isUrdu
                ? "آپ کسی بھی وقت سیٹنگز میں جا کر دکان کا نام اور رسید کی ترتیبات تبدیل کر سکتے ہیں۔"
                : "You can change business name, receipt headers, and logo anytime in Settings."}
            </p>
          </div>

        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="px-6 py-4 sm:px-12 text-center z-20 relative space-y-1">
        <NATechHubBadge variant="footer" />
      </footer>

    </div>
  );
}
