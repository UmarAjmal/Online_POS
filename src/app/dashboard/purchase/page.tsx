"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Plus, FileText, Keyboard, Search, ShoppingCart,
  Trash2, Check, X, Minus, CreditCard, Loader2, Banknote, ReceiptText, Save, Smartphone
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyPurchaseTransaction, notifyAuditDelete } from "@/lib/notifications";

// ── Modular Components ──────────────────────────────────────────────────────
import { SupplierSelector } from "./_components/SupplierSelector";
import { AddSupplierModal } from "./_components/AddSupplierModal";
import { PurchaseHistory } from "./_components/PurchaseHistory";
import { PODetailModal } from "./_components/PODetailModal";
import { ShortcutsHelp } from "./_components/ShortcutsHelp";
import type { DBProduct, Supplier, Category, CartItem, PurchaseOrder, PODetailItem } from "./_components/types";

export default function PurchasePage() {
  const { shopId, shopName, industryType, hasTax, userName, userRole } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [isLive, setIsLive] = useState(false);

  // ── Base data ──
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // ── Cart state ──
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState("walkin");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"cash" | "bank" | "credit">("cash");
  const [paidNow, setPaidNow] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Cart keyboard focus ──
  const [isCartFocused, setIsCartFocused] = useState(false);
  const [selectedCartIdx, setSelectedCartIdx] = useState(-1);

  // ── Search dropdown focus & index state ──
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedSearchProductIndex, setSelectedSearchProductIndex] = useState(0);

  // ── Modals ──
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeProductForVariants, setActiveProductForVariants] = useState<DBProduct | null>(null);
  const [selectedModalIndex, setSelectedModalIndex] = useState<number>(0);

  // IMEI manual input states for Purchase
  const [isImeiPurchaseModalOpen, setIsImeiPurchaseModalOpen] = useState(false);
  const [imeiPurchaseProduct, setImeiPurchaseProduct] = useState<DBProduct | null>(null);
  const [imeiPurchaseInputs, setImeiPurchaseInputs] = useState<Array<{ imei1: string; imei2?: string }>>([]);

  // Pharmacy manual input states for Purchase
  const [isPharmacyPurchaseModalOpen, setIsPharmacyPurchaseModalOpen] = useState(false);
  const [pharmacyPurchaseCartIdx, setPharmacyPurchaseCartIdx] = useState<number | null>(null);
  const [pharmacyInputs, setPharmacyInputs] = useState<{ bonusQty: number; discount: number; batchNumber: string; expiryDate: string }>({ bonusQty: 0, discount: 0, batchNumber: "", expiryDate: "" });

  // Hardware Calculator States (ft + in split inputs)
  const [hardwareCalcProduct, setHardwareCalcProduct] = useState<DBProduct | null>(null);
  const [hardwareCalcLengthFt, setHardwareCalcLengthFt] = useState<number>(0);
  const [hardwareCalcLengthIn, setHardwareCalcLengthIn] = useState<number>(0);
  const [hardwareCalcWidthFt, setHardwareCalcWidthFt] = useState<number>(0);
  const [hardwareCalcWidthIn, setHardwareCalcWidthIn] = useState<number>(0);
  const [hardwareCalcQty, setHardwareCalcQty] = useState<number>(1);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedPOItems, setSelectedPOItems] = useState<PODetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  // ── History ──
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Realtime ──
  useEffect(() => {
    if (!shopId) return;
    fetchBaseData();
    const channel = supabase
      .channel(`purchase-rt-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `shop_id=eq.${shopId}` }, fetchBaseData)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders", filter: `shop_id=eq.${shopId}` }, () => { fetchBaseData(); if (activeTab === "history") fetchHistory(); })
      .subscribe((s: any) => setIsLive(s === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [shopId]);

  useEffect(() => { if (activeTab === "history" && shopId) fetchHistory(); }, [activeTab, shopId]);

  // ── Computed totals ──
  const subtotal = cart.reduce((acc, c) => acc + c.purchasePrice * c.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = Math.max(0, subtotal + taxAmount - discount);
  const remaining = Math.max(0, total - paidNow);
  useEffect(() => { if (paymentMode !== "credit") setPaidNow(total); else setPaidNow(0); }, [paymentMode, total]);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== "all") list = list.filter(p => p.category_id === selectedCategoryId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
    }
    return list;
  }, [products, selectedCategoryId, searchQuery]);

  // ── Autocomplete Results ──
  const autocompleteResults = useMemo(() => {
    if (searchQuery.trim() === "") return [];
    return filteredProducts.slice(0, 10);
  }, [filteredProducts, searchQuery]);

  // ── Modal Choices for Variations ──
  const modalChoices = useMemo<any[]>(() => {
    if (!activeProductForVariants) return [];
    return [
      { id: "base", name: `Base Unit (${activeProductForVariants.unit || "unit"})`, purchasePrice: activeProductForVariants.purchase_price_single || 0, price: activeProductForVariants.sale_price_single || 0, stock: activeProductForVariants.current_stock, isBase: true },
      ...getProductUnitOptions(activeProductForVariants)
    ];
  }, [activeProductForVariants]);

  useEffect(() => {
    setSelectedModalIndex(0);
  }, [activeProductForVariants]);

  // ── Helper to retrieve packing options ──
  function getProductUnitOptions(product: DBProduct) {
    const options: {
      id: string;
      name: string;
      price: number;
      purchasePrice: number;
      stock: number;
    }[] = [];

    if (product.product_variants && product.product_variants.length > 0) {
      for (const v of product.product_variants) {
        if (!options.some(o => o.name.toLowerCase() === v.packing_name.toLowerCase())) {
          const isPacking = !!v.is_packing;
          const stockVal = isPacking && v.pack_size ? Math.floor(product.current_stock / v.pack_size) : v.stock_quantity;

          options.push({
            id: v.id,
            name: v.packing_name,
            price: v.sale_price,
            purchasePrice: v.purchase_price || 0,
            stock: stockVal
          });
        }
      }
    }
    return options;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ════════════════════════════════════════════════════════════════════════════
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement;

    // ── Intercept keys if activeProductForVariants modal is open ──
    if (activeProductForVariants) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedModalIndex(prev => (prev + 1 < modalChoices.length ? prev + 1 : prev));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedModalIndex(prev => (prev - 1 >= 0 ? prev - 1 : prev));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const choice = modalChoices[selectedModalIndex];
        if (choice) {
          if (choice.isBase) {
            addToCart(activeProductForVariants);
          } else {
            addToCart(activeProductForVariants, choice.id, choice.name, choice.purchasePrice, choice.price);
          }
        }
        setActiveProductForVariants(null);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveProductForVariants(null);
        return;
      }
    }

    const isEditingInputOrSelect =
      (activeEl?.tagName === "INPUT" && activeEl.id !== "purchase-search-input") ||
      activeEl?.tagName === "SELECT" ||
      activeEl?.tagName === "TEXTAREA";

    if (isEditingInputOrSelect) {
      const allowedKeys = ["F1", "F2", "F3", "F4", "F7", "F8", "F9", "F10", "Escape"];
      if (!allowedKeys.includes(e.key)) {
        return;
      }
    }

    // INTERCEPT keys if autocomplete dropdown is open
    if (isSearchDropdownOpen && autocompleteResults.length > 0 && activeEl?.id === "purchase-search-input") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSearchProductIndex(prev => (prev + 1 < autocompleteResults.length ? prev + 1 : prev));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSearchProductIndex(prev => (prev - 1 >= 0 ? prev - 1 : prev));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selectedProd = autocompleteResults[selectedSearchProductIndex];
        if (selectedProd) {
          const options = getProductUnitOptions(selectedProd);
          if (options.length > 0) {
            setActiveProductForVariants(selectedProd);
          } else {
            addToCart(selectedProd);
          }
        }
        setSearchQuery("");
        setIsSearchDropdownOpen(false);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsSearchDropdownOpen(false);
        return;
      }
    }

    // ── Cart-focused mode ──
    if (isCartFocused && cart.length > 0) {
      if (e.key === "Escape" || e.key === "F3" || (e.altKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        setIsCartFocused(false); setSelectedCartIdx(-1);
        document.getElementById("purchase-search-input")?.focus();
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCartIdx(p => Math.min(p + 1, cart.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCartIdx(p => Math.max(p - 1, 0)); return; }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedCartIdx >= 0) {
          const activeId = document.activeElement?.id;
          if (!activeId || !activeId.startsWith("purchase-")) {
            document.getElementById(`purchase-rate-${selectedCartIdx}`)?.focus();
          } else if (activeId === `purchase-rate-${selectedCartIdx}`) {
            document.getElementById(`purchase-salerate-${selectedCartIdx}`)?.focus();
          } else if (activeId === `purchase-salerate-${selectedCartIdx}`) {
            document.getElementById(`purchase-qty-${selectedCartIdx}`)?.focus();
          }
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (selectedCartIdx >= 0) {
          const activeId = document.activeElement?.id;
          if (!activeId || !activeId.startsWith("purchase-")) {
            document.getElementById(`purchase-qty-${selectedCartIdx}`)?.focus();
          } else if (activeId === `purchase-qty-${selectedCartIdx}`) {
            document.getElementById(`purchase-salerate-${selectedCartIdx}`)?.focus();
          } else if (activeId === `purchase-salerate-${selectedCartIdx}`) {
            document.getElementById(`purchase-rate-${selectedCartIdx}`)?.focus();
          }
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setCart(prev => prev.filter((_, i) => i !== selectedCartIdx));
        setSelectedCartIdx(prev => {
          if (cart.length <= 1) {
            setIsCartFocused(false);
            return -1;
          }
          return Math.min(prev, cart.length - 2);
        });
        return;
      }
      if (e.key === "F8") { e.preventDefault(); setPaymentMode(p => p === "cash" ? "bank" : p === "bank" ? "credit" : "cash"); return; }
      if (e.key === "F9" || (e.altKey && e.key === "Enter")) { e.preventDefault(); handleSavePurchase(); return; }
    }

    // ── Global shortcuts ──
    if (e.key === "Enter" && activeEl?.id === "purchase-search-input" && searchQuery.trim() !== "") {
      e.preventDefault();
      const query = searchQuery.trim().toLowerCase();

      const matchedProduct = products.find(p => p.code && p.code.toLowerCase() === query);
      if (matchedProduct) {
        const options = getProductUnitOptions(matchedProduct);
        if (options.length > 0) {
          setActiveProductForVariants(matchedProduct);
        } else {
          addToCart(matchedProduct);
        }
        setSearchQuery("");
        setIsSearchDropdownOpen(false);
        return;
      } else {
        if (autocompleteResults.length === 1) {
          const prod = autocompleteResults[0];
          const options = getProductUnitOptions(prod);
          if (options.length > 0) {
            setActiveProductForVariants(prod);
          } else {
            addToCart(prod);
          }
          setSearchQuery("");
          setIsSearchDropdownOpen(false);
          return;
        }
      }
    }

    if (e.key === "F1" || (e.altKey && e.key.toLowerCase() === "s")) {
      e.preventDefault();
      setIsCartFocused(false); setSelectedCartIdx(-1);
      document.getElementById("purchase-search-input")?.focus();
      setIsSearchDropdownOpen(true);
    }
    if (e.key === "F2" || (e.altKey && e.key.toLowerCase() === "u")) {
      e.preventDefault();
      document.getElementById("purchase-supplier-btn")?.click();
    }
    if ((e.key === "F3" || (e.altKey && e.key.toLowerCase() === "a")) && !isCartFocused) {
      e.preventDefault();
      if (cart.length === 0) { toast.warning("Cart is empty!"); return; }
      setIsCartFocused(true); setSelectedCartIdx(0);
      document.getElementById("purchase-search-input")?.blur();
      toast.info("Cart focused — use ↑↓ to navigate, ← to edit price, → to edit qty, Del to remove");
    }
    if (e.key === "F4" || (e.altKey && e.key.toLowerCase() === "d")) {
      e.preventDefault();
      document.getElementById("purchase-discount-input")?.focus();
    }
    if (e.key === "F7" || (e.altKey && e.key.toLowerCase() === "t")) {
      e.preventDefault();
      document.getElementById("purchase-tax-input")?.focus();
    }
    if (e.key === "F8") {
      e.preventDefault();
      setPaymentMode(p => p === "cash" ? "bank" : p === "bank" ? "credit" : "cash");
    }
    if (e.key === "F9" || (e.altKey && e.key === "Enter")) {
      e.preventDefault();
      handleSavePurchase();
    }
    if (e.key === "F10" || (e.altKey && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      setIsShortcutsOpen(p => !p);
    }
    if (e.key === "Escape") {
      setSearchQuery("");
      setIsSearchDropdownOpen(false);
      setIsCartFocused(false); setSelectedCartIdx(-1);
    }
  }, [isCartFocused, cart, selectedCartIdx, paymentMode, discount, taxRate, selectedSupplierId, isSearchDropdownOpen, autocompleteResults, selectedSearchProductIndex, searchQuery, products]);

  useEffect(() => {
    if (activeTab !== "new") return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, handleKeyDown]);

  // ── Fetch functions ──
  async function fetchBaseData() {
    if (!shopId) return;
    setLoading(true);
    try {
      let prodsRes = await supabase.from("products")
        .select("id,name,code,unit,purchase_price_single,sale_price_single,current_stock,category_id,pack_size,measurement_type,has_imei,is_ingredient,product_variants(id,packing_name,purchase_price,sale_price,stock_quantity,is_packing,pack_size)")
        .eq("shop_id", shopId).order("name");

      if (prodsRes.error) {
        if (prodsRes.error.message.includes("is_ingredient") || prodsRes.error.hint?.includes("is_ingredient")) {
          prodsRes = await supabase.from("products")
            .select("id,name,code,unit,purchase_price_single,sale_price_single,current_stock,category_id,pack_size,measurement_type,has_imei,product_variants(id,packing_name,purchase_price,sale_price,stock_quantity,is_packing,pack_size)")
            .eq("shop_id", shopId).order("name");
          if (prodsRes.error) throw prodsRes.error;
          prodsRes.data = (prodsRes.data || []).map((p: any) => ({ ...p, is_ingredient: false }));
        } else {
          throw prodsRes.error;
        }
      }

      const [{ data: sups }, { data: cats }, { data: accs }] = await Promise.all([
        supabase.from("parties").select("id,name,phone,current_balance,address").eq("shop_id", shopId).eq("type", "supplier").order("name"),
        supabase.from("categories").select("id,name").eq("shop_id", shopId).order("name"),
        supabase.from("cash_accounts").select("id,name,current_balance").eq("shop_id", shopId).order("name"),
      ]);
      setProducts((prodsRes.data || []) as any);
      setSuppliers(sups || []);
      setCategories(cats || []);
      setAccounts(accs || []);
      if (accs && accs.length > 0) {
        const cashInHandAcc = accs.find((a: any) => a.name.toLowerCase() === "cash in hand");
        setSelectedAccountId(prev => prev || (cashInHandAcc ? cashInHandAcc.id : accs[0].id));
      }
    } catch (err: any) { toast.error("Load failed: " + err.message); }
    finally { setLoading(false); }
  }

  async function fetchHistory() {
    if (!shopId) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id,created_at,total_amount,paid_amount,discount,tax_amount,status,payment_mode,notes,invoice_number,is_voided,supplier_id")
        .eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;

      const pMap: Record<string, string> = {};
      const psRes = await supabase.from("parties").select("id,name").eq("shop_id", shopId).eq("type", "supplier");
      (psRes.data || []).forEach((p: any) => { pMap[p.id] = p.name; });

      const itemsRes = await supabase.from("purchase_order_items").select("purchase_order_id");
      const cMap: Record<string, number> = {};
      (itemsRes.data || []).forEach((r: any) => { cMap[r.purchase_order_id] = (cMap[r.purchase_order_id] || 0) + 1; });

      setPurchaseOrders((data || []).map((po: any) => ({
        ...po,
        total_amount: Number(po.total_amount), paid_amount: Number(po.paid_amount),
        discount: Number(po.discount), tax_amount: Number(po.tax_amount),
        supplierName: po.supplier_id ? (pMap[po.supplier_id] || "Unknown") : "Cash Purchase",
        itemCount: cMap[po.id] || 0,
      })));
    } catch (err: any) { toast.error("History load failed: " + err.message); }
    finally { setHistoryLoading(false); }
  }

  // ── Cart helpers ──
  const handleConfirmHardwareCalculation = () => {
    if (!hardwareCalcProduct) return;

    const isDimension = hardwareCalcProduct.measurement_type === "dimension";

    // Convert ft+in to total feet
    const totalLengthFt = hardwareCalcLengthFt + hardwareCalcLengthIn / 12;
    const totalWidthFt = hardwareCalcWidthFt + hardwareCalcWidthIn / 12;

    if (totalLengthFt <= 0) {
      toast.error("Please enter a valid length.");
      return;
    }
    if (isDimension && totalWidthFt <= 0) {
      toast.error("Please enter a valid width.");
      return;
    }

    let totalQty = 0;
    if (isDimension) {
      totalQty = totalLengthFt * totalWidthFt * hardwareCalcQty;
    } else {
      totalQty = totalLengthFt * hardwareCalcQty;
    }
    totalQty = Math.round(totalQty * 1000) / 1000;

    const fmtFtIn = (ft: number, inches: number) => {
      const parts: string[] = [];
      if (ft > 0) parts.push(`${ft} ft`);
      if (inches > 0) parts.push(`${inches} in`);
      return parts.length > 0 ? parts.join(' ') : '0 ft';
    };
    const descSuffix = isDimension
      ? `${fmtFtIn(hardwareCalcLengthFt, hardwareCalcLengthIn)} × ${fmtFtIn(hardwareCalcWidthFt, hardwareCalcWidthIn)} (${hardwareCalcQty} pcs)`
      : `${fmtFtIn(hardwareCalcLengthFt, hardwareCalcLengthIn)} (${hardwareCalcQty} pcs)`;

    const purchasePrice = hardwareCalcProduct.purchase_price_single || 0;
    const salePrice = hardwareCalcProduct.sale_price_single || 0;
    const stock = hardwareCalcProduct.current_stock;

    const existIdx = cart.findIndex(c => c.productId === hardwareCalcProduct.id && c.packingName === descSuffix);
    if (existIdx !== -1) {
      setCart(prev => prev.map((c, i) => i === existIdx ? { ...c, quantity: c.quantity + totalQty } : c));
    } else {
      setCart(prev => [...prev, {
        productId: hardwareCalcProduct.id,
        variantId: undefined,
        name: hardwareCalcProduct.name,
        packingName: descSuffix,
        purchasePrice,
        salePrice,
        quantity: totalQty,
        stock
      }]);
    }

    setHardwareCalcProduct(null);
  };

  const openImeiPurchaseModal = (item: CartItem, cartIndex: number) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;
    setImeiPurchaseProduct(prod);
    setImeiPurchaseInputs(item.imeis || [{ imei1: "", imei2: "" }]);
    setIsImeiPurchaseModalOpen(true);
  };

  const openPharmacyPurchaseModal = (item: CartItem, cartIndex: number) => {
    setPharmacyPurchaseCartIdx(cartIndex);
    setPharmacyInputs({
      bonusQty: item.bonusQty || 0,
      discount: item.discount || 0,
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
    });
    setIsPharmacyPurchaseModalOpen(true);
  };

  const handleConfirmImeiPurchase = () => {
    if (!imeiPurchaseProduct) return;

    // Validate that all rows have imei1 filled
    const invalidRowIndex = imeiPurchaseInputs.findIndex(input => !input.imei1.trim());
    if (invalidRowIndex !== -1) {
      toast.error(`Please enter IMEI 1 for device #${invalidRowIndex + 1}`);
      return;
    }

    // Validate uniqueness of IMEI 1 in the list
    const imei1s = imeiPurchaseInputs.map(input => input.imei1.trim());
    const hasDuplicates = imei1s.some((val, i) => imei1s.indexOf(val) !== i);
    if (hasDuplicates) {
      toast.error("Duplicate IMEI 1 numbers are not allowed in the same item.");
      return;
    }

    const qty = imeiPurchaseInputs.length;
    const purchasePrice = imeiPurchaseProduct.purchase_price_single || 0;
    const salePrice = imeiPurchaseProduct.sale_price_single || 0;

    const existIdx = cart.findIndex(c => c.productId === imeiPurchaseProduct.id && !c.variantId);
    if (existIdx !== -1) {
      setCart(prev => prev.map((c, i) => i === existIdx ? {
        ...c,
        quantity: qty,
        imeis: imeiPurchaseInputs
      } : c));
      toast.success(`Updated ${imeiPurchaseProduct.name} IMEIs (${qty} units)`);
    } else {
      setCart(prev => [...prev, {
        productId: imeiPurchaseProduct.id,
        variantId: undefined,
        name: imeiPurchaseProduct.name,
        purchasePrice,
        salePrice,
        quantity: qty,
        stock: imeiPurchaseProduct.current_stock,
        has_imei: true,
        imeis: imeiPurchaseInputs
      }]);
      toast.success(`Added ${imeiPurchaseProduct.name} (${qty} units) to cart`);
    }

    setIsImeiPurchaseModalOpen(false);
    setImeiPurchaseProduct(null);
    setImeiPurchaseInputs([]);
  };

  function addToCart(product: DBProduct, variantId?: string, variantName?: string, variantPrice?: number, variantSalePrice?: number) {
    if (product.has_imei) {
      const existIdx = cart.findIndex(c => c.productId === product.id && !c.variantId);
      if (existIdx !== -1) {
        openImeiPurchaseModal(cart[existIdx], existIdx);
      } else {
        setImeiPurchaseProduct(product);
        setImeiPurchaseInputs([{ imei1: "", imei2: "" }]);
        setIsImeiPurchaseModalOpen(true);
      }
      return;
    }

    if (industryType === "hardware" && (product.measurement_type === "dimension" || product.measurement_type === "length")) {
      if (!variantId) {
        setHardwareCalcProduct(product);
        setHardwareCalcLengthFt(0);
        setHardwareCalcLengthIn(0);
        setHardwareCalcWidthFt(0);
        setHardwareCalcWidthIn(0);
        setHardwareCalcQty(1);
        return;
      }
    }

    const existIdx = cart.findIndex(c => c.productId === product.id && c.variantId === variantId);
    if (existIdx !== -1) {
      setCart(prev => prev.map((c, i) => i === existIdx ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart(prev => [...prev, {
        productId: product.id, variantId, name: product.name, packingName: variantName,
        purchasePrice: variantId ? (variantPrice ?? product.purchase_price_single ?? 0) : (product.purchase_price_single || 0),
        salePrice: variantId ? (variantSalePrice ?? 0) : (product.sale_price_single || 0),
        quantity: 1, stock: product.current_stock,
      }]);
    }
  }

  function resetCart() {
    setCart([]); setSelectedSupplierId("walkin"); setDiscount(0); setTaxRate(0);
    setPaymentMode("cash"); setPaidNow(0); setInvoiceNumber(""); setNotes("");
    setIsCartFocused(false); setSelectedCartIdx(-1);
    if (accounts.length > 0) {
      const cashInHandAcc = accounts.find(a => a.name.toLowerCase() === "cash in hand");
      setSelectedAccountId(cashInHandAcc ? cashInHandAcc.id : accounts[0].id);
    }
  }

  // ── Save Purchase with Weighted Average Cost ──────────────────────────────
  async function handleSavePurchase() {
    if (cart.length === 0) { toast.warning("Add at least one product!"); return; }
    if (!shopId) return;
    setIsSubmitting(true);
    try {
      const effectivePaid = paymentMode !== "credit" ? total : paidNow;
      const status = effectivePaid >= total ? "PAID" : effectivePaid > 0 ? "PARTIAL" : "CREDIT";

      const { data: po, error: poErr } = await supabase.from("purchase_orders").insert({
        shop_id: shopId,
        supplier_id: selectedSupplierId !== "walkin" ? selectedSupplierId : null,
        total_amount: total, paid_amount: effectivePaid,
        discount, tax_amount: taxAmount,
        status, payment_mode: paymentMode,
        notes: notes.trim() || null,
        invoice_number: invoiceNumber.trim() || null,
        is_voided: false,
        account_id: (effectivePaid > 0 && selectedAccountId) ? selectedAccountId : null,
      }).select().single();
      if (poErr) throw poErr;

      // Deduct paid amount from selected account
      if (effectivePaid > 0 && selectedAccountId) {
        const currentAcc = accounts.find(a => a.id === selectedAccountId);
        if (currentAcc) {
          const { error: accUpdateErr } = await supabase
            .from("cash_accounts")
            .update({ current_balance: Number(currentAcc.current_balance) - effectivePaid })
            .eq("id", selectedAccountId);
          if (accUpdateErr) throw accUpdateErr;
        }

        const { error: txErr } = await supabase.from("account_transactions").insert({
          shop_id: shopId,
          account_id: selectedAccountId,
          type: "withdrawal",
          amount: effectivePaid,
          ref_type: "purchase",
          ref_id: po.id,
          remarks: `Purchase #${po.id.slice(0, 8).toUpperCase()}${invoiceNumber ? ` | Inv: ${invoiceNumber}` : ""}`,
        });
        if (txErr) throw txErr;
      }

      for (const item of cart) {
        await supabase.from("purchase_order_items").insert({
          purchase_order_id: po.id,
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
          unit_price: item.purchasePrice,
          purchase_price: item.purchasePrice,
          subtotal: item.purchasePrice * item.quantity,
          bonus_quantity: item.bonusQty || 0,
          discount_amount: item.discount || 0,
          batch_number: item.batchNumber || null,
          expiry_date: item.expiryDate || null,
        });

        if ((industryType === "pharmacy" || industryType === "fertilizer") && item.batchNumber && item.expiryDate) {
          await supabase.from("product_batches").insert({
            shop_id: shopId,
            product_id: item.productId,
            variant_id: item.variantId || null,
            batch_number: item.batchNumber,
            expiry_date: item.expiryDate,
            stock_quantity: item.quantity + (item.bonusQty || 0),
            purchase_price: item.purchasePrice
          });
        }

        if (item.has_imei && item.imeis && item.imeis.length > 0) {
          const imeiRows = item.imeis.map(im => ({
            product_id: item.productId,
            shop_id: shopId,
            imei1: im.imei1.trim(),
            imei2: im.imei2?.trim() || null,
            status: "available"
          }));
          const { error: imeiInsertErr } = await supabase
            .from("product_imeis")
            .insert(imeiRows);
          if (imeiInsertErr) throw imeiInsertErr;
        }

        // ── Weighted Average Cost Calculation ──────────────────────────────
        // Adjust for pharmacy bonus & discount
        const effectivePurchasedQty = item.quantity + (item.bonusQty || 0);
        const effectiveTotalCost = Math.max(0, (item.purchasePrice * item.quantity) - (item.discount || 0));
        const effectiveUnitPrice = effectivePurchasedQty > 0 ? effectiveTotalCost / effectivePurchasedQty : item.purchasePrice;

        const parentProd = products.find(p => p.id === item.productId);
        if (item.variantId && parentProd) {
          const v = parentProd.product_variants?.find(v => v.id === item.variantId);
          if (v) {
            const isBoxPack = !!v.is_packing && v.pack_size && v.pack_size > 0;
            const variantPackSize = v.pack_size || 1;

            if (isBoxPack) {
              const oldProdStock = parentProd.current_stock || 0;
              const newProdStock = oldProdStock + (effectivePurchasedQty * variantPackSize);

              const pricePerBaseUnit = effectiveUnitPrice / variantPackSize;
              const oldBasePurchasePrice = parentProd.purchase_price_single || pricePerBaseUnit;
              const weightedBasePrice = newProdStock > 0
                ? Math.round(((oldProdStock * oldBasePurchasePrice) + (effectivePurchasedQty * variantPackSize * pricePerBaseUnit)) / newProdStock * 10000) / 10000
                : pricePerBaseUnit;

              await supabase.from("products").update({
                current_stock: newProdStock,
                purchase_price_single: weightedBasePrice
              }).eq("id", parentProd.id);

              const oldStock = v.stock_quantity || 0;
              const oldPrice = v.purchase_price || effectiveUnitPrice;
              const newStock = oldStock + effectivePurchasedQty;
              const weightedAvgPrice = newStock > 0
                ? Math.round(((oldStock * oldPrice) + (effectivePurchasedQty * effectiveUnitPrice)) / newStock * 100) / 100
                : effectiveUnitPrice;

              const updateData: any = {
                stock_quantity: newStock,
                purchase_price: weightedAvgPrice,
              };
              if (item.salePrice !== undefined && item.salePrice !== null) {
                updateData.sale_price = item.salePrice;
              }
              await supabase.from("product_variants").update(updateData).eq("id", item.variantId);
            } else {
              const oldStock = v.stock_quantity || 0;
              const oldPrice = v.purchase_price || effectiveUnitPrice;
              const newStock = oldStock + effectivePurchasedQty;
              const weightedAvgPrice = newStock > 0
                ? Math.round(((oldStock * oldPrice) + (effectivePurchasedQty * effectiveUnitPrice)) / newStock * 100) / 100
                : effectiveUnitPrice;

              const updateData: any = {
                stock_quantity: newStock,
                purchase_price: weightedAvgPrice,
              };
              if (item.salePrice !== undefined && item.salePrice !== null) {
                updateData.sale_price = item.salePrice;
              }
              await supabase.from("product_variants").update(updateData).eq("id", item.variantId);
            }
          }
        } else {
          const p = products.find(p => p.id === item.productId);
          if (p) {
            const oldStock = p.current_stock || 0;
            const oldPrice = p.purchase_price_single || effectiveUnitPrice;
            const newStock = oldStock + effectivePurchasedQty;
            const weightedAvgPrice = newStock > 0
              ? Math.round(((oldStock * oldPrice) + (effectivePurchasedQty * effectiveUnitPrice)) / newStock * 100) / 100
              : effectiveUnitPrice;

            const updateData: any = {
              current_stock: newStock,
              purchase_price_single: weightedAvgPrice,
            };
            if (item.salePrice !== undefined && item.salePrice !== null) {
              updateData.sale_price_single = item.salePrice;
            }
            await supabase.from("products").update(updateData).eq("id", item.productId);
          }
        }
      }

      // Supplier Khata
      if (selectedSupplierId !== "walkin" && remaining > 0) {
        await supabase.from("credit_transactions").insert({
          shop_id: shopId, customer_id: selectedSupplierId,
          transaction_type: "charge", amount: remaining,
          remarks: `Purchase #${po.id.slice(0, 8).toUpperCase()}${invoiceNumber ? ` | Inv: ${invoiceNumber}` : ""}`,
        });
        const sup = suppliers.find(s => s.id === selectedSupplierId);
        if (sup) await supabase.from("parties").update({ current_balance: (sup.current_balance || 0) + remaining }).eq("id", selectedSupplierId);
      }

      const supName = selectedSupplierId !== "walkin" ? (suppliers.find(s => s.id === selectedSupplierId)?.name || "Supplier") : "Cash Purchase";
      notifyPurchaseTransaction(
        userName || "Manager",
        userRole || "Admin",
        po.id.slice(0, 8).toUpperCase(),
        total,
        supName
      );

      toast.success("Purchase saved! Stock & weighted avg price updated 📦");
      resetCart();
      await fetchBaseData();
    } catch (err: any) { toast.error("Failed: " + err.message); }
    finally { setIsSubmitting(false); }
  }

  // ── View PO ──
  async function handleViewPO(poId: string) {
    setIsDetailOpen(true); setLoadingDetail(true);
    try {
      const [{ data: po }, { data: items }] = await Promise.all([
        supabase.from("purchase_orders").select("*").eq("id", poId).single(),
        supabase.from("purchase_order_items").select("*, products(name, unit)").eq("purchase_order_id", poId),
      ]);
      const sup = suppliers.find(s => s.id === po?.supplier_id);
      setSelectedPO({ ...po, supplierName: sup?.name || "Cash Purchase", supplierPhone: sup?.phone || "" });
      const populated: PODetailItem[] = [];
      for (const it of (items || [])) {
        let variantName = "";
        if (it.variant_id) {
          const { data: v } = await supabase.from("product_variants").select("packing_name").eq("id", it.variant_id).maybeSingle();
          variantName = v?.packing_name || "";
        }
        populated.push({ ...it, productName: it.products?.name || "Unknown", unit: it.products?.unit || "unit", variantName });
      }
      setSelectedPOItems(populated);
    } catch (err: any) { toast.error("Failed to load: " + err.message); }
    finally { setLoadingDetail(false); }
  }

  // ── Void PO ──
  async function handleVoidPO(poId: string) {
    if (!confirm("Void this purchase? Stock will be reversed.")) return;
    setVoidingId(poId);
    try {
      const { data: items } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", poId);
      for (const it of (items || [])) {
        if (it.variant_id) {
          const { data: v } = await supabase.from("product_variants").select("stock_quantity, is_packing, pack_size").eq("id", it.variant_id).maybeSingle();
          if (v) {
            if (v.is_packing && v.pack_size && v.pack_size > 0) {
              const { data: p } = await supabase.from("products").select("current_stock").eq("id", it.product_id).maybeSingle();
              if (p) {
                await supabase.from("products").update({
                  current_stock: Math.max(0, p.current_stock - (it.quantity * v.pack_size))
                }).eq("id", it.product_id);
              }
            } else {
              await supabase.from("product_variants").update({ stock_quantity: Math.max(0, v.stock_quantity - it.quantity) }).eq("id", it.variant_id);
            }
          }
        } else {
          const { data: p } = await supabase.from("products").select("current_stock").eq("id", it.product_id).maybeSingle();
          if (p) await supabase.from("products").update({ current_stock: Math.max(0, p.current_stock - it.quantity) }).eq("id", it.product_id);
        }
      }
      const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
      const wasOwed = po ? Number(po.total_amount) - Number(po.paid_amount) : 0;
      if (po?.supplier_id && wasOwed > 0) {
        const sup = suppliers.find(s => s.id === po.supplier_id);
        if (sup) await supabase.from("parties").update({ current_balance: Math.max(0, sup.current_balance - wasOwed) }).eq("id", po.supplier_id);
      }
      await supabase.from("purchase_orders").update({ is_voided: true, status: "VOIDED" }).eq("id", poId);
      
      notifyAuditDelete(
        userName || "Manager",
        userRole || "Admin",
        "purchase",
        `Purchase Order #${poId.slice(0, 8).toUpperCase()}`,
        "Voided by admin/manager"
      );

      toast.success("Purchase voided & stock reversed!");
      setIsDetailOpen(false);
      fetchHistory();
    } catch (err: any) { toast.error("Void failed: " + err.message); }
    finally { setVoidingId(null); }
  }

  // ── PDF ──
  async function handleDownloadPDF(po: any, items: PODetailItem[]) {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 41, 59);
      doc.text(shopName || "AR GROUP", 15, 20);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text("Purchase / Stock-In Bill", 15, 26);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 41, 59);
      doc.text("PURCHASE RECEIPT", 130, 20);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
      doc.text(`PO #: ${po.id.slice(0, 8).toUpperCase()}`, 130, 26);
      doc.text(`Date: ${new Date(po.created_at).toLocaleString()}`, 130, 31);
      if (po.invoice_number) doc.text(`Supplier Inv: ${po.invoice_number}`, 130, 36);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(15, 40, 195, 40);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      doc.text("SUPPLIER", 15, 47);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
      doc.text(po.supplierName || "Cash Purchase", 15, 53);
      if (po.supplierPhone) doc.text(`Phone: ${po.supplierPhone}`, 15, 58);
      autoTable(doc, {
        head: [["#", "Product", "Variant/Unit", "Qty", "Purchase Price", "Subtotal"]],
        body: items.map((it, i) => [i + 1, it.productName, it.variantName || it.unit || "-", it.quantity, `Rs ${Number(it.unit_price).toLocaleString()}`, `Rs ${Number(it.subtotal).toLocaleString()}`]),
        startY: 65, theme: "striped",
        headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
        margin: { left: 15, right: 15 },
      });
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 41, 59);
      doc.text(`Total: Rs ${Number(po.total_amount).toLocaleString()}`, 130, finalY);
      doc.setFontSize(9); doc.setTextColor(5, 150, 105);
      doc.text(`Paid: Rs ${Number(po.paid_amount).toLocaleString()}`, 130, finalY + 6);
      const bal = Number(po.total_amount) - Number(po.paid_amount);
      if (bal > 0) { doc.setTextColor(220, 38, 38); doc.text(`Outstanding: Rs ${bal.toLocaleString()}`, 130, finalY + 12); }
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text("Powered by Falcon Swift PVT. LTD. POS", 15, 285);
      doc.save(`purchase_${po.id.slice(0, 8)}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err: any) { toast.error("PDF failed: " + err.message); }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-0 font-sans text-slate-800">

      {/* Page Controls & Tabs */}
      <div className="flex items-center justify-end pb-4 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          {/* Shortcuts hint button */}
          <button onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-500 rounded-xl text-[10px] font-black transition-all border border-slate-200">
            <Keyboard size={13} /> F10
          </button>
          {/* Tab Switcher */}
          <div className="flex border border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm gap-1">
            {(["new", "history"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === tab ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                {tab === "new" ? <><Plus size={13} /> {isUrdu ? "نئی خریداری" : "New Purchase"}</> : <><FileText size={13} /> {isUrdu ? "خریداری ریکارڈ" : "History"}</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isPharmacyPurchaseModalOpen && pharmacyPurchaseCartIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="text-emerald-500" size={18} />
                  {isUrdu 
                    ? (industryType === "fertilizer" ? "زرعی آئٹم تفصیلات (بیچ / ایکسپائری)" : "فارمیسی آئٹم تفصیلات")
                    : (industryType === "fertilizer" ? "Agri Item Details (Batch/Expiry)" : "Pharmacy Item Details")}
                </h3>
                <button onClick={() => setIsPharmacyPurchaseModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isUrdu ? "بیچ نمبر *" : "Batch Number *"}
                    </label>
                    <Input
                      value={pharmacyInputs.batchNumber}
                      onChange={(e) => setPharmacyInputs({ ...pharmacyInputs, batchNumber: e.target.value })}
                      className="h-9 focus-visible:ring-emerald-500"
                      placeholder={isUrdu ? "مثلاً BT-2024" : "e.g. BT-2024"}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isUrdu ? "تاریخ ایکسپائری *" : "Expiry Date *"}
                    </label>
                    <Input
                      type="date"
                      value={pharmacyInputs.expiryDate}
                      onChange={(e) => setPharmacyInputs({ ...pharmacyInputs, expiryDate: e.target.value })}
                      className="h-9 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isUrdu ? "بونس تعداد" : "Bonus Quantity"}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={pharmacyInputs.bonusQty}
                      onChange={(e) => setPharmacyInputs({ ...pharmacyInputs, bonusQty: parseFloat(e.target.value) || 0 })}
                      className="h-9 focus-visible:ring-emerald-500"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-slate-400">
                      {isUrdu ? "مفت ملے ہوئے آئٹمز" : "Free items received"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {isUrdu ? "اضافی ڈسکاؤنٹ (روپے)" : "Extra Discount (Rs)"}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={pharmacyInputs.discount}
                      onChange={(e) => setPharmacyInputs({ ...pharmacyInputs, discount: parseFloat(e.target.value) || 0 })}
                      className="h-9 focus-visible:ring-emerald-500"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-slate-400">
                      {isUrdu ? "اس آئٹم پر رعایت" : "Discount on this item"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <Button variant="ghost" onClick={() => setIsPharmacyPurchaseModalOpen(false)}>
                  {isUrdu ? "منسوخ" : "Cancel"}
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
                  onClick={() => {
                    if (!pharmacyInputs.batchNumber.trim() || !pharmacyInputs.expiryDate) {
                      toast.error(isUrdu ? "بیچ نمبر اور ایکسپائری تاریخ لازمی ہے۔" : "Batch Number and Expiry Date are required.");
                      return;
                    }
                    setCart(prev => prev.map((c, i) => i === pharmacyPurchaseCartIdx ? { ...c, ...pharmacyInputs } : c));
                    setIsPharmacyPurchaseModalOpen(false);
                    toast.success(isUrdu ? "فارمیسی تفصیلات درج ہو گئیں" : "Pharmacy details added");
                  }}
                >
                  {isUrdu ? "محفوظ کریں" : "Save Details"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ── Tab: New Purchase ── */}
        {activeTab === "new" && (
          <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="flex gap-4" style={{ height: "calc(100vh - 230px)" }}>

            {/* Left Column: Search & Wide Cart Table */}
            <div className="flex-1 flex flex-col bg-white border border-slate-200 shadow-sm rounded-2xl p-4 overflow-hidden h-full relative">
              {/* Autocomplete Search input */}
              <div className="relative mb-4 flex-shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <Input
                  id="purchase-search-input"
                  placeholder={isUrdu ? "پروڈکٹ کا نام یا بارکوڈ اسکین کریں... (F1)" : "Search product by name or scan barcode... (F1, Arrows to nav, Enter to select)"}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                    setSelectedSearchProductIndex(0);
                  }}
                  onFocus={() => {
                    setIsSearchDropdownOpen(true);
                    setSelectedSearchProductIndex(0);
                  }}
                  className="pl-11 h-11 bg-slate-50 border-slate-200 text-slate-800 text-sm rounded-2xl focus-visible:ring-violet-500/20"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Autocomplete Floating Dropdown */}
                {isSearchDropdownOpen && searchQuery.trim() !== "" && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsSearchDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-40 max-h-[320px] overflow-y-auto custom-scrollbar p-2">
                      {autocompleteResults.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-500 font-bold">
                          {isUrdu ? "کوئی پروڈکٹ نہیں ملی۔" : "No products found."}
                        </div>
                      ) : (
                        autocompleteResults.map((product, pIdx) => {
                          const isHighlighted = selectedSearchProductIndex === pIdx;
                          const options = getProductUnitOptions(product);
                          return (
                            <div
                              key={product.id}
                              onClick={() => {
                                addToCart(product);
                                setSearchQuery("");
                                setIsSearchDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${isHighlighted
                                  ? "bg-violet-600/90 border-violet-500/30 text-white"
                                  : "hover:bg-zinc-900 border-transparent text-zinc-300"
                                }`}
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs truncate text-white">
                                    {product.name}
                                  </span>
                                  {product.code && (
                                    <span className={`text-[9px] font-mono tracking-wider ${isHighlighted ? "text-violet-200" : "text-zinc-500"}`}>
                                      {product.code}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className={`text-[9.5px] font-bold ${isHighlighted ? "text-violet-200" : "text-zinc-400"}`}>
                                    {isUrdu ? "اسٹاک:" : "Stock:"} {product.current_stock} {product.unit || "unit"}
                                  </span>
                                  <span className={`text-[9.5px] font-bold ${isHighlighted ? "text-violet-200" : "text-violet-400"}`}>
                                    {isUrdu ? "خرید ریٹ:" : "Cost:"} Rs {product.purchase_price_single}
                                  </span>
                                </div>
                              </div>

                              {/* Quick packings pills */}
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    addToCart(product);
                                    setSearchQuery("");
                                    setIsSearchDropdownOpen(false);
                                  }}
                                  className={`text-[9px] font-black px-2 py-1 rounded border transition-all ${isHighlighted
                                      ? "bg-zinc-900 border-zinc-800 text-white hover:bg-white hover:text-black"
                                      : "bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-violet-650 hover:text-white"
                                    }`}
                                >
                                  {product.unit || (isUrdu ? "بیس یونٹ" : "Base")}
                                </button>
                                {options.map(opt => (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      addToCart(product, opt.id, opt.name, opt.purchasePrice);
                                      setSearchQuery("");
                                      setIsSearchDropdownOpen(false);
                                    }}
                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all ${isHighlighted
                                        ? "bg-violet-700 border-violet-600 text-white hover:bg-white hover:text-black"
                                        : "bg-violet-950/40 border-violet-900/30 text-violet-400 hover:bg-violet-650 hover:text-white"
                                      }`}
                                  >
                                    {opt.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cart Table List */}
              <div className="flex-1 overflow-auto border border-slate-100 rounded-2xl bg-slate-50/20 p-2.5 custom-scrollbar min-h-0">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                    <ShoppingCart size={32} className="text-slate-200 mb-2.5" />
                    <p className="text-xs font-semibold">
                      {isUrdu ? "آپ کی پرچیز کارٹ خالی ہے۔" : "Your purchase cart is empty."}
                    </p>
                    <p className="text-[10px] text-slate-450 mt-1">
                      {isUrdu ? "خریداری کے لیے اوپر سرچ بار سے پروڈکٹ شامل کریں۔" : "Search and select items or packings to build the cart."}
                    </p>
                  </div>
                ) : (
                  <div className="min-w-[650px] overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider pb-2">
                          <th className="py-2.5 px-3">{isUrdu ? "پروڈکٹ کا نام اور پیکنگ" : "Product Name & Variant"}</th>
                          <th className="py-2.5 px-3 w-[130px] text-right">{isUrdu ? "خرید ریٹ (روپے)" : "Purchase Cost (Rs)"}</th>
                          <th className="py-2.5 px-3 w-[130px] text-right">{isUrdu ? "سیل ریٹ (روپے)" : "Sale Price (Rs)"}</th>
                          <th className="py-2.5 px-3 w-[130px] text-center">{isUrdu ? "تعداد" : "Quantity"}</th>
                          <th className="py-2.5 px-3 w-[120px] text-right">{isUrdu ? "کل رقم (روپے)" : "Total (Rs)"}</th>
                          <th className="py-2.5 px-3 w-[50px] text-center">{isUrdu ? "ایکشن" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, idx) => {
                          const isItemHighlighted = isCartFocused && selectedCartIdx === idx;
                          return (
                            <tr
                              key={`${item.productId}-${item.variantId || "base"}-${idx}`}
                              className={`border-b border-slate-100 transition-all ${isItemHighlighted ? "bg-violet-50/35" : "hover:bg-slate-50/50"
                                }`}
                            >
                              {/* Name & Packing */}
                              <td className="py-3 px-3">
                                <div className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                  {item.name}
                                </div>
                                {item.packingName && (
                                  <span className="inline-block bg-violet-50 text-violet-750 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-violet-100 mt-1.5 uppercase tracking-wide">
                                    {isUrdu ? `پیکنگ: ${item.packingName}` : `Packing: ${item.packingName}`}
                                  </span>
                                )}
                                {item.has_imei && (
                                  <div className="mt-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openImeiPurchaseModal(item, idx)}
                                      className="text-[9px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded-lg font-bold border border-indigo-200/50 flex items-center gap-1 shadow-sm transition-all"
                                    >
                                      <Smartphone size={10} />
                                      {isUrdu ? `IMEIs منیج کریں (${item.imeis?.length || 0})` : `Manage IMEIs (${item.imeis?.length || 0})`}
                                    </button>
                                    {item.imeis && item.imeis.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[8px] text-slate-500 max-w-xs">
                                        {item.imeis.map((i, imIdx) => (
                                          <span key={imIdx} className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shadow-sm">
                                            {i.imei1}{i.imei2 ? `/${i.imei2}` : ""}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(industryType === "pharmacy" || industryType === "fertilizer") && (
                                  <div className="mt-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openPharmacyPurchaseModal(item, idx)}
                                      className={`text-[9px] px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 shadow-sm transition-all ${item.batchNumber ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-200/50 hover:bg-orange-100'}`}
                                    >
                                      <Plus size={10} />
                                      {item.batchNumber 
                                        ? (isUrdu ? `بیچ: ${item.batchNumber}` : `Batch: ${item.batchNumber}`) 
                                        : (isUrdu ? "بیچ / ایکسپائری درج کریں" : "Add Batch/Expiry Details")}
                                    </button>
                                    {item.expiryDate && (
                                      <span className="block text-[8px] font-bold text-slate-500 mt-0.5">
                                        {isUrdu ? `ایکسپائری: ${item.expiryDate}` : `Expiry: ${item.expiryDate}`}
                                      </span>
                                    )}
                                    {item.bonusQty ? <span className="block text-[9px] text-slate-500 mt-1">{isUrdu ? `بونس: ${item.bonusQty} | رعایت: Rs ${item.discount || 0}` : `Bonus: ${item.bonusQty} | Disc: Rs ${item.discount || 0}`}</span> : null}
                                  </div>
                                )}
                              </td>

                              {/* Editable Purchase Price */}
                              <td className="py-2 px-2">
                                <div className="flex flex-col gap-0.5 items-end">
                                  <span className="text-[8px] font-black text-violet-500 uppercase tracking-wide">
                                    {isUrdu ? "خرید ریٹ" : "Cost Rate"}
                                  </span>
                                  <input
                                    id={`purchase-rate-${idx}`}
                                    type="number"
                                    step="any"
                                    value={item.purchasePrice}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setCart(prev => prev.map((c, i) => i === idx ? { ...c, purchasePrice: isNaN(val) ? 0 : Math.max(0, val) } : c));
                                    }}
                                    onFocus={(e) => {
                                      e.target.select();
                                      setIsCartFocused(true);
                                      setSelectedCartIdx(idx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                        e.preventDefault();
                                        const next = idx + (e.key === "ArrowDown" ? 1 : -1);
                                        if (next < 0) document.getElementById("purchase-search-input")?.focus();
                                        else if (next < cart.length) document.getElementById(`purchase-rate-${next}`)?.focus();
                                      } else if (e.key === "ArrowRight") {
                                        e.preventDefault();
                                        document.getElementById(`purchase-salerate-${idx}`)?.focus();
                                      }
                                    }}
                                    className="no-spin w-24 h-7 bg-white border-2 border-violet-200 rounded-lg px-2 text-[11px] font-extrabold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 text-slate-800 text-right shadow-sm"
                                    placeholder="0"
                                  />
                                </div>
                              </td>

                              {/* Editable Sale Price */}
                              <td className="py-2 px-2">
                                <div className="flex flex-col gap-0.5 items-end">
                                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wide">
                                    {isUrdu ? "سیل ریٹ" : "Sale Price"}
                                  </span>
                                  <input
                                    id={`purchase-salerate-${idx}`}
                                    type="number"
                                    step="any"
                                    value={item.salePrice || 0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setCart(prev => prev.map((c, i) => i === idx ? { ...c, salePrice: isNaN(val) ? 0 : Math.max(0, val) } : c));
                                    }}
                                    onFocus={(e) => {
                                      e.target.select();
                                      setIsCartFocused(true);
                                      setSelectedCartIdx(idx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                        e.preventDefault();
                                        const next = idx + (e.key === "ArrowDown" ? 1 : -1);
                                        if (next < 0) document.getElementById("purchase-search-input")?.focus();
                                        else if (next < cart.length) document.getElementById(`purchase-salerate-${next}`)?.focus();
                                      } else if (e.key === "ArrowLeft") {
                                        e.preventDefault();
                                        document.getElementById(`purchase-rate-${idx}`)?.focus();
                                      } else if (e.key === "ArrowRight") {
                                        e.preventDefault();
                                        document.getElementById(`purchase-qty-${idx}`)?.focus();
                                      }
                                    }}
                                    className="no-spin w-24 h-7 bg-white border-2 border-emerald-250 rounded-lg px-2 text-[11px] font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-250 text-slate-800 text-right shadow-sm"
                                    placeholder="0"
                                  />
                                </div>
                              </td>

                              {/* Quantity Controls */}
                              <td className="py-2 px-2 text-center">
                                <div className="flex flex-col gap-0.5 items-center">
                                  <span className="text-[8px] font-black text-purple-500 uppercase tracking-wide">
                                    {isUrdu ? "تعداد" : "Qty"}
                                  </span>
                                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.has_imei) {
                                          openImeiPurchaseModal(item, idx);
                                          return;
                                        }
                                        const newQty = Math.max(1, item.quantity - 1);
                                        setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: newQty } : c));
                                      }}
                                      className="p-1 text-slate-500 hover:bg-slate-50 rounded-md transition-colors"
                                    >
                                      <Minus size={9.5} />
                                    </button>
                                    <input
                                      id={`purchase-qty-${idx}`}
                                      type="number"
                                      value={item.quantity}
                                      readOnly={item.has_imei}
                                      onChange={(e) => {
                                        if (item.has_imei) return;
                                        const val = parseInt(e.target.value, 10);
                                        setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: isNaN(val) || val < 1 ? 1 : val } : c));
                                      }}
                                      onClick={() => {
                                        if (item.has_imei) {
                                          openImeiPurchaseModal(item, idx);
                                        }
                                      }}
                                      onFocus={(e) => {
                                        if (item.has_imei) {
                                          e.target.blur();
                                          openImeiPurchaseModal(item, idx);
                                          return;
                                        }
                                        e.target.select();
                                        setIsCartFocused(true);
                                        setSelectedCartIdx(idx);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                          e.preventDefault();
                                          const next = idx + (e.key === "ArrowDown" ? 1 : -1);
                                          if (next < 0) document.getElementById("purchase-search-input")?.focus();
                                          else if (next < cart.length) document.getElementById(`purchase-qty-${next}`)?.focus();
                                        } else if (e.key === "ArrowLeft") {
                                          e.preventDefault();
                                          document.getElementById(`purchase-salerate-${idx}`)?.focus();
                                        }
                                      }}
                                      className="no-spin w-10 text-[11px] font-extrabold text-center border-none focus:outline-none bg-transparent focus:ring-1 focus:ring-violet-500/20 focus:bg-slate-50 rounded"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.has_imei) {
                                          openImeiPurchaseModal(item, idx);
                                          return;
                                        }
                                        setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c));
                                      }}
                                      className="p-1 text-slate-500 hover:bg-slate-50 rounded-md transition-colors"
                                    >
                                      <Plus size={9.5} />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Subtotal */}
                              <td className="py-2 px-2 text-right font-extrabold text-slate-900 text-[11.5px] pt-4">
                                Rs {Math.round(item.purchasePrice * item.quantity).toLocaleString()}
                              </td>

                              {/* Delete Item */}
                              <td className="py-2 px-2 text-center pt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCart(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title={isUrdu ? "آئٹم حذف کریں" : "Delete Item"}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Supplier Selector & Checkout Panel */}
            <div className="w-[360px] flex flex-col gap-3 shrink-0 h-full overflow-y-auto pr-1 custom-scrollbar select-none">
              <SupplierSelector
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelect={setSelectedSupplierId}
                onAddNew={() => setIsAddSupplierOpen(true)}
              />

              {/* Checkout details and totals */}
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CreditCard size={12} className="text-violet-500" /> {isUrdu ? "خریداری کی تفصیلات" : "Checkout Details"}
                  </span>
                  {cart.length > 0 && (
                    <button onClick={resetCart} className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-0.5">
                      <Trash2 size={10} /> {isUrdu ? "کارٹ خالی کریں" : "Clear"}
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-350 py-10">
                    <ShoppingCart className="h-10 w-10 mb-2 text-slate-200" />
                    <p className="text-xs font-semibold">{isUrdu ? "کارٹ خالی ہے" : "Your cart is empty"}</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
                    {/* Discount + Tax */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">
                          {isUrdu ? "رعایت (روپے)" : "Discount (Rs)"}
                        </label>
                        <input
                          id="purchase-discount-input"
                          type="number"
                          value={discount || ""}
                          onChange={e => setDiscount(Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full mt-0.5 text-xs font-semibold h-8 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                        />
                      </div>
                      {hasTax && (
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase">
                            {isUrdu ? "ٹیکس (%)" : "Tax (%)"}
                          </label>
                          <input
                            id="purchase-tax-input"
                            type="number"
                            value={taxRate || ""}
                            onChange={e => setTaxRate(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="w-full mt-0.5 text-xs font-semibold h-8 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                      )}
                    </div>

                    {/* Invoice # + Notes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">
                          {isUrdu ? "سپلائر بل #" : "Supplier Inv #"}
                        </label>
                        <input
                          placeholder={isUrdu ? "اختیاری" : "Optional"}
                          value={invoiceNumber}
                          onChange={e => setInvoiceNumber(e.target.value)}
                          className="w-full mt-0.5 text-xs font-semibold h-8 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">
                          {isUrdu ? "نوٹس" : "Notes"}
                        </label>
                        <input
                          placeholder={isUrdu ? "اختیاری" : "Optional"}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="w-full mt-0.5 text-xs font-semibold h-8 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                        />
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block">
                        {isUrdu ? "طریقہ ادائیگی" : "Payment Mode"}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["cash", "bank", "credit"] as const).map(mode => (
                          <button key={mode} type="button" onClick={() => setPaymentMode(mode)}
                            className={`py-1.5 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center gap-1 ${paymentMode === mode
                                ? (mode === "cash" ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                  : mode === "bank" ? "bg-blue-500 text-white border-blue-500 shadow-md"
                                    : "bg-rose-500 text-white border-rose-500 shadow-md")
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                              }`}>
                            {mode === "cash" ? <Banknote size={10} /> : mode === "bank" ? <CreditCard size={10} /> : <ReceiptText size={10} />}
                            {isUrdu 
                              ? (mode === "cash" ? "کیش" : mode === "bank" ? "بینک" : "ادھار کھاتہ")
                              : (mode === "cash" ? "Cash" : mode === "bank" ? "Bank" : "Credit")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account Selector (Paid from) */}
                    {(paymentMode !== "credit" || paidNow > 0) && accounts.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">
                          {isUrdu ? "ادائیگی کھاتہ / والٹ" : "Paid From Account"}
                        </label>
                        <select
                          value={selectedAccountId}
                          onChange={e => setSelectedAccountId(e.target.value)}
                          className="w-full text-xs font-semibold h-8 bg-white border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                        >
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (Rs {Number(acc.current_balance).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Totals Breakdown */}
                    <div className="space-y-1 text-xs border-t border-slate-100 pt-3">
                      <div className="flex justify-between text-slate-500">
                        <span>{isUrdu ? "ذیلی ٹوٹل" : "Subtotal"}</span>
                        <span className="font-semibold">Rs {Math.round(subtotal).toLocaleString()}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-650">
                          <span>{isUrdu ? "رعایت" : "Discount"}</span>
                          <span>-Rs {discount.toLocaleString()}</span>
                        </div>
                      )}
                      {taxAmount > 0 && (
                        <div className="flex justify-between text-blue-650">
                          <span>{isUrdu ? `ٹیکس (${taxRate}%)` : `Tax (${taxRate}%)`}</span>
                          <span>+Rs {Math.round(taxAmount).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
                        <span>{isUrdu ? "کل رقم" : "Total"}</span>
                        <span>Rs {Math.round(total).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Credit partial payment */}
                    {paymentMode === "credit" && (
                      <div className="bg-rose-50 border border-rose-250 rounded-xl p-2.5 space-y-1.5">
                        <label className="text-[9px] font-black text-rose-650 uppercase">
                          {isUrdu ? "ابھی ادا شدہ رقم" : "Paid Now (Partial)"}
                        </label>
                        <input
                          type="number"
                          value={paidNow || ""}
                          onChange={e => setPaidNow(Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full text-xs font-semibold h-8 bg-white border border-rose-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                        />
                        <p className="text-[10px] font-bold text-rose-650">
                          {isUrdu ? "کھاتے میں بقایا رقم: " : "Remaining on Khata: "}
                          <span className="font-black">Rs {Math.round(remaining).toLocaleString()}</span>
                        </p>
                      </div>
                    )}

                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={handleSavePurchase}
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black rounded-2xl shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={15} />}
                      {isSubmitting 
                        ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving...") 
                        : (isUrdu ? "خریداری محفوظ کریں اور اسٹاک اپڈیٹ کریں" : "Save Purchase & Update Stock")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: History ── */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <PurchaseHistory
              orders={purchaseOrders}
              suppliers={suppliers}
              loading={historyLoading}
              voidingId={voidingId}
              onView={handleViewPO}
              onVoid={handleVoidPO}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Hardware Dimension / Length Calculator */}
      <AnimatePresence>
        {hardwareCalcProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setHardwareCalcProduct(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm relative z-10 border border-slate-150 font-sans"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800">
                  {hardwareCalcProduct.measurement_type === "dimension" ? "📐 Dimension Calculator (پیمائش)" : "📏 Length Calculator (لمبائی)"}
                </h3>
                <button onClick={() => setHardwareCalcProduct(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs font-bold text-slate-800 mb-3">{hardwareCalcProduct.name}</p>

              <div className="space-y-3">

                {hardwareCalcProduct.measurement_type === "dimension" ? (
                  <>
                    {/* LENGTH: ft + in */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">📏 Length (لمبائی)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input type="number" min={0} placeholder="0"
                            value={hardwareCalcLengthFt || ""}
                            onChange={(e) => setHardwareCalcLengthFt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="font-mono text-slate-800 h-10 pr-10" autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-len-in")?.focus(); }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
                        </div>
                        <div className="relative">
                          <Input id="hw-pur-len-in" type="number" min={0} max={11} placeholder="0"
                            value={hardwareCalcLengthIn || ""}
                            onChange={(e) => setHardwareCalcLengthIn(Math.min(11, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="font-mono text-slate-800 h-10 pr-10"
                            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-wid-ft")?.focus(); }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
                        </div>
                      </div>
                    </div>

                    {/* WIDTH: ft + in */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">📐 Width (چوڑائی)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input id="hw-pur-wid-ft" type="number" min={0} placeholder="0"
                            value={hardwareCalcWidthFt || ""}
                            onChange={(e) => setHardwareCalcWidthFt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="font-mono text-slate-800 h-10 pr-10"
                            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-wid-in")?.focus(); }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
                        </div>
                        <div className="relative">
                          <Input id="hw-pur-wid-in" type="number" min={0} max={11} placeholder="0"
                            value={hardwareCalcWidthIn || ""}
                            onChange={(e) => setHardwareCalcWidthIn(Math.min(11, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="font-mono text-slate-800 h-10 pr-10"
                            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-qty-input")?.focus(); }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">📏 Length (لمبائی)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input type="number" min={0} placeholder="0"
                          value={hardwareCalcLengthFt || ""}
                          onChange={(e) => setHardwareCalcLengthFt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="font-mono text-slate-800 h-10 pr-10" autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-len-in")?.focus(); }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
                      </div>
                      <div className="relative">
                        <Input id="hw-pur-len-in" type="number" min={0} max={11} placeholder="0"
                          value={hardwareCalcLengthIn || ""}
                          onChange={(e) => setHardwareCalcLengthIn(Math.min(11, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                          className="font-mono text-slate-800 h-10 pr-10"
                          onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("hw-pur-qty-input")?.focus(); }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">🔢 No. of {hardwareCalcProduct.measurement_type === "dimension" ? "Sheets / Pieces" : "Pieces"} (تعداد)</label>
                  <Input id="hw-pur-qty-input" type="number" min={1}
                    value={hardwareCalcQty || ""}
                    onChange={(e) => setHardwareCalcQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="font-mono text-slate-800 h-10"
                    onKeyDown={(e) => { if (e.key === "Enter") handleConfirmHardwareCalculation(); }}
                  />
                </div>

                {/* Live Preview */}
                {(() => {
                  const lenFt = hardwareCalcLengthFt + hardwareCalcLengthIn / 12;
                  const widFt = hardwareCalcWidthFt + hardwareCalcWidthIn / 12;
                  const isDim = hardwareCalcProduct.measurement_type === "dimension";
                  const computed = isDim ? lenFt * widFt * hardwareCalcQty : lenFt * hardwareCalcQty;
                  const total = computed * (hardwareCalcProduct.purchase_price_single || 0);
                  return (
                    <div className="bg-gradient-to-br from-slate-50 to-violet-50 p-4 rounded-xl border border-violet-100 mt-1 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Total Area / Qty:</span>
                        <span className="font-bold text-violet-700 font-mono text-sm">{computed.toFixed(3)} sq ft</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-violet-200 pt-2 font-bold text-sm">
                        <span className="text-slate-600">Total Purchase Cost:</span>
                        <span className="font-mono text-violet-600">Rs {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setHardwareCalcProduct(null)}
                    className="h-10 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmHardwareCalculation}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 rounded-xl"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Select Packing / Unit Variation */}
      <AnimatePresence>
        {activeProductForVariants && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setActiveProductForVariants(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md relative z-10 border border-slate-150"
            >
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {industryType === "karyana" ? "Select Unit / Variation" : "Select Packing Variation"}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                "{activeProductForVariants.name}" has multiple {industryType === "karyana" ? "units/variations" : "packings"} available.
              </p>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                {modalChoices.map((opt, oIdx) => {
                  const isChoiceSelected = selectedModalIndex === oIdx;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.isBase) {
                          addToCart(activeProductForVariants);
                        } else {
                          addToCart(activeProductForVariants, opt.id, opt.name, opt.purchasePrice, opt.price);
                        }
                        setActiveProductForVariants(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center border ${isChoiceSelected
                          ? "bg-violet-50 border-violet-500 ring-2 ring-violet-500/20"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <div>
                        <p className={`font-extrabold text-xs ${isChoiceSelected ? "text-violet-900" : "text-slate-800"}`}>
                          {opt.name}
                        </p>
                        <p className="text-[10px] text-slate-450">Stock: {opt.stock} units</p>
                      </div>
                      <div className="text-right">
                        <span className={`block font-extrabold text-xs ${isChoiceSelected ? "text-violet-700" : "text-slate-900"}`}>
                          Cost: Rs {opt.purchasePrice}
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          Sale: Rs {opt.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end mt-4 pt-2 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setActiveProductForVariants(null)} className="text-xs rounded-xl font-bold hover:bg-violet-50 hover:text-violet-750">Cancel</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSupplierAdded={sup => setSuppliers(prev => [...prev, sup].sort((a, b) => a.name.localeCompare(b.name)))}
      />

      <PODetailModal
        isOpen={isDetailOpen}
        po={selectedPO}
        items={selectedPOItems}
        loading={loadingDetail}
        voidingId={voidingId}
        shopName={shopName || ""}
        onClose={() => setIsDetailOpen(false)}
        onVoid={handleVoidPO}
        onDownloadPDF={handleDownloadPDF}
      />

      <ShortcutsHelp
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* MODAL: Purchase IMEI Entry */}
      <AnimatePresence>
        {isImeiPurchaseModalOpen && imeiPurchaseProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={() => {
                setIsImeiPurchaseModalOpen(false);
                setImeiPurchaseProduct(null);
                setImeiPurchaseInputs([]);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg relative z-10 border border-slate-150 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">Enter Purchase IMEIs</h3>
                    <p className="text-[10px] text-slate-400">{imeiPurchaseProduct.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsImeiPurchaseModalOpen(false);
                    setImeiPurchaseProduct(null);
                    setImeiPurchaseInputs([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 custom-scrollbar min-h-[150px]">
                {imeiPurchaseInputs.map((input, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest">Device #{idx + 1}</span>
                      {imeiPurchaseInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setImeiPurchaseInputs(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-750 p-1 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">IMEI 1 *</label>
                        <Input
                          placeholder="Enter IMEI 1"
                          value={input.imei1}
                          onChange={(e) => setImeiPurchaseInputs(prev => prev.map((item, i) => i === idx ? { ...item, imei1: e.target.value } : item))}
                          className="h-9 text-xs rounded-xl font-mono border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">IMEI 2 (Optional)</label>
                        <Input
                          placeholder="Enter IMEI 2"
                          value={input.imei2 || ""}
                          onChange={(e) => setImeiPurchaseInputs(prev => prev.map((item, i) => i === idx ? { ...item, imei2: e.target.value } : item))}
                          className="h-9 text-xs rounded-xl font-mono border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 shrink-0 flex justify-between items-center border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImeiPurchaseInputs(prev => [...prev, { imei1: "", imei2: "" }])}
                  className="text-xs font-bold text-indigo-650 hover:bg-indigo-50 border-indigo-200/50 rounded-xl h-9.5 px-3 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Device
                </Button>
                <span className="text-[10px] font-bold text-slate-500">Total Quantity: {imeiPurchaseInputs.length}</span>
              </div>

              <div className="flex gap-3 mt-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImeiPurchaseModalOpen(false);
                    setImeiPurchaseProduct(null);
                    setImeiPurchaseInputs([]);
                  }}
                  className="flex-1 text-slate-655 font-bold h-10 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImeiPurchase}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold h-10 rounded-xl text-xs shadow-md"
                >
                  Confirm IMEIs
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
