"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Shield, Plus, Edit2, Trash2, CheckSquare, Square, 
  Users, Lock, Unlock, Copy, CheckCircle2, AlertTriangle,
  Info, Search, ShieldCheck, Key, Settings, Loader2,
  ShoppingCart, Package, Truck, Wallet, PieChart, Store,
  Pill, RotateCcw, TrendingDown, Layers, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyAuditEdit, notifyAuditDelete } from "@/lib/notifications";

export interface RolePermissionMatrix {
  panels: Record<string, boolean>; // e.g. pos: true, sales: true
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    edit_bill?: boolean;
    delete_bill?: boolean;
    edit_account?: boolean;
    delete_account?: boolean;
    allow_wholesale?: boolean;
    allow_discounts?: boolean;
    view_cost?: boolean;
    manage_settings?: boolean;
    [key: string]: boolean | undefined;
  };
  granular?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;
}

export interface UserRoleRecord {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  is_system: number;
  permissions: RolePermissionMatrix;
  created_at: string;
  updated_at: string;
  staff_count?: number;
}

const MODULE_GROUPS = [
  {
    title: "Point of Sale & Billing",
    urduTitle: "پوائنٹ آف سیل اور بلنگ",
    icon: ShoppingCart,
    modules: [
      { key: "pos", name: "POS Terminal & Checkout", urdu: "پوائنٹ آف سیل (کاؤنٹر)" },
      { key: "sales", name: "Sales Ledger & Invoices", urdu: "سیلز لیجر اور انوائسز" },
      { key: "khata", name: "Customer Khata & Credit", urdu: "کسٹمر کھاتہ اور ادھار" },
      { key: "registers", name: "Cash Registers & Daybook", urdu: "کیش رجسٹر اور شفٹس" },
    ]
  },
  {
    title: "Inventory & Pharmacy Catalog",
    urduTitle: "انوینٹری اور فارمیسی کیٹلاگ",
    icon: Package,
    modules: [
      { key: "products", name: "Products & Stock Master", urdu: "پروڈکٹس اور اسٹاک ماسٹر" },
      { key: "categories", name: "Product Categories", urdu: "پروڈکٹ کیٹیگریز" },
      { key: "brands", name: "Brands & Manufacturers", urdu: "برانڈز اور مینوفیکچررز" },
      { key: "units", name: "Units & Packaging Conversions", urdu: "پیکنگ اور پیمائش کے یونٹس" },
      { key: "pharmacy_expiry", name: "Pharmacy Expiry Tracker", urdu: "میڈیسن ایکسپائری ٹریکر" },
      { key: "pharmacy_formulas", name: "Generic Salts & Formulations", urdu: "جنرک سالٹس اور فارمولیشنز" },
    ]
  },
  {
    title: "Procurement & Expenses",
    urduTitle: "خریداری اور اخراجات",
    icon: Truck,
    modules: [
      { key: "purchase", name: "Purchase Orders & Stock-In", urdu: "پرچیز اور اسٹاک وصولی" },
      { key: "returns", name: "Sales & Purchase Returns", urdu: "واپسی اور اسٹاک ایڈجسٹمنٹ" },
      { key: "expenses", name: "Daily Business Expenses", urdu: "روزمرہ کے اخراجات" },
    ]
  },
  {
    title: "Financials & Auditing Reports",
    urduTitle: "مالیات اور آڈٹ رپورٹس",
    icon: Wallet,
    modules: [
      { key: "accounts", name: "Chart of Accounts & Ledgers", urdu: "چارٹ آف اکاؤنٹس اور مالیات" },
      { key: "reports", name: "Financial & PDF Reports", urdu: "مالیاتی اور آڈٹ رپورٹس (PDF)" },
    ]
  },
  {
    title: "System Administration & Security",
    urduTitle: "سسٹم ایڈمنسٹریشن اور سیکیورٹی",
    icon: Shield,
    modules: [
      { key: "staff", name: "Staff HR & Payroll", urdu: "اسٹاف مینجمنٹ اور تنخواہیں" },
      { key: "roles", name: "User Roles & RBAC", urdu: "یوزر رولز اور اجازت نامے" },
      { key: "settings", name: "Store Settings & Themes", urdu: "دکان کی سیٹنگز اور کلر تھیمز" },
    ]
  }
];

const SPECIAL_ACTIONS = [
  { key: "allow_discounts", label: "Allow Counter Discounts (POS)", urdu: "کاؤنٹر پر ڈسکاؤنٹ کی اجازت" },
  { key: "allow_wholesale", label: "Allow Wholesale Rates", urdu: "ہول سیل ریٹس لاگو کرنے کی اجازت" },
  { key: "view_cost", label: "View Purchase Cost Prices", urdu: "خریداری قیمت (Cost) دیکھنے کی اجازت" },
  { key: "edit_bill", label: "Edit Settled Invoices", urdu: "مکمل بلز میں ترمیم کی اجازت" },
  { key: "delete_bill", label: "Delete / Void Invoices", urdu: "بلز حذف / کینسل کرنے کی اجازت" },
  { key: "manage_settings", label: "Change System Settings & Colors", urdu: "سسٹم سیٹنگز اور تھیم تبدیل کرنے کی اجازت" },
];

export default function RolesManagementPage() {
  const { shopId, userName, userRole } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isUrdu = language === "ur";

  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRoleRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [panels, setPanels] = useState<Record<string, boolean>>({});
  const [actions, setActions] = useState<RolePermissionMatrix["actions"]>({
    view: true,
    create: true,
    edit: false,
    delete: false,
    allow_discounts: true,
    view_cost: false,
  });
  const [granular, setGranular] = useState<Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // 1. Fetch roles
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "roles",
          orderBy: { column: "created_at", ascending: true },
        }),
      });
      const json = await res.json();

      // 2. Fetch staff to compute count per role
      const staffRes = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "user_profiles",
        }),
      });
      const staffJson = await staffRes.json();
      const staffList = staffJson.data || [];

      if (json.data) {
        const parsedRoles = json.data.map((r: any) => {
          let perms: RolePermissionMatrix = { panels: {}, actions: { view: true, create: true, edit: false, delete: false } };
          try {
            perms = typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions;
          } catch {}
          
          const count = staffList.filter((s: any) => s.role_id === r.id || s.role === r.name || s.role === r.id).length;
          return {
            ...r,
            permissions: perms,
            staff_count: count,
          };
        });
        setRoles(parsedRoles);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("Failed to load user roles");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    const initialPanels: Record<string, boolean> = {
      dashboard: true,
      pos: true,
      sales: true,
      products: true,
      categories: true,
      brands: true,
      units: true,
      purchase: false,
      returns: true,
      expenses: false,
      khata: true,
      registers: true,
      accounts: false,
      reports: false,
      pharmacy_expiry: false,
      pharmacy_formulas: false,
      staff: false,
      roles: false,
      settings: false,
    };
    setPanels(initialPanels);
    setActions({
      view: true,
      create: true,
      edit: false,
      delete: false,
      allow_discounts: true,
      view_cost: false,
      edit_bill: false,
      delete_bill: false,
      manage_settings: false,
    });

    const initGranular: Record<string, any> = {};
    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        initGranular[m.key] = {
          view: initialPanels[m.key] || false,
          create: initialPanels[m.key] || false,
          edit: false,
          delete: false,
        };
      });
    });
    setGranular(initGranular);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: UserRoleRecord) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    const perms = role.permissions || { panels: {}, actions: {} };
    setPanels(perms.panels || {});
    setActions(perms.actions || { view: true, create: true, edit: false, delete: false });
    
    // Fill granular permissions
    const initGranular: Record<string, any> = perms.granular || {};
    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        if (!initGranular[m.key]) {
          const isPanelOn = perms.panels?.[m.key] ?? false;
          initGranular[m.key] = {
            view: isPanelOn,
            create: isPanelOn && (perms.actions?.create ?? false),
            edit: isPanelOn && (perms.actions?.edit ?? false),
            delete: isPanelOn && (perms.actions?.delete ?? false),
          };
        }
      });
    });
    setGranular(initGranular);
    setIsModalOpen(true);
  };

  const handleToggleModule = (modKey: string) => {
    setPanels(prev => {
      const nextVal = !prev[modKey];
      const updated = { ...prev, [modKey]: nextVal };
      setGranular(g => ({
        ...g,
        [modKey]: {
          view: nextVal,
          create: nextVal ? g[modKey]?.create ?? true : false,
          edit: nextVal ? g[modKey]?.edit ?? false : false,
          delete: nextVal ? g[modKey]?.delete ?? false : false,
        }
      }));
      return updated;
    });
  };

  const handleToggleGranular = (modKey: string, perm: "view" | "create" | "edit" | "delete") => {
    setGranular(prev => {
      const current = prev[modKey] || { view: false, create: false, edit: false, delete: false };
      const nextVal = !current[perm];
      const updatedItem = { ...current, [perm]: nextVal };
      
      // If turning on create/edit/delete, ensure view is true
      if (nextVal && perm !== "view") {
        updatedItem.view = true;
      }
      
      // Update parent panel state
      if (perm === "view") {
        setPanels(p => ({ ...p, [modKey]: nextVal }));
      } else if (nextVal) {
        setPanels(p => ({ ...p, [modKey]: true }));
      }

      return { ...prev, [modKey]: updatedItem };
    });
  };

  const handleToggleAction = (actKey: string) => {
    setActions(prev => ({ ...prev, [actKey]: !prev[actKey] }));
  };

  const handleSelectAll = (enable: boolean) => {
    const nextPanels: Record<string, boolean> = {};
    const nextGranular: Record<string, any> = {};
    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        nextPanels[m.key] = enable;
        nextGranular[m.key] = {
          view: enable,
          create: enable,
          edit: enable,
          delete: enable,
        };
      });
    });
    setPanels(nextPanels);
    setGranular(nextGranular);
    setActions(prev => ({
      ...prev,
      view: enable,
      create: enable,
      edit: enable,
      delete: enable,
      allow_discounts: enable,
      view_cost: enable,
      edit_bill: enable,
      delete_bill: enable,
      manage_settings: enable,
    }));
  };

  const handleSaveRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roleName.trim()) {
      toast.error(isUrdu ? "رول کا نام درج کریں" : "Role name is required");
      return;
    }

    setSaving(true);
    const permissionData: RolePermissionMatrix = {
      panels,
      actions,
      granular,
    };

    try {
      if (selectedRole) {
        // Update role
        const res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            table: "roles",
            data: {
              name: roleName,
              description: roleDescription,
              permissions: JSON.stringify(permissionData),
              updated_at: new Date().toISOString(),
            },
            filters: [{ col: "id", op: "eq", val: selectedRole.id }],
          }),
        });

        if (res.ok) {
          toast.success(isUrdu ? "رول کی تفصیلات اور اجازت نامے اپڈیٹ ہو گئے!" : "Role & permissions updated successfully!");
          await notifyAuditEdit(
            userName || "Admin",
            userRole || "SuperAdmin",
            "roles",
            roleName,
            `Permissions matrix modified (${Object.values(panels).filter(Boolean).length} panels enabled)`
          );
          setIsModalOpen(false);
          fetchRoles();
        } else {
          toast.error("Failed to update role");
        }
      } else {
        // Insert new role
        const newId = "role-" + Date.now().toString(36);
        const res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "insert",
            table: "roles",
            data: {
              id: newId,
              shop_id: shopId || "ar-group-shop-001",
              name: roleName,
              description: roleDescription,
              is_system: 0,
              permissions: JSON.stringify(permissionData),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        });

        if (res.ok) {
          toast.success(isUrdu ? "نیا کسٹم رول کامیابی سے شامل کر دیا گیا!" : "New custom role created successfully!");
          await notifyAuditEdit(
            userName || "Admin",
            userRole || "SuperAdmin",
            "roles",
            roleName,
            "Created new custom user role"
          );
          setIsModalOpen(false);
          fetchRoles();
        } else {
          toast.error("Failed to create role");
        }
      }
    } catch (err) {
      console.error("Save role error:", err);
      toast.error("Error saving role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    if (selectedRole.is_system === 1) {
      toast.error(isUrdu ? "سسٹم کا ڈیفالٹ رول حذف نہیں کیا جا سکتا" : "System default roles cannot be deleted");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          table: "roles",
          filters: [{ col: "id", op: "eq", val: selectedRole.id }],
        }),
      });

      if (res.ok) {
        toast.success(isUrdu ? "رول کامیابی سے حذف کر دیا گیا" : "Role deleted successfully");
        await notifyAuditDelete(
          userName || "Admin",
          userRole || "SuperAdmin",
          "roles",
          selectedRole.name,
          "Deleted custom user role"
        );
        setIsDeleteModalOpen(false);
        fetchRoles();
      } else {
        toast.error("Failed to delete role");
      }
    } catch (err) {
      toast.error("Error deleting role");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans pb-16 animate-in fade-in duration-300">
      
      {/* Top Action Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              {isUrdu ? "یوزر رولز اور رسائی کنٹرول (RBAC)" : "User Roles & Access Control (RBAC)"}
            </h2>
            <p className="text-xs text-slate-500">
              {isUrdu 
                ? "ہر رول کے لیے پیجز کی View, Create, Edit, اور Delete رسائی سیٹ کریں" 
                : "Create custom roles with granular read, write, edit, and void permissions per module"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUrdu ? "رولز تلاش کریں..." : "Search roles..."}
              className="pl-8 h-9 text-xs w-44 sm:w-52 bg-slate-50 border-slate-200"
            />
          </div>
          <Link href="/dashboard/staff">
            <Button variant="outline" className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
              <Users size={14} className="mr-1.5 text-blue-600" />
              {isUrdu ? "اسٹاف لسٹ" : "Staff List"}
            </Button>
          </Link>
          <Button
            onClick={handleOpenAdd}
            className="text-white h-9 text-xs font-semibold px-3.5 shadow-xs cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Plus size={14} className="mr-1" />
            {isUrdu ? "نیا رول بنائیں" : "New Custom Role"}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-0.5">
          <p className="font-bold">
            {isUrdu ? "رول بیسڈ رسائی کا اصول (RBAC Policy)" : "Role-Based Access Control & Real-time Audit Protection"}
          </p>
          <p className="text-blue-700/90 leading-relaxed">
            {isUrdu 
              ? "یہاں بنائے گئے رولز فوری طور پر [Staff Management] کے ڈراپ ڈاؤن میں ظاہر ہوں گے اور اسی کے مطابق صارفین کو متعلقہ پیجز اور نوٹیفیکیشنز موصول ہوں گے۔" 
              : "Roles created here are instantly available to assign in Staff Management. Users only access modules granted to their role, and critical edits/deletes are logged to notifications."}
          </p>
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-xs font-medium">Loading user roles & permissions...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <Shield size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No User Roles Found</p>
          <p className="text-xs text-slate-400 mt-1">Click "New Custom Role" to define permissions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRoles.map((role) => {
            const activePanelsCount = Object.values(role.permissions?.panels || {}).filter(Boolean).length;
            const canEditAction = role.permissions?.actions?.edit ?? false;
            const canDeleteAction = role.permissions?.actions?.delete ?? false;

            return (
              <div 
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Top Role Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                        style={{ backgroundColor: role.is_system === 1 ? "#1e293b" : theme.primaryColor }}
                      >
                        <Shield size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {role.is_system === 1 ? (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Lock size={10} /> System Default
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Unlock size={10} /> Custom Role
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium">
                            • {role.staff_count || 0} Staff Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {role.description || "No description provided for this user role."}
                  </p>

                  {/* Permission Highlights */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Accessible Modules:</span>
                      <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {activePanelsCount} / 17 Modules
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                        Read / View ✓
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        role.permissions?.actions?.create ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}>
                        Create / Add
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        canEditAction ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}>
                        Edit
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        canDeleteAction ? "bg-red-50 text-red-700 border-red-100" : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}>
                        Delete / Void
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    onClick={() => handleOpenEdit(role)}
                    variant="outline"
                    className="h-8 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 flex-1"
                  >
                    <Edit2 size={13} className="mr-1.5 text-blue-600" />
                    {isUrdu ? "اجازت نامے تبدیل کریں" : "Edit Permissions"}
                  </Button>

                  {role.is_system === 0 && (
                    <Button
                      onClick={() => {
                        setSelectedRole(role);
                        setIsDeleteModalOpen(true);
                      }}
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 p-0"
                      title="Delete Role"
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Add / Edit Role & Granular Permissions ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div 
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {selectedRole ? (isUrdu ? "رول اور اجازت نامے ترمیم کریں" : "Edit Role & Granular Permissions") : (isUrdu ? "نیا کسٹم رول بنائیں" : "Create New Custom Role")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isUrdu ? "ہر ماڈیول کے لیے اجازت نامے منتخب کریں" : "Configure module access and action privileges"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
              
              {/* Role Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    {isUrdu ? "رول کا نام *" : "Role Title *"}
                  </label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder={isUrdu ? "مثلاً سینئر کیشیئر / اسسٹنٹ مینیجر" : "e.g. Senior Cashier / Assistant Manager"}
                    className="bg-slate-50 border-slate-200 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">
                    {isUrdu ? "رول کی مختصر تفصیل" : "Role Description"}
                  </label>
                  <Input
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder={isUrdu ? "مثلاً کاؤنٹر سیلز اور اسٹاک دیکھنے کا مجاز" : "e.g. Authorized to process counter checkout and view sales"}
                    className="bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-700">{isUrdu ? "فوری انتخاب:" : "Quick Selection:"}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 rounded bg-slate-900 text-white font-semibold text-[11px] hover:bg-slate-800"
                  >
                    {isUrdu ? "تمام منتخب کریں (مکمل رسائی)" : "Select All (Full Access)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-semibold text-[11px] hover:bg-slate-300"
                  >
                    {isUrdu ? "سب غیر منتخب کریں" : "Deselect All"}
                  </button>
                </div>
              </div>

              {/* Granular Module Permissions Matrix */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  {isUrdu ? "ماڈیولز اور ایکشنز کی اجازت (Permission Matrix)" : "Granular Modules & Action Privileges"}
                </h4>

                <div className="space-y-4">
                  {MODULE_GROUPS.map((group) => (
                    <div key={group.title} className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200/80 flex items-center gap-2">
                        <group.icon size={15} className="text-slate-600" />
                        <span className="font-bold text-slate-800 text-xs">{isUrdu ? group.urduTitle : group.title}</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {group.modules.map((mod) => {
                          const isEnabled = panels[mod.key] ?? false;
                          const gPerm = granular[mod.key] || { view: isEnabled, create: isEnabled, edit: false, delete: false };

                          return (
                            <div key={mod.key} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/40">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModule(mod.key)}
                                  className="cursor-pointer text-slate-700 hover:text-slate-900"
                                >
                                  {isEnabled ? (
                                    <CheckSquare size={17} className="text-blue-600" />
                                  ) : (
                                    <Square size={17} className="text-slate-300" />
                                  )}
                                </button>
                                <div>
                                  <p className={`font-semibold ${isEnabled ? "text-slate-900" : "text-slate-400"}`}>
                                    {isUrdu ? mod.urdu : mod.name}
                                  </p>
                                </div>
                              </div>

                              {/* 4 Action check chips */}
                              <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleGranular(mod.key, "view")}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                    gPerm.view 
                                      ? "bg-blue-50 text-blue-700 border-blue-200" 
                                      : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  {isUrdu ? "دیکھیں" : "Read"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGranular(mod.key, "create")}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                    gPerm.create 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  {isUrdu ? "درج کریں" : "Create"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGranular(mod.key, "edit")}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                    gPerm.edit 
                                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                                      : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  {isUrdu ? "ترمیم" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGranular(mod.key, "delete")}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                    gPerm.delete 
                                      ? "bg-red-50 text-red-700 border-red-200" 
                                      : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                                  }`}
                                >
                                  {isUrdu ? "حذف" : "Delete"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Privileges & Audit Triggers */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Key size={16} className="text-purple-600" />
                  {isUrdu ? "خصوصی کاروباری اختیارات (Special Privileges)" : "Special Financial & Operational Privileges"}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPECIAL_ACTIONS.map((act) => {
                    const isChecked = actions[act.key] ?? false;
                    return (
                      <button
                        key={act.key}
                        type="button"
                        onClick={() => handleToggleAction(act.key)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isChecked 
                            ? "bg-purple-50/50 border-purple-200 text-purple-950" 
                            : "bg-slate-50/40 border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {isChecked ? <CheckSquare size={16} className="text-purple-600" /> : <Square size={16} className="text-slate-300" />}
                        </span>
                        <div>
                          <p className="font-semibold text-xs">{isUrdu ? act.urdu : act.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{isUrdu ? "استعمال پر آڈٹ لاگ محفوظ ہوگا" : "Logs audit entry on trigger"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="text-xs text-slate-600"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={saving}
                className="text-white text-xs font-semibold px-4 shadow-xs cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <CheckCircle2 size={13} className="mr-1.5" />}
                {selectedRole ? (isUrdu ? "تبدیلیاں محفوظ کریں" : "Save Changes") : (isUrdu ? "رول محفوظ کریں" : "Create Role")}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ── */}
      {isDeleteModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                {isUrdu ? "کیا آپ یہ رول حذف کرنا چاہتے ہیں؟" : "Delete User Role?"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isUrdu 
                  ? `کیا آپ واقعی '${selectedRole.name}' رول حذف کرنا چاہتے ہیں؟ اس سے وابستہ صارفین کے اختیارات متاثر ہو سکتے ہیں۔` 
                  : `Are you sure you want to permanently delete '${selectedRole.name}'? Staff assigned to this role will lose these custom privileges.`}
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={saving}
                className="flex-1 border-slate-200 text-xs"
              >
                {isUrdu ? "منسوخ کریں" : "Cancel"}
              </Button>
              <Button
                onClick={handleDeleteRole}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs"
              >
                {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : <Trash2 size={13} className="mr-1" />}
                {isUrdu ? "ہاں، حذف کریں" : "Yes, Delete Role"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
