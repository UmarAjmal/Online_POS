"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, DollarSign, Users, AlertTriangle, 
  ArrowUpRight, ShoppingBag, Wallet, Clock, 
  Phone, MessageSquare, ArrowDownRight, RefreshCw, 
  CheckCircle2, Award, Layers, ChevronRight, UserCheck, 
  BarChart3, PieChart as PieIcon, Sparkles, ShieldAlert,
  Truck
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────
type InvoiceItem = {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_mode: string;
  status: string;
  party_id: string | null;
  cashier_name?: string | null;
  parties?: { name: string; phone?: string } | null;
};

type ItemRecord = {
  quantity: number;
  subtotal: number;
  cost_price?: number;
  product_id: string;
  created_at?: string;
  products?: {
    id: string;
    name: string;
    unit?: string | null;
    purchase_price_single?: number;
    category_id?: string;
    categories?: { name: string } | null;
  } | null;
};

type ProductRecord = {
  id: string;
  name: string;
  current_stock: number;
  min_stock_level: number;
  unit: string | null;
  purchase_price_single: number;
  sale_price_single: number;
};

type PartyRecord = {
  id: string;
  name: string;
  phone: string | null;
  type: string; // 'customer' | 'supplier'
  current_balance: number;
  created_at: string;
};

type ExpenseRecord = {
  id: string;
  name: string;
  amount: number;
  expense_type?: string;
  category?: string;
  created_at: string;
};

type ExpiryAlertItem = {
  id: string;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  stock_quantity: number;
};

type OverdueCustomer = {
  id: string;
  name: string;
  phone: string | null;
  pendingBalance: number;
  lastActivityDate: string;
  daysOverdue: number;
};

type TopProduct = {
  id: string;
  name: string;
  unit: string;
  quantitySold: number;
  totalRevenue: number;
};

type TopSeller = {
  name: string;
  billsCount: number;
  totalSales: number;
};

type TopCustomer = {
  id: string;
  name: string;
  phone: string | null;
  billsCount: number;
  totalSpent: number;
  currentBalance: number;
};

export default function DashboardPage() {
  const { shopId, shopName, industryType } = useShop();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  // Raw fetched data
  const [rawInvoices, setRawInvoices] = useState<InvoiceItem[]>([]);
  const [rawItems, setRawItems] = useState<ItemRecord[]>([]);
  const [rawProducts, setRawProducts] = useState<ProductRecord[]>([]);
  const [rawParties, setRawParties] = useState<PartyRecord[]>([]);
  const [rawExpenses, setRawExpenses] = useState<ExpenseRecord[]>([]);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState<ExpiryAlertItem[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchDashboardData();
    }

    const handleAppRefresh = () => {
      if (shopId) fetchDashboardData();
    };

    window.addEventListener("app-refresh", handleAppRefresh);
    return () => window.removeEventListener("app-refresh", handleAppRefresh);
  }, [shopId, industryType]);

  const fetchDashboardData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [
        { data: invoices },
        { data: partiesData },
        { data: productsData },
        { data: itemsData },
        { data: expensesData },
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select(`
            id,
            created_at,
            total_amount,
            paid_amount,
            due_amount,
            payment_mode,
            status,
            party_id,
            cashier_name,
            is_voided,
            parties ( name, phone )
          `)
          .eq("shop_id", shopId)
          .eq("is_voided", false)
          .neq("status", "draft")
          .order("created_at", { ascending: false }),

        supabase
          .from("parties")
          .select("id, name, phone, type, current_balance, created_at")
          .eq("shop_id", shopId),

        supabase
          .from("products")
          .select("id, name, current_stock, min_stock_level, unit, purchase_price_single, sale_price_single")
          .eq("shop_id", shopId),

        supabase
          .from("invoice_items")
          .select(`
            quantity,
            subtotal,
            cost_price,
            product_id,
            created_at,
            products ( id, name, unit, purchase_price_single, category_id, categories ( name ) )
          `)
          .limit(1000),

        supabase
          .from("expenses")
          .select("id, name, amount, expense_type, category, created_at")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false }),
      ]);

      const formattedInvoices: InvoiceItem[] = (invoices || [])
        .filter((inv: any) => inv.status !== "quotation" && inv.payment_mode !== "quotation")
        .map((inv: any) => {
          let partyInfo = null;
          if (inv.parties) {
            partyInfo = Array.isArray(inv.parties) ? inv.parties[0] : inv.parties;
          }
          return {
            id: inv.id,
            created_at: inv.created_at,
            total_amount: Number(inv.total_amount || 0),
            paid_amount: Number(inv.paid_amount || 0),
            due_amount: Number(inv.due_amount || 0),
            payment_mode: inv.payment_mode || "cash",
            status: inv.status,
            party_id: inv.party_id,
            cashier_name: inv.cashier_name || "Admin",
            parties: partyInfo,
          };
        });

      setRawInvoices(formattedInvoices);
      setRawParties(
        (partiesData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          type: p.type || "customer",
          current_balance: Number(p.current_balance || 0),
          created_at: p.created_at,
        }))
      );
      setRawProducts(
        (productsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          current_stock: Number(p.current_stock || 0),
          min_stock_level: Number(p.min_stock_level || 0),
          unit: p.unit,
          purchase_price_single: Number(p.purchase_price_single || 0),
          sale_price_single: Number(p.sale_price_single || 0),
        }))
      );
      setRawItems(
        (itemsData || []).map((i: any) => ({
          quantity: Number(i.quantity || 0),
          subtotal: Number(i.subtotal || 0),
          cost_price: Number(i.cost_price || 0),
          product_id: i.product_id,
          created_at: i.created_at,
          products: i.products,
        }))
      );
      setRawExpenses(
        (expensesData || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount || 0),
          expense_type: e.expense_type || e.category,
          category: e.category || e.expense_type,
          created_at: e.created_at,
        }))
      );

      // Pharmacy near expiry check
      if (industryType === "pharmacy") {
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
        const { data: expiryData } = await supabase
          .from("product_batches")
          .select("id, batch_number, expiry_date, stock_quantity, products(name)")
          .eq("shop_id", shopId)
          .gt("stock_quantity", 0)
          .lte("expiry_date", sixtyDaysFromNow.toISOString().split("T")[0])
          .order("expiry_date", { ascending: true })
          .limit(5);

        if (expiryData) {
          setNearExpiryAlerts(
            expiryData.map((b: any) => ({
              id: b.id,
              batch_number: b.batch_number,
              expiry_date: b.expiry_date,
              stock_quantity: b.stock_quantity,
              product_name: b.products?.name || "Medicine Item",
            }))
          );
        }
      }
    } catch (err: any) {
      console.error("Dashboard statistics loading failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Today's Date Filtering Bounds (Daily Performance) ──────────────
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, []);

  // ── Filtered Datasets ──────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      const d = new Date(inv.created_at);
      return d >= startDate && d <= endDate;
    });
  }, [rawInvoices, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter((exp) => {
      const d = new Date(exp.created_at);
      return d >= startDate && d <= endDate;
    });
  }, [rawExpenses, startDate, endDate]);

  // ── Product Cost Lookup Map ────────────────────────────────────────
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    rawProducts.forEach((p) => {
      map.set(p.id, p.purchase_price_single || 0);
    });
    return map;
  }, [rawProducts]);

  // ── Financial Metrics Calculation ──────────────────────────────────
  const {
    totalRevenue,
    cashSales,
    creditSales,
    totalBillsCount,
    cogsAmount,
    grossProfit,
    grossMarginPct,
    totalExpensesAmount,
    netProfit,
    netMarginPct,
    avgBasketSize,
  } = useMemo(() => {
    let rev = 0;
    let cash = 0;
    let credit = 0;

    filteredInvoices.forEach((inv) => {
      const amt = inv.total_amount;
      rev += amt;
      if (inv.payment_mode === "credit") {
        credit += amt;
      } else {
        cash += amt;
      }
    });

    // Calculate accurate COGS
    let cogs = 0;
    rawItems.forEach((item) => {
      const itemCost = item.cost_price || productCostMap.get(item.product_id) || 0;
      cogs += item.quantity * itemCost;
    });

    // If range is filtered, ratio estimate fallback
    if (cogs === 0 && rev > 0) {
      cogs = rev * 0.75;
    } else if (rev > 0 && rawInvoices.length > 0) {
      const allRev = rawInvoices.reduce((s, i) => s + i.total_amount, 0) || 1;
      const ratio = rev / allRev;
      cogs = cogs * Math.min(ratio, 1);
    }

    const gProfit = rev - cogs;
    const gMargin = rev > 0 ? (gProfit / rev) * 100 : 0;
    const expTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const nProfit = gProfit - expTotal;
    const nMargin = rev > 0 ? (nProfit / rev) * 100 : 0;
    const avgBasket = filteredInvoices.length > 0 ? rev / filteredInvoices.length : 0;

    return {
      totalRevenue: rev,
      cashSales: cash,
      creditSales: credit,
      totalBillsCount: filteredInvoices.length,
      cogsAmount: Math.max(0, cogs),
      grossProfit: gProfit,
      grossMarginPct: gMargin,
      totalExpensesAmount: expTotal,
      netProfit: nProfit,
      netMarginPct: nMargin,
      avgBasketSize: avgBasket,
    };
  }, [filteredInvoices, filteredExpenses, rawItems, productCostMap, rawInvoices]);

  // ── Khata (Receivables & Payables) Position ─────────────────────────
  const {
    totalCustomerReceivables,
    totalSupplierPayables,
    debtorCustomerCount,
    creditorSupplierCount,
    netWorkingCapital,
    receivableRatio,
  } = useMemo(() => {
    let custReceivable = 0;
    let suppPayable = 0;
    let debtorCount = 0;
    let creditorCount = 0;

    rawParties.forEach((p) => {
      if (p.type === "customer") {
        if (p.current_balance > 0) {
          custReceivable += p.current_balance;
          debtorCount++;
        }
      } else if (p.type === "supplier") {
        if (p.current_balance > 0) {
          suppPayable += p.current_balance;
          creditorCount++;
        }
      }
    });

    const netCap = custReceivable - suppPayable;
    const totalDues = custReceivable + suppPayable;
    const ratio = totalDues > 0 ? (custReceivable / totalDues) * 100 : 50;

    return {
      totalCustomerReceivables: custReceivable,
      totalSupplierPayables: suppPayable,
      debtorCustomerCount: debtorCount,
      creditorSupplierCount: creditorCount,
      netWorkingCapital: netCap,
      receivableRatio: ratio,
    };
  }, [rawParties]);

  // ── Overdue Customers (5+ Days Pending Udhaar) ──────────────────────
  const overdueCustomersList = useMemo<OverdueCustomer[]>(() => {
    const now = new Date().getTime();
    const result: OverdueCustomer[] = [];

    const partyLastInvoiceMap = new Map<string, string>();
    rawInvoices.forEach((inv) => {
      if (inv.party_id && (!partyLastInvoiceMap.has(inv.party_id) || new Date(inv.created_at) > new Date(partyLastInvoiceMap.get(inv.party_id)!))) {
        partyLastInvoiceMap.set(inv.party_id, inv.created_at);
      }
    });

    rawParties.forEach((party) => {
      if (party.type === "customer" && party.current_balance > 0) {
        const lastDateStr = partyLastInvoiceMap.get(party.id) || party.created_at;
        const lastTime = new Date(lastDateStr).getTime();
        const diffDays = Math.floor((now - lastTime) / (1000 * 60 * 60 * 24));

        if (diffDays >= 5) {
          result.push({
            id: party.id,
            name: party.name,
            phone: party.phone,
            pendingBalance: party.current_balance,
            lastActivityDate: lastDateStr,
            daysOverdue: diffDays,
          });
        }
      }
    });

    return result.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 6);
  }, [rawParties, rawInvoices]);

  // ── Stock Health Analysis (Out of Stock & Low Stock) ────────────────
  const { outOfStockList, lowStockList } = useMemo(() => {
    const outStock: ProductRecord[] = [];
    const lowStock: ProductRecord[] = [];

    rawProducts.forEach((p) => {
      if (p.current_stock <= 0) {
        outStock.push(p);
      } else if (p.current_stock <= p.min_stock_level) {
        lowStock.push(p);
      }
    });

    return {
      outOfStockList: outStock.slice(0, 6),
      lowStockList: lowStock.slice(0, 6),
    };
  }, [rawProducts]);

  // ── Top Selling Products (Fast Movers) ──────────────────────────────
  const topSellingProducts = useMemo<TopProduct[]>(() => {
    const prodMap = new Map<string, { name: string; unit: string; qty: number; revenue: number }>();

    rawItems.forEach((item) => {
      const pId = item.product_id;
      const pName = item.products?.name || "General Product";
      const pUnit = item.products?.unit || "Units";
      const current = prodMap.get(pId) || { name: pName, unit: pUnit, qty: 0, revenue: 0 };
      current.qty += item.quantity;
      current.revenue += item.subtotal;
      prodMap.set(pId, current);
    });

    return Array.from(prodMap.entries())
      .map(([id, val]) => ({
        id,
        name: val.name,
        unit: val.unit,
        quantitySold: val.qty,
        totalRevenue: val.revenue,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [rawItems]);

  // ── Top Sellers / Cashiers ──────────────────────────────────────────
  const topSellersList = useMemo<TopSeller[]>(() => {
    const sellerMap = new Map<string, { count: number; total: number }>();

    filteredInvoices.forEach((inv) => {
      const seller = inv.cashier_name?.trim() || "Main Cashier";
      const current = sellerMap.get(seller) || { count: 0, total: 0 };
      current.count += 1;
      current.total += inv.total_amount;
      sellerMap.set(seller, current);
    });

    return Array.from(sellerMap.entries())
      .map(([name, val]) => ({
        name,
        billsCount: val.count,
        totalSales: val.total,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 4);
  }, [filteredInvoices]);

  // ── Top VIP Customers ──────────────────────────────────────────────
  const topCustomersList = useMemo<TopCustomer[]>(() => {
    const custMap = new Map<string, { name: string; phone: string | null; count: number; spent: number; balance: number }>();

    filteredInvoices.forEach((inv) => {
      if (inv.party_id && inv.parties) {
        const pId = inv.party_id;
        const current = custMap.get(pId) || {
          name: inv.parties.name,
          phone: inv.parties.phone || null,
          count: 0,
          spent: 0,
          balance: 0,
        };
        current.count += 1;
        current.spent += inv.total_amount;
        custMap.set(pId, current);
      }
    });

    rawParties.forEach((party) => {
      if (custMap.has(party.id)) {
        const item = custMap.get(party.id)!;
        item.balance = party.current_balance;
      }
    });

    return Array.from(custMap.entries())
      .map(([id, val]) => ({
        id,
        name: val.name,
        phone: val.phone,
        billsCount: val.count,
        totalSpent: val.spent,
        currentBalance: val.balance,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 4);
  }, [filteredInvoices, rawParties]);

  // ── Dynamic Sales & Expense Trajectory (Today's Hourly Spline) ─────
  const trendChartData = useMemo(() => {
    const points: { label: string; sales: number; expenses: number }[] = [];
    for (let h = 8; h <= 22; h += 2) {
      const hLabel = `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;
      const hStart = new Date(startDate);
      hStart.setHours(h, 0, 0, 0);
      const hEnd = new Date(startDate);
      hEnd.setHours(h + 2, 0, 0, 0);

      const hSales = filteredInvoices
        .filter((inv) => {
          const d = new Date(inv.created_at);
          return d >= hStart && d < hEnd;
        })
        .reduce((sum, i) => sum + i.total_amount, 0);

      const hExp = filteredExpenses
        .filter((exp) => {
          const d = new Date(exp.created_at);
          return d >= hStart && d < hEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      points.push({ label: hLabel, sales: hSales, expenses: hExp });
    }
    return points;
  }, [startDate, filteredInvoices, filteredExpenses]);

  const maxChartVal = useMemo(() => {
    const maxS = Math.max(...trendChartData.map((d) => d.sales), 0);
    const maxE = Math.max(...trendChartData.map((d) => d.expenses), 0);
    return Math.max(maxS, maxE, 1000);
  }, [trendChartData]);

  // SVG dimensions for trend chart
  const svgW = 600;
  const svgH = 200;
  const padX = 35;
  const padY = 25;

  const trendSvgCoords = useMemo(() => {
    if (!trendChartData.length) return [];
    return trendChartData.map((pt, i) => {
      const x = padX + (i / (trendChartData.length - 1 || 1)) * (svgW - padX * 2);
      const ySales = svgH - padY - (pt.sales / maxChartVal) * (svgH - padY * 2);
      const yExp = svgH - padY - (pt.expenses / maxChartVal) * (svgH - padY * 2);
      return { ...pt, x, ySales, yExp };
    });
  }, [trendChartData, maxChartVal]);

  const salesLineD = useMemo(() => {
    return trendSvgCoords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.ySales.toFixed(1)}`).join(" ");
  }, [trendSvgCoords]);

  const salesAreaD = useMemo(() => {
    if (!trendSvgCoords.length) return "";
    const first = trendSvgCoords[0];
    const last = trendSvgCoords[trendSvgCoords.length - 1];
    return `${salesLineD} L ${last.x.toFixed(1)} ${(svgH - padY).toFixed(1)} L ${first.x.toFixed(1)} ${(svgH - padY).toFixed(1)} Z`;
  }, [salesLineD, trendSvgCoords]);

  // ── Financial Breakdown Donut Chart Math ────────────────────────────
  const donutSegments = useMemo(() => {
    const safeNetProfit = Math.max(0, netProfit);
    const safeCogs = Math.max(0, cogsAmount);
    const safeExp = Math.max(0, totalExpensesAmount);

    const sumComponents = safeCogs + safeExp + safeNetProfit || 1;

    const data = [
      {
        id: "cogs",
        name: language === "ur" ? "مال کی خرید (COGS)" : "Cost of Goods (COGS)",
        value: safeCogs,
        color: "#3b82f6",
        bgColor: "bg-blue-500",
        textColor: "text-blue-600 dark:text-blue-400",
        pct: (safeCogs / sumComponents) * 100,
      },
      {
        id: "expenses",
        name: language === "ur" ? "کاروباری اخراجات" : "Operating Expenses",
        value: safeExp,
        color: "#f97316",
        bgColor: "bg-orange-500",
        textColor: "text-orange-600 dark:text-orange-400",
        pct: (safeExp / sumComponents) * 100,
      },
      {
        id: "profit",
        name: language === "ur" ? "خالص منافع (Net Profit)" : "Net Profit Margin",
        value: safeNetProfit,
        color: "#10b981",
        bgColor: "bg-emerald-500",
        textColor: "text-emerald-600 dark:text-emerald-400",
        pct: (safeNetProfit / sumComponents) * 100,
      },
    ];

    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPct = 0;

    const segments = data.map((seg) => {
      const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPct / 100) * circumference);
      accumulatedPct += seg.pct;
      return {
        ...seg,
        radius,
        circumference,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return segments;
  }, [netProfit, cogsAmount, totalExpensesAmount, language]);

  // Helper for WhatsApp Payment Reminder
  const sendWhatsAppReminder = (customer: OverdueCustomer) => {
    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, "") : "";
    let targetPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      targetPhone = "92" + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(
      `السلام علیکم ${customer.name} صاحب!\nآپ کی طرف ${shopName || "ہماری شاپ"} کا واجب الادا بقایا Rs ${customer.pendingBalance.toLocaleString()} ہے جو کہ ${customer.daysOverdue} دن سے زیر التواء ہے۔\nبرائے مہربانی حساب کلیئر فرما دیجئے۔ شکریہ!`
    );
    window.open(`https://wa.me/${targetPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-zinc-100 pb-12">

      {loading ? (
        <div className="h-[45vh] flex flex-col justify-center items-center rounded-[24px] bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800">
          <div 
            className="h-10 w-10 border-4 border-slate-200 rounded-full animate-spin mb-3"
            style={{ borderTopColor: theme.primaryColor }}
          />
          <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide uppercase">
            Calculating financial aggregates & ledger balances...
          </p>
        </div>
      ) : (
        <>
          {/* ── 1. FINANCIAL METRICS RIBBON (5 SQUIRCLE CARDS - NO BOTTOM COLORED LINES) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
            
            {/* CARD 1: Total Sales / Revenue */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-4 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {language === "ur" ? "کل فروخت (آج)" : "Total Sales / Revenue"}
                </span>
                <div 
                  className="h-8 w-8 rounded-[12px] flex items-center justify-center"
                  style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                >
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Rs {Math.round(totalRevenue).toLocaleString("en-PK")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalBillsCount}</span>
                  <span>{language === "ur" ? `بلز (اوسط Rs ${Math.round(avgBasketSize).toLocaleString("en-PK")})` : `invoices (${Math.round(avgBasketSize).toLocaleString("en-PK")} avg)`}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: Operating Expenses */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-4 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {language === "ur" ? "کاروباری اخراجات" : "Operating Expenses"}
                </span>
                <div className="h-8 w-8 rounded-[12px] bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <ArrowDownRight size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                  Rs {Math.round(totalExpensesAmount).toLocaleString("en-PK")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span className="text-orange-600 font-extrabold">{filteredExpenses.length}</span>
                  <span>{language === "ur" ? "اخراجات واؤچرز" : "recorded expense vouchers"}</span>
                </div>
              </div>
            </div>

            {/* CARD 3: Net Profit */}
            <div className={`relative overflow-hidden bg-white/95 dark:bg-zinc-900/90 border p-4 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${
              netProfit >= 0 ? "border-emerald-200/90 dark:border-emerald-900/40" : "border-rose-200/90 dark:border-rose-900/40"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {language === "ur" ? "خالص منافع" : "Net Bottomline Profit"}
                </span>
                <div className={`h-8 w-8 rounded-[12px] flex items-center justify-center ${
                  netProfit >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}>
                  <Sparkles size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  Rs {Math.round(netProfit).toLocaleString("en-PK")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span className={`px-1.5 py-0.5 rounded-md font-extrabold text-[10px] ${
                    netProfit >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                  }`}>
                    {netMarginPct.toFixed(1)}%
                  </span>
                  <span>{language === "ur" ? "منافع کا تناسب" : "net profit yield margin"}</span>
                </div>
              </div>
            </div>

            {/* CARD 4: Customer Receivables (Udhaar) */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-4 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {language === "ur" ? "کسٹمر بقایا جات (مارکیٹ ادھار)" : "Customer Receivables"}
                </span>
                <div className="h-8 w-8 rounded-[12px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  Rs {Math.round(totalCustomerReceivables).toLocaleString("en-PK")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span className="text-indigo-600 font-extrabold">{debtorCustomerCount}</span>
                  <span>{language === "ur" ? "مجموعی کسٹمر کھاتے" : "active debtor khata accounts"}</span>
                </div>
              </div>
            </div>

            {/* CARD 5: Supplier Payables (Wajib-ul-Adaa) */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-4 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {language === "ur" ? "سپلائر واجبات (کمپنی ادائیگیاں)" : "Supplier Payables"}
                </span>
                <div className="h-8 w-8 rounded-[12px] bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Truck size={16} />
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  Rs {Math.round(totalSupplierPayables).toLocaleString("en-PK")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  <span className="text-rose-600 font-extrabold">{creditorSupplierCount}</span>
                  <span>{language === "ur" ? "زیر التواء سپلائر بلز" : "pending supplier bills"}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── 2. VISUAL CHARTS: SALES TREND + FINANCIAL DONUT BREAKDOWN ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Sales Trend Spline Graph (7 cols) */}
            <div className="lg:col-span-7 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="h-8 w-8 rounded-[12px] flex items-center justify-center"
                      style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                    >
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "سیل و اخراجات کا رجحان" : "Revenue & Expense Trajectory"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "روزانہ کی سیل اور کاروباری خرچ کا ٹائم لائن گراف" : "Timeline comparison of gross intake vs outgoing operational expenses"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                      {language === "ur" ? "سیلز" : "Sales"}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      {language === "ur" ? "اخراجات" : "Expense"}
                    </span>
                  </div>
                </div>

                {/* SVG Area & Spline Trend */}
                <div className="relative w-full h-[220px] mt-4">
                  {trendChartData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">
                      {language === "ur" ? "اس دورانیے میں کوئی ریکارڈ موجود نہیں ہے" : "No transaction records in this period"}
                    </div>
                  ) : (
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="trendSalesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.primaryColor} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={theme.primaryColor} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                        const y = svgH - padY - ratio * (svgH - padY * 2);
                        const val = Math.round(ratio * maxChartVal);
                        return (
                          <g key={idx} className="opacity-40">
                            <line x1={padX} y1={y} x2={svgW - padX} y2={y} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="0.8" />
                            <text x={padX + 2} y={y - 4} className="text-[9px] font-black fill-slate-400 dark:fill-zinc-500">
                              Rs {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Sales Area Fill */}
                      <path d={salesAreaD} fill="url(#trendSalesGradient)" />

                      {/* Sales Line */}
                      <path
                        d={salesLineD}
                        fill="none"
                        stroke={theme.primaryColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Expense Line (Orange Dash) */}
                      <path
                        d={trendSvgCoords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.yExp.toFixed(1)}`).join(" ")}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />

                      {/* Data Point Nodes */}
                      {trendSvgCoords.map((pt, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle
                            cx={pt.x}
                            cy={pt.ySales}
                            r="5"
                            fill="#ffffff"
                            stroke={theme.primaryColor}
                            strokeWidth="3"
                            className="transition-transform group-hover:scale-125"
                          />
                          <text
                            x={pt.x}
                            y={pt.ySales - 10}
                            textAnchor="middle"
                            className="text-[9px] font-black fill-slate-800 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                          >
                            Rs {Math.round(pt.sales).toLocaleString()}
                          </text>

                          <text
                            x={pt.x}
                            y={svgH - 6}
                            textAnchor="middle"
                            className="text-[9px] font-bold fill-slate-400 dark:fill-zinc-500"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              {/* Bottom Quick Summary Ribbon */}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-zinc-800 text-center">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-[14px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{language === "ur" ? "کیش وصولی" : "Cash Inflow"}</p>
                  <p className="text-xs font-black text-slate-800 dark:text-zinc-200 mt-0.5">
                    Rs {Math.round(cashSales).toLocaleString("en-PK")}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-[14px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{language === "ur" ? "ادھار دیا گیا" : "Udhaar Given"}</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Rs {Math.round(creditSales).toLocaleString("en-PK")}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-[14px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{language === "ur" ? "کیش بنام ادھار" : "Cash:Credit Ratio"}</p>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {totalRevenue > 0 ? `${Math.round((cashSales / totalRevenue) * 100)}% ${language === "ur" ? "نقد" : "Cash"}` : "100%"}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Pie / Donut Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <PieIcon size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "مالیاتی تجزیہ و اخراجات" : "Profit & Expense Breakdown"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "خریداری لاگت، اخراجات اور خالص منافع کا تناسب" : "Distribution of COGS, operating costs & net retained profit"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Donut Visualization */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                  
                  {/* Circular SVG Donut */}
                  <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="64"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="18"
                        className="dark:stroke-zinc-800"
                      />

                      {donutSegments.map((seg, idx) => (
                        <circle
                          key={seg.id}
                          cx="80"
                          cy="80"
                          r={seg.radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth={hoveredDonutIndex === idx ? "22" : "18"}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutIndex(idx)}
                          onMouseLeave={() => setHoveredDonutIndex(null)}
                        />
                      ))}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {hoveredDonutIndex !== null ? donutSegments[hoveredDonutIndex].name.split("(")[0] : (language === "ur" ? "کل آمدن" : "Gross Rev")}
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        Rs {hoveredDonutIndex !== null
                          ? Math.round(donutSegments[hoveredDonutIndex].value).toLocaleString("en-PK")
                          : Math.round(totalRevenue).toLocaleString("en-PK")}
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {hoveredDonutIndex !== null
                          ? `${donutSegments[hoveredDonutIndex].pct.toFixed(1)}%`
                          : `${netMarginPct.toFixed(1)}% Net`}
                      </span>
                    </div>
                  </div>

                  {/* Legend breakdown list */}
                  <div className="space-y-2.5 flex-1 w-full">
                    {donutSegments.map((seg, idx) => (
                      <div
                        key={seg.id}
                        onMouseEnter={() => setHoveredDonutIndex(idx)}
                        onMouseLeave={() => setHoveredDonutIndex(null)}
                        className={`p-2.5 rounded-[16px] border transition-all cursor-pointer ${
                          hoveredDonutIndex === idx
                            ? "bg-slate-50 dark:bg-zinc-800/80 border-slate-300 dark:border-zinc-700 shadow-sm"
                            : "bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-[6px] ${seg.bgColor}`} />
                            <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                              {seg.name}
                            </span>
                          </div>
                          <span className="font-black text-slate-900 dark:text-white">
                            Rs {Math.round(seg.value).toLocaleString("en-PK")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-1 pl-5">
                          <span>{seg.pct.toFixed(1)}% {language === "ur" ? "کل آمدن کا" : "of revenue"}</span>
                          <span className={seg.textColor}>{language === "ur" ? "تصدیق شدہ" : "Verified"}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Bottom Note */}
              <div className="p-2.5 rounded-[16px] bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-zinc-300">
                <span>{language === "ur" ? "خالص منافع تناسب" : "Net Retained Margin"}</span>
                <span className="px-2 py-0.5 rounded-[10px] bg-emerald-500/10 text-emerald-600 font-black">
                  {netMarginPct.toFixed(1)}% {language === "ur" ? "مارجن" : "Yield"}
                </span>
              </div>
            </div>

          </div>

          {/* ── 3. KHATA POSITION: RECEIVABLES VS PAYABLES LIQUIDITY GAUGE ─ */}
          <div className="bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[12px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    {language === "ur" ? "کھاتہ و مالیاتی پوزیشن (وصولیاں بنام ادائیگیاں)" : "Ledger Working Capital & Balance Position"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {language === "ur" ? "مارکیٹ سے کسٹمر ریکوری بمقابلہ سپلائر کے واجب الادا بلز" : "Live comparison of customer market udhaar vs supplier pending bills"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/dashboard/khata">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-[14px] border-slate-200 dark:border-zinc-700">
                    {language === "ur" ? "کھاتہ رجسٹر کھولیں" : "Open Khata Ledger"}
                  </Button>
                </Link>
                <Link href="/dashboard/purchase">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-[14px] border-slate-200 dark:border-zinc-700">
                    {language === "ur" ? "سپلائر بلز" : "Supplier Dues"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Customer Receivables */}
                <div className="p-3.5 rounded-[18px] bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      {language === "ur" ? "کسٹمر بقایا جات (مارکیٹ وصولی)" : "Customer Receivables"}
                    </span>
                    <h4 className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
                      Rs {Math.round(totalCustomerReceivables).toLocaleString("en-PK")}
                    </h4>
                    <p className="text-[10px] font-bold text-indigo-500 mt-0.5">
                      {language === "ur" ? `${debtorCustomerCount} گاہکوں کے کھاتے میں بقایا ہے` : `${debtorCustomerCount} customers have pending balance`}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-[14px] bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-xs">
                    {receivableRatio.toFixed(0)}%
                  </div>
                </div>

                {/* Supplier Payables */}
                <div className="p-3.5 rounded-[18px] bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                      {language === "ur" ? "سپلائر واجبات (کمپنی ادائیگیاں)" : "Supplier Payables"}
                    </span>
                    <h4 className="text-xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
                      Rs {Math.round(totalSupplierPayables).toLocaleString("en-PK")}
                    </h4>
                    <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                      {language === "ur" ? `${creditorSupplierCount} سپلائر اکاؤنٹس زیر التواء ہیں` : `${creditorSupplierCount} supplier accounts pending`}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-[14px] bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-xs">
                    {(100 - receivableRatio).toFixed(0)}%
                  </div>
                </div>

                {/* Net Working Capital Surplus/Deficit */}
                <div className={`p-3.5 rounded-[18px] border flex items-center justify-between ${
                  netWorkingCapital >= 0
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                    : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
                }`}>
                  <div>
                    <span className={`text-[10px] font-black uppercase ${
                      netWorkingCapital >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {language === "ur" ? "خالص مارکیٹ پوزیشن" : "Net Market Liquidity"}
                    </span>
                    <h4 className={`text-xl font-black mt-0.5 ${
                      netWorkingCapital >= 0 ? "text-emerald-950 dark:text-emerald-200" : "text-amber-950 dark:text-amber-200"
                    }`}>
                      Rs {Math.round(netWorkingCapital).toLocaleString("en-PK")}
                    </h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${netWorkingCapital >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {netWorkingCapital >= 0 
                        ? (language === "ur" ? "مثبت سرپلس بیلنس" : "Positive Surplus Balance")
                        : (language === "ur" ? "ادائیگیاں وصولیوں سے زیادہ ہیں" : "Payables Exceed Receivables")}
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-[14px] flex items-center justify-center font-black text-xs ${
                    netWorkingCapital >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {netWorkingCapital >= 0 ? (language === "ur" ? "سرپلس" : "Surplus") : (language === "ur" ? "قرض" : "Debt")}
                  </div>
                </div>

              </div>

              {/* Proportional Split Bar */}
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${receivableRatio}%` }}
                  title={`Customer Receivables: ${receivableRatio.toFixed(1)}%`}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500 rounded-r-full"
                  style={{ width: `${100 - receivableRatio}%` }}
                  title={`Supplier Payables: ${(100 - receivableRatio).toFixed(1)}%`}
                />
              </div>
            </div>
          </div>

          {/* ── 4. STOCK ALERTS & TOP FAST-MOVING PRODUCTS (2 COLS) ───────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Out of Stock & Low Stock Warnings (6 cols) */}
            <div className="lg:col-span-6 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[12px] bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "ختم اور کم اسٹاک الرٹس" : "Out of Stock & Depletion Alerts"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "وہ اشیاء جو ختم ہو چکی ہیں یا کم ترین لیول پر ہیں" : "Products below minimum reorder thresholds"}
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/products">
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary px-2 rounded-[10px]">
                      {language === "ur" ? "انوینٹری دیکھیں" : "View Inventory"} <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>

                {/* Stock Table */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-2">
                  {outOfStockList.length === 0 && lowStockList.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-[14px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mb-2">
                        <CheckCircle2 size={20} />
                      </div>
                      <p className="text-xs font-bold text-emerald-600">{language === "ur" ? "تمام پروڈکٹس کا اسٹاک تسلی بخش ہے" : "All Product Stocks Healthy"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{language === "ur" ? "کوئی آئٹم ختم نہیں ہے" : "No critical shortages detected"}</p>
                    </div>
                  ) : (
                    [...outOfStockList, ...lowStockList].slice(0, 5).map((prod) => {
                      const isZero = prod.current_stock <= 0;
                      return (
                        <div key={prod.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-[16px] transition-colors">
                          <div className="min-w-0 pr-3">
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 truncate max-w-[220px]">
                              {prod.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {language === "ur" ? `کم از کم حد: ${prod.min_stock_level} • قیمت خرید: Rs ${prod.purchase_price_single}` : `Min Level: ${prod.min_stock_level} ${prod.unit || "units"} • Buy: Rs ${prod.purchase_price_single}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-[12px] ${
                              isZero
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"
                            }`}>
                              {isZero ? (language === "ur" ? "ختم شدہ" : "Out of Stock") : `${prod.current_stock} ${prod.unit || (language === "ur" ? "باقی" : "left")}`}
                            </span>
                            <Link href={`/dashboard/purchase?product=${encodeURIComponent(prod.name)}`}>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] font-black rounded-[10px] px-2 border-slate-200 dark:border-zinc-700">
                                {language === "ur" ? "آرڈر دیں" : "Order"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Top Selling Fast Movers (6 cols) */}
            <div className="lg:col-span-6 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[12px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Award size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "سب سے زیادہ فروخت ہونے والی اشیاء" : "Top Selling Fast Movers"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "فروخت اور آمدن کے لحاظ سے بہترین پراڈکٹس" : "Highest volume and revenue generating inventory"}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-[10px] border border-amber-200 dark:border-amber-900/40">
                    {language === "ur" ? "ٹاپ لسٹ" : "Leaderboard"}
                  </span>
                </div>

                {/* Top Selling List */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-2">
                  {topSellingProducts.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                      {language === "ur" ? "اس دورانیے میں کوئی فروخت ریکارڈ نہیں ہوئی" : "No sales recorded in this timeframe"}
                    </div>
                  ) : (
                    topSellingProducts.map((prod, idx) => {
                      const medalColors = [
                        "bg-amber-100 text-amber-800 border-amber-300",
                        "bg-slate-200 text-slate-700 border-slate-300",
                        "bg-amber-50 text-amber-700 border-amber-200",
                        "bg-slate-100 text-slate-600 border-slate-200",
                        "bg-slate-100 text-slate-600 border-slate-200",
                      ];
                      return (
                        <div key={prod.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-[16px] transition-colors">
                          <div className="flex items-center gap-3 min-w-0 pr-3">
                            <div className={`h-7 w-7 rounded-[10px] border flex items-center justify-center font-black text-xs shrink-0 ${medalColors[idx] || medalColors[3]}`}>
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 truncate max-w-[200px]">
                                {prod.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {prod.quantitySold} {prod.unit || (language === "ur" ? "فروخت" : "units sold")}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              Rs {Math.round(prod.totalRevenue).toLocaleString("en-PK")}
                            </span>
                            <p className="text-[10px] text-emerald-600 font-bold">{language === "ur" ? "آمدن" : "Revenue"}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── 5. AGING KHATA: 5+ DAYS OVERDUE PAYMENTS (HIGH IMPORTANCE) ── */}
          <div className="bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-[12px] bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {language === "ur" ? "5 دن سے زائد پرانے زیر التواء ادھار (اوور ڈیو کھاتہ)" : "Aging Khata: 5+ Days Overdue Customer Balances"}
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      {overdueCustomersList.length} {language === "ur" ? "واجب الادا" : "Overdue"}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {language === "ur" ? "جن گاہکوں کا بقایا ادھار 5 دن یا اس سے زیادہ پرانا ہو چکا ہے" : "Immediate collection queue for receivables older than 5 business days"}
                  </p>
                </div>
              </div>

              <Link href="/dashboard/khata">
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-[14px] border-slate-200 dark:border-zinc-700">
                  {language === "ur" ? "مکمل کھاتہ بک" : "Full Khata Book"} <ArrowUpRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>

            {/* Overdue Table */}
            <div className="mt-3">
              {overdueCustomersList.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="h-10 w-10 rounded-[14px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs font-bold text-emerald-600">{language === "ur" ? "کوئی بھی ادھار 5 دن سے زائد پرانا نہیں ہے" : "No Overdue Debts Over 5 Days"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{language === "ur" ? "تمام گاہکوں کا کھاتہ اپ ٹو ڈیٹ ہے" : "All customer khata payments are up-to-date"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                  {overdueCustomersList.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 rounded-[20px] bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-600 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white capitalize">
                            {customer.name}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {customer.phone || (language === "ur" ? "فون نمبر موجود نہیں" : "No Phone")}
                          </p>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                          {customer.daysOverdue} {language === "ur" ? "دن پرانا" : "Days Due"}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{language === "ur" ? "واجب الادا رقم" : "Pending Due"}</p>
                          <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                            Rs {Math.round(customer.pendingBalance).toLocaleString("en-PK")}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          {customer.phone && (
                            <button
                              onClick={() => sendWhatsAppReminder(customer)}
                              title={language === "ur" ? "واٹس ایپ ریمائنڈر بھیجیں" : "Send WhatsApp Payment Reminder"}
                              className="h-8 w-8 rounded-[12px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              title={language === "ur" ? "فون کال کریں" : "Call Customer"}
                              className="h-8 w-8 rounded-[12px] bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-300 transition-colors"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          <Link href={`/dashboard/khata?search=${encodeURIComponent(customer.name)}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[10px] font-black rounded-[12px] px-2 border-slate-200 dark:border-zinc-700">
                              {language === "ur" ? "لیجر" : "Ledger"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 6. TOP SELLERS & TOP VIP CUSTOMERS (2 COLS) ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Top Staff / Cashiers (6 cols) */}
            <div className="lg:col-span-6 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[12px] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "ٹاپ سیلز عملہ و کیشیئرز" : "Top Performing Cashiers & Staff"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "سیلز کاؤنٹر پر سب سے زیادہ بل بنانے والا عملہ" : "Highest volume operators by POS invoice generation"}
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/staff">
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary px-2 rounded-[10px]">
                      {language === "ur" ? "اسٹاف لسٹ" : "Staff Directory"} <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>

                {/* Staff List */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-2">
                  {topSellersList.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                      {language === "ur" ? "عملے کی کوئی سیلز ریکارڈ نہیں ہے" : "No staff sales recorded yet"}
                    </div>
                  ) : (
                    topSellersList.map((seller) => (
                      <div key={seller.name} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-[16px] transition-colors">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-8 w-8 rounded-[12px] flex items-center justify-center font-black text-xs"
                            style={{ backgroundColor: `${theme.primaryColor}18`, color: theme.primaryColor }}
                          >
                            {seller.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200 capitalize">
                              {seller.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {seller.billsCount} {language === "ur" ? "انوائسز بنائی گئیں" : "invoices generated"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            Rs {Math.round(seller.totalSales).toLocaleString("en-PK")}
                          </span>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {language === "ur" ? "اوسط" : "Avg"} Rs {Math.round(seller.totalSales / (seller.billsCount || 1)).toLocaleString("en-PK")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Top VIP Customers (6 cols) */}
            <div className="lg:col-span-6 bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[12px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Users size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {language === "ur" ? "ٹاپ معزز گاہک (VIP گاہک)" : "Top VIP Buying Customers"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === "ur" ? "سب سے زیادہ خریداری کرنے والے گاہک اور ان کا حساب" : "Highest lifetime spend and current ledger balances"}
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/khata">
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary px-2 rounded-[10px]">
                      {language === "ur" ? "کسٹمر کھاتہ" : "Customer Ledger"} <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>

                {/* VIP Customers List */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 mt-2">
                  {topCustomersList.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                      {language === "ur" ? "گاہکوں کا کوئی ریکارڈ نہیں ملا" : "No customer transactions logged in timeframe"}
                    </div>
                  ) : (
                    topCustomersList.map((cust) => (
                      <div key={cust.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-2 rounded-[16px] transition-colors">
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className="h-8 w-8 rounded-[12px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                            VIP
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200 truncate capitalize">
                              {cust.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {cust.billsCount} {language === "ur" ? "بلز" : "visits"} &bull; {cust.phone || (language === "ur" ? "فون نمبر نہیں ہے" : "No phone")}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            Rs {Math.round(cust.totalSpent).toLocaleString("en-PK")}
                          </span>
                          <p className={`text-[10px] font-bold ${
                            cust.currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}>
                            {cust.currentBalance > 0 
                              ? (language === "ur" ? `بقایا: Rs ${Math.round(cust.currentBalance).toLocaleString()}` : `Due: Rs ${Math.round(cust.currentBalance).toLocaleString()}`)
                              : (language === "ur" ? "حساب صفر" : "Zero Balance")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── 7. PHARMACY EXPIRY BATCHES (IF APPLICABLE) ───────────────── */}
          {industryType === "pharmacy" && nearExpiryAlerts.length > 0 && (
            <div className="bg-white/95 dark:bg-zinc-900/90 border border-orange-200/90 dark:border-orange-900/40 p-5 rounded-[24px] shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-[12px] bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-orange-900 dark:text-orange-200">
                      {language === "ur" ? "قریبی میعاد ختم ہونے والی ادویات (اگلے 60 دن)" : "Pharmacy Critical Batch Expiry Watch (Next 60 Days)"}
                    </h2>
                    <p className="text-[11px] text-orange-600/80 font-medium">
                      {language === "ur" ? "ان ادویات کی جلد فروخت یا سپلائر کو واپسی تجویز کی جاتی ہے" : "Immediate clearance or return to supplier recommended"}
                    </p>
                  </div>
                </div>

                <Link href="/dashboard/products?tab=products">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-[14px] text-orange-700 border-orange-200">
                    {language === "ur" ? "ایکسپائری مینیجر" : "Expiry Manager"}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                {nearExpiryAlerts.map((batch) => {
                  const daysLeft = Math.ceil((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  const isExpired = daysLeft <= 0;
                  return (
                    <div key={batch.id} className="p-3.5 rounded-[18px] bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{batch.product_name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          {language === "ur" ? `بیچ: ${batch.batch_number} • مقدار: ${batch.stock_quantity}` : `Batch: ${batch.batch_number} • Qty: ${batch.stock_quantity}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-[10px] ${
                        isExpired ? "bg-red-100 text-red-700 border border-red-200" : "bg-orange-100 text-orange-800 border border-orange-200"
                      }`}>
                        {isExpired ? (language === "ur" ? "ایکسپائر" : "EXPIRED") : (language === "ur" ? `${daysLeft} دن باقی` : `${daysLeft}d left`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
}
