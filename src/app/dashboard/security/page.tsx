"use client";

import React, { useState, useEffect } from "react";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Shield, Key, Lock, Users, LogOut, Clock, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Smartphone, Monitor, 
  Trash2, Sliders, ShieldAlert, ShieldCheck, Filter, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyAuditEdit } from "@/lib/notifications";

interface ActiveSession {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  email: string;
  token: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
  status: string;
  last_active_at: string;
  created_at: string;
}

interface LoginAuditLog {
  id: string;
  user_id: string | null;
  email: string;
  status: "SUCCESS" | "FAILED" | "LOCKED";
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SecuritySettings {
  id: string;
  shop_id: string;
  session_timeout_mins: number;
  single_session_only: number;
  min_password_length: number;
  require_uppercase: number;
  require_numbers: number;
  require_special_chars: number;
  password_expiry_days: number;
  max_failed_attempts: number;
  lockout_duration_mins: number;
  two_factor_enabled: number;
}

export default function LoginSecurityPage() {
  const { shopId, userName, userRole } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [activeTab, setActiveTab] = useState<"sessions" | "policy" | "audit">("sessions");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [logs, setLogs] = useState<LoginAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Policy Form State
  const [sessionTimeout, setSessionTimeout] = useState<number>(60);
  const [singleSessionOnly, setSingleSessionOnly] = useState<boolean>(false);
  const [minPasswordLength, setMinPasswordLength] = useState<number>(8);
  const [requireUppercase, setRequireUppercase] = useState<boolean>(false);
  const [requireNumbers, setRequireNumbers] = useState<boolean>(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState<boolean>(false);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<number>(0);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(5);
  const [lockoutDurationMins, setLockoutDurationMins] = useState<number>(15);

  // Log filter
  const [logFilter, setLogFilter] = useState<"ALL" | "SUCCESS" | "FAILED" | "LOCKED">("ALL");
  const [searchLog, setSearchLog] = useState("");

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 15000); // 15s auto-poll for live sessions
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Security Settings
      const setRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "security_settings",
          filters: [{ col: "shop_id", op: "eq", val: "ar-group-shop-001" }],
        }),
      });
      const setJson = await setRes.json();
      if (setJson.data && setJson.data.length > 0) {
        const s: SecuritySettings = setJson.data[0];
        setSessionTimeout(s.session_timeout_mins || 60);
        setSingleSessionOnly(s.single_session_only === 1);
        setMinPasswordLength(s.min_password_length || 8);
        setRequireUppercase(s.require_uppercase === 1);
        setRequireNumbers(s.require_numbers === 1);
        setRequireSpecialChars(s.require_special_chars === 1);
        setPasswordExpiryDays(s.password_expiry_days || 0);
        setMaxFailedAttempts(s.max_failed_attempts || 5);
        setLockoutDurationMins(s.lockout_duration_mins || 15);
      }

      // 2. Fetch Active Sessions
      const sessRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "security_active_sessions",
        }),
      });
      const sessJson = await sessRes.json();
      if (sessJson.data) setSessions(sessJson.data);

      // 3. Fetch Login Audit Logs
      const logRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "login_audit_logs",
          orderBy: { column: "created_at", ascending: false },
          limit: 100,
        }),
      });
      const logJson = await logRes.json();
      if (logJson.data) setLogs(logJson.data);
    } catch (err: any) {
      console.error(err);
      toast.error(isUrdu ? "سیکیورٹی ڈیٹا لوڈ کرنے میں مسئلہ ہوا" : "Failed to load security settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const payload = {
        session_timeout_mins: Number(sessionTimeout),
        single_session_only: singleSessionOnly ? 1 : 0,
        min_password_length: Number(minPasswordLength),
        require_uppercase: requireUppercase ? 1 : 0,
        require_numbers: requireNumbers ? 1 : 0,
        require_special_chars: requireSpecialChars ? 1 : 0,
        password_expiry_days: Number(passwordExpiryDays),
        max_failed_attempts: Number(maxFailedAttempts),
        lockout_duration_mins: Number(lockoutDurationMins),
        updated_at: new Date().toISOString(),
      };

      await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "security_settings",
          data: payload,
          filters: [{ col: "shop_id", op: "eq", val: "ar-group-shop-001" }],
        }),
      });

      notifyAuditEdit(
        userName || "Super Admin",
        userRole || "Admin",
        "settings",
        "Password & Session Security Policy",
        `Min Len: ${minPasswordLength}, Timeout: ${sessionTimeout}m, Lockout: ${maxFailedAttempts} fails`
      );

      toast.success(isUrdu ? "سیکیورٹی پالیسی محفوظ ہو گئی! 🔒" : "Security & password policy updated successfully! 🔒");
    } catch (err: any) {
      toast.error(err.message || (isUrdu ? "سیٹنگز محفوظ کرنے میں ناکامی" : "Failed to update security settings"));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleForceLogout = async (sessionId: string, targetUser: string) => {
    const confirmLogout = window.confirm(
      isUrdu
        ? `کیا آپ واقعی ${targetUser} کا سیشن بند (Force Logout) کرنا چاہتے ہیں؟`
        : `Are you sure you want to terminate the active session for ${targetUser}?`
    );
    if (!confirmLogout) return;

    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "security_force_logout",
          sessionId,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success(isUrdu ? "صارف کا سیشن بند کر دیا گیا" : "Session terminated successfully");
      fetchSecurityData();
    } catch (err: any) {
      toast.error(err.message || (isUrdu ? "سیشن ختم کرنے میں ناکامی" : "Failed to terminate session"));
    }
  };

  const handleClearLogs = async () => {
    if (!confirm(isUrdu ? "کیا آپ تمام لاگ ان آڈٹ لاگز صاف کرنا چاہتے ہیں؟" : "Clear all login history logs?")) return;
    try {
      await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "security_clear_logs" }),
      });
      toast.success(isUrdu ? "لاگز صاف کر دیے گئے" : "Audit logs cleared");
      fetchSecurityData();
    } catch (err: any) {
      toast.error(err.message || (isUrdu ? "لاگز ڈیلیٹ کرنے میں ناکامی" : "Failed to clear logs"));
    }
  };

  const filteredLogs = logs.filter((l) => {
    const matchType = logFilter === "ALL" || l.status === logFilter;
    const matchSearch =
      l.email.toLowerCase().includes(searchLog.toLowerCase()) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(searchLog.toLowerCase())) ||
      (l.failure_reason && l.failure_reason.toLowerCase().includes(searchLog.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      
      {/* Top Banner Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Active Users Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              {isUrdu ? "فعال سیشنز" : "Active Logins"}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {sessions.length} {isUrdu ? "صارفین" : "Users"}
            </h4>
            <span className="text-[10px] font-bold text-emerald-600">
              {isUrdu ? "● لائیو سیشنز" : "● Live Sessions"}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={20} />
          </div>
        </div>

        {/* Timeout Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              {isUrdu ? "سیشن ٹائم آؤٹ" : "Session Timeout"}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {sessionTimeout} {isUrdu ? "منٹ" : "Mins"}
            </h4>
            <span className="text-[10px] text-slate-400">
              {isUrdu ? "آٹو لاگ آؤٹ" : "Idle auto-logout"}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={20} />
          </div>
        </div>

        {/* Password Requirement Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              {isUrdu ? "پاس ورڈ رول" : "Password Rule"}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {isUrdu ? `کم از کم ${minPasswordLength} حروف` : `Min ${minPasswordLength} Chars`}
            </h4>
            <span className="text-[10px] text-emerald-600">
              {requireNumbers ? (isUrdu ? "اعداد لازمی" : "Numbers Required") : (isUrdu ? "معیاری" : "Standard")}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Key size={20} />
          </div>
        </div>

        {/* Lockout Protection */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              {isUrdu ? "غلط پاس ورڈ گارڈ" : "Brute Force Guard"}
            </span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {maxFailedAttempts} {isUrdu ? "کوششیں" : "Tries"}
            </h4>
            <span className="text-[10px] text-rose-600 font-bold">
              {lockoutDurationMins}{isUrdu ? " منٹ لاک آؤٹ" : "m Lockout"}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ShieldAlert size={20} />
          </div>
        </div>

      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "sessions" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={15} />
          {isUrdu ? `لائیو ایکٹیو سیشنز (${sessions.length})` : `Active Sessions (${sessions.length})`}
        </button>

        <button
          onClick={() => setActiveTab("policy")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "policy" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders size={15} />
          {isUrdu ? "پاس ورڈ اور سیکیورٹی پالیسی" : "Security & Password Rules"}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "audit" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={15} />
          {isUrdu ? "لاگ ان آڈٹ ہسٹری لاگز" : "Login Audit History"}
        </button>
      </div>

      {/* TAB 1: Active Sessions Monitor */}
      {activeTab === "sessions" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "موجودہ لاگ ان صارفین اور ڈیوائسز" : "Currently Active Logged-in Sessions"}
              </h3>
              <p className="text-xs text-slate-400">
                {isUrdu ? "تمام کاؤنٹرز، موبائل ڈیوائسز اور ایڈمن اکاؤنٹس کے ایکٹیو سیشنز" : "Live sessions across all POS terminals, mobile devices, and administrator accounts"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSecurityData}
              className="h-8 text-xs rounded-xl text-slate-600 cursor-pointer"
            >
              <RefreshCw size={12} className="mr-1" /> {isUrdu ? "ریفریش" : "Refresh"}
            </Button>
          </div>

          <div className="overflow-x-auto">
            {sessions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Users size={32} className="mx-auto opacity-30" />
                <p className="text-xs font-semibold">{isUrdu ? "کوئی ایکٹیو سیشن موجود نہیں ہے" : "No active sessions detected"}</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-3">{isUrdu ? "صارف و ای میل" : "User & Email"}</th>
                    <th className="py-3 px-3">{isUrdu ? "مقرر کردہ رول" : "Assigned Role"}</th>
                    <th className="py-3 px-3">{isUrdu ? "آئی پی ایڈریس" : "IP Address"}</th>
                    <th className="py-3 px-3">{isUrdu ? "ڈیوائس / براؤزر" : "Device / Browser"}</th>
                    <th className="py-3 px-3">{isUrdu ? "لاگ ان وقت" : "Login Time"}</th>
                    <th className="py-3 px-3">{isUrdu ? "آخری ایکٹیویٹی" : "Last Active"}</th>
                    <th className="py-3 px-3 text-right">{isUrdu ? "ایکشن" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-slate-900">{s.user_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                          {s.user_role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {s.ip_address || "127.0.0.1"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={s.user_agent}>
                          <Monitor size={13} className="text-slate-400 shrink-0" />
                          {s.device_info || "Desktop Browser"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500 font-mono">
                        {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-emerald-600 font-bold">
                        {isUrdu ? "ابھی فعال" : "Just Now"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleForceLogout(s.id, s.user_name)}
                          className="h-7 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg px-2.5 font-bold cursor-pointer"
                        >
                          <LogOut size={12} className="mr-1" /> {isUrdu ? "سیشن ختم کریں" : "Terminate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Security & Password Rules Form */}
      {activeTab === "policy" && (
        <form onSubmit={handleSavePolicy} className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Key size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "پاس ورڈ اور سیشن سیکیورٹی پالیسی" : "Authentication & Password Policy Settings"}
              </h3>
              <p className="text-xs text-slate-400">
                {isUrdu ? "پاس ورڈ کی لمبائی، لاگ ان ٹائم آؤٹ اور بروٹ فورس پروٹیکشن رولز" : "Enforce system-wide password complexity, lockout thresholds, and session timeouts"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Section A: Session Inactivity */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Clock size={15} className="text-amber-600" />
                {isUrdu ? "سیشن اور غیر حاضری کا ٹائم آؤٹ" : "Session & Inactivity Controls"}
              </h4>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isUrdu ? "غیر فعال آٹو لاگ آؤٹ ٹائم آؤٹ" : "Idle Auto-Logout Timeout"}</label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={15}>{isUrdu ? "15 منٹ (انتہائی محفوظ)" : "15 Minutes (High Security)"}</option>
                  <option value={30}>{isUrdu ? "30 منٹ" : "30 Minutes"}</option>
                  <option value={60}>{isUrdu ? "1 گھنٹہ (تجویز کردہ)" : "1 Hour (Recommended)"}</option>
                  <option value={240}>{isUrdu ? "4 گھنٹے" : "4 Hours"}</option>
                  <option value={480}>{isUrdu ? "8 گھنٹے (مکمل شفٹ)" : "8 Hours (Full Shift)"}</option>
                  <option value={1440}>{isUrdu ? "24 گھنٹے" : "24 Hours"}</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isUrdu ? "غیر فعال کیشئرز یا ایڈمنز کو خودکار لاگ آؤٹ کر دیتا ہے۔" : "Automatically logs out inactive cashiers or administrators."}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div>
                  <span className="font-bold text-slate-800 block">{isUrdu ? "ایک وقت میں ایک سیشن (Single Session)" : "Single Session per User"}</span>
                  <span className="text-[10px] text-slate-400">{isUrdu ? "نئے کمپیوٹر سے لاگ ان ہونے پر پرانا سیشن ختم ہو جائے گا" : "Terminates older login when user signs in from a new PC"}</span>
                </div>
                <input
                  type="checkbox"
                  checked={singleSessionOnly}
                  onChange={(e) => setSingleSessionOnly(e.target.checked)}
                  className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Section B: Password Complexity */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Lock size={15} className="text-blue-600" />
                {isUrdu ? "پاس ورڈ کی شرائط و پیچیدگی" : "Password Complexity Requirements"}
              </h4>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isUrdu ? "پاس ورڈ کی کم سے کم لمبائی: " : "Minimum Password Length: "}
                  <span className="text-blue-600">{minPasswordLength} {isUrdu ? "حروف" : "Characters"}</span>
                </label>
                <input
                  type="range"
                  min={6}
                  max={16}
                  step={1}
                  value={minPasswordLength}
                  onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">{isUrdu ? "کم از کم ایک عدد (0-9) لازمی ہو" : "Require at least one Number (0-9)"}</span>
                  <input
                    type="checkbox"
                    checked={requireNumbers}
                    onChange={(e) => setRequireNumbers(e.target.checked)}
                    className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">{isUrdu ? "بڑے حروف (A-Z) لازمی ہوں" : "Require Uppercase Letters (A-Z)"}</span>
                  <input
                    type="checkbox"
                    checked={requireUppercase}
                    onChange={(e) => setRequireUppercase(e.target.checked)}
                    className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">{isUrdu ? "خصوصی علامات (!@#$%^&*) لازمی ہوں" : "Require Special Characters (!@#$%^&*)"}</span>
                  <input
                    type="checkbox"
                    checked={requireSpecialChars}
                    onChange={(e) => setRequireSpecialChars(e.target.checked)}
                    className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Section C: Brute-Force Lockout */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 md:col-span-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <ShieldAlert size={15} className="text-rose-600" />
                {isUrdu ? "غلط پاس ورڈ اٹیک و عارضی لاک آؤٹ پروٹیکشن" : "Brute Force Attack & Temporary Lockout Protection"}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isUrdu ? "زیادہ سے زیادہ غلط کوششیں" : "Max Failed Attempts"}</label>
                  <select
                    value={maxFailedAttempts}
                    onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                    className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={3}>{isUrdu ? "3 کوششیں (سخت)" : "3 Attempts (Strict)"}</option>
                    <option value={5}>{isUrdu ? "5 کوششیں (معیاری)" : "5 Attempts (Standard)"}</option>
                    <option value={10}>{isUrdu ? "10 کوششیں (آسان)" : "10 Attempts (Relaxed)"}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isUrdu ? "لاک آؤٹ کا دورانیہ" : "Lockout Duration"}</label>
                  <select
                    value={lockoutDurationMins}
                    onChange={(e) => setLockoutDurationMins(Number(e.target.value))}
                    className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={5}>{isUrdu ? "5 منٹ" : "5 Minutes"}</option>
                    <option value={15}>{isUrdu ? "15 منٹ" : "15 Minutes"}</option>
                    <option value={30}>{isUrdu ? "30 منٹ" : "30 Minutes"}</option>
                    <option value={60}>{isUrdu ? "60 منٹ" : "60 Minutes"}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isUrdu ? "پاس ورڈ تبدیلی کی معیاد" : "Password Rotation Period"}</label>
                  <select
                    value={passwordExpiryDays}
                    onChange={(e) => setPasswordExpiryDays(Number(e.target.value))}
                    className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={0}>{isUrdu ? "کبھی ختم نہ ہو" : "Never Expire"}</option>
                    <option value={30}>{isUrdu ? "ہر 30 دن بعد" : "Every 30 Days"}</option>
                    <option value={60}>{isUrdu ? "ہر 60 دن بعد" : "Every 60 Days"}</option>
                    <option value={90}>{isUrdu ? "ہر 90 دن بعد" : "Every 90 Days"}</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              disabled={savingPolicy}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold px-6 shadow-md cursor-pointer"
            >
              {savingPolicy ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving Policy...") : (isUrdu ? "سیکیورٹی سیٹنگز محفوظ کریں →" : "Save Security Configuration →")}
            </Button>
          </div>
        </form>
      )}

      {/* TAB 3: Login Audit History Logs */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "لاگ ان آڈٹ ہسٹری لاگز" : "Login Security Audit Trail"}
              </h3>
              <p className="text-xs text-slate-400">
                {isUrdu ? "تمام کامیاب، ناکام اور لاک آؤٹ لاگ ان کی کوششوں کا مکمل ریکارڈ" : "Full chronological record of successful logins, failed attempts, and account lockouts"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setLogFilter("ALL")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${logFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}
                >
                  {isUrdu ? "تمام" : "All"} ({logs.length})
                </button>
                <button
                  onClick={() => setLogFilter("SUCCESS")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${logFilter === "SUCCESS" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"}`}
                >
                  {isUrdu ? "کامیاب" : "Success"}
                </button>
                <button
                  onClick={() => setLogFilter("FAILED")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${logFilter === "FAILED" ? "bg-white text-red-700 shadow-2xs" : "text-slate-600"}`}
                >
                  {isUrdu ? "ناکام / لاک" : "Failed / Locked"}
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="h-8 text-xs text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
              >
                <Trash2 size={12} className="mr-1" /> {isUrdu ? "لاگز صاف کریں" : "Clear Logs"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <ShieldCheck size={32} className="mx-auto opacity-30 text-emerald-600" />
                <p className="text-xs font-semibold">{isUrdu ? "کوئی سیکیورٹی لاگ موجود نہیں ہے" : "No Security Audit Logs"}</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-3">{isUrdu ? "تاریخ و وقت" : "Timestamp"}</th>
                    <th className="py-3 px-3">{isUrdu ? "صارف / ای میل" : "Username / Email"}</th>
                    <th className="py-3 px-3">{isUrdu ? "اسٹیٹس" : "Status"}</th>
                    <th className="py-3 px-3">{isUrdu ? "آئی پی ایڈریس" : "IP Address"}</th>
                    <th className="py-3 px-3">{isUrdu ? "تفصیل / ناکامی کی وجہ" : "Details / Failure Reason"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                        {l.email}
                      </td>
                      <td className="py-2.5 px-3">
                        {l.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={11} /> {isUrdu ? "کامیاب" : "SUCCESS"}
                          </span>
                        ) : l.status === "LOCKED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                            <Lock size={11} /> {isUrdu ? "لاک شدہ" : "LOCKED"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                            <XCircle size={11} /> {isUrdu ? "ناکام" : "FAILED"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {l.ip_address || "127.0.0.1"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {l.failure_reason || (l.status === "SUCCESS" ? (isUrdu ? "تصدیق شدہ لاگ ان" : "Authorized Login") : "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
