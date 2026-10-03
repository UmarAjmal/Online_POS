"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Loader2, LayoutDashboard, Store, Calendar, Settings, ArrowRight, Sliders, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function verifyAdminAuth() {
      setAuthLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === "superadmin@hisabx.com") {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    }
    verifyAdminAuth();
  }, []);

  const navLinks = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Businesses", path: "/admin/shops", icon: Store },
    { name: "Registrations", path: "/admin/users", icon: Users },
    { name: "Subscriptions", path: "/admin/subscriptions", icon: Calendar },
    { name: "Manage Plans", path: "/admin/plans", icon: Sliders },
    { name: "Payment Gateways", path: "/admin/gateways", icon: Settings },
  ];

  if (authLoading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col justify-center items-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-650 mb-3" />
        <p className="font-semibold text-sm">Verifying system administration credentials...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center p-6 bg-slate-50 select-none">
        <ShieldCheck size={60} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          This workspace is reserved for SaaS System Super Administrators. You do not have permissions to access this control center.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-screen bg-slate-50/50 overflow-hidden select-none">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600 h-7 w-7" /> SaaS Super Admin Control Portal
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Global system panel for subscription billing, payment gateways, active shops, and module feature toggles.
          </p>
        </div>

        <Link href="/dashboard">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md flex items-center gap-1.5 shrink-0">
            Exit to Shop Dashboard <ArrowRight size={14} />
          </Button>
        </Link>
      </div>

      {/* Sub-Navigation Navbar */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs w-fit shrink-0">
        {navLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/40" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <link.icon size={14} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Content workspace viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-white border border-slate-200/60 shadow-sm rounded-3xl p-6">
        {children}
      </div>
    </div>
  );
}
