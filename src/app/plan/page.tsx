"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Phone,
  HelpCircle,
  Zap,
  Clock,
  Laptop,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { WhatsAppFloatingAgent } from "@/components/WhatsAppFloatingAgent";
import { useTheme } from "@/context/ThemeContext";

export default function PlanPage() {
  const { theme } = useTheme();

  const planFeatures = [
    "Full Access to All 8+ Core Business & Pharmacy Modules",
    "100% Offline SQLite Architecture (Zero Internet Required)",
    "Unlimited Products, Barcodes, Medicines & Batches",
    "Unlimited Sales Invoices & Customer Transactions",
    "Color-Coded Batch & Medicine Expiry Date Alerts",
    "Multi-Pack Unit Conversions (Box ⇄ Strip ⇄ Tablet)",
    "Customer & Supplier Khata with 1-Click WhatsApp Statements",
    "Daily Shift Management & Cash Drawer Reconciliation",
    "Purchase Inward, Vendor Receiving & Delivery Challans",
    "12+ Financial & Audit Reports with PDF/Excel Export",
    "Multi-User Cashier Roles & Security Permissions",
    "1-Click Offline Database Backup to USB / Local Drive",
    "Free System Updates, Patches & New Features",
    "Priority WhatsApp & Remote Support (0326 3392082)",
    "Free Initial Staff Training & Onboarding Assistance",
  ];

  const faqs = [
    {
      q: "Does this software work without the internet?",
      a: "Yes, 100%! The system is powered by an offline SQLite database running directly on your computer or local network. You can bill, print receipts, and check inventory with zero internet connection.",
    },
    {
      q: "How does the Rs. 3,000 monthly subscription work?",
      a: "It is a straightforward monthly subscription. There are no surprise hidden charges or costly setup fees. You pay Rs. 3,000 each month to receive full software access, active customer support, and automatic updates.",
    },
    {
      q: "How can I pay the Rs. 3,000 monthly fee?",
      a: "We support convenient Pakistani payment methods including direct Bank Transfer, JazzCash, EasyPaisa, and company invoices.",
    },
    {
      q: "What hardware do I need to run this?",
      a: "Any standard Windows laptop or desktop PC (Windows 10/11) with at least 4GB RAM. It connects seamlessly to any standard USB barcode scanner and 58mm/80mm thermal receipt printer.",
    },
    {
      q: "How quickly can my shop be activated?",
      a: "Within 15 to 30 minutes! Contact us on WhatsApp (03263392082), and our technical team will remotely set up the system and train your cashiers.",
    },
  ];

  const subscribeMessage = encodeURIComponent(
    "Assalam-o-Alaikum! I want to activate the Rs. 3,000/month subscription for AR Group Pharmacy POS. Please share the payment and activation process."
  );

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
        
        {/* ─── HEADER ─── */}
        <section className="px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transparent & Affordable Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Simple, honest pricing for your pharmacy.{" "}
            <span 
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.primaryColor || "#16a34a"} 0%, #047857 100%)`,
              }}
            >
              No hidden fees.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Get complete access to all pharmacy & retail POS modules, offline database reliability, and dedicated support for one flat monthly price.
          </p>
        </section>

        {/* ─── PRICING CARD ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
          <div className="relative bg-white rounded-3xl sm:rounded-4xl border-2 border-emerald-500/40 shadow-2xl p-6 sm:p-10 lg:p-12 overflow-hidden">
            
            {/* Top Badge */}
            <div 
              className="absolute top-0 right-0 sm:right-10 px-6 py-2 rounded-b-2xl text-white text-xs font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1.5"
              style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal Pharmacy & Retail Pro</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mt-4 sm:mt-2">
              
              {/* Left Column: Price & Action */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-emerald-700 font-extrabold block">
                    Monthly Plan • ماہانہ پیکج
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl sm:text-3xl font-bold text-stone-600">Rs.</span>
                    <span className="text-5xl sm:text-6xl font-black text-stone-900 tracking-tight">
                      3,000
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-stone-500">
                      / month
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-2 font-medium">
                    Billed monthly • PKR 3,000 per shop • Cancel or pause anytime
                  </p>
                </div>

                {/* Primary CTA Button */}
                <div className="space-y-3 pt-2">
                  <a
                    href={`https://wa.me/923263392082?text=${subscribeMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer text-center"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Subscribe via WhatsApp (0326 3392082)</span>
                  </a>

                  <p className="text-[11px] text-stone-500 text-center flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Activation takes less than 15 minutes</span>
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-stone-700 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% Offline SQLite — Never locked out</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-700 font-medium">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your data stays on your PC exclusively</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-700 font-medium">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct Technical Support: 0326 3392082</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                    Accepted Payment Channels
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-700">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">Bank Transfer (All Banks)</span>
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">JazzCash</span>
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">EasyPaisa</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Full Feature Inclusions */}
              <div className="lg:col-span-7 space-y-4 lg:border-l lg:border-stone-200 lg:pl-8">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 tracking-tight">
                    Everything Included in Rs. 3,000 / month:
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    No tier restrictions or paid module add-ons. You get the complete software suite.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {planFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-xs font-medium text-stone-700 leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Urdu Note */}
                <div 
                  className="mt-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-right font-['Noto_Nastaliq_Urdu',sans-serif] space-y-1"
                  dir="rtl"
                >
                  <p className="text-xs font-bold text-emerald-950">
                    صرف ۳,۰۰۰ روپے ماہانہ میں مکمل فارمیسی سافٹ ویئر حاصل کریں!
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-loose">
                    تمام ماڈیولز، آف لائن اسپیڈ، بلنگ، کسٹمر کھاتہ، ایکسپائری الرٹس اور فوری واٹس ایپ سپورٹ شامل ہے۔
                  </p>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ─── 3 STEPS TO GET STARTED ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              No technical expertise needed. We handle the complete setup for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Contact on WhatsApp",
                desc: "Send a quick message to 03263392082. Our team answers your questions and initiates setup.",
                icon: MessageCircle,
              },
              {
                step: "02",
                title: "Remote Installation",
                desc: "We remotely connect via AnyDesk/TeamViewer to configure your pharmacy database in 15 minutes.",
                icon: Laptop,
              },
              {
                step: "03",
                title: "Start Billing & Tracking",
                desc: "Scan barcodes, print receipts, and manage your inventory with 100% offline security.",
                icon: Zap,
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs relative overflow-hidden space-y-3"
                >
                  <span className="text-4xl font-black text-stone-100 absolute top-4 right-4 pointer-events-none">
                    {s.step}
                  </span>
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base text-stone-900">{s.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── FAQ SECTION ─── */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Everything you need to know about the software and subscription.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2"
              >
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* Still have questions banner */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 text-center space-y-3 shadow-xs">
            <h4 className="font-bold text-sm text-stone-900">
              Have questions or need custom multi-branch setup?
            </h4>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              Our support team is available 7 days a week on WhatsApp and call.
            </p>
            <a
              href={`https://wa.me/923263392082?text=${encodeURIComponent("Assalam-o-Alaikum! I have a question regarding AR Group POS subscription.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Talk to Sales Agent (0326 3392082)</span>
            </a>
          </div>
        </section>

      </main>

      {/* ─── WHATSAPP AGENT & FOOTER ─── */}
      <WhatsAppFloatingAgent phoneNumber="03263392082" />
      <PublicFooter />

    </div>
  );
}
