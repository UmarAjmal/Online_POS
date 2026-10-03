"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NATechHubBadge } from "@/components/NATechHubBadge";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowLeft, Eye, EyeOff, Loader2, Lock,
  User, Languages, ShieldCheck, Sparkles, CheckCircle2
} from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const { theme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isUrdu = language === "ur";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(isUrdu ? "براہ کرم یوزر نیم اور پاس ورڈ درج کریں" : "Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password.trim(),
      });

      if (error) {
        toast.error(isUrdu ? "لاگ ان ناکام ہو گیا" : "Login failed", { description: error.message });
        return;
      }

      const name = data?.user?.name || (isUrdu ? "سٹاف" : "Staff");
      toast.success(isUrdu ? `خوش آمدید، ${name}` : `Welcome back, ${name}!`);
      window.location.href = "/dashboard";
    } catch {
      toast.error(
        isUrdu ? "لاگ ان میں خرابی" : "Login failed",
        { description: isUrdu ? "سرور سے رابطہ نہ ہو سکا۔" : "Could not connect to server." }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    toast.info(isUrdu ? "لاگ ان معلومات درج کر دی گئیں" : "Demo credentials filled!");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f8f7f5] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* ─── AMBIENT BACKGROUND GLOW & MESH (DYNAMIC THEME LINKED) ─── */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 transition-colors duration-700"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, ${theme.primaryColor || "#16a34a"}18 0%, transparent 45%), radial-gradient(circle at 85% 80%, ${theme.sidebarBg || "#1b2d19"}15 0%, transparent 50%)`,
        }}
      />
      
      {/* Floating Animated Ambient Blobs */}
      <div 
        className="fixed -top-40 -left-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-30 animate-pulse"
        style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
      />
      <div 
        className="fixed -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20 animate-pulse"
        style={{ backgroundColor: theme.sidebarBg || "#1b2d19" }}
      />

      {/* Subtle Geometric Texture */}
      <div 
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 0, transparent 24px)",
        }}
      />

      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-12 z-20 relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-950 transition-colors px-3 py-1.5 rounded-xl hover:bg-stone-200/60 border border-transparent hover:border-stone-300/80 active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>{isUrdu ? "مین ویب سائٹ پر جائیں" : "Back to Website"}</span>
        </Link>

        {/* Language Switch Button */}
        <button
          type="button"
          onClick={() => setLanguage(isUrdu ? "en" : "ur")}
          className="px-3 py-1.5 rounded-xl border border-stone-300/90 bg-white text-stone-800 text-xs font-bold hover:bg-stone-100 hover:border-stone-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          title="Switch Language (تبدیل زبان)"
        >
          <Languages size={14} style={{ color: theme.primaryColor || "#16a34a" }} />
          <span>{isUrdu ? "English" : "اردو"}</span>
        </button>
      </header>

      {/* ─── MAIN CENTERED LOGIN CARD ─── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 z-10 relative">
        <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-emerald-950/5">
          
          {/* Top Dynamic Theme Accent Line */}
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          />

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-600">
              <ShieldCheck size={12} style={{ color: theme.primaryColor || "#16a34a" }} />
              <span>{isUrdu ? "سٹاف پورٹل لاگ ان" : "Staff Portal Access"}</span>
            </div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {isUrdu ? "اپنے اکاؤنٹ میں داخل ہوں" : "Sign in to your account"}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-bold text-stone-700">
                {isUrdu ? "یوزر نیم / ای میل" : "Username or Email"}
              </Label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200">
                  <User 
                    size={17} 
                    className={focusedField === "username" ? "text-stone-900" : "text-stone-400"}
                    style={focusedField === "username" ? { color: theme.primaryColor } : {}}
                  />
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder={isUrdu ? "اپنا یوزر نیم درج کریں" : "Enter username or email"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  className="h-11 pl-10 pr-4 bg-stone-50/70 hover:bg-white focus:bg-white border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all duration-200"
                  style={{
                    borderColor: focusedField === "username" ? (theme.primaryColor || "#16a34a") : undefined,
                    boxShadow: focusedField === "username" ? `0 0 0 3px ${theme.primaryColor || "#16a34a"}20` : undefined,
                  }}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-stone-700">
                  {isUrdu ? "پاس ورڈ" : "Password"}
                </Label>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200">
                  <Lock 
                    size={17} 
                    className={focusedField === "password" ? "text-stone-900" : "text-stone-400"}
                    style={focusedField === "password" ? { color: theme.primaryColor } : {}}
                  />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isUrdu ? "اپنا پاس ورڈ درج کریں" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="h-11 pl-10 pr-11 bg-stone-50/70 hover:bg-white focus:bg-white border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all duration-200"
                  style={{
                    borderColor: focusedField === "password" ? (theme.primaryColor || "#16a34a") : undefined,
                    boxShadow: focusedField === "password" ? `0 0 0 3px ${theme.primaryColor || "#16a34a"}20` : undefined,
                  }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Fill Demo Chip */}
            <div className="pt-0.5 flex items-center justify-between text-[11px] text-stone-500">
              <span className="font-semibold text-stone-600">
                {isUrdu ? "فوری لاگ ان ٹیسٹ:" : "Quick Fill:"}
              </span>
              <button
                type="button"
                onClick={() => handleQuickFill("admin", "admin")}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-mono text-[10px] font-bold border border-stone-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles size={11} className="text-amber-600" />
                admin / admin
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99]"
              style={{
                backgroundColor: theme.primaryColor || "#16a34a",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isUrdu ? "تصدیق ہو رہی ہے..." : "Authenticating..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isUrdu ? "لاگ ان کریں" : "Sign In to Dashboard"}</span>
                </>
              )}
            </Button>

          </form>

        </div>
      </main>

      {/* ─── FOOTER (CLEAN TEXT WITHOUT LOGO) ─── */}
      <footer className="px-6 py-4 sm:px-12 text-center z-20 relative space-y-1">
        <NATechHubBadge variant="footer" />
        <p className="text-[10px] text-stone-400 tracking-wide font-medium">
          {isUrdu
            ? "بزنس سوفٹ ویئر · پی او ایس · انوینٹری · کھاتہ و اکاؤنٹس"
            : "Business Software · POS · Inventory · Khata & Accounts"}
        </p>
      </footer>

    </div>
  );
}
