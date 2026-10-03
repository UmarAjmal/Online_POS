"use client";

import React from "react";
import { ShieldAlert, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SubscriptionBlockerProps {
  featureName: string;
  requiredPlan: "Starter" | "Premium";
  description?: string;
}

export function SubscriptionBlocker({
  featureName,
  requiredPlan,
  description
}: SubscriptionBlockerProps) {
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const defaultDescription = isUrdu 
    ? "یہ جدید کاروباری فیچر فعال پلان کا تقاضا کرتا ہے۔ فوری رسائی کے لیے ابھی اپ گریڈ کریں۔"
    : "This advanced business feature requires an active paid plan. Upgrade now to unlock immediate access.";

  return (
    <div className="w-full min-h-[400px] flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-3xl border border-slate-200/80 shadow-md">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-100/50 animate-bounce-subtle">
          <ShieldAlert size={28} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-850 tracking-tight uppercase">
            {isUrdu ? "پلان اپ گریڈ درکار ہے" : "Upgrade Plan Required"}
          </h3>
          <p className="text-xs text-rose-650 font-black uppercase tracking-wider">
            {featureName} • {isUrdu ? "لاک شدہ فیچر" : "Locked Feature"}
          </p>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {description || defaultDescription}
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-[11px] font-bold text-slate-600 flex items-center gap-2 justify-center">
          <Sparkles size={14} className="text-amber-550 shrink-0" />
          <span>
            {isUrdu ? (
              <>آج ہی <strong className="text-slate-800">{requiredPlan} پلان</strong> پر منتقل ہو کر رسائی حاصل کریں۔</>
            ) : (
              <>Unlocked by migrating to the <strong className="text-slate-800">{requiredPlan} Plan</strong> today.</>
            )}
          </span>
        </div>

        <div className="pt-2">
          <p className="text-[11px] font-semibold text-slate-500">
            {isUrdu
              ? "اس فیچر کو فعال کروانے کے لیے ایڈمنسٹریٹر یا فالکن سوئفٹ سپورٹ سے رابطہ کریں۔"
              : "Contact your administrator or Falcon Swift PVT. LTD. support to enable this feature."}
          </p>
        </div>
      </div>
    </div>
  );
}
