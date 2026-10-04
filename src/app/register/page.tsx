"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Sparkles,
  Loader2,
  Languages,
  ShieldCheck,
  Store,
  Palette,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme, THEME_PRESETS } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { sqliteClient } from "@/lib/sqliteClient";
import { NATechHubBadge } from "@/components/NATechHubBadge";

export default function RegisterPage() {
  const router = useRouter();
  const { theme, applyPreset } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isUrdu = language === "ur";

  // Step state (1: Personal Account, 2: Business Setup)
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Personal info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Business info
  const [businessName, setBusinessName] = useState("");
  const [industryType, setIndustryType] = useState("retail");
  const [businessPhone, setBusinessPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [footerNote, setFooterNote] = useState("Thank you for shopping with us! Please visit again.");
  const [selectedThemePreset, setSelectedThemePreset] = useState("emerald");

  // Step 1 Validation
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error(isUrdu ? "براہ کرم اپنا پورا نام درج کریں" : "Please enter your full name.");
      return;
    }
    if (!phone.trim()) {
      toast.error(isUrdu ? "براہ کرم اپنا رابطہ نمبر درج کریں" : "Please enter your phone number.");
      return;
    }
    if (!email.trim()) {
      toast.error(isUrdu ? "براہ کرم ای میل یا یوزر نیم درج کریں" : "Please enter your email or username.");
      return;
    }
    if (password.length < 4) {
      toast.error(isUrdu ? "پاس ورڈ کم از کم 4 حروف پر مشتمل ہونا چاہیے" : "Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isUrdu ? "پاس ورڈز مطابقت نہیں رکھتے" : "Passwords do not match.");
      return;
    }

    setStep(2);
  };

  // Step 2 Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) {
      toast.error(isUrdu ? "کاروبار یا دکان کا نام درج کریں" : "Please enter your business or shop name.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await sqliteClient.auth.signUp({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        industryType,
        businessPhone: businessPhone.trim() || phone.trim(),
        address: address.trim(),
        footerNote: footerNote.trim(),
        currency: currency.trim() || "PKR",
        themePreset: selectedThemePreset,
      });

      if (error) {
        toast.error(isUrdu ? "رجسٹریشن میں خرابی" : "Registration Failed", {
          description: error.message || "Could not create account.",
        });
        return;
      }

      toast.success(
        isUrdu ? "اکاؤنٹ کامیابی سے بن گیا!" : "Account Created Successfully!",
        {
          description: isUrdu
            ? `آپ کی دکان "${businessName}" اب تیار ہے۔ براہ کرم لاگ ان کریں۔`
            : `Your business "${businessName}" is ready. Please sign in to activate.`,
        }
      );

      // Redirect to login with prefilled username and flag for first time welcome
      router.push(`/login?registered=true&new_user=true&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      toast.error("Registration error", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    { id: "retail", name: isUrdu ? "جنرل ریٹیل / مارٹ" : "General Retail & Mart" },
    { id: "supermart", name: isUrdu ? "سپر اسٹور / ڈیپارٹمنٹل" : "Superstore / Grocery" },
    { id: "pharmacy", name: isUrdu ? "فارمیسی و میڈیکل اسٹور" : "Pharmacy & Medical Store" },
    { id: "wholesale", name: isUrdu ? "ہول سیل ڈسٹری بیوشن" : "Wholesale & Distribution" },
    { id: "cosmetics", name: isUrdu ? "کاسمیٹکس و جنرل اسٹور" : "Cosmetics & Care" },
  ];

  const presets = [
    { key: "emerald", label: "Emerald Green", color: "#16a34a" },
    { key: "navy", label: "Corporate Navy", color: "#2563eb" },
    { key: "indigo", label: "Royal Indigo", color: "#6366f1" },
    { key: "teal", label: "Ocean Teal", color: "#0d9488" },
    { key: "amber", label: "Warm Amber", color: "#d97706" },
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

      {/* ─── TOP NAVBAR ─── */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-12 z-20 relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-950 transition-colors px-3 py-1.5 rounded-xl hover:bg-stone-200/60 border border-transparent hover:border-stone-300/80 active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{isUrdu ? "ہوم پیج پر جائیں" : "Back to Home"}</span>
        </Link>

        {/* Language switch */}
        <button
          type="button"
          onClick={() => setLanguage(isUrdu ? "en" : "ur")}
          className="px-3 py-1.5 rounded-xl border border-stone-300/90 bg-white text-stone-800 text-xs font-bold hover:bg-stone-100 hover:border-stone-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <Languages size={14} style={{ color: theme.primaryColor || "#16a34a" }} />
          <span>{isUrdu ? "English" : "اردو"}</span>
        </button>
      </header>

      {/* ─── MAIN SIGNUP CARD ─── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 z-10 relative">
        <div className="w-full max-w-[540px] bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Top Dynamic Accent Line */}
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          />

          {/* Stepper Header */}
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {isUrdu ? "نیا بزنس اکاؤنٹ بنائیں" : "Create Business Account"}
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {step === 1
                ? (isUrdu ? "مرحلہ ۱: اپنے ذاتی لاگ ان اور رابطے کی تفصیلات درج کریں" : "Step 1 of 2: Enter your owner account credentials")
                : (isUrdu ? "مرحلہ ۲: اپنی دکان یا کاروبار کی تفصیلات اور برانڈنگ سیٹ کریں" : "Step 2 of 2: Setup your business profile and receipt settings")}
            </p>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors ${
                    step >= 1 ? "shadow-xs" : "opacity-40"
                  }`}
                  style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                >
                  1
                </span>
                <span className="text-xs font-semibold text-stone-800">
                  {isUrdu ? "ذاتی اکاؤنٹ" : "Account Info"}
                </span>
              </div>
              <div className="w-8 h-0.5 bg-stone-200" />
              <div className="flex items-center gap-2">
                <span 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === 2 
                      ? "text-white shadow-xs" 
                      : "bg-stone-200 text-stone-500"
                  }`}
                  style={step === 2 ? { backgroundColor: theme.primaryColor || "#16a34a" } : undefined}
                >
                  2
                </span>
                <span className={`text-xs font-semibold ${step === 2 ? "text-stone-800" : "text-stone-400"}`}>
                  {isUrdu ? "بزنس پروفائل" : "Business Details"}
                </span>
              </div>
            </div>
          </div>

          {/* ─── STEP 1: PERSONAL ACCOUNT INFO ─── */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in duration-200">
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <User size={14} className="text-stone-400" />
                  <span>{isUrdu ? "پورا نام (Full Name)" : "Full Name"} *</span>
                </Label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isUrdu ? "مثلاً محمد عمر" : "e.g. Muhammad Umar"}
                  className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Phone size={14} className="text-stone-400" />
                    <span>{isUrdu ? "رابطہ نمبر (Phone)" : "Phone Number"} *</span>
                  </Label>
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0326 1234567"
                    className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Mail size={14} className="text-stone-400" />
                    <span>{isUrdu ? "ای میل / یوزر نیم" : "Email / Username"} *</span>
                  </Label>
                  <Input
                    required
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Lock size={14} className="text-stone-400" />
                    <span>{isUrdu ? "پاس ورڈ (Password)" : "Password"} *</span>
                  </Label>
                  <div className="relative">
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs pr-9 bg-stone-50/70 border-stone-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-stone-400" />
                    <span>{isUrdu ? "پاس ورڈ کی تصدیق" : "Confirm Password"} *</span>
                  </Label>
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Submit Step 1 Button */}
              <Button
                type="submit"
                className="w-full h-11 mt-4 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
              >
                <span>{isUrdu ? "اگلا مرحلہ: بزنس سیٹ اپ" : "Next: Business Setup"}</span>
                <ArrowRight size={14} />
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-stone-500">
                  {isUrdu ? "پہلے سے اکاؤنٹ موجود ہے؟" : "Already have an account?"}{" "}
                  <Link
                    href="/login"
                    className="font-bold underline underline-offset-2 hover:text-stone-900"
                    style={{ color: theme.primaryColor || "#16a34a" }}
                  >
                    {isUrdu ? "لاگ ان کریں" : "Sign In"}
                  </Link>
                </p>
              </div>

            </form>
          )}

          {/* ─── STEP 2: BUSINESS DETAILS & BRANDING ─── */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-200">
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-stone-400" />
                  <span>{isUrdu ? "دکان / کاروبار کا نام (Business Name)" : "Business / Shop Name"} *</span>
                </Label>
                <Input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={isUrdu ? "مثلاً المدینہ مارٹ / رحمانی فارمیسی" : "e.g. Al-Madina Supermart & Pharmacy"}
                  className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Store size={14} className="text-stone-400" />
                    <span>{isUrdu ? "کاروبار کی قسم (Industry Type)" : "Business Category"}</span>
                  </Label>
                  <select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-stone-50/70 border border-stone-200 rounded-xl text-stone-800 focus:outline-hidden"
                  >
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Phone size={14} className="text-stone-400" />
                    <span>{isUrdu ? "دکان کا فون نمبر" : "Shop Phone"}</span>
                  </Label>
                  <Input
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder={phone || "0326 1234567"}
                    className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-stone-400" />
                  <span>{isUrdu ? "پتہ / شہر (Address & City)" : "Address & City"}</span>
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isUrdu ? "مثلاً مین بازار، خانیوال روڈ" : "e.g. Main Market, Commercial Area"}
                  className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-stone-400" />
                  <span>{isUrdu ? "رسید پر فوٹر نوٹ (Receipt Note)" : "Receipt Footer Note"}</span>
                </Label>
                <Input
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  placeholder="Thank you for shopping with us!"
                  className="h-10 text-xs bg-stone-50/70 border-stone-200 rounded-xl"
                />
              </div>

              {/* Theme Color Selection */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Palette size={14} className="text-stone-400" />
                  <span>{isUrdu ? "سافٹ ویئر کا رنگ منتخب کریں (Theme Preset)" : "Software Color Theme"}</span>
                </Label>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {presets.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setSelectedThemePreset(p.key);
                        applyPreset(p.key);
                      }}
                      className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        selectedThemePreset === p.key
                          ? "border-stone-900 ring-2 ring-stone-900 shadow-xs"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.label}
                    >
                      {selectedThemePreset === p.key && (
                        <CheckCircle2 size={16} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back and Submit Actions */}
              <div className="flex items-center gap-3 pt-3">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  <ArrowLeft size={14} className="mr-1" />
                  <span>{isUrdu ? "پیچھے" : "Back"}</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isUrdu ? "اکاؤنٹ بن رہا ہے..." : "Creating Account..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{isUrdu ? "اکاؤنٹ مکمل کریں 🎉" : "Complete Registration 🎉"}</span>
                    </>
                  )}
                </Button>
              </div>

            </form>
          )}

        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="px-6 py-4 sm:px-12 text-center z-20 relative space-y-1">
        <NATechHubBadge variant="footer" />
      </footer>

    </div>
  );
}
