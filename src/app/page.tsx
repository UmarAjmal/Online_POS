"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ShoppingCart,
  Package,
  BookOpen,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { WhatsAppFloatingAgent } from "@/components/WhatsAppFloatingAgent";
import { useTheme } from "@/context/ThemeContext";

export default function HomePage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbfbfa] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* ─── SHARED NAVBAR ─── */}
      <PublicNavbar phoneNumber="03263392082" />

      {/* ─── AMBIENT GLOW EFFECTS ─── */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30 transition-colors duration-700"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, ${theme.primaryColor || "#16a34a"}15 0%, transparent 45%), radial-gradient(circle at 90% 80%, ${theme.sidebarBg || "#1b2d19"}15 0%, transparent 50%)`,
        }}
      />
      <div 
        className="fixed -top-40 -left-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20 animate-pulse"
        style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
      />
      <div 
        className="fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20 animate-pulse"
        style={{ backgroundColor: theme.sidebarBg || "#1b2d19" }}
      />

      <main className="flex-1 z-10 relative">
        
        {/* ─── HERO SECTION ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-16 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            
            {/* Left Text & Actions */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  Universal Point of Sale & <br className="hidden sm:block" />
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${theme.primaryColor || "#16a34a"} 0%, #047857 100%)`,
                    }}
                  >
                    Business Management
                  </span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Complete cashier billing, multi-pack inventory, customer khata ledgers, and accounts in one unified system. Built for retail marts, wholesale, superstores, pharmacies, and commercial shops.
                </p>
              </div>

              {/* Call-To-Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/plan"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                  style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                >
                  <span>Get Started (Rs. 3,000/mo)</span>
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/product"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-stone-800 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 font-bold text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Modules</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Fast & Secure POS Counter</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Bilingual Urdu & English</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Thermal Receipt Ready</span>
                </span>
              </div>

            </div>

            {/* Right Vector Illustration */}
            <div className="lg:col-span-6 flex justify-center items-center">
              <div className="relative w-full max-w-md lg:max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-200/80 bg-white p-2 group hover:shadow-emerald-950/10 transition-all duration-500">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-teal-50/50">
                  <Image
                    src="/pharmacy.jpg"
                    alt="POS Management Illustration"
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── QUICK PRODUCT MODULES TEASER ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                Product Architecture
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Designed for Speed, Accuracy & Control
              </h3>
            </div>
            <Link
              href="/product"
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 group cursor-pointer"
            >
              <span>View All 8+ Modules in Detail</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: ShoppingCart,
                title: "POS & Fast Billing",
                desc: "Sub-second barcode lookup, split payments, hold bills, and 80mm/58mm thermal receipts.",
              },
              {
                icon: Package,
                title: "Inventory & Expiry Tracker",
                desc: "Complete stock visibility, multi-pack units, and automated near-expiry alerts.",
              },
              {
                icon: BookOpen,
                title: "Digital Khata Ledgers",
                desc: "Customer & supplier accounts with 1-click WhatsApp balance statement sending.",
              },
              {
                icon: ShieldCheck,
                title: "Data Safety & Backups",
                desc: "Instant local backups to USB or drive. Your records remain private and secure.",
              },
            ].map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-md transition-shadow space-y-2.5"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-stone-900">{mod.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── MONTHLY PLAN TEASER BANNER (Rs. 3,000 / month) ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-6xl mx-auto">
          <div className="p-6 sm:p-10 rounded-3xl sm:rounded-4xl bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 text-white relative overflow-hidden shadow-2xl">
            
            {/* Background decorative glow */}
            <div 
              className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                  Universal Business & Retail Pro — Just{" "}
                  <span className="text-emerald-400">Rs. 3,000</span> / month
                </h3>

                <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                  Unlock all 8+ business modules, unlimited transactions, instant data backups, free automatic updates, and dedicated WhatsApp support. No setup fees, no lock-in.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-medium text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All Modules Included</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Fast Counter Speed</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Stock & Expiry Alerts</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Digital Khata Ledgers</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>12+ PDF Reports</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp Support</span>
                  </span>
                </div>
              </div>

              {/* Action Side */}
              <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center gap-3">
                <div className="text-center lg:text-right">
                  <div className="text-3xl sm:text-4xl font-black text-white">
                    Rs. 3,000 <span className="text-xs font-normal text-stone-400">/ mo</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Instant 15-Min Setup
                  </span>
                </div>

                <a
                  href={`https://wa.me/923263392082?text=${encodeURIComponent("Assalam-o-Alaikum! I want to activate the Rs. 3,000/month subscription for Falcon Swift POS.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Subscribe on WhatsApp</span>
                </a>

                <Link
                  href="/plan"
                  className="text-xs text-stone-300 hover:text-white font-semibold underline underline-offset-4 transition-colors"
                >
                  View full plan details & FAQs →
                </Link>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* ─── FLOATING WHATSAPP AGENT (03263392082) ─── */}
      <WhatsAppFloatingAgent phoneNumber="03263392082" />

      {/* ─── SHARED FOOTER ─── */}
      <PublicFooter />

    </div>
  );
}
