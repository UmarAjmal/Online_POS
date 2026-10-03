"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { NATechHubBadge } from "@/components/NATechHubBadge";
import { useTheme } from "@/context/ThemeContext";

export default function HomePage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbfbfa] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
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

      {/* ─── TOP NAVBAR ─── */}
      <header className="px-6 py-5 sm:px-12 max-w-7xl mx-auto w-full flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 bg-white shadow-xs border border-stone-200/60">
            <Image
              src="/falcon.png"
              alt="Falcon Swift PVT. LTD."
              width={44}
              height={44}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight">
              Falcon Swift PVT. LTD.
            </h1>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:opacity-95 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
        >
          <span>Staff Login</span>
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* ─── HERO SECTION ─── */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 sm:py-12 max-w-6xl mx-auto w-full z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Text & Get Started Call-To-Action */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Smart Pharmacy & <br className="hidden sm:block" />
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
                Complete retail billing, medicine expiry tracker, multi-pack inventory, khata ledger, and accounts in one unified offline-ready software.
              </p>
            </div>

            {/* Prominent Get Started Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
              >
                <span>Get Started</span>
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

          </div>

          {/* Right Vector Illustration (pharmacy.jpg) */}
          <div className="lg:col-span-6 flex justify-center items-center">
            <div className="relative w-full max-w-md lg:max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-200/80 bg-white p-2 group hover:shadow-emerald-950/10 transition-all duration-500">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-teal-50/50">
                <Image
                  src="/pharmacy.jpg"
                  alt="Pharmacy Management Illustration"
                  fill
                  priority
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="px-6 py-5 sm:px-12 text-center z-20 relative border-t border-stone-200/60 bg-white/60 backdrop-blur-md">
        <NATechHubBadge variant="footer" />
      </footer>

    </div>
  );
}
