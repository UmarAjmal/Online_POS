"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Plus, Edit2, Trash2, Key, ShieldAlert, Loader2, 
  X, CheckSquare, Square, ShieldCheck, Mail, User, Shield, FileText, Landmark
} from "lucide-react";
import { toast } from "sonner";
import { SubscriptionBlocker } from "@/components/dashboard/SubscriptionBlocker";
import { notifyAuditEdit, notifyAuditDelete } from "@/lib/notifications";

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  role: string; // 'salesman' | 'manager' | 'superadmin' | custom role
  role_id?: string;
  created_at: string;
  permissions: {
    panels: Record<string, boolean>;
    actions: Record<string, boolean>;
  } | null;
}

const PANELS = [
  { key: "dashboard", label: "Overview Dashboard", labelUr: "ڈیش بورڈ اوور ویو" },
  { key: "pos", label: "POS / Cashier", labelUr: "پوائنٹ آف سیل (POS)" },
  { key: "sales", label: "Sales & Ledger", labelUr: "سیلز اور انوائسز" },
  { key: "products", label: "Products & Stock", labelUr: "پروڈکٹس اور اسٹاک" },
  { key: "categories", label: "Categories", labelUr: "کیٹیگریز" },
  { key: "brands", label: "Brands", labelUr: "برانڈز" },
  { key: "units", label: "Units & Packings", labelUr: "یونٹس اور پیکنگ" },
  { key: "purchase", label: "Purchase / Stock-In", labelUr: "خریداری اور اسٹاک ان" },
  { key: "returns", label: "Returns / Adjustments", labelUr: "واپسی اور ایڈجسٹمنٹ" },
  { key: "expenses", label: "Expenses", labelUr: "روزمرہ اخراجات" },
  { key: "khata", label: "Khata (Ledger)", labelUr: "کھاتہ کسٹمر و سپلائر" },
  { key: "registers", label: "Register Ledger", labelUr: "کیش رجسٹر اور ڈے بک" },
  { key: "accounts", label: "Accounts Ledger", labelUr: "اکاؤنٹس اور مالیات" },
  { key: "pharmacy_expiry", label: "Pharmacy Expiry", labelUr: "میڈیسن ایکسپائری ٹریکر" },
  { key: "pharmacy_formulas", label: "Formulations", labelUr: "جنرک فارمولیشنز" },
  { key: "staff", label: "Staff Management", labelUr: "اسٹاف مینجمنٹ" },
  { key: "roles", label: "User Roles & RBAC", labelUr: "یوزر رولز اور RBAC" },
  { key: "settings", label: "System Settings", labelUr: "سسٹم سیٹنگز" },
];

const ACTIONS = [
  { key: "create", label: "Create / Add Records", labelUr: "نیا ریکارڈ درج کریں" },
  { key: "edit", label: "Edit / Modify Records", labelUr: "ریکارڈ میں تبدیلی کریں" },
  { key: "delete", label: "Delete / Void Records", labelUr: "ریکارڈ حذف / ختم کریں" },
  { key: "edit_bill", label: "Edit Settled Bills", labelUr: "سیٹلڈ بلز میں ترمیم کریں" },
  { key: "delete_bill", label: "Delete / Void Bills", labelUr: "بل منسوخ / ڈیلیٹ کریں" },
  { key: "edit_account", label: "Edit Accounts", labelUr: "اکاؤنٹس میں ترمیم کریں" },
  { key: "delete_account", label: "Delete Accounts", labelUr: "اکاؤنٹس حذف کریں" },
  { key: "allow_discounts", label: "Allow Counter Discounts", labelUr: "کاؤنٹر ڈسکاؤنٹ کی اجازت" },
  { key: "view_cost", label: "View Cost Prices", labelUr: "خریداری لاگت قیمت دیکھیں" },
];

const DEFAULT_PERMISSIONS = {
  panels: {
    dashboard: true,
    pos: true,
    sales: true,
    registers: true,
    purchase: true,
    products: true,
    categories: true,
    brands: true,
    units: true,
    khata: true,
    returns: true,
    expenses: true,
    accounts: true,
    pharmacy_expiry: true,
    pharmacy_formulas: true,
    staff: false,
    roles: false,
    settings: false,
  },
  actions: {
    create: true,
    edit: false,
    delete: false,
    edit_bill: false,
    delete_bill: false,
    edit_account: false,
    delete_account: false,
    allow_discounts: true,
    view_cost: false,
  }
};

export default function StaffPage() {
  const { shopId, userRole, hasPayroll, subscriptionTier, userName } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [dynamicRoles, setDynamicRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Salesman");
  const [roleId, setRoleId] = useState("");
  const [panelsPerms, setPanelsPerms] = useState<Record<string, boolean>>({});
  const [actionsPerms, setActionsPerms] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Payroll State
  const [activeTab, setActiveTab] = useState<"staff" | "payroll">("staff");
  const [payrollSlips, setPayrollSlips] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "payroll") {
        setActiveTab("payroll");
      }
    }
  }, []);
  
  // Payslip Form
  const [isAddPayslipOpen, setIsAddPayslipOpen] = useState(false);
  const [slipStaffId, setSlipStaffId] = useState("");
  const [slipMonth, setSlipMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
  });
  const [slipBaseSalary, setSlipBaseSalary] = useState<number>(0);
  const [slipAllowances, setSlipAllowances] = useState<number>(0);
  const [slipDeductions, setSlipDeductions] = useState<number>(0);
  const [slipAccountId, setSlipAccountId] = useState("");

  const fetchStaff = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          id,
          name,
          email,
          role,
          role_id,
          created_at,
          permissions
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaffList((data as any) || []);

      // Fetch dynamic roles
      const { data: rolesData } = await supabase
        .from("roles")
        .select("id, name, permissions")
        .eq("shop_id", shopId)
        .order("name");

      if (rolesData) {
        setDynamicRoles(rolesData);
      }

      // If payroll enabled, fetch slips and accounts
      if (hasPayroll) {
        const { data: slips } = await supabase
          .from("payroll_slips")
          .select(`
            id,
            month_year,
            base_salary,
            allowances,
            deductions,
            net_payable,
            status,
            created_at,
            user_profiles ( name )
          `)
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false });
        if (slips) setPayrollSlips(slips);

        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name, current_balance, type")
          .eq("shop_id", shopId)
          .in("type", ["cash", "bank"])
          .order("name");
        if (accounts) setCashAccounts(accounts);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(isUrdu ? "اسٹاف لسٹ لوڈ کرنے میں مسئلہ ہوا" : "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [shopId, hasPayroll]);

  const handleRoleChange = (selectedRoleName: string) => {
    setRole(selectedRoleName);
    
    // Check if dynamic role matched
    const matchedRole = dynamicRoles.find(r => r.name === selectedRoleName);
    if (matchedRole) {
      setRoleId(matchedRole.id);
      if (matchedRole.permissions) {
        const initialPanels: Record<string, boolean> = {};
        const initialActions: Record<string, boolean> = {};
        PANELS.forEach(p => initialPanels[p.key] = matchedRole.permissions.panels?.[p.key] ?? false);
        ACTIONS.forEach(a => initialActions[a.key] = matchedRole.permissions.actions?.[a.key] ?? false);
        setPanelsPerms(initialPanels);
        setActionsPerms(initialActions);
      }
      return;
    }

    setRoleId("");
    // Fallback standard roles
    if (selectedRoleName.toLowerCase().includes("superadmin") || selectedRoleName.toLowerCase().includes("super admin")) {
      const allPanels: Record<string, boolean> = {};
      const allActions: Record<string, boolean> = {};
      PANELS.forEach(p => allPanels[p.key] = true);
      ACTIONS.forEach(a => allActions[a.key] = true);
      setPanelsPerms(allPanels);
      setActionsPerms(allActions);
    } else if (selectedRoleName.toLowerCase().includes("manager")) {
      const mgrPanels: Record<string, boolean> = {};
      const mgrActions: Record<string, boolean> = {};
      PANELS.forEach(p => mgrPanels[p.key] = p.key !== "settings" && p.key !== "roles");
      ACTIONS.forEach(a => mgrActions[a.key] = a.key !== "delete" && a.key !== "delete_account");
      setPanelsPerms(mgrPanels);
      setActionsPerms(mgrActions);
    } else {
      // Salesman / Default
      const initialPanels: Record<string, boolean> = {};
      const initialActions: Record<string, boolean> = {};
      PANELS.forEach(p => initialPanels[p.key] = DEFAULT_PERMISSIONS.panels[p.key as keyof typeof DEFAULT_PERMISSIONS.panels] ?? false);
      ACTIONS.forEach(a => initialActions[a.key] = DEFAULT_PERMISSIONS.actions[a.key as keyof typeof DEFAULT_PERMISSIONS.actions] ?? false);
      setPanelsPerms(initialPanels);
      setActionsPerms(initialActions);
    }
  };

  const openAddModal = () => {
    setSelectedStaff(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole(dynamicRoles[0]?.name || "Salesman");
    setRoleId(dynamicRoles[0]?.id || "");
    
    // Initialize permissions with defaults
    const initialPanels: Record<string, boolean> = {};
    const initialActions: Record<string, boolean> = {};
    PANELS.forEach(p => initialPanels[p.key] = DEFAULT_PERMISSIONS.panels[p.key as keyof typeof DEFAULT_PERMISSIONS.panels] ?? false);
    ACTIONS.forEach(a => initialActions[a.key] = DEFAULT_PERMISSIONS.actions[a.key as keyof typeof DEFAULT_PERMISSIONS.actions] ?? false);
    
    setPanelsPerms(initialPanels);
    setActionsPerms(initialActions);
    setModalOpen(true);
  };

  const openEditModal = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setName(staff.name);
    setEmail(staff.email || "");
    setPassword("");
    setRole(staff.role);
    setRoleId(staff.role_id || "");

    // Load existing permissions or defaults
    const staffPanels = staff.permissions?.panels || {};
    const staffActions = staff.permissions?.actions || {};
    
    const initialPanels: Record<string, boolean> = {};
    const initialActions: Record<string, boolean> = {};
    
    PANELS.forEach(p => {
      initialPanels[p.key] = staffPanels[p.key] ?? false;
    });
    
    ACTIONS.forEach(a => {
      initialActions[a.key] = staffActions[a.key] ?? false;
    });

    setPanelsPerms(initialPanels);
    setActionsPerms(initialActions);
    setModalOpen(true);
  };

  const togglePanelPerm = (key: string) => {
    setPanelsPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleActionPerm = (key: string) => {
    setActionsPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(isUrdu ? "نام لکھنا لازمی ہے" : "Name is required");

    setSubmitting(true);
    const toastId = toast.loading(
      selectedStaff 
        ? (isUrdu ? "اسٹاف پروفائل اپ ڈیٹ کی جا رہی ہے..." : "Updating staff...") 
        : (isUrdu ? "نیا اسٹاف رجسٹر کیا جا رہا ہے..." : "Registering new staff...")
    );

    try {
      const formattedPermissions = {
        panels: panelsPerms,
        actions: actionsPerms
      };

      if (selectedStaff) {
        // Edit staff user
        const { error } = await supabase.rpc("update_staff_user", {
          staff_id: selectedStaff.id,
          staff_name: name,
          staff_role: role,
          staff_permissions: formattedPermissions,
          staff_password: password || null
        });

        if (error) throw error;

        // Sync party name
        if (name.trim() !== selectedStaff.name) {
          await supabase
            .from("parties")
            .update({ name: `${name.trim()} (Staff)` })
            .eq("shop_id", shopId)
            .eq("name", `${selectedStaff.name} (Staff)`);
        }

        await notifyAuditEdit(
          userName || "Admin",
          userRole || "SuperAdmin",
          "staff",
          name,
          `Modified staff profile and permissions (Role: ${role})`
        );

        toast.success(isUrdu ? "اسٹاف پروفائل اور اختیارات کامیابی سے اپ ڈیٹ ہو گئے" : "Staff profile updated successfully", { id: toastId });
      } else {
        // Create new staff user
        if (!email.trim()) throw new Error(isUrdu ? "ای میل لکھنا لازمی ہے" : "Email is required");
        if (!password.trim()) throw new Error(isUrdu ? "پاس ورڈ لکھنا لازمی ہے" : "Password is required");

        const { data: newUserId, error } = await supabase.rpc("create_staff_user", {
          staff_email: email,
          staff_password: password,
          staff_name: name,
          staff_shop_id: shopId,
          staff_role: role,
          staff_permissions: formattedPermissions
        });

        if (error) throw error;

        // Create party record
        await supabase.from("parties").insert({
          shop_id: shopId,
          name: `${name.trim()} (Staff)`,
          phone: null,
          type: "customer",
          opening_balance: 0
        });

        await notifyAuditEdit(
          userName || "Admin",
          userRole || "SuperAdmin",
          "staff",
          name,
          `Registered new staff account (${email}) with role: ${role}`
        );

        toast.success(isUrdu ? "نیا اسٹاف ممبر کامیابی سے رجسٹر ہو گیا" : "Staff registered successfully", { id: toastId });
      }

      setModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isUrdu ? "کوئی خرابی پیش آئی" : "An error occurred"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    const toastId = toast.loading(isUrdu ? "اسٹاف حذف کیا جا رہا ہے..." : "Deleting staff user...");

    try {
      const { error } = await supabase.rpc("delete_staff_user", {
        staff_id: selectedStaff.id
      });

      if (error) throw error;

      // Delete corresponding party record
      await supabase
        .from("parties")
        .delete()
        .eq("shop_id", shopId)
        .eq("name", `${selectedStaff.name} (Staff)`);

      await notifyAuditDelete(
        userName || "Admin",
        userRole || "SuperAdmin",
        "staff",
        selectedStaff.name,
        `Deleted staff user (${selectedStaff.email})`
      );

      toast.success(isUrdu ? "اسٹاف ممبر کامیابی سے ڈیلیٹ کر دیا گیا" : "Staff member deleted successfully", { id: toastId });
      setDeleteConfirmOpen(false);
      fetchStaff();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isUrdu ? "اسٹاف ڈیلیٹ کرنے میں ناکامی" : "Failed to delete staff member"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipStaffId || !slipAccountId || !slipMonth || slipBaseSalary <= 0) {
      toast.error(isUrdu ? "براہ کرم تمام لازمی خانے پر کریں۔" : "Please fill all required fields correctly.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(isUrdu ? "پے رول پروسیس ہو رہا ہے..." : "Processing payroll...");

    try {
      const netPayable = slipBaseSalary + slipAllowances - slipDeductions;
      
      const { error: slipError } = await supabase.from("payroll_slips").insert({
        shop_id: shopId,
        staff_id: slipStaffId,
        month_year: slipMonth,
        base_salary: slipBaseSalary,
        allowances: slipAllowances,
        deductions: slipDeductions,
        net_payable: netPayable,
        status: "paid"
      });

      if (slipError) throw slipError;

      // Automatically deduct from Cash Account
      const selectedStaff = staffList.find(s => s.id === slipStaffId);
      const staffName = selectedStaff ? selectedStaff.name : "Staff";
      
      const { error: txError } = await supabase.from("account_transactions").insert({
        shop_id: shopId,
        account_id: slipAccountId,
        type: "withdrawal",
        amount: netPayable,
        remarks: `Salary Payment [${slipMonth}] - ${staffName}`
      });

      if (txError) throw txError;

      // Sync with Employee Ledger/Khata
      const { data: partyData } = await supabase
        .from("parties")
        .select("id")
        .eq("shop_id", shopId)
        .eq("name", `${staffName} (Staff)`)
        .eq("type", "customer")
        .maybeSingle();

      if (partyData) {
        const grossSalary = Number(slipBaseSalary) + Number(slipAllowances);

        // 1. Log Salary Earned (Charge)
        const { error: earnError } = await supabase
          .from("credit_transactions")
          .insert({
            shop_id: shopId,
            customer_id: partyData.id,
            amount: grossSalary,
            transaction_type: "charge",
            remarks: `Monthly Salary Earned [${slipMonth}]`
          });
        if (!earnError) {
          await supabase.rpc("increment_party_balance", {
            p_id: partyData.id,
            amount: grossSalary
          });
        }

        // 2. Log Salary Paid (Payment)
        const { error: payError } = await supabase
          .from("credit_transactions")
          .insert({
            shop_id: shopId,
            customer_id: partyData.id,
            amount: netPayable,
            transaction_type: "payment",
            remarks: `Salary Disbursed [${slipMonth}]`
          });
        if (!payError) {
          await supabase.rpc("increment_party_balance", {
            p_id: partyData.id,
            amount: -netPayable
          });
        }
      }

      toast.success(isUrdu ? "سیلری سلپ تیار اور رقم ادا ہو گئی! 💸" : "Payslip generated and salary disbursed! 💸", { id: toastId });
      setIsAddPayslipOpen(false);
      setSlipBaseSalary(0);
      setSlipAllowances(0);
      setSlipDeductions(0);
      setSlipAccountId("");
      fetchStaff();
    } catch (err: any) {
      toast.error((isUrdu ? "خرابی: " : "Failed: ") + err.message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (subscriptionTier === "free") {
    return (
      <div className="space-y-6">
        <SubscriptionBlocker featureName="Staff Management Roles & Control" requiredPlan="Starter" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2 flex-wrap">
          <Link href="/dashboard/roles">
            <button className="flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold px-3.5 py-2 rounded-lg border border-purple-200 transition text-xs shrink-0 cursor-pointer">
              <Shield size={14} />
              {isUrdu ? "یوزر رولز اور RBAC" : "User Roles & RBAC"}
            </button>
          </Link>
          {hasPayroll && (
            <div className="bg-slate-100 p-1 rounded-xl inline-flex text-xs font-semibold shrink-0">
              <button
                onClick={() => setActiveTab("staff")}
                className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === "staff" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {isUrdu ? "اسٹاف لسٹ" : "Staff List"}
              </button>
              <button
                onClick={() => setActiveTab("payroll")}
                className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === "payroll" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {isUrdu ? "پے رول" : "Payroll"}
              </button>
            </div>
          )}
          {activeTab === "staff" && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow-sm transition-all text-xs shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              {isUrdu ? "نیا اسٹاف شامل کریں" : "Register Staff User"}
            </button>
          )}
          {activeTab === "payroll" && hasPayroll && (
            <button
              onClick={() => setIsAddPayslipOpen(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all text-sm shrink-0 cursor-pointer"
            >
              <FileText size={18} />
              {isUrdu ? "سیلری سلپ بنائیں" : "Generate Payslip"}
            </button>
          )}
        </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-zinc-400 mb-3" size={32} />
          <span className="text-zinc-500 text-sm">{isUrdu ? "ڈیٹا لوڈ ہو رہا ہے..." : "Loading data..."}</span>
        </div>
      ) : activeTab === "staff" ? (
        staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-zinc-200 border-dashed rounded-xl text-center">
            <Users className="text-zinc-300 mb-3" size={48} />
            <h3 className="font-semibold text-zinc-800 text-base">{isUrdu ? "کوئی اسٹاف موجود نہیں" : "No Staff Found"}</h3>
            <p className="text-zinc-500 text-sm max-w-sm mt-1 mb-4">
              {isUrdu ? "اپنی دکان کے ملازمین کو شامل کریں اور ان کے اختیارات مقرر کریں۔" : "Get started by adding staff members to your shop and assigning their respective permissions."}
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm"
            >
              {isUrdu ? "پہلا اسٹاف ممبر شامل کریں" : "Add First Staff"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <motion.div
              layout
              key={staff.id}
              className="bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 p-5 shadow-sm flex flex-col justify-between transition duration-200"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-base shadow-inner">
                      {staff.name?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-950 leading-tight">{staff.name}</h3>
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full ${
                        staff.role === "superadmin" 
                          ? "bg-purple-100 text-purple-700" 
                          : staff.role === "manager" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {staff.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-zinc-400" />
                    <span className="truncate">{staff.email || (isUrdu ? "کوئی ای میل درج نہیں" : "No Email")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-zinc-400" />
                    <span>
                      {staff.role === "superadmin"
                        ? (isUrdu ? "مکمل ایڈمن اختیارات" : "Full Administrative Access")
                        : (isUrdu 
                            ? `${Object.values(staff.permissions?.panels || {}).filter(Boolean).length} / ${PANELS.length} ماڈیولز فعال`
                            : `${Object.values(staff.permissions?.panels || {}).filter(Boolean).length} / ${PANELS.length} Panels enabled`)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 mt-5">
                <button
                  onClick={() => openEditModal(staff)}
                  className="p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Edit2 size={14} />
                  {isUrdu ? "اختیارات" : "Permissions"}
                </button>
                {staff.role !== "superadmin" && (
                  <button
                    onClick={() => {
                      setSelectedStaff(staff);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 size={14} />
                    {isUrdu ? "حذف کریں" : "Delete"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        )
      ) : null}

      {/* Add / Edit Staff Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-zinc-200"
            >
              <div className="p-6 border-b border-zinc-100 sticky top-0 bg-white flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                  {selectedStaff ? <Edit2 className="text-blue-600" size={18} /> : <Plus className="text-blue-600" size={18} />}
                  {selectedStaff 
                    ? (isUrdu ? "اسٹاف اختیارات میں ترمیم کریں" : "Modify Staff Permissions") 
                    : (isUrdu ? "نیا اسٹاف ممبر شامل کریں" : "Register New Staff Member")}
                </h2>
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">{isUrdu ? "مکمل نام" : "Full Name"}</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isUrdu ? "مثال: علی احمد" : "John Doe"}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">{isUrdu ? "ای میل ایڈریس" : "Email Address"}</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        required
                        disabled={!!selectedStaff}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">
                      {selectedStaff 
                        ? (isUrdu ? "نیا پاس ورڈ (پرانا رکھنے کے لیے خالی چھوڑیں)" : "New Password (Leave blank to keep current)") 
                        : (isUrdu ? "پاس ورڈ" : "Password")}
                    </label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="password"
                        required={!selectedStaff}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-700">{isUrdu ? "سیکیورٹی رول (RBAC)" : "Security Role (RBAC)"}</label>
                      <Link href="/dashboard/roles" className="text-[10px] text-purple-600 hover:underline font-semibold">
                        {isUrdu ? "+ رولز مینیج کریں" : "+ Manage Roles"}
                      </Link>
                    </div>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                    >
                      {dynamicRoles.length > 0 ? (
                        dynamicRoles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Salesman">{isUrdu ? "سیلز مین (محدود رسائی)" : "Salesman (Limited access)"}</option>
                          <option value="Manager">{isUrdu ? "مینیجر (درمیانہ اختیارات)" : "Manager (Intermediate access)"}</option>
                          <option value="Super Admin">{isUrdu ? "سپر ایڈمن (تمام اختیارات)" : "Super Admin (All access)"}</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {!role.toLowerCase().includes("superadmin") && !role.toLowerCase().includes("super admin") && (
                  <div className="space-y-6 border-t border-zinc-100 pt-6">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-blue-600" />
                        {isUrdu ? "قابل رسائی اسکرینز اور ماڈیولز" : "Accessible Modules / Panels"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {PANELS.map((p) => {
                          const enabled = panelsPerms[p.key];
                          return (
                            <button
                              type="button"
                              key={p.key}
                              onClick={() => togglePanelPerm(p.key)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-semibold transition cursor-pointer ${
                                enabled
                                  ? "bg-blue-50/50 border-blue-200 text-blue-900"
                                  : "border-zinc-200 hover:border-zinc-300 text-zinc-600"
                              }`}
                            >
                              {enabled ? (
                                <CheckSquare size={16} className="text-blue-600 shrink-0" />
                              ) : (
                                <Square size={16} className="text-zinc-400 shrink-0" />
                              )}
                              <span className="truncate">{isUrdu ? p.labelUr : p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-1.5">
                        <Key size={16} className="text-blue-600" />
                        {isUrdu ? "حساس ایکشنز اور پابندیاں" : "Restricted Actions Control"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ACTIONS.map((a) => {
                          const enabled = actionsPerms[a.key];
                          return (
                            <button
                              type="button"
                              key={a.key}
                              onClick={() => toggleActionPerm(a.key)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-semibold transition cursor-pointer ${
                                enabled
                                  ? "bg-blue-50/50 border-blue-200 text-blue-900"
                                  : "border-zinc-200 hover:border-zinc-300 text-zinc-600"
                              }`}
                            >
                              {enabled ? (
                                <CheckSquare size={16} className="text-blue-600 shrink-0" />
                              ) : (
                                <Square size={16} className="text-zinc-400 shrink-0" />
                              )}
                              <span className="truncate">{isUrdu ? a.labelUr : a.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {role === "superadmin" && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                    <ShieldAlert className="text-purple-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-purple-900">{isUrdu ? "سپر ایڈمن اختیارات کی تنبیہ" : "Superadmin Privilege Alert"}</h4>
                      <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                        {isUrdu 
                          ? "اسٹاف کو سپر ایڈمن بنانے سے وہ تمام ماڈیولز، مالیاتی ریکارڈز، اکاؤنٹس اور اسٹاف پر مکمل کنٹرول حاصل کر لے گا۔"
                          : "Setting this staff member as a Superadmin grants them absolute control, enabling them to access all modules and perform all actions, including deleting or editing transactions, cash accounts, and managing other staff."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold border border-zinc-200 hover:bg-zinc-50 rounded-lg transition text-zinc-600 cursor-pointer"
                  >
                    {isUrdu ? "منسوخ کریں" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="animate-spin" size={16} />}
                    {selectedStaff 
                      ? (isUrdu ? "اختیارات محفوظ کریں" : "Update Permissions") 
                      : (isUrdu ? "اسٹاف رجسٹر کریں" : "Register Staff")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Staff Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmOpen && selectedStaff && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 border border-zinc-200 shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <Trash2 size={24} />
                <h3 className="text-lg font-bold">{isUrdu ? "کیا آپ اسٹاف اکاؤنٹ ڈیلیٹ کرنا چاہتے ہیں؟" : "Remove Staff Member?"}</h3>
              </div>
              <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                {isUrdu ? (
                  <>
                    کیا آپ واقعی <strong>{selectedStaff.name}</strong> ({selectedStaff.email}) کا اکاؤنٹ حذف کرنا چاہتے ہیں؟ اس سے ان کا لاگ ان ختم ہو جائے گا، لیکن سابقہ سیلز اور کھاتہ کا ریکارڈ محفوظ رہے گا۔
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <strong>{selectedStaff.name}</strong> ({selectedStaff.email})? 
                    This action is permanent and will delete their login credentials and profile. Historical data generated by this user (like sales, transactions) will be preserved.
                  </>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  {isUrdu ? "منسوخ کریں" : "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin" size={14} />}
                  {isUrdu ? "اکاؤنٹ ڈیلیٹ کریں" : "Delete Account"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payroll Tab Rendering */}
      {activeTab === "payroll" && hasPayroll && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isUrdu ? "تاریخ اجراء" : "Date Generated"}</th>
                  <th className="py-3 px-4">{isUrdu ? "اسٹاف کا نام" : "Staff Name"}</th>
                  <th className="py-3 px-4">{isUrdu ? "مہینہ" : "Month"}</th>
                  <th className="py-3 px-4 text-right">{isUrdu ? "بنیادی تنخواہ" : "Base Salary"}</th>
                  <th className="py-3 px-4 text-right">{isUrdu ? "کل ادائیگی" : "Net Payable"}</th>
                  <th className="py-3 px-4">{isUrdu ? "اسٹیٹس" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollSlips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {isUrdu ? "کوئی پے رول سلپ موجود نہیں ہے۔" : "No payroll slips found."}
                    </td>
                  </tr>
                ) : (
                  payrollSlips.map(slip => (
                    <tr key={slip.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-500 text-xs">{new Date(slip.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{slip.user_profiles?.name}</td>
                      <td className="py-3 px-4 font-semibold text-blue-600">{slip.month_year}</td>
                      <td className="py-3 px-4 text-right text-slate-600">Rs {Number(slip.base_salary).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">Rs {Number(slip.net_payable).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {slip.status === "paid" ? (isUrdu ? "ادا شدہ" : "paid") : slip.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Generate Payslip */}
      <AnimatePresence>
        {isAddPayslipOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0" onClick={() => setIsAddPayslipOpen(false)}
            />
            <motion.div 
              initial={{ scale:0.95, y:10 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg relative z-10 border border-slate-100 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <FileText className="text-blue-600" /> {isUrdu ? "سیلری سلپ تیار کریں" : "Generate Payslip"}
              </h3>
              
              <form onSubmit={handleGeneratePayslip} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "اسٹاف کا انتخاب" : "Select Staff"}</label>
                    <select
                      value={slipStaffId}
                      onChange={e => setSlipStaffId(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                      required
                    >
                      <option value="">{isUrdu ? "-- ملازم منتخب کریں --" : "-- Choose Employee --"}</option>
                      {staffList.filter(s => s.role !== "superadmin").map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "تنخواہ کا مہینہ" : "Salary Month"}</label>
                    <input 
                      type="month"
                      value={slipMonth}
                      onChange={e => setSlipMonth(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                      required
                    >
                    </input>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 my-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "بنیادی تنخواہ (روپے)" : "Base Salary (Rs)"}</label>
                    <input 
                      type="number" min="0" required
                      value={slipBaseSalary || ""}
                      onChange={e => setSlipBaseSalary(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "الاؤنسز (+)" : "Allowances (+)"}</label>
                    <input 
                      type="number" min="0"
                      value={slipAllowances || ""}
                      onChange={e => setSlipAllowances(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "کٹوتی (-)" : "Deductions (-)"}</label>
                    <input 
                      type="number" min="0"
                      value={slipDeductions || ""}
                      onChange={e => setSlipDeductions(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 text-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                  <span className="font-bold text-blue-900">{isUrdu ? "کل واجب الادا رقم" : "Net Payable Amount"}</span>
                  <span className="text-xl font-black text-blue-700">Rs {(slipBaseSalary + slipAllowances - slipDeductions).toLocaleString()}</span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ادائیگی کا اکاؤنٹ" : "Deduct From Account"}</label>
                  <select
                    value={slipAccountId}
                    onChange={e => setSlipAccountId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">{isUrdu ? "-- کیش یا بینک اکاؤنٹ منتخب کریں --" : "-- Select Cash/Bank Account --"}</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({isUrdu ? "بیلنس" : "Bal"}: Rs {Number(acc.current_balance).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddPayslipOpen(false)}
                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    {isUrdu ? "منسوخ کریں" : "Cancel"}
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />} {isUrdu ? "تنخواہ ادا کریں" : "Issue Payslip"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
