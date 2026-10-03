"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTheme, THEME_PRESETS, ColorTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Palette, Check, RotateCcw, Save, Sparkles,
  Layers, Sliders, Eye, ArrowLeft, CheckCircle2,
  Copy, Download, Upload, CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ColorSettingsPage() {
  const { theme, presetKey, updateTheme, applyPreset, resetDefault, saveThemeToDb } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleColorChange = (key: keyof ColorTheme, value: string) => {
    updateTheme({ [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveThemeToDb();
    setSaving(false);
    if (success) {
      toast.success(isUrdu ? "کلر تھیم کامیابی سے محفوظ ہو گئی!" : "Theme colors saved and applied successfully!");
    } else {
      toast.info(isUrdu ? "تھیم مقامی طور پر لاگو ہو گئی ہے" : "Theme applied locally in browser!");
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
    setCopied(true);
    toast.success(isUrdu ? "تھیم کوڈ کاپی ہو گیا!" : "Theme JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportJson = () => {
    const raw = prompt(
      isUrdu
        ? "تھیم JSON کوڈ یہاں پیسٹ کریں:"
        : "Paste your Theme JSON configuration:"
    );
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.sidebarBg && parsed.primaryColor) {
        updateTheme(parsed);
        toast.success(isUrdu ? "تھیم کامیابی سے امپورٹ ہو گئی!" : "Theme imported successfully!");
      } else {
        toast.error("Invalid theme format");
      }
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16 animate-in fade-in duration-300">
      {/* Top Header Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-800">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              {isUrdu ? "کلر پیلیٹ اور تھیم کسٹمائزر" : "Color Palette & Dynamic Theme Studio"}
            </h2>
            <p className="text-xs text-slate-500">
              {isUrdu
                ? "سائیڈ بار، بٹنز اور ایکٹیو لنکس کے رنگ اپنی پسند کے مطابق ایڈجسٹ کریں"
                : "Customize sidebar background, button colors, and accent highlights in real-time"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={resetDefault}
            variant="ghost"
            className="text-slate-500 hover:text-slate-700 h-9 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {isUrdu ? "ڈیفالٹ بحال کریں" : "Reset Default"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="text-white h-9 text-xs shadow-xs font-semibold px-4 cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isUrdu ? "تھیم محفوظ کریں" : "Save & Apply Theme"}
          </Button>
        </div>
      </div>

      {/* Preset Themes Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              {isUrdu ? "ریڈی میڈ ڈیزائنر تھیمز (1-کلک اپلائی)" : "Curated Designer Theme Presets"}
            </h3>
          </div>
          <span className="text-xs text-slate-400">Click any card to apply</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Object.entries(THEME_PRESETS).map(([key, p]) => {
            const isSelected = presetKey === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`relative flex flex-col text-left p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isSelected
                    ? "border-slate-800 bg-slate-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-xs font-bold text-slate-800 truncate pr-2">
                    {p.presetName.split("(")[0]}
                  </span>
                  {isSelected && (
                    <span className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </span>
                  )}
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="h-8 flex-1 rounded-lg shadow-inner border border-black/10 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.sidebarBg }}
                    title="Sidebar"
                  >
                    Sidebar
                  </div>
                  <div
                    className="h-8 flex-1 rounded-lg shadow-inner border border-black/10 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.primaryColor }}
                    title="Buttons"
                  >
                    Button
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg shadow-inner border border-black/10 flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: p.badgeBg, color: p.badgeText }}
                    title="Badge"
                  >
                    Tag
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Custom Color Pickers */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  {isUrdu ? "اپنی مرضی کے رنگ منتخب کریں" : "Custom Color Pickers"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-md"
                >
                  {copied ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Export"}</span>
                </button>
                <button
                  onClick={handleImportJson}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-md"
                >
                  <Upload size={13} />
                  <span>Import</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sidebar Background */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUrdu ? "سائیڈ بار کا پس منظر (Sidebar Background)" : "Sidebar Background Color"}
                  </p>
                  <p className="text-[11px] text-slate-500">Main background of the left navigation rail</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.sidebarBg}
                    onChange={(e) => handleColorChange("sidebarBg", e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={theme.sidebarBg}
                    onChange={(e) => handleColorChange("sidebarBg", e.target.value)}
                    className="w-24 h-9 text-xs font-mono font-semibold uppercase bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Sidebar Active Item */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUrdu ? "ایکٹیو مینیو کا رنگ (Sidebar Active Tab)" : "Sidebar Active Item Highlight"}
                  </p>
                  <p className="text-[11px] text-slate-500">Color of current page button in sidebar</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.sidebarActive}
                    onChange={(e) => handleColorChange("sidebarActive", e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={theme.sidebarActive}
                    onChange={(e) => handleColorChange("sidebarActive", e.target.value)}
                    className="w-24 h-9 text-xs font-mono font-semibold uppercase bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Primary / Button Color */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUrdu ? "مین بٹن کا رنگ (Primary Buttons)" : "Primary Action Buttons Color"}
                  </p>
                  <p className="text-[11px] text-slate-500">Save, POS checkout, and action buttons</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={theme.primaryColor}
                    onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                    className="w-24 h-9 text-xs font-mono font-semibold uppercase bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Primary Button Hover */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUrdu ? "بٹن ہوور کا رنگ (Button Hover Color)" : "Primary Button Hover State"}
                  </p>
                  <p className="text-[11px] text-slate-500">Darker/lighter shade when hovering buttons</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.primaryHover}
                    onChange={(e) => handleColorChange("primaryHover", e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={theme.primaryHover}
                    onChange={(e) => handleColorChange("primaryHover", e.target.value)}
                    className="w-24 h-9 text-xs font-mono font-semibold uppercase bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Header Accent */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUrdu ? "ہیڈر ایکسنٹ (Header Accent)" : "Top Header Accent & Badge"}
                  </p>
                  <p className="text-[11px] text-slate-500">Top bar active accents and icons</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.headerAccent}
                    onChange={(e) => handleColorChange("headerAccent", e.target.value)}
                    className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <Input
                    value={theme.headerAccent}
                    onChange={(e) => handleColorChange("headerAccent", e.target.value)}
                    className="w-24 h-9 text-xs font-mono font-semibold uppercase bg-white border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Live Interactive Component Studio */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {isUrdu ? "لائیو کمپوننٹ پریویو" : "Live UI Component Preview"}
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Real-time
              </span>
            </div>

            {/* Simulated Desktop App Mockup */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
              {/* Simulated Window Top Bar */}
              <div className="h-6 bg-slate-200/80 px-3 flex items-center gap-1.5 border-b border-slate-300/50">
                <div className="h-2 w-2 rounded-full bg-red-400"></div>
                <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                <span className="text-[9px] font-mono text-slate-500 ml-2">Pharmacy OS - Live Theme</span>
              </div>

              <div className="flex h-64">
                {/* Mini Sidebar */}
                <div
                  className="w-28 p-2 flex flex-col justify-between shrink-0 transition-colors duration-200 select-none"
                  style={{ backgroundColor: theme.sidebarBg, color: theme.sidebarText }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
                      <div className="h-4 w-4 rounded bg-white/20"></div>
                      <span className="text-[10px] font-bold truncate">Falcon Swift PVT. LTD.</span>
                    </div>

                    <div className="space-y-1 text-[9px]">
                      <div
                        className="px-2 py-1 rounded-md font-semibold flex items-center gap-1 shadow-xs"
                        style={{ backgroundColor: theme.sidebarActive, color: "#ffffff" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                        <span>POS Desk</span>
                      </div>
                      <div className="px-2 py-1 rounded-md opacity-70 hover:opacity-100 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40"></span>
                        <span>Products</span>
                      </div>
                      <div className="px-2 py-1 rounded-md opacity-70 hover:opacity-100 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40"></span>
                        <span>Sales</span>
                      </div>
                      <div className="px-2 py-1 rounded-md opacity-70 hover:opacity-100 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40"></span>
                        <span>Reports</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-[8px] opacity-60">
                    Admin Active
                  </div>
                </div>

                {/* Mini Main Content Body (Base color stays clean white) */}
                <div className="flex-1 bg-white p-3 flex flex-col justify-between overflow-hidden">
                  {/* Top Bar inside mockup */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      <span
                        className="h-4 w-4 rounded flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ backgroundColor: theme.headerAccent }}
                      >
                        ✓
                      </span>
                      <span className="text-[10px] font-bold text-slate-800">Billing POS</span>
                    </div>
                    <div className="h-4 w-16 bg-slate-100 rounded border border-slate-200"></div>
                  </div>

                  {/* Sample Card & Buttons */}
                  <div className="space-y-2 py-2">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-700">Augmentin 625mg</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                        >
                          In Stock
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400">Batch: B-9022 • Exp: 12/2026</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        className="text-[10px] text-white px-2.5 py-1 rounded-md font-semibold shadow-xs flex-1 transition-colors"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        + Add Item
                      </button>
                      <button className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md font-medium border border-slate-200">
                        Print
                      </button>
                    </div>
                  </div>

                  <p className="text-[8px] text-slate-400 text-center">
                    Base page background stays pure white for clarity.
                  </p>
                </div>
              </div>
            </div>

            {/* Save notice */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                {isUrdu
                  ? "تھیم منتخب ہوتے ہی فورا سائیڈ بار اور بٹنز پر لاگو ہو جاتی ہے۔"
                  : "Changes update in real-time across all dashboard components."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
