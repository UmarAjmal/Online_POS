"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, ArrowRightLeft, Landmark, Coins, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownLeft, Trash2, Download, Scale, Layers,
  TrendingUp, Users, Package, DollarSign
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { SubscriptionBlocker } from "@/components/dashboard/SubscriptionBlocker";
import { calculateTrialBalance } from "@/lib/trialBalance";

interface CashAccount {
  id: string;
  name: string;
  type: string; // 'cash' | 'bank' | 'wallet'
  current_balance: number;
  created_at: string;
}

interface AccountTransaction {
  id: string;
  account_id: string;
  type: string; // 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'
  amount: number;
  ref_type: string | null;
  ref_id: string | null;
  remarks: string | null;
  created_at: string;
  account_name?: string;
}

export default function AccountsPage() {
  const { shopId, shopName, permissions, hasAssetsRec, allowIndustrialAccounts, allowAccounts } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [fixedAssets, setFixedAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // New account form
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<"cash" | "bank" | "wallet">("cash");
  const [newAccBalance, setNewAccBalance] = useState(0);
  const [submittingAccount, setSubmittingAccount] = useState(false);

  // Transfer form
  const [transferSource, setTransferSource] = useState("");
  const [transferDest, setTransferDest] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferRemarks, setTransferRemarks] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Fixed Asset form
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState("furniture");
  const [newAssetPrice, setNewAssetPrice] = useState(0);
  const [newAssetLife, setNewAssetLife] = useState(5);
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // Selected account filter for ledger
  const [selectedAccFilter, setSelectedAccFilter] = useState<string>("all");

  // Tab state
  const [activeTab, setActiveTab] = useState<"wallets" | "chart" | "trial" | "assets">("wallets");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "assets") {
        setActiveTab("assets");
      }
    }
  }, []);

  // General Ledger and Trial Balance data states
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);

  useEffect(() => {
    if (!shopId) return;

    loadData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`accounts-realtime-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_accounts", filter: `shop_id=eq.${shopId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "account_transactions", filter: `shop_id=eq.${shopId}` }, loadData)
      .subscribe((status: string) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  async function loadData() {
    if (!shopId) return;
    setLoading(true);
    try {
      // 1. Fetch cash accounts
      let { data: accs, error: accsErr } = await supabase
        .from("cash_accounts")
        .select("*")
        .eq("shop_id", shopId)
        .order("name");

      if (accsErr) throw accsErr;

      // 2. If no accounts exist, auto-seed defaults
      if (!accs || accs.length === 0) {
        const defaults = [
          { shop_id: shopId, name: "Cash in Hand", type: "cash", current_balance: 0.00 }
        ];
        const { data: inserted, error: insertErr } = await supabase
          .from("cash_accounts")
          .insert(defaults)
          .select();

        if (insertErr) throw insertErr;
        accs = inserted || [];
        toast.success("Default Cash in Hand account created (Rs 0 opening balance)");
      }

      setAccounts(accs);

      // 3. Fetch account transactions
      const { data: txs, error: txsErr } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (txsErr) throw txsErr;

      // Map account names
      const accMap: Record<string, string> = {};
      accs.forEach((a: any) => { accMap[a.id] = a.name; });

      setTransactions((txs || []).map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        account_name: accMap[t.account_id] || "Unknown Account"
      })));

      // 4. Fetch sales revenue
      const { data: salesData } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("shop_id", shopId)
        .neq("is_voided", true)
        .neq("status", "draft");
      const salesSum = (salesData || []).reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0);
      setTotalSales(salesSum);

      // 5. Fetch purchase orders (COGS)
      const { data: purchaseData } = await supabase
        .from("purchase_orders")
        .select("total_amount")
        .eq("shop_id", shopId)
        .neq("is_voided", true);
      const purchasesSum = (purchaseData || []).reduce((sum: number, po: any) => sum + Number(po.total_amount), 0);
      setTotalPurchases(purchasesSum);

      // 6. Fetch expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("shop_id", shopId);
      const expensesSum = (expenseData || []).reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
      setTotalExpenses(expensesSum);

      // 7. Fetch parties (Receivables & Payables)
      const { data: partiesData } = await supabase
        .from("parties")
        .select("type, current_balance")
        .eq("shop_id", shopId);
      const receivablesSum = (partiesData || [])
        .filter((p: any) => p.type === "customer" && Number(p.current_balance) > 0)
        .reduce((sum: number, p: any) => sum + Number(p.current_balance), 0);
      const payablesSum = (partiesData || [])
        .filter((p: any) => p.type === "supplier" && Number(p.current_balance) > 0)
        .reduce((sum: number, p: any) => sum + Number(p.current_balance), 0);
      setTotalReceivable(receivablesSum);
      setTotalPayable(payablesSum);

      // 8. Fetch products (Inventory Asset Value)
      const { data: productsData } = await supabase
        .from("products")
        .select("current_stock, purchase_price_single")
        .eq("shop_id", shopId);
      const inventorySum = (productsData || []).reduce(
        (sum: number, p: any) => sum + (Number(p.purchase_price_single || 0) * Number(p.current_stock || 0)),
        0
      );
      setInventoryValue(inventorySum);

      // 9. Fetch fixed assets if enabled
      if (hasAssetsRec) {
        const { data: assetsData } = await supabase
          .from("fixed_assets")
          .select("*")
          .eq("shop_id", shopId)
          .eq("status", "active")
          .order("created_at", { ascending: false });
        setFixedAssets(assetsData || []);
      }

    } catch (err: any) {
      toast.error("Failed to load accounts: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (permissions?.actions?.edit_account === false) {
      toast.error("Access Denied: You do not have permission to add/edit accounts.");
      return;
    }
    if (!newAccName.trim()) return;
    setSubmittingAccount(true);
    try {
      const { data: newAcc, error } = await supabase
        .from("cash_accounts")
        .insert({
          shop_id: shopId,
          name: newAccName.trim(),
          type: newAccType,
          current_balance: newAccBalance
        })
        .select()
        .single();

      if (error) throw error;

      // Log opening balance transaction if > 0
      if (newAccBalance > 0) {
        await supabase.from("account_transactions").insert({
          shop_id: shopId,
          account_id: newAcc.id,
          type: "deposit",
          amount: newAccBalance,
          remarks: "Opening Balance"
        });
      }

      toast.success("Account added successfully! 🎉");
      setIsAddAccountOpen(false);
      setNewAccName("");
      setNewAccBalance(0);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    if (permissions?.actions?.delete_account === false) {
      toast.error("Access Denied: You do not have permission to delete accounts.");
      return;
    }
    const acc = accounts.find(a => a.id === accountId);
    if (acc && acc.name.toLowerCase() === "cash in hand") {
      // Only block delete if this is the LAST Cash in Hand account
      const cashInHandAccounts = accounts.filter(a => a.name.toLowerCase() === "cash in hand");
      if (cashInHandAccounts.length <= 1) {
        toast.error("At least one 'Cash in Hand' account is required and cannot be deleted! 🚫");
        return;
      }
    }
    if (!confirm("Are you sure you want to delete this account? Associated ledger logs will be permanently deleted, and referencing invoice records will be unlinked.")) return;
    try {
      // Unlink references first to avoid foreign key violations
      await Promise.all([
        supabase.from("invoices").update({ account_id: null }).eq("account_id", accountId),
        supabase.from("purchase_orders").update({ account_id: null }).eq("account_id", accountId),
        supabase.from("expenses").update({ account_id: null }).eq("account_id", accountId),
        supabase.from("credit_transactions").update({ account_id: null }).eq("account_id", accountId)
      ]);

      const { error } = await supabase
        .from("cash_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
      toast.success("Account deleted successfully! 🗑️");
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete account: " + err.message);
    }
  }

  async function handleDownloadPDF() {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("AR GROUP", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Cash & Bank Account Ledger Report", 15, 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const accFilterName = selectedAccFilter === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccFilter)?.name || "Selected Account";
      doc.text(`Account: ${accFilterName}`, 130, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`, 130, 26);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, 30, 195, 30);

      const body = filteredTransactions.map(tx => {
        const isInflow = tx.type === "deposit" || tx.type === "transfer_in";
        return [
          new Date(tx.created_at).toLocaleString(),
          tx.account_name || "Unknown",
          tx.type.replace("_", " ").toUpperCase(),
          tx.remarks || "-",
          `${isInflow ? "+" : "-"} Rs ${tx.amount.toLocaleString()}`
        ];
      });

      autoTable(doc, {
        head: [["Date / Time", "Account Name", "Transaction Type", "Remarks", "Amount"]],
        body: body,
        startY: 35,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
        margin: { left: 15, right: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Powered by Falcon Swift PVT. LTD. POS", 15, 285);

      doc.save(`account_ledger_${selectedAccFilter}.pdf`);
      toast.success("PDF statement downloaded! 📄");
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    }
  }

  async function handleDownloadTrialBalancePDF() {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(shopName || "AR GROUP", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Trial Balance Financial Statement", 15, 26);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`, 130, 26);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, 30, 195, 30);

      const tb = calculateTrialBalance({
        cashBalances: accounts.map((a) => Number(a.current_balance)),
        receivable: totalReceivable,
        payable: totalPayable,
        inventory: inventoryValue,
        fixedAssets: fixedAssets.reduce((sum, a) => sum + Number(a.current_value || 0), 0),
        sales: totalSales,
        purchases: 0,
        expenses: totalExpenses,
      });

      const rows: any[] = [];

      // 1. Assets
      accounts.forEach(a => {
        rows.push([
          "1100",
          `Cash/Bank - ${a.name}`,
          "Asset",
          `Rs ${Number(a.current_balance).toLocaleString()}`,
          "-"
        ]);
      });
      rows.push(["1200", "Accounts Receivable (Khata Customers)", "Asset", `Rs ${totalReceivable.toLocaleString()}`, "-"]);
      rows.push(["1300", "Stock / Inventory Asset", "Asset", `Rs ${inventoryValue.toLocaleString()}`, "-"]);

      // 2. Liabilities
      rows.push(["2100", "Accounts Payable (Khata Suppliers)", "Liability", "-", `Rs ${totalPayable.toLocaleString()}`]);

      // 3. Equity
      rows.push(["3100", "Owner's Capital Account (Equity)", "Equity", "-", `Rs ${tb.ownersEquity.toLocaleString()}`]);

      // 4. Revenue
      rows.push(["4100", "Sales Revenue", "Revenue", "-", `Rs ${totalSales.toLocaleString()}`]);

      // 5. Expenses (purchases are in Stock Asset — not counted again)
      rows.push(["5200", "Operating Expenses", "Expense", `Rs ${totalExpenses.toLocaleString()}`, "-"]);
      if (totalPurchases > 0) {
        rows.push(["—", `Purchases → Stock (reference only: Rs ${totalPurchases.toLocaleString()})`, "Memo", "-", "-"]);
      }

      const sumDebits = tb.sumDebits;
      const sumCredits = tb.sumCredits;

      // Append Total Row
      rows.push([
        "",
        "TOTAL BALANCE",
        "",
        `Rs ${sumDebits.toLocaleString()}`,
        `Rs ${sumCredits.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [["Account Code", "Account Name", "Classification", "Debit Balance", "Credit Balance"]],
        body: rows,
        startY: 35,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" }
        },
        didParseCell: function (data) {
          if (data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [30, 41, 59];
          }
        },
        margin: { left: 15, right: 15 }
      });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Powered by Falcon Swift PVT. LTD. POS & ERP System", 15, 285);

      doc.save(`trial_balance_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Trial Balance PDF downloaded! 📄");
    } catch (err: any) {
      toast.error("Failed to generate Trial Balance PDF: " + err.message);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (permissions?.actions?.edit_account === false) {
      toast.error("Access Denied: You do not have permission to perform account transfers.");
      return;
    }
    if (!transferSource || !transferDest || transferAmount <= 0) {
      toast.error("Please fill in all details correctly.");
      return;
    }
    if (transferSource === transferDest) {
      toast.error("Source and destination accounts cannot be the same.");
      return;
    }

    const srcAcc = accounts.find(a => a.id === transferSource);
    if (srcAcc && srcAcc.current_balance < transferAmount) {
      if (!confirm("Warning: Transfer amount exceeds current balance. Proceed anyway?")) {
        return;
      }
    }

    setSubmittingTransfer(true);
    try {
      // 1. Deduct from source
      const currentSrc = accounts.find(a => a.id === transferSource)?.current_balance || 0;
      await supabase.from("cash_accounts").update({ current_balance: currentSrc - transferAmount }).eq("id", transferSource);

      // 2. Add to destination
      const currentDest = accounts.find(a => a.id === transferDest)?.current_balance || 0;
      await supabase.from("cash_accounts").update({ current_balance: currentDest + transferAmount }).eq("id", transferDest);

      // 3. Log transactions
      const remarks = transferRemarks.trim() || `Transfer from ${accounts.find(a => a.id === transferSource)?.name} to ${accounts.find(a => a.id === transferDest)?.name}`;

      await supabase.from("account_transactions").insert([
        {
          shop_id: shopId,
          account_id: transferSource,
          type: "transfer_out",
          amount: transferAmount,
          remarks
        },
        {
          shop_id: shopId,
          account_id: transferDest,
          type: "transfer_in",
          amount: transferAmount,
          remarks
        }
      ]);

      toast.success("Transfer completed successfully! 💸");
      setIsTransferOpen(false);
      setTransferAmount(0);
      setTransferRemarks("");
      loadData();
    } catch (err: any) {
      toast.error("Transfer failed: " + err.message);
    } finally {
      setSubmittingTransfer(false);
    }
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (permissions?.actions?.edit_account === false) {
      toast.error("Access Denied: You do not have permission to add assets.");
      return;
    }
    if (!newAssetName.trim() || newAssetPrice <= 0 || newAssetLife <= 0) return;
    setSubmittingAsset(true);
    try {
      const { error } = await supabase
        .from("fixed_assets")
        .insert({
          shop_id: shopId,
          name: newAssetName.trim(),
          asset_type: newAssetType,
          purchase_date: new Date().toISOString().split("T")[0],
          purchase_price: newAssetPrice,
          useful_life_years: newAssetLife,
          current_value: newAssetPrice
        });

      if (error) throw error;
      toast.success("Fixed Asset added successfully! 🏢");
      setIsAddAssetOpen(false);
      setNewAssetName("");
      setNewAssetPrice(0);
      setNewAssetLife(5);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAsset(false);
    }
  }

  const filteredTransactions = transactions.filter(t =>
    selectedAccFilter === "all" ? true : t.account_id === selectedAccFilter
  );

  const totalFixedAssetsVal = fixedAssets.reduce((sum, a) => sum + Number(a.current_value || 0), 0);
  const cashAndBankTotal = accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);
  const trialBalance = calculateTrialBalance({
    cashBalances: accounts.map((a) => Number(a.current_balance)),
    receivable: totalReceivable,
    payable: totalPayable,
    inventory: inventoryValue,
    fixedAssets: totalFixedAssetsVal,
    sales: totalSales,
    purchases: 0,
    expenses: totalExpenses,
  });
  const {
    totalAssets: totalAssetsVal,
    totalLiabilities: totalLiabilitiesVal,
    totalExpenses: totalExpensesVal,
    totalRevenue: totalRevenueVal,
    ownersEquity: ownersEquityVal,
    sumDebits: sumDebitsVal,
    sumCredits: sumCreditsVal,
    isBalanced: trialBalanceIsBalanced,
  } = trialBalance;

  if (!allowAccounts) {
    return <SubscriptionBlocker featureName="Chart of Accounts & Ledger" requiredPlan="Starter" />;
  }

  return (
    <div className="space-y-6 font-sans text-slate-800">

      {/* Action Controls */}
      <div className="flex items-center justify-end pb-4 border-b border-slate-100">
        {activeTab === "wallets" && permissions?.actions?.edit_account !== false && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowRightLeft size={14} /> {isUrdu ? "رقم ٹرانسفر کریں" : "Transfer Cash"}
            </button>
            <button
              type="button"
              onClick={() => setIsAddAccountOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
            >
              <Plus size={14} /> {isUrdu ? "نیا اکاؤنٹ شامل کریں" : "Add Account"}
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-3xl p-1.5 shrink-0 select-none shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab("wallets")}
          className={`flex-1 py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "wallets"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Wallet size={14} /> {isUrdu ? "والٹس اور لیجرز" : "Wallets & Ledgers"}
        </button>
        <button
          onClick={() => setActiveTab("chart")}
          className={`flex-1 py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "chart"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Layers size={14} /> {isUrdu ? "چارٹ آف اکاؤنٹس" : "Chart of Accounts"} {!allowIndustrialAccounts && "🔒"}
        </button>
        <button
          onClick={() => setActiveTab("trial")}
          className={`flex-1 py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "trial"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Scale size={14} /> {isUrdu ? "ٹرائل بیلنس" : "Trial Balance"} {!allowIndustrialAccounts && "🔒"}
        </button>
        {hasAssetsRec && (
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex-1 py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "assets"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
          >
            <Landmark size={14} /> {isUrdu ? "فکسڈ اثاثہ جات" : "Fixed Assets"}
          </button>
        )}
      </div>

      {!allowIndustrialAccounts && (activeTab === "chart" || activeTab === "trial") ? (
        <SubscriptionBlocker featureName={isUrdu ? "جنرل لیجرز اور ٹرائل بیلنس اسٹیٹمنٹس" : "General Ledgers & Trial Balance statements"} requiredPlan="Starter" />
      ) : loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {activeTab === "wallets" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left panel - Accounts list */}
              <div className="lg:col-span-4 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{isUrdu ? "میرے والٹس اور اکاؤنٹس" : "My Wallets & Accounts"}</h2>
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className={`p-5 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all relative overflow-hidden`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                            {acc.type === "cash" ? (isUrdu ? "کیش دراز" : "Cash Drawer") : acc.type === "bank" ? (isUrdu ? "بینک اکاؤنٹ" : "Bank Ledger") : (isUrdu ? "موبائل والٹ" : "Mobile Wallet")}
                          </p>
                          <h3 className="font-extrabold text-slate-800 text-sm mt-0.5">{acc.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {permissions?.actions?.delete_account !== false && (() => {
                            const cashInHandCount = accounts.filter(a => a.name.toLowerCase() === "cash in hand").length;
                            const isLastCashInHand = acc.name.toLowerCase() === "cash in hand" && cashInHandCount <= 1;
                            return !isLastCashInHand;
                          })() && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(acc.id);
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all border border-rose-100 cursor-pointer"
                                title={isUrdu ? "اکاؤنٹ حذف کریں" : "Delete account"}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          <span className={`p-2 rounded-xl ${acc.type === "cash" ? "bg-amber-50 text-amber-600" : acc.type === "bank" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                            {acc.type === "cash" ? <Landmark size={16} /> : acc.type === "bank" ? <Landmark size={16} /> : <Wallet size={16} />}
                          </span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-baseline justify-between">
                        <span className="text-slate-400 text-xs font-semibold">{isUrdu ? "دستیاب بیلنس" : "Available Balance"}</span>
                        <span className="text-lg font-black text-slate-900">Rs {Number(acc.current_balance).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel - Transaction history */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">{isUrdu ? "اکاؤنٹ لیجر / اسٹیٹمنٹ" : "Account Ledger"}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{isUrdu ? "کیش کی نقل و حرکت اور تبدیلیاں" : "Recent cash updates and movements"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {filteredTransactions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-xl text-xs font-black text-slate-500 transition-all shadow-sm cursor-pointer"
                      >
                        <Download size={13} /> {isUrdu ? "پی ڈی ایف ڈاؤن لوڈ" : "Download PDF"}
                      </button>
                    )}
                    <select
                      value={selectedAccFilter}
                      onChange={e => setSelectedAccFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="all">{isUrdu ? "تمام اکاؤنٹس" : "All Accounts"}</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs font-medium">{isUrdu ? "لیجر میں کوئی اندراج موجود نہیں ہے۔" : "No ledger entries found"}</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[9px] tracking-wider">
                          <th className="py-2.5 px-3">{isUrdu ? "تاریخ و وقت" : "Date"}</th>
                          <th className="py-2.5 px-3">{isUrdu ? "اکاؤنٹ" : "Account"}</th>
                          <th className="py-2.5 px-3">{isUrdu ? "قسم" : "Type"}</th>
                          <th className="py-2.5 px-3">{isUrdu ? "تفصیل / ریمارکس" : "Remarks"}</th>
                          <th className="py-2.5 px-3 text-right">{isUrdu ? "رقم" : "Amount"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map(tx => {
                          const isInflow = tx.type === "deposit" || tx.type === "transfer_in";
                          const typeText = tx.type === "deposit" ? (isUrdu ? "جمع رقم" : "DEPOSIT")
                            : tx.type === "withdrawal" ? (isUrdu ? "نکلوائی رقم" : "WITHDRAWAL")
                            : tx.type === "transfer_in" ? (isUrdu ? "وصول ٹرانسفر" : "TRANSFER IN")
                            : (isUrdu ? "ارسال ٹرانسفر" : "TRANSFER OUT");

                          return (
                            <tr key={tx.id} className="border-b border-slate-55 hover:bg-slate-50/50">
                              <td className="py-3 px-3 text-slate-400 font-medium font-mono">{new Date(tx.created_at).toLocaleString()}</td>
                              <td className="py-3 px-3 font-bold text-slate-700">{tx.account_name}</td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-black text-[9px] ${isInflow ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                  }`}>
                                  {isInflow ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                  {typeText}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-semibold">{tx.remarks || "-"}</td>
                              <td className={`py-3 px-3 text-right font-black ${isInflow ? "text-emerald-600" : "text-red-500"}`}>
                                {isInflow ? "+" : "-"} Rs {tx.amount.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chart" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Category: ASSETS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Landmark size={15} />
                      </span>
                      {isUrdu ? "اثاثہ جات (Assets 1000)" : "Assets (1000)"}
                    </h3>
                    <div className="space-y-3">
                      {accounts.map(a => (
                        <div key={a.id} className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{a.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold uppercase">{a.type}</p>
                          </div>
                          <span className="text-xs font-black text-slate-800">Rs {Number(a.current_balance).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "کسٹمر واجب الوصول (A/R)" : "Accounts Receivable"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "کسٹمر کھاتہ" : "Customers Khata"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">Rs {totalReceivable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "اسٹاک مالیت اثاثہ" : "Stock / Inventory Asset"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "پروڈکٹس مالیت" : "Products Stock Value"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">Rs {inventoryValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUrdu ? "کل اثاثہ جات" : "Total Assets"}</span>
                    <span className="text-sm font-black text-blue-600">
                      Rs {totalAssetsVal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Category: LIABILITIES */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                        <Users size={15} />
                      </span>
                      {isUrdu ? "واجبات (Liabilities 2000)" : "Liabilities (2000)"}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "سپلائر واجب الادا (A/P)" : "Accounts Payable"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "سپلائرز کھاتہ" : "Suppliers Khata"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">Rs {totalPayable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUrdu ? "کل واجبات" : "Total Liabilities"}</span>
                    <span className="text-sm font-black text-rose-600">Rs {totalLiabilitiesVal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Category: EQUITY */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Scale size={15} />
                      </span>
                      {isUrdu ? "مالکانہ سرمایہ (Equity 3000)" : "Equity (3000)"}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "مالک کا کیپیٹل اکاؤنٹ" : "Owner's Capital Account"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "سرمایہ" : "Starting/Retained Equity"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">
                          Rs {ownersEquityVal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUrdu ? "کل مالکانہ سرمایہ" : "Total Equity"}</span>
                    <span className="text-sm font-black text-amber-600">
                      Rs {ownersEquityVal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Category: REVENUE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <TrendingUp size={15} />
                      </span>
                      {isUrdu ? "آمدنی (Revenue 4000)" : "Revenue (4000)"}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "سیلز ریونیو" : "Sales Income"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "اسٹور سیلز انوائسز" : "Store Sales Invoices"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">Rs {totalRevenueVal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUrdu ? "کل ریونیو" : "Total Revenue"}</span>
                    <span className="text-sm font-black text-emerald-600">Rs {totalRevenueVal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Category: EXPENSES */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-violet-500" />
                  <div>
                    <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <span className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
                        <Coins size={15} />
                      </span>
                      {isUrdu ? "اخراجات (Expenses 5000)" : "Expenses (5000)"}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "خریداری (اسٹاک میں)" : "Purchases (→ Stock)"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "اسٹاک اثاثہ میں شامل ہے" : "In Inventory Asset — not expense"}</p>
                        </div>
                        <span className="text-xs font-black text-slate-500">Rs {totalPurchases.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{isUrdu ? "دوکان کے اخراجات" : "Operating Expenses"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase">{isUrdu ? "تنخواہیں، کرایہ، بلز وغیرہ" : "Salaries, Rent, Bills, etc."}</p>
                        </div>
                        <span className="text-xs font-black text-slate-800">Rs {totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUrdu ? "کل آپریشنل اخراجات" : "Total Operating Expenses"}</span>
                    <span className="text-sm font-black text-violet-600">Rs {totalExpensesVal.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "trial" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-sm">{isUrdu ? "ٹرائل بیلنس شیٹ" : "Trial Balance Sheet"}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {trialBalanceIsBalanced
                      ? (isUrdu ? "مکمل متوازن — ڈیبٹ اور کریڈٹ برابر ہیں" : "Balanced — debits equal credits")
                      : (isUrdu ? "آپ کے اکاؤنٹس اور ٹرانزیکشنز سے بیلنس شمار ہو رہا ہے" : "Calculating balances from your accounts & transactions")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTrialBalancePDF}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  <Download size={13} /> {isUrdu ? "ٹرائل بیلنس پی ڈی ایف ڈاؤن لوڈ کریں" : "Download Trial Balance PDF"}
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-sm space-y-2">
                <p className="font-semibold text-slate-800">{isUrdu ? "مالیاتی حسابات کا خلاصہ" : "What is included (no double counting)"}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-slate-600">
                  <p>{isUrdu ? "کیش و بینک:" : "Cash & Bank:"} <strong className="text-slate-800">Rs {cashAndBankTotal.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "کسٹمر ادھار:" : "Customer Udhaar:"} <strong className="text-slate-800">Rs {totalReceivable.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "اسٹاک / انوینٹری:" : "Stock / Inventory:"} <strong className="text-slate-800">Rs {inventoryValue.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "سپلائر واجبات:" : "Supplier Payable:"} <strong className="text-slate-800">Rs {totalPayable.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "سیلز آمدنی:" : "Sales Revenue:"} <strong className="text-slate-800">Rs {totalSales.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "آپریشنل اخراجات:" : "Operating Expenses:"} <strong className="text-slate-800">Rs {totalExpenses.toLocaleString()}</strong></p>
                  <p>{isUrdu ? "خریداری (اسٹاک میں):" : "Purchases (→ Stock):"} <strong className="text-slate-800">Rs {totalPurchases.toLocaleString()}</strong></p>
                </div>
                {totalPurchases > 0 && (
                  <p className="text-xs text-slate-500 border-t border-slate-200 pt-2">
                    {isUrdu ? "خریداری اسٹاک میں شامل ہے — الگ خرچے کے طور پر شمار نہیں کی جاتی۔" : "Purchases are reflected in Stock / Inventory above — not counted again as expense."}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[9px] tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3">{isUrdu ? "کوڈ" : "Code"}</th>
                      <th className="py-2.5 px-3">{isUrdu ? "اکاؤنٹ نام" : "Account Name"}</th>
                      <th className="py-2.5 px-3">{isUrdu ? "درجہ بندی" : "Classification"}</th>
                      <th className="py-2.5 px-3 text-right">{isUrdu ? "ڈیبٹ بیلنس (روپے)" : "Debit Balance (Rs)"}</th>
                      <th className="py-2.5 px-3 text-right">{isUrdu ? "کریڈٹ بیلنس (روپے)" : "Credit Balance (Rs)"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {/* 1. Assets (Debits) */}
                    {accounts.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-400">1100</td>
                        <td className="py-3 px-3 font-bold text-slate-850">Cash/Bank - {a.name}</td>
                        <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase leading-none">{isUrdu ? "اثاثہ" : "Asset"}</span></td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {Number(a.current_balance).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-slate-400">-</td>
                      </tr>
                    ))}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">1200</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "کسٹمر کھاتہ بقایا (A/R)" : "Accounts Receivable (Khata Customers)"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase leading-none">{isUrdu ? "اثاثہ" : "Asset"}</span></td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {totalReceivable.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">1300</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "اسٹاک / انوینٹری اثاثہ" : "Stock / Inventory Asset"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase leading-none">{isUrdu ? "اثاثہ" : "Asset"}</span></td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {inventoryValue.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                    </tr>
                    {hasAssetsRec && (
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-400">1400</td>
                        <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "فکسڈ اثاثہ جات (مشینری، پراپرٹی)" : "Fixed Assets (Machinery, Property)"}</td>
                        <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase leading-none">{isUrdu ? "اثاثہ" : "Asset"}</span></td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {totalFixedAssetsVal.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-slate-400">-</td>
                      </tr>
                    )}

                    {/* 2. Liabilities (Credits) */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">2100</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "سپلائر واجب الادا (A/P)" : "Accounts Payable (Khata Suppliers)"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase leading-none">{isUrdu ? "واجبات" : "Liability"}</span></td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {totalPayable.toLocaleString()}</td>
                    </tr>

                    {/* 3. Equity (Credits) */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">3100</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "مالکانہ سرمایہ اکاؤنٹ (Equity)" : "Owner's Capital Account (Equity)"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase leading-none">{isUrdu ? "سرمایہ" : "Equity"}</span></td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">
                        Rs {ownersEquityVal.toLocaleString()}
                      </td>
                    </tr>

                    {/* 4. Revenue (Credits) */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">4100</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "سیلز آمدنی" : "Sales Revenue"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase leading-none">{isUrdu ? "آمدنی" : "Revenue"}</span></td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {totalSales.toLocaleString()}</td>
                    </tr>

                    {/* 5. Expenses (Debits) — purchases are in Stock Asset, not here */}
                    {totalPurchases > 0 && (
                      <tr className="bg-slate-50/80 text-slate-500 italic">
                        <td className="py-3 px-3 font-mono font-semibold">—</td>
                        <td className="py-3 px-3">{isUrdu ? `خریداری مالیت (Rs ${totalPurchases.toLocaleString()}) — اسٹاک اثاثہ میں شامل` : `Purchases → Stock (Rs ${totalPurchases.toLocaleString()}) — reference only`}</td>
                        <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 uppercase leading-none">{isUrdu ? "معلوماتی" : "Memo"}</span></td>
                        <td className="py-3 px-3 text-right">-</td>
                        <td className="py-3 px-3 text-right">-</td>
                      </tr>
                    )}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-400">5200</td>
                      <td className="py-3 px-3 font-bold text-slate-850">{isUrdu ? "دوکان کے آپریشنل اخراجات" : "Operating Expenses"}</td>
                      <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-violet-50 text-violet-600 border border-violet-100 uppercase leading-none">{isUrdu ? "خرچہ" : "Expense"}</span></td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-750">Rs {totalExpenses.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-slate-400">-</td>
                    </tr>

                    {/* Totals balancing row */}
                    <tr className="bg-slate-50 font-black border-t border-slate-200 text-slate-850 text-xs">
                      <td className="py-3.5 px-3"></td>
                      <td className="py-3.5 px-3 uppercase tracking-wider">{isUrdu ? "مجموعی متوازن میزان (Total Balance)" : "TOTAL BALANCE"}</td>
                      <td className="py-3.5 px-3"></td>
                      <td className="py-3.5 px-3 text-right text-blue-650 font-black">
                        Rs {sumDebitsVal.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-650 font-black">
                        Rs {sumCreditsVal.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "assets" && hasAssetsRec && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-sm">{isUrdu ? "فکسڈ اثاثہ جات کا انتظام" : "Fixed Assets Management"}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{isUrdu ? "پراپرٹی، مشینری اور اثاثہ جات کی قدر کا ریکارڈ" : "Track property, machinery, and auto-depreciation."}</p>
                </div>
                {permissions?.actions?.edit_account !== false && (
                  <button
                    type="button"
                    onClick={() => setIsAddAssetOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                  >
                    <Plus size={13} /> {isUrdu ? "نیا اثاثہ شامل کریں" : "Add Asset"}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[9px] tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3">{isUrdu ? "اثاثہ کا نام" : "Asset Name"}</th>
                      <th className="py-2.5 px-3">{isUrdu ? "قسم" : "Type"}</th>
                      <th className="py-2.5 px-3 text-right">{isUrdu ? "خرید قیمت" : "Purchase Price"}</th>
                      <th className="py-2.5 px-3 text-right">{isUrdu ? "موجودہ قدر" : "Current Value"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {fixedAssets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">{isUrdu ? "کوئی فکسڈ اثاثہ درج نہیں ہے۔" : "No fixed assets recorded yet."}</td>
                      </tr>
                    ) : (
                      fixedAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-slate-800">{asset.name}</td>
                          <td className="py-3 px-3 uppercase text-[10px] text-slate-500">{asset.asset_type}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">Rs {Number(asset.purchase_price).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-black text-blue-600">Rs {Number(asset.current_value).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: Add Account */}
      <AnimatePresence>
        {isAddAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" onClick={() => setIsAddAccountOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 border border-slate-100 shadow-xl"
            >
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Plus size={16} className="text-blue-600" /> {isUrdu ? "نیا کیش / بینک اکاؤنٹ" : "New Cash Account"}
              </h3>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "اکاؤنٹ کا نام" : "Account Name"}</label>
                  <input
                    type="text"
                    placeholder={isUrdu ? "مثلاً میزان بینک، جاز کیش دراز..." : "e.g. Meezan Bank, JazzCash Drawer"}
                    value={newAccName}
                    onChange={e => setNewAccName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "اکاؤنٹ کی قسم" : "Account Type"}</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as any)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-600"
                  >
                    <option value="cash">{isUrdu ? "نقد رقم / کیش دراز" : "Cash / Drawer"}</option>
                    <option value="bank">{isUrdu ? "بینک اکاؤنٹ" : "Bank Account"}</option>
                    <option value="wallet">{isUrdu ? "موبائل والٹ (ایزی پیسہ / جاز کیش)" : "Mobile Wallet"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ابتدائی بیلنس (روپے)" : "Opening Balance (Rs)"}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newAccBalance || ""}
                    onChange={e => setNewAccBalance(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(false)}
                    className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    {isUrdu ? "منسوخ کریں" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAccount}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAccount && <Loader2 size={13} className="animate-spin" />} {isUrdu ? "محفوظ کریں" : "Save Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Transfer Cash */}
      <AnimatePresence>
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" onClick={() => setIsTransferOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 border border-slate-100 shadow-xl"
            >
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-600" /> {isUrdu ? "رقم ٹرانسفر کریں" : "Transfer Cash / Funds"}
              </h3>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ارسال کنندہ اکاؤنٹ (From)" : "Source Account (From)"}</label>
                  <select
                    value={transferSource}
                    onChange={e => setTransferSource(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-600"
                    required
                  >
                    <option value="">{isUrdu ? "اکاؤنٹ منتخب کریں..." : "Select source account..."}</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Rs {Number(a.current_balance).toLocaleString()})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "وصول کنندہ اکاؤنٹ (To)" : "Destination Account (To)"}</label>
                  <select
                    value={transferDest}
                    onChange={e => setTransferDest(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-600"
                    required
                  >
                    <option value="">{isUrdu ? "اکاؤنٹ منتخب کریں..." : "Select destination account..."}</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Rs {Number(a.current_balance).toLocaleString()})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ٹرانسفر رقم (روپے)" : "Transfer Amount (Rs)"}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={transferAmount || ""}
                    onChange={e => setTransferAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "تفصیل / ریمارکس" : "Remarks / Note"}</label>
                  <input
                    type="text"
                    placeholder={isUrdu ? "اختیاری ریمارکس..." : "Optional remarks..."}
                    value={transferRemarks}
                    onChange={e => setTransferRemarks(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(false)}
                    className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    {isUrdu ? "منسوخ کریں" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransfer}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submittingTransfer && <Loader2 size={13} className="animate-spin" />} {isUrdu ? "رقم بھیجیں" : "Transfer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL: Add Fixed Asset */}
        {isAddAssetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" onClick={() => setIsAddAssetOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 border border-slate-100 shadow-xl"
            >
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Landmark size={16} className="text-blue-600" /> {isUrdu ? "نیا فکسڈ اثاثہ" : "New Fixed Asset"}
              </h3>
              <form onSubmit={handleAddAsset} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "اثاثہ کا نام" : "Asset Name"}</label>
                  <input
                    type="text"
                    placeholder={isUrdu ? "مثلاً ائیر کنڈیشنر، کاؤنٹر وغیرہ..." : "e.g., Air Conditioner, Counter..."}
                    value={newAssetName}
                    onChange={e => setNewAssetName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "کیٹیگری" : "Asset Category"}</label>
                  <select
                    value={newAssetType}
                    onChange={e => setNewAssetType(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  >
                    <option value="machinery">{isUrdu ? "مشینری اور آلات" : "Machinery & Equipment"}</option>
                    <option value="furniture">{isUrdu ? "فرنیچر اور فکسچرز" : "Furniture & Fixtures"}</option>
                    <option value="electronics">{isUrdu ? "الیکٹرانکس و کمپیوٹرز" : "Electronics & Computers"}</option>
                    <option value="property">{isUrdu ? "پراپرٹی اور بلڈنگ" : "Property & Building"}</option>
                    <option value="vehicles">{isUrdu ? "گاڑیاں اور ٹرانسپورٹ" : "Vehicles"}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "خریداری قیمت (روپے)" : "Purchase Price (Rs)"}</label>
                  <input
                    type="number"
                    value={newAssetPrice || ""}
                    onChange={e => setNewAssetPrice(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "کارآمد مدت (سال)" : "Useful Life (Years)"}</label>
                  <input
                    type="number"
                    value={newAssetLife || ""}
                    onChange={e => setNewAssetLife(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    min="1"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAssetOpen(false)}
                    className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    {isUrdu ? "منسوخ کریں" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAsset}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAsset && <Loader2 size={13} className="animate-spin" />} {isUrdu ? "محفوظ کریں" : "Save Asset"}
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
