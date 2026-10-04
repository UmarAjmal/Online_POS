"use client";

import React, { useState } from "react";
import { MessageCircle, X, Send, Phone, CheckCircle2, Sparkles, MessageSquare } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface WhatsAppFloatingAgentProps {
  phoneNumber?: string; // Default: 03263392082 -> 923263392082
}

export function WhatsAppFloatingAgent({ phoneNumber = "03263392082" }: WhatsAppFloatingAgentProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Clean phone number for WhatsApp wa.me API
  const formattedPhone = phoneNumber.replace(/[^0-9]/g, "");
  const cleanPhone = formattedPhone.startsWith("0")
    ? `92${formattedPhone.slice(1)}`
    : formattedPhone.startsWith("92")
    ? formattedPhone
    : `92${formattedPhone}`;

  const openWhatsApp = (msg: string) => {
    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    openWhatsApp(customMessage.trim());
    setCustomMessage("");
    setIsOpen(false);
  };

  const quickPrompts = [
    {
      label: "Subscribe to Monthly Plan (Rs. 3,000/mo)",
      text: "Assalam-o-Alaikum! I am interested in subscribing to the AR Group Pharmacy POS monthly plan (Rs. 3,000/month). Please guide me on activation.",
      badge: "Rs. 3,000/mo",
    },
    {
      label: "Schedule Live Demo & Product Info",
      text: "Assalam-o-Alaikum! I want to see a live demo and learn more about the AR Group Pharmacy & Retail POS system.",
      badge: "Free Demo",
    },
    {
      label: "General Question / Technical Support",
      text: "Assalam-o-Alaikum! I have a question regarding the pharmacy POS system installation and setup.",
      badge: "Support",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ─── POPUP CHAT CARD ─── */}
      {isOpen && (
        <div className="mb-3 w-[92vw] max-w-[360px] bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Card Header */}
          <div
            className="p-4 text-white relative flex items-center justify-between"
            style={{
              backgroundColor: theme.sidebarBg || "#1b2d19",
              backgroundImage: `linear-gradient(135deg, ${theme.sidebarBg || "#1b2d19"} 0%, ${theme.primaryColor || "#16a34a"} 100%)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#25D366]">
                  <MessageCircle className="w-6 h-6 fill-current" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Falcon Swift Support
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h4>
                <p className="text-[11px] text-white/80 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online • Typically replies in 5 min
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
              aria-label="Close WhatsApp chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3.5 bg-[#fcfcfb]">
            {/* Incoming message simulation */}
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm border border-stone-200/80 shadow-xs space-y-1.5">
              <p className="text-xs font-semibold text-stone-900">
                Assalam-o-Alaikum! 👋
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                Welcome to <strong>Falcon Swift PVT. LTD.</strong> (AR Group POS). How can we help you today with your pharmacy or retail shop?
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400">
                <span>Official Customer Care</span>
                <span>{phoneNumber}</span>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-1">
                Quick Options
              </p>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => openWhatsApp(prompt.text)}
                  className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/70 border border-stone-200/70 hover:border-emerald-300 transition-all text-xs font-medium text-stone-800 flex items-center justify-between group cursor-pointer shadow-2xs"
                >
                  <span className="truncate pr-2">{prompt.label}</span>
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-stone-100 text-stone-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {prompt.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Direct phone call button */}
            <div className="pt-1 flex items-center justify-between text-xs px-1">
              <a
                href={`tel:${phoneNumber}`}
                className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Call: {phoneNumber}</span>
              </a>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified Agent
              </span>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCustomSend} className="relative pt-1">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-emerald-500 shadow-2xs text-stone-800 placeholder:text-stone-400"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-2.5 p-1.5 rounded-lg text-white transition-all shadow-xs cursor-pointer"
                style={{ backgroundColor: "#25D366" }}
                title="Send on WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── FLOATING TOGGLE BUTTON ─── */}
      <div className="flex items-center gap-3">
        {/* Subtle tooltip when closed */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-stone-200 text-xs font-semibold text-stone-800 animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Chat on WhatsApp</span>
            <span className="text-[11px] text-stone-400">({phoneNumber})</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Contact on WhatsApp"
          className="relative group p-3.5 sm:p-4 rounded-full text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: "#25D366",
            boxShadow: "0 10px 25px -5px rgba(37, 211, 102, 0.4), 0 8px 10px -6px rgba(37, 211, 102, 0.3)",
          }}
        >
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 group-hover:opacity-50 animate-ping pointer-events-none" />

          {isOpen ? (
            <X className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
          ) : (
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 fill-current relative z-10" />
          )}

          {/* Badge indicator */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              1
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
