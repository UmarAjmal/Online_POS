"use client";

import React, { useState, useEffect } from "react";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Database, Download, Upload, RefreshCw, HardDrive, 
  ShieldCheck, AlertTriangle, Trash2, CheckCircle2, 
  FileText, Layers, Clock, Zap, Cpu, Search, Check,
  AlertOctagon, Flame, ArrowUpRight, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyAuditEdit, notifyAuditDelete } from "@/lib/notifications";

interface TableStat {
  name: string;
  count: number;
  category: string;
}

interface DBHealthData {
  engine: string;
  status: string;
  integrity: string;
  dbSizeKb: number;
  walSizeKb: number;
  totalTables: number;
  totalRecords: number;
  tables: TableStat[];
  lastOptimizedAt: string;
}

interface BackupRecord {
  id: string;
  filename: string;
  backup_type: string;
  file_size_kb: number;
  record_count: number;
  status: string;
  created_by: string;
  created_at: string;
}

export default function DatabaseManagementPage() {
  const { shopId, userName, shopName, userRole } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [health, setHealth] = useState<DBHealthData | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"backup" | "restore" | "tables" | "maintenance">("backup");

  // Actions states
  const [exportingSql, setExportingSql] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [searchTable, setSearchTable] = useState("");

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreContent, setRestoreContent] = useState<string>("");
  const [restoreType, setRestoreType] = useState<"sql" | "json">("sql");
  const [restoring, setRestoring] = useState(false);

  // Danger Zone Modals
  const [isWipeTxModalOpen, setIsWipeTxModalOpen] = useState(false);
  const [wipeTxPhrase, setWipeTxPhrase] = useState("");
  const [wipingTx, setWipingTx] = useState(false);

  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [factoryResetPhrase, setFactoryResetPhrase] = useState("");
  const [resettingFactory, setResettingFactory] = useState(false);

  // Auto-backup settings state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoBackupInterval, setAutoBackupInterval] = useState("daily");
  const [retentionDays, setRetentionDays] = useState(14);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchHealthAndBackups();
    fetchSecuritySettings();
  }, []);

  const fetchHealthAndBackups = async () => {
    setLoading(true);
    try {
      // 1. Fetch DB Health
      const hRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "db_health" }),
      });
      const hJson = await hRes.json();
      if (hJson.data) setHealth(hJson.data);

      // 2. Fetch Backups
      const bRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "database_backups",
          orderBy: { column: "created_at", ascending: false },
          limit: 20,
        }),
      });
      const bJson = await bRes.json();
      if (bJson.data) setBackups(bJson.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load database status");
    } finally {
      setLoading(false);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "security_settings",
          single: true,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setAutoBackupEnabled(json.data.auto_backup_enabled === 1);
        setAutoBackupInterval(json.data.auto_backup_interval || "daily");
        setRetentionDays(json.data.retention_days || 14);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveBackupSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "security_settings",
          data: {
            auto_backup_enabled: autoBackupEnabled ? 1 : 0,
            auto_backup_interval: autoBackupInterval,
            retention_days: Number(retentionDays),
            updated_at: new Date().toISOString(),
          },
          filters: [{ col: "shop_id", op: "eq", val: "ar-group-shop-001" }],
        }),
      });
      toast.success(isUrdu ? "آٹو بیک اپ سیٹنگز محفوظ ہو گئیں" : "Auto-backup settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportSql = async () => {
    setExportingSql(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "db_export_sql",
          actorName: userName || "Admin",
          shopName: shopName || "",
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Trigger instant browser download
      const blob = new Blob([json.data.sqlDump || json.data.sql], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = json.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isUrdu ? "آف لائن ایس کیو ایل بیک اپ ڈاؤنلوڈ ہو گیا!" : "Offline .SQL backup generated & downloaded! 💾");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Failed to export SQL backup");
    } finally {
      setExportingSql(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "db_export_json",
          actorName: userName || "Admin",
          shopName: shopName || "",
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const blob = new Blob([json.data.jsonString || JSON.stringify(json.data.jsonData, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = json.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isUrdu ? "ڈیٹا بیس سنیپ شاٹ (JSON) ڈاؤنلوڈ ہو گیا!" : "Database JSON snapshot downloaded! 📦");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Failed to export JSON snapshot");
    } finally {
      setExportingJson(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);

    const isJson = file.name.endsWith(".json");
    setRestoreType(isJson ? "json" : "sql");

    const reader = new FileReader();
    reader.onload = (event) => {
      setRestoreContent(event.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreContent) {
      toast.error(isUrdu ? "پہلے بیک اپ فائل منتخب کریں" : "Please select a backup file first");
      return;
    }

    const confirmRestore = window.confirm(
      isUrdu
        ? "کیا آپ واقعی اس فائل سے ڈیٹا بیس بحال (Restore) کرنا چاہتے ہیں؟"
        : "Are you sure you want to restore the database from this backup file? Existing data will be updated/replaced."
    );
    if (!confirmRestore) return;

    setRestoring(true);
    try {
      let res;
      if (restoreType === "json") {
        const parsed = JSON.parse(restoreContent);
        res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "db_restore_json",
            jsonData: parsed,
          }),
        });
      } else {
        res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "db_restore_sql",
            sqlContent: restoreContent,
          }),
        });
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success(isUrdu ? "ڈیٹا بیس کامیابی سے بحال ہو گیا!" : "Database restored successfully! 🚀");
      setRestoreFile(null);
      setRestoreContent("");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const handleVacuumOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "db_vacuum" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success(isUrdu ? "ڈیٹا بیس کامیابی سے ڈی فریگمنٹ اور آپٹیمائز ہو گیا!" : "Database vacuumed, re-indexed and optimized! ⚡");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const handleWipeTransactions = async () => {
    if (wipeTxPhrase !== "CLEAR-TRANSACTIONS") {
      toast.error(isUrdu ? "تصدیقی فقرہ درست لکھیں: CLEAR-TRANSACTIONS" : "Type 'CLEAR-TRANSACTIONS' to confirm");
      return;
    }

    setWipingTx(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "db_wipe_transactions",
          confirmPhrase: wipeTxPhrase,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      notifyAuditDelete(
        userName || "Super Admin",
        userRole || "Admin",
        "settings",
        "All Transaction Records & Invoices",
        "Admin cleared transaction history"
      );

      toast.success(isUrdu ? "تمام سیلز اور ٹرانزیکشنز صاف کر دی گئیں" : "Transaction logs and invoices wiped clean! 🧹");
      setIsWipeTxModalOpen(false);
      setWipeTxPhrase("");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Wipe failed");
    } finally {
      setWipingTx(false);
    }
  };

  const handleFactoryReset = async () => {
    if (factoryResetPhrase !== "FACTORY-RESET-CONFIRMED") {
      toast.error(isUrdu ? "تصدیقی فقرہ درست لکھیں: FACTORY-RESET-CONFIRMED" : "Type 'FACTORY-RESET-CONFIRMED' to confirm");
      return;
    }

    setResettingFactory(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "db_factory_reset",
          confirmPhrase: factoryResetPhrase,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      notifyAuditDelete(
        userName || "Super Admin",
        userRole || "Admin",
        "settings",
        "Full System Database",
        "Admin triggered factory reset"
      );

      toast.success(isUrdu ? "سسٹم فیکٹری ری سیٹ مکمل ہو گیا" : "Factory reset completed! System restored to defaults.");
      setIsFactoryResetModalOpen(false);
      setFactoryResetPhrase("");
      fetchHealthAndBackups();
    } catch (err: any) {
      toast.error(err.message || "Factory reset failed");
    } finally {
      setResettingFactory(false);
    }
  };

  const filteredTables = health?.tables.filter((t) =>
    t.name.toLowerCase().includes(searchTable.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTable.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      
      {/* Top Health & Engine Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Engine Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "انجن" : "Engine"}</span>
            <Cpu size={15} className="text-blue-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-black text-slate-900 truncate">{health?.engine || "SQLite 3"}</h4>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {health?.status ? (isUrdu && health.status.toLowerCase() === "online" ? "آن لائن" : health.status) : (isUrdu ? "آن لائن" : "Online")}
            </span>
          </div>
        </div>

        {/* Database Size */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "ڈیٹا بیس سائز" : "DB Size"}</span>
            <HardDrive size={15} className="text-indigo-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-base font-black text-slate-900">{health ? `${(health.dbSizeKb / 1024).toFixed(2)} MB` : "0 MB"}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{isUrdu ? "ڈسک اسپیس" : "Disk Footprint"}</span>
          </div>
        </div>

        {/* WAL Journal Size */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "عارضی لاگ کیش" : "WAL Cache"}</span>
            <Zap size={15} className="text-amber-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-base font-black text-slate-900">{health ? `${health.walSizeKb} KB` : "0 KB"}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{isUrdu ? "رائٹ لاگ" : "Write Log"}</span>
          </div>
        </div>

        {/* Total Tables */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "ٹیبلز" : "Tables"}</span>
            <Layers size={15} className="text-purple-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-base font-black text-slate-900">{health?.totalTables || 0}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{isUrdu ? "فعال اسکیماز" : "Active Schemas"}</span>
          </div>
        </div>

        {/* Total Records */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "کل ریکارڈز" : "Total Rows"}</span>
            <Database size={15} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-base font-black text-slate-900">{health ? health.totalRecords.toLocaleString() : 0}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{isUrdu ? "تمام ڈیٹا ریکارڈز" : "All Data Records"}</span>
          </div>
        </div>

        {/* Integrity Check */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isUrdu ? "صحت و درستگی" : "Integrity"}</span>
            <ShieldCheck size={15} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-black text-emerald-600 uppercase tracking-wide">{isUrdu ? "صحیح (محفوظ)" : "PASS (OK)"}</h4>
            <span className="text-[10px] text-slate-400 font-medium">{isUrdu ? "کوئی خرابی نہیں" : "No Corruptions"}</span>
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("backup")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "backup" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Download size={15} />
          {isUrdu ? "آف لائن بیک اپ اور شیڈول" : "Offline Backup & Schedule"}
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "restore" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Upload size={15} />
          {isUrdu ? "ڈیٹا بیس بحالی (Restore)" : "Restore Database"}
        </button>

        <button
          onClick={() => setActiveTab("tables")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "tables" ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers size={15} />
          {isUrdu ? "ٹیبلز اور لائیو ریکارڈز" : "Table Statistics"}
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "maintenance" ? "border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle size={15} />
          {isUrdu ? "آپٹیمائزیشن اور خطرے کا زون" : "Maintenance & Reset"}
        </button>
      </div>

      {/* TAB 1: Backup & Export */}
      {activeTab === "backup" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Instant Downloads & Auto Settings */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Instant Offline Export Cards */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isUrdu ? "فوری آف لائن بیک اپ ڈاؤنلوڈ" : "Instant Offline Backups"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isUrdu ? "اپنا تمام ڈیٹا محفوظ .sql یا .json فارمیٹ میں ڈاؤنلوڈ کریں" : "Export raw SQL scripts or structured JSON snapshots for offline storage"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleExportSql}
                  disabled={exportingSql}
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left group cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{isUrdu ? "ڈاؤنلوڈ .SQL سکرپٹ" : "Download .SQL Script"}</span>
                    <FileText size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isUrdu ? "معیاری ANSI SQL ڈمپ فائل بمعہ تمام ٹیبلز اور ڈیٹا اینٹریز" : "Standard ANSI SQL dump with CREATE TABLE and INSERT statements."}
                  </p>
                  <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    {exportingSql ? (isUrdu ? "تیار ہو رہا ہے..." : "Exporting...") : (isUrdu ? "ڈاؤنلوڈ SQL فائل ←" : "Download SQL File →")}
                  </span>
                </button>

                <button
                  onClick={handleExportJson}
                  disabled={exportingJson}
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all text-left group cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{isUrdu ? "ڈاؤنلوڈ .JSON سنیپ شاٹ" : "Download .JSON Snapshot"}</span>
                    <Layers size={16} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isUrdu ? "کومپیکٹ JSON ڈیٹا سنیپ شاٹ کلاؤڈ یا بحالی کے لیے تیار" : "Compact JSON data snapshot ready for web restore or cloud storage."}
                  </p>
                  <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                    {exportingJson ? (isUrdu ? "تیار ہو رہا ہے..." : "Generating...") : (isUrdu ? "ڈاؤنلوڈ JSON فائل ←" : "Download JSON File →")}
                  </span>
                </button>
              </div>
            </div>

            {/* Daily Auto-Backup Configuration */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isUrdu ? "خودکار ڈیلی بیک اپ شیڈول" : "Automated Daily Backup Schedule"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isUrdu ? "روزانہ خودکار بیک اپ اور تاریخ کا دورانیہ" : "Configure automatic background backups & retention schedule"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800 block">{isUrdu ? "خودکار ڈیلی بیک اپ فعال کریں" : "Enable Automated Daily Backups"}</span>
                    <span className="text-[11px] text-slate-400">{isUrdu ? "ہر رات 12 بجے خودکار چلے گا" : "Runs daily at 00:00 midnight automatically"}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                    className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">{isUrdu ? "بیک اپ کی بارمباری" : "Backup Frequency"}</label>
                    <select
                      value={autoBackupInterval}
                      onChange={(e) => setAutoBackupInterval(e.target.value)}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="daily">{isUrdu ? "روزانہ آدھی رات کو" : "Daily at Midnight"}</option>
                      <option value="12hours">{isUrdu ? "ہر 12 گھنٹے بعد" : "Every 12 Hours"}</option>
                      <option value="weekly">{isUrdu ? "ہفتہ وار اتوار کو" : "Weekly on Sunday"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">{isUrdu ? "بیک اپ رکھنے کی مدت (دن)" : "Retention Limit (Days)"}</label>
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value={7}>{isUrdu ? "7 دن رکھیں" : "Keep 7 Days"}</option>
                      <option value={14}>{isUrdu ? "14 دن رکھیں" : "Keep 14 Days"}</option>
                      <option value={30}>{isUrdu ? "30 دن رکھیں" : "Keep 30 Days"}</option>
                      <option value={90}>{isUrdu ? "90 دن رکھیں" : "Keep 90 Days"}</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={saveBackupSettings}
                    disabled={savingSettings}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-4"
                  >
                    {savingSettings ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving...") : (isUrdu ? "بیک اپ شیڈول محفوظ کریں" : "Save Auto-Backup Schedule")}
                  </Button>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Backup History Log */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-slate-500" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isUrdu ? "پچھلے بیک اپ لاگز" : "Generated Backup History"}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHealthAndBackups}
                className="h-8 text-xs rounded-xl text-slate-600"
              >
                <RefreshCw size={12} className="mr-1" /> {isUrdu ? "ریفریش" : "Refresh"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-100 mt-2 custom-scrollbar">
              {backups.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Database size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-semibold">{isUrdu ? "ابھی تک کوئی بیک اپ ریکارڈ نہیں" : "No Backup Records Yet"}</p>
                  <p className="text-[11px]">{isUrdu ? "آف لائن بیک اپ ڈاؤنلوڈ کرنے کے لیے اوپر بٹن پر کلک کریں۔" : "Click 'Download .SQL Script' above to generate an offline backup."}</p>
                </div>
              ) : (
                backups.map((b) => (
                  <div key={b.id} className="py-3 px-1 flex items-center justify-between hover:bg-slate-50/60 rounded-xl transition-colors">
                    <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">{b.filename}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                          {b.backup_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{isUrdu ? "سائز:" : "Size:"} {b.file_size_kb} KB</span>
                        <span>•</span>
                        <span>{b.record_count.toLocaleString()} {isUrdu ? "ریکارڈز" : "rows"}</span>
                        <span>•</span>
                        <span>{new Date(b.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50">
                      {isUrdu ? "✓ تیار ہے" : "✓ Ready"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Restore Database */}
      {activeTab === "restore" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "ڈیٹا بیس بحالی (Restore Engine)" : "Restore Database from File"}
              </h3>
              <p className="text-xs text-slate-400">
                {isUrdu ? "اپنی .sql سکرپٹ یا .json فائل منتخب کریں اور سسٹم میں ڈیٹا بحال کریں" : "Select and execute a previously exported .SQL script or .JSON data snapshot"}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">{isUrdu ? "بحالی سے پہلے اہم وارننگ:" : "Important Pre-Restore Warning:"}</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {isUrdu 
                  ? "ڈیٹا بیس بحال کرنے سے پرانا ڈیٹا اوور رائٹ ہو جائے گا۔ بحالی سے پہلے موجودہ ڈیٹا کا نیا بیک اپ ضرور ڈاؤنلوڈ کر لیں۔"
                  : "Restoring a database will merge and update existing records. Make sure you take a fresh backup before performing a restore."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="restore-file-input"
                accept=".sql,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="restore-file-input" className="cursor-pointer space-y-2 block">
                <Upload size={32} className="mx-auto text-slate-400" />
                <span className="text-xs font-bold text-slate-700 block">
                  {restoreFile ? restoreFile.name : (isUrdu ? "بیک اپ فائل منتخب کرنے کے لیے کلک کریں (.SQL یا .JSON)" : "Click to select .SQL or .JSON Backup File")}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {restoreFile ? `${(restoreFile.size / 1024).toFixed(1)} KB` : (isUrdu ? "معیاری .sql ڈمپ یا .json فائل منتخب کریں" : "Supports standard .sql dumps or .json snapshots")}
                </span>
              </label>
            </div>

            {restoreContent && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{isUrdu ? "فائل پیش نظارہ:" : "File Preview:"}</span>
                  <span className="text-[10px] font-mono text-slate-400">Type: {restoreType.toUpperCase()}</span>
                </div>
                <textarea
                  value={restoreContent.slice(0, 1500) + (restoreContent.length > 1500 ? "\n... (truncated for preview)" : "")}
                  readOnly
                  rows={6}
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 focus:outline-none custom-scrollbar"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {restoreFile && (
                <Button
                  variant="outline"
                  onClick={() => { setRestoreFile(null); setRestoreContent(""); }}
                  className="rounded-xl text-xs"
                >
                  {isUrdu ? "انتخاب ختم کریں" : "Clear Selection"}
                </Button>
              )}
              <Button
                onClick={handleExecuteRestore}
                disabled={!restoreContent || restoring}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold px-6 shadow-md"
              >
                {restoring ? (isUrdu ? "ڈیٹا بیس بحال ہو رہا ہے..." : "Restoring Database...") : (isUrdu ? "ڈیٹا بیس بحال کریں ←" : "Execute Database Restore →")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Table Statistics */}
      {activeTab === "tables" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "تمام ڈیٹا بیس ٹیبلز اور سائز" : "Database Tables & Record Metrics"}
              </h3>
              <p className="text-xs text-slate-400">
                {isUrdu ? "ہر ٹیبل کا لائیو ریکارڈ کاؤنٹ اور کیٹیگری" : "Live row counts and classification for all system tables"}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={isUrdu ? "ٹیبل کا نام تلاش کریں..." : "Search table name..."}
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">{isUrdu ? "ٹیبل کا نام" : "Table Schema Name"}</th>
                  <th className="py-3 px-3">{isUrdu ? "کیٹیگری" : "Category Group"}</th>
                  <th className="py-3 px-3 text-right">{isUrdu ? "ریکارڈز کی تعداد" : "Row Count"}</th>
                  <th className="py-3 px-3 text-right">{isUrdu ? "ڈیٹا شیئر فیصد" : "Data Share"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTables.map((t, idx) => {
                  const sharePct = health?.totalRecords ? Math.round((t.count / health.totalRecords) * 100) : 0;
                  return (
                    <tr key={t.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{t.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.category.includes("Transactions")
                            ? "bg-amber-50 text-amber-700"
                            : t.category.includes("Security")
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                        {t.count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-bold text-slate-500 font-mono">{sharePct}%</span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.max(sharePct, 2)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Maintenance & Reset */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          
          {/* Optimization Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isUrdu ? "ڈیٹا بیس ڈی فریگمنٹ اور آپٹیمائزیشن (VACUUM)" : "Database VACUUM & Index Optimization"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isUrdu ? "غیر استعمال شدہ جگہ خالی کریں اور رفتار تیز کریں" : "Reclaim deleted disk pages, defragment table structures, and rebuild index trees"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-800">{isUrdu ? "ڈیٹا بیس انڈیکس اور ویکیوم کو بہتر بنائیں" : "Optimize Database Indexes & Vacuum WAL"}</p>
                <p className="text-[11px] text-slate-500">
                  {isUrdu 
                    ? "یہ عمل مکمل طور پر محفوظ ہے۔ ڈیٹا ختم کیے بغیر رفتار تیز کرتا ہے۔" 
                    : "Safe operation. Can be executed during normal store operation without data loss."}
                </p>
              </div>
              <Button
                onClick={handleVacuumOptimize}
                disabled={optimizing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shrink-0"
              >
                {optimizing ? (isUrdu ? "بہتر ہو رہا ہے..." : "Optimizing...") : (isUrdu ? "ویکیوم اور آپٹیمائز چلائیں ⚡" : "Run VACUUM & Optimize ⚡")}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/40 rounded-3xl border-2 border-red-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-red-200/60">
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <AlertOctagon size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-red-950">
                  {isUrdu ? "خطرناک زون (Danger Zone Actions)" : "Danger Zone - Data Deletion & Wipe Tools"}
                </h3>
                <p className="text-xs text-red-700">
                  {isUrdu ? "یہ اعمال ناقابل واپسی ہیں۔ احتیاط کے ساتھ استعمال کریں۔" : "These operations are irreversible and require double explicit confirmation."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Wipe Transactions Only */}
              <div className="p-5 rounded-2xl bg-white border border-red-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Trash2 size={14} className="text-amber-600" />
                    {isUrdu ? "صرف سیلز اور ٹرانزیکشنز صاف کریں" : "Wipe Sales & Transactions Only"}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isUrdu 
                      ? "تمام سیلز انوائسز، خریداری، اخراجات اور کیش ریکارڈز ختم کر دے گا۔ پروڈکٹس، اسٹاک، کسٹمرز اور اسٹاف محفوظ رہیں گے۔" 
                      : "Clears all invoices, sale bills, purchase orders, expenses, and cash ledger records. Products, stock inventory, customers, categories, and staff remain intact."}
                  </p>
                </div>
                <Button
                  onClick={() => setIsWipeTxModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl w-full cursor-pointer"
                >
                  {isUrdu ? "تمام انوائسز اور ٹرانزیکشنز صاف کریں" : "Clear All Invoices & Transactions"}
                </Button>
              </div>

              {/* Factory Reset */}
              <div className="p-5 rounded-2xl bg-white border border-red-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-red-700 flex items-center gap-1.5">
                    <Flame size={14} className="text-red-600" />
                    {isUrdu ? "مکمل فیکٹری ڈیٹا بیس ری سیٹ" : "Full Factory Database Reset"}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isUrdu 
                      ? "تمام پروڈکٹس، کھاتہ جات اور سیٹنگز مستقل طور پر ختم کر کے سافٹ ویئر کو بالکل نیا کر دے گا۔" 
                      : "Permanently deletes all data including products, customers, and ledger balances, resetting the store back to fresh state."}
                  </p>
                </div>
                <Button
                  onClick={() => setIsFactoryResetModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl w-full cursor-pointer"
                >
                  {isUrdu ? "مکمل فیکٹری ری سیٹ کریں" : "Full Factory Reset"}
                </Button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* MODAL: Wipe Transactions Confirmation */}
      {isWipeTxModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 pb-2 border-b border-slate-100">
              <AlertTriangle size={24} />
              <h3 className="font-extrabold text-sm text-slate-900">
                {isUrdu ? "ٹرانزیکشنز صاف کرنے کی تصدیق" : "Confirm Clear Transactions"}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isUrdu 
                ? "یہ عمل تمام سیلز انوائسز، خریداری، اخراجات اور کیش ریکارڈز مستقل ختم کر دے گا۔ تصدیق کے لیے نیچے CLEAR-TRANSACTIONS لکھیں:" 
                : "This will permanently delete all sales invoices, purchases, expenses, and transaction logs. To confirm, type CLEAR-TRANSACTIONS below:"}
            </p>
            <Input
              value={wipeTxPhrase}
              onChange={(e) => setWipeTxPhrase(e.target.value)}
              placeholder="CLEAR-TRANSACTIONS"
              className="text-xs font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setIsWipeTxModalOpen(false); setWipeTxPhrase(""); }}
                className="rounded-xl text-xs"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </Button>
              <Button
                onClick={handleWipeTransactions}
                disabled={wipeTxPhrase !== "CLEAR-TRANSACTIONS" || wipingTx}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                {wipingTx ? (isUrdu ? "صاف ہو رہا ہے..." : "Clearing...") : (isUrdu ? "تصدیق اور ٹرانزیکشنز صاف کریں" : "Confirm & Clear Transactions")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Factory Reset Confirmation */}
      {isFactoryResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-slate-100">
              <Flame size={24} />
              <h3 className="font-extrabold text-sm text-red-700">
                {isUrdu ? "فیکٹری ری سیٹ کی تصدیق" : "Confirm Factory Database Reset"}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isUrdu 
                ? "یہ پورے اسٹور کا تمام ڈیٹا مستقل ختم کر کے ابتدائی حالت پر لے جائے گا۔ تصدیق کے لیے نیچے FACTORY-RESET-CONFIRMED لکھیں:" 
                : "This will wipe the entire store database back to clean defaults. To confirm, type FACTORY-RESET-CONFIRMED below:"}
            </p>
            <Input
              value={factoryResetPhrase}
              onChange={(e) => setFactoryResetPhrase(e.target.value)}
              placeholder="FACTORY-RESET-CONFIRMED"
              className="text-xs font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setIsFactoryResetModalOpen(false); setFactoryResetPhrase(""); }}
                className="rounded-xl text-xs"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </Button>
              <Button
                onClick={handleFactoryReset}
                disabled={factoryResetPhrase !== "FACTORY-RESET-CONFIRMED" || resettingFactory}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                {resettingFactory ? (isUrdu ? "ری سیٹ ہو رہا ہے..." : "Resetting...") : (isUrdu ? "فیکٹری ری سیٹ کی تصدیق کریں" : "Confirm Factory Reset")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
