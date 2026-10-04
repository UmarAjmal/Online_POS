"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X, MessageCircle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface PublicNavbarProps {
  phoneNumber?: string;
}

export function PublicNavbar({ phoneNumber = "03263392082" }: PublicNavbarProps) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Product & Modules", href: "/product" },
    { label: "Pricing & Plans", href: "/plan" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-stone-200/70 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        
        {/* ─── BRAND LOGO & TITLE ─── */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 bg-white shadow-xs border border-stone-200/80 group-hover:scale-105 transition-transform">
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
        </Link>

        {/* ─── DESKTOP NAVIGATION ─── */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center cursor-pointer ${
                  isActive
                    ? "text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950 hover:bg-stone-100/80"
                }`}
                style={
                  isActive
                    ? { backgroundColor: theme.primaryColor || "#16a34a" }
                    : undefined
                }
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ─── DESKTOP ACTIONS ─── */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-all border border-stone-200 shadow-2xs cursor-pointer"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:opacity-95 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          >
            <span>Sign Up</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* ─── MOBILE HAMBURGER BUTTON ─── */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 border border-stone-200 shadow-2xs"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          >
            Sign Up
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* ─── MOBILE DRAWER MENU ─── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "text-white font-bold"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
                style={
                  isActive
                    ? { backgroundColor: theme.primaryColor || "#16a34a" }
                    : undefined
                }
              >
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 p-3 rounded-xl text-white font-bold text-xs shadow-xs"
              style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
            >
              <span>Create Business Account (Sign Up)</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
