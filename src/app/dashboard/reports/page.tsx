"use client";

import React, { useState, useEffect } from "react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Calculator, Download, TrendingDown,
  ShoppingBag, Truck, Package, Users, ChevronRight,
  CreditCard, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SubscriptionBlocker } from "@/components/dashboard/SubscriptionBlocker";

type ReportTab =
  | "sales"
  | "sales_by_product"
  | "sales_by_customer"
  | "sales_by_payment"
  | "purchases"
  | "purchases_by_supplier"
  | "expenses"
  | "expense_category"
  | "pl"
  | "inventory"
  | "khata"
  | "aging";

export default function ReportsPage() {
  const { shopId, userName, shopName, allowReports } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [partiesData, setPartiesData] = useState<any[]>([]);

  const [plSummary, setPlSummary] = useState({
    revenue: 0, cogs: 0, expenses: 0, grossProfit: 0, netProfit: 0, marginPct: 0
  });
  const [stockSummary, setStockSummary] = useState({
    totalItems: 0, totalQuantity: 0, valuationCost: 0, valuationRetail: 0,
    expectedProfit: 0, lowStockCount: 0
  });

  useEffect(() => {
    if (shopId) fetchReportData();
  }, [shopId, activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDateTime = `${startDate}T00:00:00.000Z`;
      const endDateTime   = `${endDate}T23:59:59.999Z`;

      // Always fetch products (needed for COGS / valuation)
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select(`id, name, purchase_price_single, sale_price_single, current_stock, min_stock_level, unit,
          product_variants ( id, packing_name, purchase_price, sale_price, stock_quantity )`)
        .eq("shop_id", shopId);
      if (prodErr) throw prodErr;
      setProductsData(products || []);

      const productCostDict: Record<string, number> = {};
      const variantCostDict: Record<string, number> = {};
      (products || []).forEach((p: any) => {
        productCostDict[p.id] = Number(p.purchase_price_single || 0);
        (p.product_variants || []).forEach((v: any) => { variantCostDict[v.id] = Number(v.purchase_price || 0); });
      });

      const needSales    = ["sales","sales_by_product","sales_by_customer","sales_by_payment","pl","aging"].includes(activeTab);
      const needPurchases= ["purchases","purchases_by_supplier","pl","aging"].includes(activeTab);
      const needExpenses = ["expenses","expense_category","pl"].includes(activeTab);
      const needParties  = ["khata","sales_by_customer","purchases_by_supplier","aging"].includes(activeTab);

      if (needSales) {
        const { data: sales, error: sErr } = await supabase
          .from("invoices")
          .select(`id, total_amount, paid_amount, status, payment_mode, created_at, party_id,
            parties ( name ),
            invoice_items ( id, product_id, variant_id, quantity, unit_price, subtotal )`)
          .eq("shop_id", shopId).eq("is_voided", false)
          .gte("created_at", startDateTime).lte("created_at", endDateTime)
          .order("created_at", { ascending: false });
        if (sErr) throw sErr;
        setSalesData((sales || [])
          .filter((inv: any) => inv.status !== "quotation" && inv.status !== "draft" && inv.payment_mode !== "quotation")
          .map((inv: any) => {
          let cogs = 0;
          (inv.invoice_items || []).forEach((it: any) => {
            const c = it.variant_id && variantCostDict[it.variant_id] ? variantCostDict[it.variant_id] : (productCostDict[it.product_id] || 0);
            cogs += c * Number(it.quantity || 0);
          });
          return { ...inv, cogs, profit: Number(inv.total_amount || 0) - cogs };
        }));
      }

      if (needPurchases) {
        const { data: purchases, error: pErr } = await supabase
          .from("purchase_orders")
          .select(`id, total_amount, status, created_at, supplier_id, parties ( name )`)
          .eq("shop_id", shopId)
          .gte("created_at", startDateTime).lte("created_at", endDateTime)
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;
        setPurchasesData(purchases || []);
      }

      if (needExpenses) {
        const { data: expenses, error: eErr } = await supabase
          .from("expenses")
          .select("id, name, amount, expense_type, remarks, created_at")
          .eq("shop_id", shopId)
          .gte("created_at", startDateTime).lte("created_at", endDateTime)
          .order("created_at", { ascending: false });
        if (eErr) throw eErr;
        setExpensesData(expenses || []);
      }

      if (needParties) {
        const { data: parties, error: ptErr } = await supabase
          .from("parties")
          .select("id, name, phone, type, current_balance, created_at")
          .eq("shop_id", shopId)
          .order("name", { ascending: true });
        if (ptErr) throw ptErr;
        setPartiesData(parties || []);
      }
    } catch (err: any) {
      toast.error("Failed to load report data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Lookup maps from productsData ──────────────────────────────────────────
  const { productCostMap, variantCostMap, productNameMap, variantNameMap } = React.useMemo(() => {
    const pCost: Record<string, number> = {};
    const vCost: Record<string, number> = {};
    const pName: Record<string, string> = {};
    const vName: Record<string, string> = {};
    productsData.forEach((p: any) => {
      pCost[p.id] = Number(p.purchase_price_single || 0);
      pName[p.id] = p.name;
      (p.product_variants || []).forEach((v: any) => {
        vCost[v.id] = Number(v.purchase_price || 0);
        vName[v.id] = `${p.name} (${v.packing_name})`;
      });
    });
    return { productCostMap: pCost, variantCostMap: vCost, productNameMap: pName, variantNameMap: vName };
  }, [productsData]);

  // ── P&L Summary ────────────────────────────────────────────────────────────
  useEffect(() => {
    const rev  = salesData.reduce((s, x) => s + Number(x.total_amount), 0);
    const cogs = salesData.reduce((s, x) => s + Number(x.cogs || 0), 0);
    const exp  = expensesData.reduce((s, x) => s + Number(x.amount || 0), 0);
    const gp   = rev - cogs;
    const np   = gp - exp;
    setPlSummary({ revenue: rev, cogs, expenses: exp, grossProfit: gp, netProfit: np, marginPct: rev > 0 ? (np / rev) * 100 : 0 });
  }, [salesData, expensesData]);

  // ── Stock Summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    let ti = 0, tq = 0, cv = 0, rv = 0, lc = 0;
    productsData.forEach((p: any) => {
      ti++;
      const s = Number(p.current_stock || 0);
      tq += s;
      if (p.product_variants?.length > 0) {
        p.product_variants.forEach((v: any) => {
          const vs = Number(v.stock_quantity || 0);
          cv += vs * Number(v.purchase_price || 0);
          rv += vs * Number(v.sale_price || 0);
        });
      } else {
        cv += s * Number(p.purchase_price_single || 0);
        rv += s * Number(p.sale_price_single || 0);
      }
      if (s <= Number(p.min_stock_level || 0)) lc++;
    });
    setStockSummary({ totalItems: ti, totalQuantity: tq, valuationCost: cv, valuationRetail: rv, expectedProfit: rv - cv, lowStockCount: lc });
  }, [productsData]);

  // ── Advanced aggregations (client-side) ───────────────────────────────────
  const salesByProduct = React.useMemo(() => {
    const agg: Record<string, { name: string; qty: number; revenue: number; cost: number; profit: number }> = {};
    salesData.forEach((inv: any) => {
      (inv.invoice_items || []).forEach((it: any) => {
        const key = it.variant_id || it.product_id || "unknown";
        if (key === "unknown") return;
        const name = (it.variant_id && variantNameMap[it.variant_id]) ? variantNameMap[it.variant_id] : (productNameMap[it.product_id] || "Unknown");
        const cp   = (it.variant_id && variantCostMap[it.variant_id]) ? variantCostMap[it.variant_id] : (productCostMap[it.product_id] || 0);
        const qty  = Number(it.quantity || 0);
        const rev  = Number(it.subtotal || 0);
        const cost = qty * cp;
        if (!agg[key]) agg[key] = { name, qty: 0, revenue: 0, cost: 0, profit: 0 };
        agg[key].qty     += qty;
        agg[key].revenue += rev;
        agg[key].cost    += cost;
        agg[key].profit  += rev - cost;
      });
    });
    return Object.values(agg).sort((a, b) => b.revenue - a.revenue);
  }, [salesData, productNameMap, variantNameMap, productCostMap, variantCostMap]);

  const salesByCustomer = React.useMemo(() => {
    const agg: Record<string, { name: string; count: number; total: number; paid: number; balance: number }> = {};
    salesData.forEach((inv: any) => {
      const key  = inv.party_id || "walk-in";
      const name = inv.parties?.name || "Walk-in Customer";
      const tot  = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      if (!agg[key]) agg[key] = { name, count: 0, total: 0, paid: 0, balance: 0 };
      agg[key].count++;
      agg[key].total   += tot;
      agg[key].paid    += paid;
      agg[key].balance += tot - paid;
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  }, [salesData]);

  const salesByPayment = React.useMemo(() => {
    const agg: Record<string, { mode: string; count: number; total: number }> = {};
    salesData.forEach((inv: any) => {
      const mode = inv.payment_mode || "cash";
      const tot  = Number(inv.total_amount || 0);
      if (!agg[mode]) agg[mode] = { mode, count: 0, total: 0 };
      agg[mode].count++;
      agg[mode].total += tot;
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  }, [salesData]);

  const purchasesBySupplier = React.useMemo(() => {
    const agg: Record<string, { name: string; count: number; total: number }> = {};
    purchasesData.forEach((po: any) => {
      const key  = po.supplier_id || "generic";
      const name = po.parties?.name || "Generic Supplier";
      const tot  = Number(po.total_amount || 0);
      if (!agg[key]) agg[key] = { name, count: 0, total: 0 };
      agg[key].count++;
      agg[key].total += tot;
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  }, [purchasesData]);

  const expenseByCategory = React.useMemo(() => {
    const agg: Record<string, { category: string; count: number; total: number }> = {};
    expensesData.forEach((e: any) => {
      const cat = e.expense_type || "general";
      const amt = Number(e.amount || 0);
      if (!agg[cat]) agg[cat] = { category: cat, count: 0, total: 0 };
      agg[cat].count++;
      agg[cat].total += amt;
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  }, [expensesData]);


  const agingReport = React.useMemo(() => {
    const today = new Date();
    const getDaysDiff = (dateStr: string) => {
      const diffTime = Math.abs(today.getTime() - new Date(dateStr).getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const receivables: any[] = [];
    const payables: any[] = [];

    partiesData.forEach(party => {
      let b0_30 = 0, b31_60 = 0, b61_90 = 0, b90_plus = 0;
      let totalUnpaid = 0;

      if (party.type === "customer") {
        const partyInvoices = salesData.filter(inv => inv.party_id === party.id && (Number(inv.total_amount) - Number(inv.paid_amount || 0)) > 0);
        partyInvoices.forEach(inv => {
          const unpaid = Number(inv.total_amount) - Number(inv.paid_amount || 0);
          const days = getDaysDiff(inv.created_at);
          totalUnpaid += unpaid;
          if (days <= 30) b0_30 += unpaid;
          else if (days <= 60) b31_60 += unpaid;
          else if (days <= 90) b61_90 += unpaid;
          else b90_plus += unpaid;
        });

        const diff = Number(party.current_balance || 0) - totalUnpaid;
        if (diff > 0) {
          b90_plus += diff;
          totalUnpaid += diff;
        }

        if (totalUnpaid > 0) {
          receivables.push({ name: party.name, total: totalUnpaid, b0_30, b31_60, b61_90, b90_plus });
        }
      } else {
        const balance = Number(party.current_balance || 0);
        if (balance > 0) {
           payables.push({ name: party.name, total: balance, b0_30: balance, b31_60: 0, b61_90: 0, b90_plus: 0 });
        }
      }
    });

    receivables.sort((a, b) => b.total - a.total);
    payables.sort((a, b) => b.total - a.total);

    return { receivables, payables };
  }, [salesData, partiesData]);


  const setPreset = (days: number, type: "days" | "month" | "year") => {
    const end = new Date(), start = new Date();
    if (type === "days")  start.setDate(end.getDate() - days);
    else if (type === "month") start.setDate(1);
    else if (type === "year")  start.setMonth(0, 1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // ── PDF Generation ─────────────────────────────────────────────────────────
  const generatePDF = () => {
    setDownloading(true);
    try {
      const doc  = new jsPDF();
      const pm   = 15;
      const blue = [30, 41, 59] as [number, number, number];

      // Header band
      doc.setFillColor(...blue); doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");   doc.setFontSize(20); doc.text(shopName || "AR GROUP", pm, 17);
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      doc.text("Business Audit & Reports Statement", pm, 25);
      doc.text(`Generated By: ${userName || "Operator"}`, pm, 32);
      doc.text(`Date: ${startDate}  →  ${endDate}`, 130, 18);
      doc.text(`Exported: ${new Date().toLocaleString()}`, 130, 25);
      doc.text(`Report: ${activeTab.toUpperCase().replace(/_/g," ")}`, 130, 32);

      let y = 55;

      const box = (label: string, val: string, x: number, w: number) => {
        doc.setFillColor(248,250,252); doc.rect(x, y, w, 22, "F");
        doc.setDrawColor(226,232,240); doc.rect(x, y, w, 22, "S");
        doc.setTextColor(100,116,139); doc.setFontSize(7.5); doc.setFont("helvetica","bold");
        doc.text(label.toUpperCase(), x+4, y+7);
        doc.setTextColor(15,23,42);   doc.setFontSize(11);
        doc.text(val, x+4, y+16);
      };

      let head: string[][] = [];
      let rows: any[][] = [];

      if (activeTab === "sales") {
        box("Total Invoices", `${salesData.length}`, pm, 38);
        box("Total Revenue", `Rs ${Math.round(plSummary.revenue).toLocaleString()}`, pm+43, 65);
        box("Est. Gross Profit", `Rs ${Math.round(plSummary.grossProfit).toLocaleString()}`, pm+113, 67);
        y += 32;
        head = [["Date","Invoice ID","Customer","Mode","Received (Rs)","Total (Rs)","Profit (Rs)"]];
        rows = salesData.map(s => [
          new Date(s.created_at).toLocaleDateString(),
          s.id.substring(0,8).toUpperCase(),
          s.parties?.name || "Walk-in",
          s.payment_mode || "cash",
          Number(s.paid_amount||0).toFixed(0),
          Number(s.total_amount||0).toFixed(0),
          Number(s.profit||0).toFixed(0)
        ]);

      } else if (activeTab === "sales_by_product") {
        const totQty = salesByProduct.reduce((s,p)=>s+p.qty,0);
        const totRev = salesByProduct.reduce((s,p)=>s+p.revenue,0);
        const totPrf = salesByProduct.reduce((s,p)=>s+p.profit,0);
        box("Total Units Sold", `${totQty.toLocaleString()}`, pm, 50);
        box("Product Revenue", `Rs ${Math.round(totRev).toLocaleString()}`, pm+55, 62);
        box("Estimated Profit", `Rs ${Math.round(totPrf).toLocaleString()}`, pm+122, 58);
        y += 32;
        head = [["Product / Variant","Qty Sold","Avg Price","Total Sales (Rs)","Total Cost (Rs)","Net Profit (Rs)","Margin (%)"]];
        rows = salesByProduct.map(p => [
          p.name,
          p.qty.toString(),
          (p.revenue/(p.qty||1)).toFixed(0),
          p.revenue.toFixed(0),
          p.cost.toFixed(0),
          p.profit.toFixed(0),
          `${(p.revenue>0?(p.profit/p.revenue)*100:0).toFixed(1)}%`
        ]);

      } else if (activeTab === "sales_by_customer") {
        const totPur  = salesByCustomer.reduce((s,c)=>s+c.total,0);
        const totBal  = salesByCustomer.reduce((s,c)=>s+c.balance,0);
        box("Active Customers", `${salesByCustomer.length}`, pm, 45);
        box("Total Purchased", `Rs ${Math.round(totPur).toLocaleString()}`, pm+50, 67);
        box("Outstanding Udhaar", `Rs ${Math.round(totBal).toLocaleString()}`, pm+122, 58);
        y += 32;
        head = [["Customer Name","Invoices","Total Purchased (Rs)","Paid (Rs)","Udhaar / Balance (Rs)"]];
        rows = salesByCustomer.map(c=>[c.name,c.count.toString(),c.total.toFixed(0),c.paid.toFixed(0),c.balance.toFixed(0)]);

      } else if (activeTab === "sales_by_payment") {
        const totRev = salesByPayment.reduce((s,p)=>s+p.total,0);
        box("Total Sale Inflow", `Rs ${Math.round(totRev).toLocaleString()}`, pm, 65);
        box("Cash (نقد)", `Rs ${Math.round(salesByPayment.find(p=>p.mode==="cash")?.total||0).toLocaleString()}`, pm+70, 55);
        box("Udhaar (ادھار)", `Rs ${Math.round(salesByPayment.find(p=>p.mode==="credit")?.total||0).toLocaleString()}`, pm+130, 50);
        y += 32;
        head = [["Payment Method","Invoice Count","Total (Rs)","Share (%)"]];
        rows = salesByPayment.map(p=>[
          p.mode.toUpperCase(),
          p.count.toString(),
          p.total.toFixed(0),
          `${(salesByPayment.reduce((s,x)=>s+x.total,0)>0?(p.total/salesByPayment.reduce((s,x)=>s+x.total,0))*100:0).toFixed(1)}%`
        ]);

      } else if (activeTab === "purchases") {
        const totPur = purchasesData.reduce((s,p)=>s+Number(p.total_amount),0);
        box("Purchase Orders", `${purchasesData.length}`, pm, 50);
        box("Total Spending", `Rs ${Math.round(totPur).toLocaleString()}`, pm+55, 125);
        y += 32;
        head = [["Date","PO ID","Supplier","Status","Total (Rs)"]];
        rows = purchasesData.map(p=>[
          new Date(p.created_at).toLocaleDateString(),
          p.id.substring(0,8).toUpperCase(),
          p.parties?.name||"Generic Supplier",
          p.status||"completed",
          Number(p.total_amount||0).toFixed(0)
        ]);

      } else if (activeTab === "purchases_by_supplier") {
        const totSp = purchasesBySupplier.reduce((s,x)=>s+x.total,0);
        box("Suppliers", `${purchasesBySupplier.length}`, pm, 50);
        box("Total Procurement Spend", `Rs ${Math.round(totSp).toLocaleString()}`, pm+55, 125);
        y += 32;
        head = [["Supplier Name","Restock Orders","Total Spent (Rs)"]];
        rows = purchasesBySupplier.map(s=>[s.name,s.count.toString(),s.total.toFixed(0)]);

      } else if (activeTab === "expenses") {
        box("Expense Entries", `${expensesData.length}`, pm, 50);
        box("Total Expense", `Rs ${Math.round(plSummary.expenses).toLocaleString()}`, pm+55, 125);
        y += 32;
        head = [["Date","Name","Category","Remarks","Amount (Rs)"]];
        rows = expensesData.map(e=>[
          new Date(e.created_at).toLocaleDateString(),
          e.name,
          e.expense_type||"general",
          e.remarks||"-",
          Number(e.amount||0).toFixed(0)
        ]);

      } else if (activeTab === "expense_category") {
        const totExp = expenseByCategory.reduce((s,c)=>s+c.total,0);
        box("Categories", `${expenseByCategory.length}`, pm, 50);
        box("Total Expenses", `Rs ${Math.round(totExp).toLocaleString()}`, pm+55, 125);
        y += 32;
        head = [["Category","Transactions","Total Spent (Rs)","Share (%)"]];
        rows = expenseByCategory.map(c=>[
          c.category.toUpperCase(),
          c.count.toString(),
          c.total.toFixed(0),
          `${(expenseByCategory.reduce((s,x)=>s+x.total,0)>0?(c.total/expenseByCategory.reduce((s,x)=>s+x.total,0))*100:0).toFixed(1)}%`
        ]);

      } else if (activeTab === "pl") {
        box("Sales Revenue", `Rs ${Math.round(plSummary.revenue).toLocaleString()}`, pm, 55);
        box("COGS", `Rs ${Math.round(plSummary.cogs).toLocaleString()}`, pm+60, 60);
        box("Expenses", `Rs ${Math.round(plSummary.expenses).toLocaleString()}`, pm+125, 55);
        doc.setFillColor(...blue); doc.rect(pm, y+28, 180, 12, "F");
        doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont("helvetica","bold");
        doc.text(`NET PROFIT: Rs ${Math.round(plSummary.netProfit).toLocaleString()}  (Margin: ${plSummary.marginPct.toFixed(1)}%)`, pm+5, y+36);
        y += 50;
        head = [["P&L Account","Value (Rs)"]];
        rows = [
          ["Gross Sales Revenue",plSummary.revenue.toFixed(0)],
          ["Cost of Goods Sold (COGS)",plSummary.cogs.toFixed(0)],
          ["Gross Profit",plSummary.grossProfit.toFixed(0)],
          ["Operating Expenses",plSummary.expenses.toFixed(0)],
          ["Net Profit",plSummary.netProfit.toFixed(0)]
        ];

      } else if (activeTab === "inventory") {
        box("Stock Valuation (Cost)", `Rs ${Math.round(stockSummary.valuationCost).toLocaleString()}`, pm, 55);
        box("Stock Retail Value", `Rs ${Math.round(stockSummary.valuationRetail).toLocaleString()}`, pm+60, 60);
        box("Expected Profit", `Rs ${Math.round(stockSummary.expectedProfit).toLocaleString()}`, pm+125, 55);
        y += 32;
        head = [["ID","Product Name","Stock","Alert Level","Cost (Rs)","Retail (Rs)"]];
        rows = productsData.map(p=>[
          p.id.substring(0,8).toUpperCase(),
          p.name,
          `${p.current_stock} ${p.unit||"pcs"}`,
          `${p.min_stock_level} ${p.unit||"pcs"}`,
          (Number(p.current_stock||0)*Number(p.purchase_price_single||0)).toFixed(0),
          (Number(p.current_stock||0)*Number(p.sale_price_single||0)).toFixed(0)
        ]);

      } else if (activeTab === "khata") {
        const totRec = partiesData.filter(p=>p.type==="customer").reduce((s,p)=>s+Number(p.current_balance||0),0);
        const totPay = partiesData.filter(p=>p.type==="supplier").reduce((s,p)=>s+Number(p.current_balance||0),0);
        box("Customer Receivables", `Rs ${Math.round(totRec).toLocaleString()}`, pm, 88);
        box("Supplier Payables",    `Rs ${Math.round(totPay).toLocaleString()}`, pm+95, 85);
        y += 32;
        head = [["Party Name","Phone","Type","Outstanding Balance (Rs)"]];
        rows = partiesData.map(p=>[
          p.name, p.phone||"-",
          p.type==="customer"?"Customer":"Supplier",
          Number(p.current_balance||0).toFixed(0)
        ]);
      } else if (activeTab === "aging") {
        const totRec = agingReport.receivables.reduce((s,p)=>s+p.total,0);
        const totPay = agingReport.payables.reduce((s,p)=>s+p.total,0);
        box("Total Receivables", `Rs ${Math.round(totRec).toLocaleString()}`, pm, 88);
        box("Total Payables",    `Rs ${Math.round(totPay).toLocaleString()}`, pm+95, 85);
        y += 32;
        head = [["Party Name","0-30 Days","31-60 Days","61-90 Days","90+ Days","Total (Rs)"]];
        
        if (agingReport.receivables.length > 0) {
          rows.push(["--- ACCOUNTS RECEIVABLE ---","","","","",""]);
          agingReport.receivables.forEach((r: any) => {
             rows.push([r.name, r.b0_30.toFixed(0), r.b31_60.toFixed(0), r.b61_90.toFixed(0), r.b90_plus.toFixed(0), r.total.toFixed(0)]);
          });
        }
        if (agingReport.payables.length > 0) {
          rows.push(["--- ACCOUNTS PAYABLE ---","","","","",""]);
          agingReport.payables.forEach((p: any) => {
             rows.push([p.name, p.b0_30.toFixed(0), p.b31_60.toFixed(0), p.b61_90.toFixed(0), p.b90_plus.toFixed(0), p.total.toFixed(0)]);
          });
        }
      }

      autoTable(doc, {
        startY: y,
        head,
        body: rows,
        margin: { left: pm, right: pm },
        styles: { fontSize: 8, font: "helvetica" },
        headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: () => {},
      });

      doc.save(`NATechHub_${activeTab}_${startDate}_to_${endDate}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err: any) {
      toast.error("PDF generation failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // ── Sidebar tab config ─────────────────────────────────────────────────────
  const tabs: { id: ReportTab; label: string; urdu: string; icon: React.ReactNode; group: string }[] = [
    { id:"sales",               label:"Sales Summary",         urdu:"سیلز سمری",       icon:<ShoppingBag size={13}/>, group:"Sales (فروخت)" },
    { id:"sales_by_product",    label:"Sales by Product",      urdu:"پروڈکٹ سیلز",     icon:<Layers size={13}/>,      group:"Sales (فروخت)" },
    { id:"sales_by_customer",   label:"Sales by Customer",     urdu:"کسٹمر سیلز",      icon:<Users size={13}/>,       group:"Sales (فروخت)" },
    { id:"sales_by_payment",    label:"Sales by Payment",      urdu:"ادائیگی رپورٹ",   icon:<CreditCard size={13}/>,  group:"Sales (فروخت)" },
    { id:"purchases",           label:"Purchases Summary",     urdu:"خریداری سمری",    icon:<Truck size={13}/>,       group:"Purchases (خریداری)" },
    { id:"purchases_by_supplier",label:"Purchases by Supplier",urdu:"سپلائر خریداری", icon:<Truck size={13}/>,       group:"Purchases (خریداری)" },
    { id:"expenses",            label:"Expense Statements",    urdu:"اخراجات تفصیل",  icon:<TrendingDown size={13}/>, group:"Expenses (اخراجات)" },
    { id:"expense_category",    label:"Expense by Category",   urdu:"اخراجات اقسام",  icon:<Layers size={13}/>,      group:"Expenses (اخراجات)" },
    { id:"pl",                  label:"Profit & Loss",         urdu:"نفع و نقصان",     icon:<Calculator size={13}/>,  group:"Analytics (تجزیہ)" },
    { id:"inventory",           label:"Stock Valuation",       urdu:"اسٹاک مالیت",     icon:<Package size={13}/>,     group:"Analytics (تجزیہ)" },
    { id:"khata",               label:"Khata / Udhaar",        urdu:"بقایا ادھار",     icon:<Users size={13}/>,       group:"Analytics (تجزیہ)" },
    { id:"aging",               label:"Aging Report (A/R & A/P)", urdu:"ایجنگ رپورٹ", icon:<TrendingDown size={13}/>, group:"Analytics (تجزیہ)" },
  ];
  const groups = [...new Set(tabs.map(t=>t.group))];

  return (
    <div className="space-y-5 animate-in fade-in duration-500 font-sans text-slate-800">

      {/* ── Action Header ── */}
      <div className="flex items-center justify-end">
        <Button
          onClick={generatePDF}
          disabled={loading || downloading || (["expenses", "expense_category", "pl", "inventory", "khata", "aging"].includes(activeTab) && !allowReports)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 shadow-md cursor-pointer"
        >
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
          {isUrdu ? "پی ڈی ایف رپورٹ ڈاؤن لوڈ کریں" : "Download PDF Report"}
        </Button>
      </div>

      {/* ── Date Controls ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isUrdu ? "از تاریخ" : "From"}</span>
            <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="h-8 text-xs w-36 font-semibold"/>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{isUrdu ? "تا تاریخ" : "To"}</span>
            <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="h-8 text-xs w-36 font-semibold"/>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {label: isUrdu ? "آج" : "Today", cb:()=>setPreset(0,"days")},
            {label: isUrdu ? "گزشتہ کل" : "Yesterday", cb:()=>setPreset(1,"days")},
            {label: isUrdu ? "7 دن" : "7 Days", cb:()=>setPreset(7,"days")},
            {label: isUrdu ? "30 دن" : "30 Days", cb:()=>setPreset(30,"days")},
            {label: isUrdu ? "موجودہ مہینہ" : "This Month", cb:()=>setPreset(0,"month")},
            {label: isUrdu ? "موجودہ سال" : "This Year", cb:()=>setPreset(0,"year")},
          ].map(btn=>(
            <button key={btn.label} onClick={btn.cb}
              className="px-3 py-1.5 bg-slate-100 hover:bg-primary/10 hover:text-primary border border-transparent text-[11px] font-bold text-slate-600 rounded-xl transition-all cursor-pointer">
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main layout: Sidebar + Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Tab Navigator */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 h-fit space-y-4">
          {groups.map(group => (
            <div key={group}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-2">{group}</p>
              <div className="space-y-0.5">
                {tabs.filter(t=>t.group===group).map(t=>(
                  <button
                    key={t.id}
                    onClick={()=>setActiveTab(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all cursor-pointer ${
                      activeTab===t.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {t.icon}
                      <span>{isUrdu ? t.urdu : t.label}</span>
                      {["expenses", "expense_category", "pl", "inventory", "khata", "aging"].includes(t.id) && !allowReports && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] px-1 rounded-sm border border-amber-200">PRO</span>
                      )}
                    </span>
                    <span className={`text-[9px] font-bold ${activeTab===t.id?"text-blue-200":"text-slate-400"}`}>{isUrdu ? t.label : t.urdu}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Report Content */}
        <div className="lg:col-span-9 space-y-5">

          {["expenses", "expense_category", "pl", "inventory", "khata", "aging"].includes(activeTab) && !allowReports ? (
            <SubscriptionBlocker 
              featureName={tabs.find(t => t.id === activeTab)?.label || "Premium Financial Statement"} 
              requiredPlan="Starter" 
              description={isUrdu ? "یہ تجزیاتی رپورٹ صرف پریمیم پلانز پر دستیاب ہے۔ مکمل اکاؤنٹس آڈٹ کے لیے اپنے پلان کو اپ گریڈ کریں۔" : "This analytical statement is only available on paid plans. Upgrade your subscription to unlock complete accounts auditing."}
            />
          ) : loading ? (
            <div className="h-[45vh] flex flex-col justify-center items-center bg-white rounded-3xl border border-slate-200/80 shadow-sm text-slate-400">
              <Loader2 className="h-9 w-9 animate-spin mb-3 text-blue-500"/>
              <p className="font-semibold text-sm">{isUrdu ? "رپورٹ لوڈ ہو رہی ہے..." : "Loading report data..."}</p>
            </div>
          ) : (
            <>
              {/* ── KPI Summary Cards ── */}

              {/* SALES SUMMARY */}
              {activeTab==="sales" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "کل انوائسز / بلز" : "Total Invoices"} value={`${salesData.length}`} sub={isUrdu ? "منتخب مدت میں جاری شدہ" : "Issued in date range"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل سیلز ریونیو" : "Total Revenue"} value={`Rs ${Math.round(plSummary.revenue).toLocaleString()}`} sub={isUrdu ? "تمام بلز کی مجموعی رقم" : "All invoice totals"} color="slate"/>
                  <KpiCard label={isUrdu ? "مجموعی منافع" : "Gross Profit"} value={`Rs ${Math.round(plSummary.grossProfit).toLocaleString()}`} sub={`${isUrdu ? "مارجن" : "Margin"}: ${plSummary.revenue>0?((plSummary.grossProfit/plSummary.revenue)*100).toFixed(1):0}%`} color="green"/>
                </div>
              )}

              {/* SALES BY PRODUCT */}
              {activeTab==="sales_by_product" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "فروخت شدہ پروڈکٹس" : "Products Ranked"} value={`${salesByProduct.length}`} sub={isUrdu ? "ایکٹو آئٹمز" : "SKUs with sales activity"} color="blue"/>
                  <KpiCard label={isUrdu ? "پروڈکٹ ریونیو" : "Total Revenue"} value={`Rs ${Math.round(salesByProduct.reduce((s,p)=>s+p.revenue,0)).toLocaleString()}`} sub={isUrdu ? "کل سیلز رقم" : "Product sales combined"} color="slate"/>
                  <KpiCard label={isUrdu ? "متوقع منافع" : "Estimated Profit"} value={`Rs ${Math.round(salesByProduct.reduce((s,p)=>s+p.profit,0)).toLocaleString()}`} sub={isUrdu ? "ریونیو منہا خریداری لاگت" : "Revenue minus purchase cost"} color="green"/>
                </div>
              )}

              {/* SALES BY CUSTOMER */}
              {activeTab==="sales_by_customer" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "ایکٹو کسٹمرز" : "Customers"} value={`${salesByCustomer.length}`} sub={isUrdu ? "خریداروں کی تعداد" : "Unique buyers in period"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل خریداری بلنگ" : "Total Purchased"} value={`Rs ${Math.round(salesByCustomer.reduce((s,c)=>s+c.total,0)).toLocaleString()}`} sub={isUrdu ? "مجموعی لیجر بلنگ" : "Gross ledger billing"} color="slate"/>
                  <KpiCard label={isUrdu ? "بقایا ادھار" : "Outstanding Udhaar"} value={`Rs ${Math.round(salesByCustomer.reduce((s,c)=>s+c.balance,0)).toLocaleString()}`} sub={isUrdu ? "مارکیٹ سے واجب الوصول" : "Unpaid balances due"} color="red"/>
                </div>
              )}

              {/* SALES BY PAYMENT */}
              {activeTab==="sales_by_payment" && (() => {
                const totRev = salesByPayment.reduce((s,p)=>s+p.total,0);
                return (
                  <div className="grid md:grid-cols-3 gap-4">
                    <KpiCard label={isUrdu ? "نقد رقم (Cash)" : "Cash (نقد)"} value={`Rs ${Math.round(salesByPayment.find(p=>p.mode==="cash")?.total||0).toLocaleString()}`} sub={`${salesByPayment.find(p=>p.mode==="cash")?.count||0} ${isUrdu ? "ٹرانزیکشنز" : "transactions"}`} color="green"/>
                    <KpiCard label={isUrdu ? "کارڈ / ڈیجیٹل (Card)" : "Card (کارڈ)"} value={`Rs ${Math.round(salesByPayment.find(p=>p.mode==="card")?.total||0).toLocaleString()}`} sub={`${salesByPayment.find(p=>p.mode==="card")?.count||0} ${isUrdu ? "ٹرانزیکشنز" : "transactions"}`} color="blue"/>
                    <KpiCard label={isUrdu ? "ادھار کھاتہ (Udhaar)" : "Udhaar (ادھار)"} value={`Rs ${Math.round(salesByPayment.find(p=>p.mode==="credit")?.total||0).toLocaleString()}`} sub={`${salesByPayment.find(p=>p.mode==="credit")?.count||0} ${isUrdu ? "ادھار بلز" : "credit bills"}`} color="red"/>
                  </div>
                );
              })()}

              {/* PURCHASES SUMMARY */}
              {activeTab==="purchases" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <KpiCard label={isUrdu ? "خریداری آرڈرز" : "Purchase Orders"} value={`${purchasesData.length}`} sub={isUrdu ? "سپلائر مال وصولی" : "Supplier restocks received"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل خریداری خرچ" : "Total Spend"} value={`Rs ${Math.round(purchasesData.reduce((s,p)=>s+Number(p.total_amount||0),0)).toLocaleString()}`} sub={isUrdu ? "اسٹاک خریداری لاگت" : "Procurement capital outflow"} color="slate"/>
                </div>
              )}

              {/* PURCHASES BY SUPPLIER */}
              {activeTab==="purchases_by_supplier" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <KpiCard label={isUrdu ? "ایکٹو سپلائرز" : "Active Suppliers"} value={`${purchasesBySupplier.length}`} sub={isUrdu ? "سپلائر لسٹ" : "Suppliers with restocks"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل خریداری مالیت" : "Total Procurement"} value={`Rs ${Math.round(purchasesBySupplier.reduce((s,x)=>s+x.total,0)).toLocaleString()}`} sub={isUrdu ? "مجموعی ہول سیل خریداری" : "Total wholesale spend"} color="slate"/>
                </div>
              )}

              {/* EXPENSE DETAILS */}
              {activeTab==="expenses" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <KpiCard label={isUrdu ? "اخراجات انٹریز" : "Expense Entries"} value={`${expensesData.length}`} sub={isUrdu ? "دوکان کے اندراج شدہ اخراجات" : "Logged operations costs"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل اخراجات" : "Total Expenses"} value={`Rs ${Math.round(plSummary.expenses).toLocaleString()}`} sub={isUrdu ? "مجموعی آپریشنل اخراجات" : "Non-product outflow"} color="red"/>
                </div>
              )}

              {/* EXPENSE BY CATEGORY */}
              {activeTab==="expense_category" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <KpiCard label={isUrdu ? "اخراجات کی اقسام" : "Expense Categories"} value={`${expenseByCategory.length}`} sub={isUrdu ? "مختلف کیٹیگریز" : "Distinct types logged"} color="blue"/>
                  <KpiCard label={isUrdu ? "کل کیٹیگری اخراجات" : "Total Expenses"} value={`Rs ${Math.round(expenseByCategory.reduce((s,c)=>s+c.total,0)).toLocaleString()}`} sub={isUrdu ? "تمام اقسام کا مجموعہ" : "Total outflow sum"} color="red"/>
                </div>
              )}

              {/* PROFIT & LOSS */}
              {activeTab==="pl" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "مجموعی ریونیو (Sales)" : "Gross Revenue"} value={`Rs ${Math.round(plSummary.revenue).toLocaleString()}`} sub={isUrdu ? "کل فروخت" : "Total billings"} color="slate" dark/>
                  <KpiCard label={isUrdu ? "فروخت شدہ مال کی لاگت (COGS)" : "Total COGS"} value={`Rs ${Math.round(plSummary.cogs).toLocaleString()}`} sub={isUrdu ? "خریداری لاگت" : "Purchase cost of sold goods"} color="slate"/>
                  <KpiCard label={isUrdu ? "خالص منافع (Net Profit)" : "Net Profit"} value={`Rs ${Math.round(plSummary.netProfit).toLocaleString()}`} sub={`${isUrdu ? "مارجن" : "Margin"}: ${plSummary.marginPct.toFixed(1)}%`} color="green"/>
                </div>
              )}

              {/* INVENTORY */}
              {activeTab==="inventory" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "اسٹاک لاگت پر (Cost)" : "Stock at Cost"} value={`Rs ${Math.round(stockSummary.valuationCost).toLocaleString()}`} sub={isUrdu ? "خرید ریٹ پر مالیت" : "Procurement asset value"} color="slate"/>
                  <KpiCard label={isUrdu ? "اسٹاک سیل ریٹ پر (Retail)" : "Stock at Retail"} value={`Rs ${Math.round(stockSummary.valuationRetail).toLocaleString()}`} sub={isUrdu ? "متوقع فروخت مالیت" : "Expected sale revenue"} color="blue"/>
                  <KpiCard label={isUrdu ? "متوقع منافع" : "Expected Profit"} value={`Rs ${Math.round(stockSummary.expectedProfit).toLocaleString()}`} sub={`${stockSummary.lowStockCount} ${isUrdu ? "آئٹمز کم اسٹاک پر ہیں" : "items low on stock"}`} color="green"/>
                </div>
              )}

              {/* KHATA */}
              {activeTab==="khata" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <KpiCard label={isUrdu ? "کسٹمر ادھار وصولی" : "Customer Receivables"} value={`Rs ${Math.round(partiesData.filter(p=>p.type==="customer").reduce((s,p)=>s+Number(p.current_balance||0),0)).toLocaleString()}`} sub={isUrdu ? "مارکیٹ سے لینا ہے" : "Udhaar to collect"} color="red"/>
                  <KpiCard label={isUrdu ? "سپلائر واجب الادا" : "Supplier Payables"} value={`Rs ${Math.round(partiesData.filter(p=>p.type==="supplier").reduce((s,p)=>s+Number(p.current_balance||0),0)).toLocaleString()}`} sub={isUrdu ? "سپلائرز کو دینا ہے" : "Amount owed to suppliers"} color="slate"/>
                  <KpiCard label={isUrdu ? "رجسٹرڈ پارٹیز" : "Registered Parties"} value={`${partiesData.length}`} sub={isUrdu ? "کسٹمرز + سپلائرز" : "Customers + Suppliers"} color="blue" dark/>
                </div>
              )}

              {/* AGING */}
              {activeTab==="aging" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <KpiCard label={isUrdu ? "کل کسٹمر بقایا جات" : "Total Receivables (A/R)"} value={`Rs ${Math.round(agingReport.receivables.reduce((s,p)=>s+p.total,0)).toLocaleString()}`} sub={isUrdu ? "کسٹمرز سے وصول طلب" : "Outstanding from customers"} color="red"/>
                  <KpiCard label={isUrdu ? "کل سپلائر واجبات" : "Total Payables (A/P)"} value={`Rs ${Math.round(agingReport.payables.reduce((s,p)=>s+p.total,0)).toLocaleString()}`} sub={isUrdu ? "سپلائرز کو ادائیگی طلب" : "Outstanding to suppliers"} color="slate"/>
                </div>
              )}

              {/* ── Data Table ── */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{isUrdu ? "رپورٹ / اسٹیٹمنٹ تفصیلات" : "Statement Details"}</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {startDate} → {endDate}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                      <ReportTableHead activeTab={activeTab} isUrdu={isUrdu}/>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      <ReportTableBody
                        activeTab={activeTab}
                        isUrdu={isUrdu}
                        salesData={salesData}
                        salesByProduct={salesByProduct}
                        salesByCustomer={salesByCustomer}
                        salesByPayment={salesByPayment}
                        purchasesData={purchasesData}
                        purchasesBySupplier={purchasesBySupplier}
                        expensesData={expensesData}
                        expenseByCategory={expenseByCategory}
                        plSummary={plSummary}
                        productsData={productsData}
                        partiesData={partiesData}
                        agingReport={agingReport}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, dark }: {
  label: string; value: string; sub: string;
  color: "blue"|"green"|"red"|"slate"; dark?: boolean;
}) {
  const colors: Record<string, string> = {
    blue:  "text-blue-600",
    green: "text-emerald-600",
    red:   "text-rose-600",
    slate: "text-slate-800",
  };
  return (
    <div className={`p-4.5 rounded-2xl border ${dark?"bg-slate-900 border-slate-700":"bg-white border-slate-200/80"} shadow-sm`}>
      <span className={`text-[9px] font-black uppercase tracking-widest block ${dark?"text-slate-400":"text-slate-400"}`}>{label}</span>
      <h3 className={`text-xl font-black mt-1 ${dark?"text-white":colors[color]}`}>{value}</h3>
      <p className={`text-[10px] font-bold mt-1.5 ${dark?"text-slate-500":"text-slate-400"}`}>{sub}</p>
    </div>
  );
}

function ReportTableHead({ activeTab, isUrdu }: { activeTab: ReportTab; isUrdu?: boolean }) {
  const th = (text: string, right = false) => (
    <th className={`py-3 px-4 ${right?"text-right":""}`}>{text}</th>
  );
  if (activeTab==="sales") return <tr>{th(isUrdu ? "تاریخ" : "Date")}{th(isUrdu ? "انوائس نمبر" : "Invoice ID")}{th(isUrdu ? "کسٹمر" : "Customer")}{th(isUrdu ? "ادائیگی طریقہ" : "Mode")}{th(isUrdu ? "وصول شدہ" : "Received",true)}{th(isUrdu ? "کل رقم" : "Total",true)}{th(isUrdu ? "متوقع منافع" : "Est. Profit",true)}</tr>;
  if (activeTab==="sales_by_product") return <tr>{th(isUrdu ? "پروڈکٹ / ویرینٹ" : "Product / Variant")}{th(isUrdu ? "فروخت شدہ تعداد" : "Units Sold",true)}{th(isUrdu ? "اوسط قیمت" : "Avg Price",true)}{th(isUrdu ? "سیلز ریونیو" : "Sales Revenue",true)}{th(isUrdu ? "خرید لاگت (COGS)" : "Cost (COGS)",true)}{th(isUrdu ? "خالص منافع" : "Net Profit",true)}{th(isUrdu ? "مارجن %" : "Margin",true)}</tr>;
  if (activeTab==="sales_by_customer") return <tr>{th(isUrdu ? "کسٹمر نام" : "Customer")}{th(isUrdu ? "بلز تعداد" : "Invoices",true)}{th(isUrdu ? "کل خریداری" : "Total Purchased",true)}{th(isUrdu ? "ادا شدہ" : "Paid",true)}{th(isUrdu ? "بقایا ادھار" : "Balance / Udhaar",true)}</tr>;
  if (activeTab==="sales_by_payment") return <tr>{th(isUrdu ? "ادائیگی طریقہ" : "Payment Method")}{th(isUrdu ? "بلز تعداد" : "Invoice Count",true)}{th(isUrdu ? "کل ریونیو" : "Total Revenue",true)}{th(isUrdu ? "حصہ %" : "Share %",true)}</tr>;
  if (activeTab==="purchases") return <tr>{th(isUrdu ? "تاریخ" : "Date")}{th(isUrdu ? "پی او نمبر" : "PO ID")}{th(isUrdu ? "سپلائر" : "Supplier")}{th(isUrdu ? "حیثیت" : "Status")}{th(isUrdu ? "کل رقم" : "Total Amount",true)}</tr>;
  if (activeTab==="purchases_by_supplier") return <tr>{th(isUrdu ? "سپلائر نام" : "Supplier Name")}{th(isUrdu ? "آرڈرز تعداد" : "Orders",true)}{th(isUrdu ? "کل خریداری خرچ" : "Total Spend",true)}</tr>;
  if (activeTab==="expenses") return <tr>{th(isUrdu ? "تاریخ" : "Date")}{th(isUrdu ? "خرچے کا عنوان" : "Expense Name")}{th(isUrdu ? "کیٹیگری" : "Category")}{th(isUrdu ? "تفصیل / ریمارکس" : "Remarks")}{th(isUrdu ? "رقم" : "Amount",true)}</tr>;
  if (activeTab==="expense_category") return <tr>{th(isUrdu ? "کیٹیگری" : "Category")}{th(isUrdu ? "انٹریز" : "Count",true)}{th(isUrdu ? "کل رقم" : "Total Amount",true)}{th(isUrdu ? "حصہ %" : "Share %",true)}</tr>;
  if (activeTab==="pl") return <tr>{th(isUrdu ? "اکاؤنٹ تفصیل" : "P&L Account")}{th(isUrdu ? "رقم (روپے)" : "Value (Rs)",true)}</tr>;
  if (activeTab==="inventory") return <tr>{th(isUrdu ? "کوڈ" : "Code")}{th(isUrdu ? "پروڈکٹ نام" : "Product Name")}{th(isUrdu ? "موجودہ اسٹاک" : "Stock")}{th(isUrdu ? "الرٹ لیول" : "Alert")}{th(isUrdu ? "خرید لاگت" : "Cost (Rs)",true)}{th(isUrdu ? "سیل ریٹ" : "Retail (Rs)",true)}</tr>;
  if (activeTab==="khata") return <tr>{th(isUrdu ? "پارٹی نام" : "Party Name")}{th(isUrdu ? "فون نمبر" : "Phone")}{th(isUrdu ? "قسم" : "Type")}{th(isUrdu ? "بقایا بیلنس" : "Balance (Rs)",true)}</tr>;
  if (activeTab==="aging") return <tr>{th(isUrdu ? "پارٹی نام" : "Party Name")}{th(isUrdu ? "0-30 دن" : "0-30 Days",true)}{th(isUrdu ? "31-60 دن" : "31-60 Days",true)}{th(isUrdu ? "61-90 دن" : "61-90 Days",true)}{th(isUrdu ? "90+ دن" : "90+ Days",true)}{th(isUrdu ? "کل واجب الادا" : "Total Due (Rs)",true)}</tr>;
  return null;
}

function ReportTableBody({ activeTab, isUrdu, salesData, salesByProduct, salesByCustomer, salesByPayment,
  purchasesData, purchasesBySupplier, expensesData, expenseByCategory,
  plSummary, productsData, partiesData, agingReport }: {
  activeTab: ReportTab;
  isUrdu?: boolean;
  salesData: any[]; salesByProduct: any[]; salesByCustomer: any[];
  salesByPayment: any[]; purchasesData: any[]; purchasesBySupplier: any[];
  expensesData: any[]; expenseByCategory: any[];
  plSummary: any; productsData: any[]; partiesData: any[];
  agingReport: any;
}) {
  const td  = (v: React.ReactNode, right=false, bold=false, cls="") => (
    <td className={`py-3 px-4 ${right?"text-right":""} ${bold?"font-bold":""} ${cls}`}>{v}</td>
  );
  const badge = (text: string, color: string) => (
    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${color}`}>{text}</span>
  );
  const empty = (cols: number, msg: string) => (
    <tr><td colSpan={cols} className="py-10 text-center text-slate-400 text-sm font-semibold">{msg}</td></tr>
  );

  if (activeTab==="sales") {
    if (!salesData.length) return empty(7, isUrdu ? "منتخب مدت میں کوئی انوائس موجود نہیں ہے۔" : "No invoices in selected date range.");
    return <>{salesData.map(s=>(
      <tr key={s.id} className="hover:bg-slate-50/60">
        {td(new Date(s.created_at).toLocaleDateString(),false,false,"text-slate-500")}
        {td(<span className="font-mono text-[10px] text-slate-500">{s.id.substring(0,8).toUpperCase()}</span>)}
        {td(s.parties?.name || (isUrdu ? "عام کسٹمر (Walk-in)" : "Walk-in"), false, true)}
        {td(badge(
          s.payment_mode==="credit" ? (isUrdu ? "ادھار" : "credit") : s.payment_mode==="card" ? (isUrdu ? "کارڈ" : "card") : (isUrdu ? "نقد" : "cash"),
          s.payment_mode==="credit"?"bg-rose-50 text-rose-700":s.payment_mode==="card"?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"
        ))}
        {td(`Rs ${Math.round(s.paid_amount||0).toLocaleString()}`,true)}
        {td(`Rs ${Math.round(s.total_amount||0).toLocaleString()}`,true,true)}
        {td(<span className="font-bold text-emerald-600">Rs {Math.round(s.profit||0).toLocaleString()}</span>,true)}
      </tr>
    ))}</>;
  }

  if (activeTab==="sales_by_product") {
    if (!salesByProduct.length) return empty(7, isUrdu ? "منتخب مدت میں پروڈکٹ سیلز کا کوئی ڈیٹا نہیں ہے۔" : "No product sales in selected date range.");
    return <>{salesByProduct.map(p=>(
      <tr key={p.name} className="hover:bg-slate-50/60">
        {td(p.name,false,true)}
        {td(`${p.qty.toLocaleString()} ${isUrdu ? "تعداد" : "units"}`,true,false,"text-slate-500 font-mono text-[10px]")}
        {td(`Rs ${Math.round(p.revenue/(p.qty||1)).toLocaleString()}`,true)}
        {td(`Rs ${Math.round(p.revenue).toLocaleString()}`,true,true)}
        {td(`Rs ${Math.round(p.cost).toLocaleString()}`,true,false,"text-slate-400")}
        {td(<span className="font-black text-emerald-600">Rs {Math.round(p.profit).toLocaleString()}</span>,true)}
        {td(`${(p.revenue>0?(p.profit/p.revenue)*100:0).toFixed(1)}%`,true,false,"text-slate-500 font-bold")}
      </tr>
    ))}</>;
  }

  if (activeTab==="sales_by_customer") {
    if (!salesByCustomer.length) return empty(5, isUrdu ? "کسٹمر سیلز کا کوئی ڈیٹا نہیں ہے۔" : "No customer data in range.");
    return <>{salesByCustomer.map(c=>(
      <tr key={c.name} className="hover:bg-slate-50/60">
        {td(c.name,false,true)}
        {td(`${c.count} ${isUrdu ? "بلز" : "bills"}`,true,false,"text-slate-500 font-mono text-[10px]")}
        {td(`Rs ${Math.round(c.total).toLocaleString()}`,true,true)}
        {td(`Rs ${Math.round(c.paid).toLocaleString()}`,true,false,"text-emerald-600")}
        {td(<span className={`font-black ${c.balance>0?"text-rose-600":"text-emerald-600"}`}>Rs {Math.round(c.balance).toLocaleString()}</span>,true)}
      </tr>
    ))}</>;
  }

  if (activeTab==="sales_by_payment") {
    if (!salesByPayment.length) return empty(4, isUrdu ? "ادائیگی کا کوئی ڈیٹا نہیں ہے۔" : "No payment data in range.");
    const tot = salesByPayment.reduce((s,p)=>s+p.total,0);
    return <>{salesByPayment.map(p=>(
      <tr key={p.mode} className="hover:bg-slate-50/60">
        {td(<span className="font-black uppercase">{p.mode==="credit" ? (isUrdu ? "ادھار" : "CREDIT") : p.mode==="card" ? (isUrdu ? "کارڈ" : "CARD") : (isUrdu ? "نقد" : "CASH")}</span>)}
        {td(`${p.count} ${isUrdu ? "بلز" : "invoices"}`,true,false,"text-slate-500 font-mono text-[10px]")}
        {td(`Rs ${Math.round(p.total).toLocaleString()}`,true,true)}
        {td(`${tot>0?((p.total/tot)*100).toFixed(1):0}%`,true,false,"text-slate-500 font-bold")}
      </tr>
    ))}</>;
  }

  if (activeTab==="purchases") {
    if (!purchasesData.length) return empty(5, isUrdu ? "کوئی خریداری آرڈر موجود نہیں ہے۔" : "No purchase orders in range.");
    return <>{purchasesData.map(p=>(
      <tr key={p.id} className="hover:bg-slate-50/60">
        {td(new Date(p.created_at).toLocaleDateString(),false,false,"text-slate-500")}
        {td(<span className="font-mono text-[10px] text-slate-400">{p.id.substring(0,8).toUpperCase()}</span>)}
        {td(p.parties?.name || (isUrdu ? "عام سپلائر" : "Generic Supplier"), false, true)}
        {td(badge(isUrdu ? "مکمل" : (p.status||"completed"), "bg-emerald-50 text-emerald-700"))}
        {td(`Rs ${Math.round(p.total_amount||0).toLocaleString()}`,true,true)}
      </tr>
    ))}</>;
  }

  if (activeTab==="purchases_by_supplier") {
    if (!purchasesBySupplier.length) return empty(3, isUrdu ? "سپلائر خریداری کا کوئی ڈیٹا نہیں ہے۔" : "No supplier procurement data.");
    return <>{purchasesBySupplier.map(s=>(
      <tr key={s.name} className="hover:bg-slate-50/60">
        {td(s.name,false,true)}
        {td(`${s.count} ${isUrdu ? "آرڈرز" : "orders"}`,true,false,"text-slate-500 font-mono text-[10px]")}
        {td(`Rs ${Math.round(s.total).toLocaleString()}`,true,true)}
      </tr>
    ))}</>;
  }

  if (activeTab==="expenses") {
    if (!expensesData.length) return empty(5, isUrdu ? "اس مدت میں کوئی خرچہ درج نہیں ہے۔" : "No expenses logged in range.");
    return <>{expensesData.map(e=>(
      <tr key={e.id} className="hover:bg-slate-50/60">
        {td(new Date(e.created_at).toLocaleDateString(),false,false,"text-slate-500")}
        {td(e.name,false,true)}
        {td(<span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{e.expense_type||(isUrdu ? "عام" : "general")}</span>)}
        {td(e.remarks||"-",false,false,"truncate max-w-[120px] text-slate-400")}
        {td(<span className="font-bold text-rose-600">Rs {Math.round(e.amount||0).toLocaleString()}</span>,true)}
      </tr>
    ))}</>;
  }

  if (activeTab==="expense_category") {
    if (!expenseByCategory.length) return empty(4, isUrdu ? "کوئی خرچہ کیٹیگری موجود نہیں ہے۔" : "No expense categories found.");
    const tot = expenseByCategory.reduce((s,c)=>s+c.total,0);
    return <>{expenseByCategory.map(c=>(
      <tr key={c.category} className="hover:bg-slate-50/60">
        {td(<span className="font-black uppercase">{c.category}</span>)}
        {td(`${c.count} ${isUrdu ? "اندراج" : "logs"}`,true,false,"text-slate-500 font-mono text-[10px]")}
        {td(<span className="font-bold text-rose-600">Rs {Math.round(c.total).toLocaleString()}</span>,true)}
        {td(`${tot>0?((c.total/tot)*100).toFixed(1):0}%`,true,false,"text-slate-500 font-bold")}
      </tr>
    ))}</>;
  }

  if (activeTab==="pl") {
    const rows = [
      {label: isUrdu ? "مجموعی سیلز ریونیو (Gross Sales)" : "Gross Sales Revenue (کل فروخت)", val:plSummary.revenue, cls:"text-slate-800"},
      {label: isUrdu ? "فروخت شدہ مال کی لاگت (COGS)" : "Cost of Goods Sold / COGS (خریداری قیمت)", val:-plSummary.cogs, cls:"text-slate-500"},
      {label: isUrdu ? "مجموعی منافع (Gross Profit)" : "Gross Profit (مجموعی منافع)", val:plSummary.grossProfit, cls:"text-blue-700 bg-blue-50", bold:true},
      {label: isUrdu ? "دوکان کے اخراجات (Operating Expenses)" : "Operating Expenses (دوکان کے خرچے)", val:-plSummary.expenses, cls:"text-slate-500"},
      {label: isUrdu ? "خالص منافع (Net Profit)" : "Net Profit (خالص منافع)", val:plSummary.netProfit, cls:"text-emerald-700 bg-emerald-50 font-black text-base", bold:true},
    ];
    return <>{rows.map((r,i)=>(
      <tr key={i} className={`${r.cls.includes("bg-")?"":"hover:bg-slate-50/60"}`}>
        <td className={`py-3.5 px-4 font-bold ${r.cls}`}>{r.label}</td>
        <td className={`py-3.5 px-4 text-right font-black ${r.cls}`}>Rs {Math.round(Math.abs(r.val)).toLocaleString()}</td>
      </tr>
    ))}</>;
  }

  if (activeTab==="inventory") {
    if (!productsData.length) return empty(6, isUrdu ? "ڈیٹا بیس میں کوئی پروڈکٹ موجود نہیں ہے۔" : "No products in database.");
    return <>{productsData.map((p: any)=>{
      const stock = Number(p.current_stock||0);
      const alert = stock<=Number(p.min_stock_level||0);
      return (
        <tr key={p.id} className={`hover:bg-slate-50/60 ${alert?"bg-amber-50/30":""}`}>
          {td(<span className="font-mono text-[10px] text-slate-400">{p.id.substring(0,8).toUpperCase()}</span>)}
          {td(p.name,false,true)}
          {td(<span className={`font-bold px-2 py-0.5 rounded ${alert?"bg-amber-100 text-amber-800":""}`}>{stock} {p.unit||"pcs"}</span>)}
          {td(`${p.min_stock_level||0} ${p.unit||"pcs"}`,false,false,"text-slate-400")}
          {td(`Rs ${Math.round(Number(p.purchase_price_single||0)).toLocaleString()}`,true)}
          {td(`Rs ${Math.round(Number(p.sale_price_single||0)).toLocaleString()}`,true,true)}
        </tr>
      );
    })}</>;
  }

  if (activeTab==="khata") {
    if (!partiesData.length) return empty(4, isUrdu ? "کوئی پارٹی رجسٹرڈ نہیں ہے۔" : "No parties registered.");
    return <>{partiesData.map((p: any)=>{
      const bal = Number(p.current_balance||0);
      return (
        <tr key={p.id} className="hover:bg-slate-50/60">
          {td(p.name,false,true)}
          {td(p.phone||"-",false,false,"font-mono text-slate-500")}
          {td(badge(
            p.type==="customer" ? (isUrdu ? "کسٹمر" : "Customer") : (isUrdu ? "سپلائر" : "Supplier"),
            p.type==="customer"?"bg-blue-50 text-blue-700 border border-blue-100":"bg-orange-50 text-orange-700 border border-orange-100"
          ))}
          {td(<span className={`font-black ${bal>0?(p.type==="customer"?"text-rose-600":"text-slate-700"):"text-emerald-600"}`}>Rs {Math.round(bal).toLocaleString()}</span>,true)}
        </tr>
      );
    })}</>;
  }

  if (activeTab==="aging") {
    if (!agingReport.receivables.length && !agingReport.payables.length) return empty(6, isUrdu ? "کوئی بقایا جات موجود نہیں ہیں۔" : "No outstanding balances to age.");
    return (
      <>
        {agingReport.receivables.length > 0 && (
          <tr className="bg-slate-100"><td colSpan={6} className="py-2 px-4 text-[10px] font-black text-slate-500 tracking-widest uppercase">{isUrdu ? "کسٹمر واجب الوصول (Accounts Receivable)" : "Accounts Receivable"}</td></tr>
        )}
        {agingReport.receivables.map((r: any) => (
          <tr key={`r_${r.name}`} className="hover:bg-slate-50/60 text-emerald-800">
            {td(r.name,false,true)}
            {td(`Rs ${Math.round(r.b0_30).toLocaleString()}`,true)}
            {td(`Rs ${Math.round(r.b31_60).toLocaleString()}`,true)}
            {td(`Rs ${Math.round(r.b61_90).toLocaleString()}`,true)}
            {td(<span className={r.b90_plus > 0 ? "text-rose-600 font-bold" : ""}>Rs {Math.round(r.b90_plus).toLocaleString()}</span>,true)}
            {td(<span className="font-black text-emerald-600">Rs {Math.round(r.total).toLocaleString()}</span>,true)}
          </tr>
        ))}
        
        {agingReport.payables.length > 0 && (
          <tr className="bg-slate-100"><td colSpan={6} className="py-2 px-4 text-[10px] font-black text-slate-500 tracking-widest uppercase">{isUrdu ? "سپلائر واجب الادا (Accounts Payable)" : "Accounts Payable"}</td></tr>
        )}
        {agingReport.payables.map((p: any) => (
          <tr key={`p_${p.name}`} className="hover:bg-slate-50/60 text-slate-700">
            {td(p.name,false,true)}
            {td(`Rs ${Math.round(p.b0_30).toLocaleString()}`,true)}
            {td(`Rs ${Math.round(p.b31_60).toLocaleString()}`,true)}
            {td(`Rs ${Math.round(p.b61_90).toLocaleString()}`,true)}
            {td(<span className={p.b90_plus > 0 ? "text-amber-600 font-bold" : ""}>Rs {Math.round(p.b90_plus).toLocaleString()}</span>,true)}
            {td(<span className="font-black text-slate-800">Rs {Math.round(p.total).toLocaleString()}</span>,true)}
          </tr>
        ))}
      </>
    );
  }

  return null;
}
