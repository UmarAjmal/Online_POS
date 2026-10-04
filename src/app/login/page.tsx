"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NATechHubBadge } from "@/components/NATechHubBadge";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Languages,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Building2,
  UserPlus,
} from "lucide-react";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isRegistered = searchParams.get("registered") === "true";
  const emailParam = searchParams.get("email") || "";
  const isNewUser = searchParams.get("new_user") === "true";

  const [username, setUsername] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isUrdu = language === "ur";

  useEffect(() => {
    if (emailParam && !username) {
      setUsername(emailParam);
    }
  }, [emailParam, username]);

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

      const user = data?.user;
      const name = user?.name || (isUrdu ? "سٹاف" : "Staff");
      const shopId = user?.shop_id;

      toast.success(isUrdu ? `خوش آمدید، ${name}` : `Welcome back, ${name}!`);

      // Check if first-time onboarding needed
      const hasSeen = typeof window !== "undefined" && shopId ? localStorage.getItem(`argroup_welcome_seen_${shopId}`) : null;
      if (isNewUser || !hasSeen) {
        window.location.href = "/welcome";
      } else {
        window.location.href = "/dashboard";
      }
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
      
      {/* ─── AMBIENT BACKGROUND GLOW & MESH ─── */}
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

      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-12 z-20 relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-950 transition-colors px-3 py-1.5 rounded-xl hover:bg-stone-200/60 border border-transparent hover:border-stone-300/80 active:scale-95 cursor-pointer"
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
        <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Top Dynamic Theme Accent Line */}
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500"
            style={{ backgroundColor: theme.primaryColor || "#16a34a" }}
          />

          {/* Registration Success Banner */}
          {isRegistered && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{isUrdu ? "اکاؤنٹ کامیابی سے بن گیا!" : "Account Registered Successfully!"}</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                {isUrdu
                  ? "براہ کرم ڈیش بورڈ میں داخل ہونے کے لیے اپنا پاس ورڈ درج کریں۔"
                  : "Please enter your password to activate and open your dashboard."}
              </p>
            </div>
          )}

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              {isUrdu ? "اپنے اکاؤنٹ میں داخل ہوں" : "Sign in to your account"}
            </h2>
            <p className="text-xs text-stone-500">
              {isUrdu
                ? "اپنا یوزر نیم اور پاس ورڈ درج کریں"
                : "Enter your credentials to access your business counter"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username / Email Field */}
            <div className="space-y-1.5">
              <Label 
                htmlFor="username" 
                className="text-xs font-bold text-stone-700 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-stone-400" />
                  <span>{isUrdu ? "ای میل یا یوزر نیم" : "Email or Username"}</span>
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  required
                  autoFocus={!username}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  placeholder={isUrdu ? "ای میل یا یوزر نیم درج کریں" : "username or email"}
                  className={`h-11 px-3.5 text-xs bg-stone-50/70 border rounded-xl transition-all duration-200 text-stone-900 placeholder:text-stone-400 ${
                    focusedField === "username" 
                      ? "bg-white border-stone-400 ring-2 ring-stone-900/5 shadow-xs" 
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label 
                htmlFor="password" 
                className="text-xs font-bold text-stone-700 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Lock size={13} className="text-stone-400" />
                  <span>{isUrdu ? "پاس ورڈ" : "Password"}</span>
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus={!!username}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={`h-11 px-3.5 pr-10 text-xs bg-stone-50/70 border rounded-xl transition-all duration-200 text-stone-900 placeholder:text-stone-400 ${
                    focusedField === "password" 
                      ? "bg-white border-stone-400 ring-2 ring-stone-900/5 shadow-xs" 
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 transition-colors p-0.5 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Fill Demo Chip (if no prefilled user) */}
            {!emailParam && (
              <div className="pt-0.5 flex items-center justify-between text-[11px] text-stone-500">
                <span className="font-semibold text-stone-600">
                  {isUrdu ? "فوری ٹیسٹ:" : "Demo Login:"}
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
            )}

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

            {/* Sign Up Link */}
            <div className="pt-3 text-center border-t border-stone-100">
              <p className="text-xs text-stone-600">
                {isUrdu ? "نیا کاروبار رجسٹر کرنا چاہتے ہیں؟" : "Want to register a new business?"}{" "}
                <Link
                  href="/register"
                  className="font-bold underline underline-offset-2 hover:text-stone-900 inline-flex items-center gap-1"
                  style={{ color: theme.primaryColor || "#16a34a" }}
                >
                  <UserPlus size={13} />
                  <span>{isUrdu ? "نیا اکاؤنٹ بنائیں (Sign Up)" : "Create Account / Sign Up"}</span>
                </Link>
              </p>
            </div>

          </form>

        </div>
      </main>

      {/* ─── FOOTER ─── */}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f7f5]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
