"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Plus, Search, Trash2, ArrowRight, Loader2, ArrowUpRight, ArrowDownLeft, Sparkles } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface DBProduct {
  id: string;
  name: string;
  unit: string | null;
  current_stock: number;
  sale_price_single?: number;
  purchase_price_single?: number;
}

interface Party {
  id: string;
  name: string;
  type: string; // 'customer' | 'supplier'
}

interface Invoice {
  id: string;
  created_at: string;
  total_amount: number;
  invoice_items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    productName?: string;
  }[];
}

interface PurchaseOrder {
  id: string;
  created_at: string;
  total_amount: number;
  purchase_order_items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    productName?: string;
  }[];
}

export default function ReturnsPage() {
  const { shopId } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"sale" | "purchase" | "adjust">("sale");
  const [loading, setLoading] = useState(false);

  // Core lists
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);

  // Selection states
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [pastDocuments, setPastDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");

  // Mode and inputs for Open Return / Invoice Search
  const [returnMode, setReturnMode] = useState<"invoice" | "open">("invoice");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [openReturnProductId, setOpenReturnProductId] = useState("");
  const [openReturnQty, setOpenReturnQty] = useState(1);
  const [openReturnPrice, setOpenReturnPrice] = useState(0);

  // Return items cart
  const [returnItems, setReturnItems] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    maxQty: number; // original quantity
  }[]>([]);
  const [returnNotes, setReturnNotes] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Stock Adjustment Form
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState<"damaged" | "expired" | "stolen">("damaged");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    loadBaseData();
  }, [shopId]);

  // Load past documents when party selection changes
  useEffect(() => {
    if (!selectedPartyId || !shopId) {
      setPastDocuments([]);
      setReturnItems([]);
      return;
    }
    loadPastDocuments();
  }, [selectedPartyId, activeTab]);

  // Load items when document changes
  useEffect(() => {
    if (!selectedDocId) {
      setReturnItems([]);
      return;
    }
    const doc = pastDocuments.find(d => d.id === selectedDocId);
    if (doc) {
      const items = activeTab === "sale" 
        ? doc.invoice_items.map((i: any) => ({
            productId: i.product_id,
            productName: i.productName || (isUrdu ? "پروڈکٹ" : "Product"),
            quantity: 0,
            price: Number(i.unit_price),
            maxQty: Number(i.quantity)
          }))
        : doc.purchase_order_items.map((i: any) => ({
            productId: i.product_id,
            productName: i.productName || (isUrdu ? "پروڈکٹ" : "Product"),
            quantity: 0,
            price: Number(i.unit_price),
            maxQty: Number(i.quantity)
          }));
      setReturnItems(items);
    }
  }, [selectedDocId]);

  // Reset states on tab/mode change
  useEffect(() => {
    setSelectedPartyId("");
    setSelectedDocId("");
    setReturnItems([]);
    setReturnNotes("");
    setReturnMode("invoice");
    setInvoiceSearchQuery("");
    setOpenReturnProductId("");
    setOpenReturnQty(1);
    setOpenReturnPrice(0);
  }, [activeTab]);

  async function loadBaseData() {
    try {
      const [{ data: partiesData }, { data: productsData }] = await Promise.all([
        supabase.from("parties").select("id, name, type").eq("shop_id", shopId),
        supabase.from("products").select("id, name, unit, current_stock, sale_price_single, purchase_price_single").eq("shop_id", shopId)
      ]);

      if (partiesData) setParties(partiesData);
      if (productsData) setProducts(productsData);
    } catch (err: any) {
      console.error(err);
      toast.error(isUrdu ? "ڈیٹا لوڈ کرنے میں مسئلہ ہوا" : "Failed to load base return data");
    }
  }

  async function loadPastDocuments() {
    setLoading(true);
    try {
      if (activeTab === "sale") {
        let query = supabase
          .from("invoices")
          .select(`
            id, created_at, total_amount,
            invoice_items (
              id, product_id, quantity, unit_price, subtotal
            )
          `)
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(25);

        if (selectedPartyId === "walkin") {
          query = query.is("customer_id", null);
        } else {
          query = query.eq("customer_id", selectedPartyId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with product names
        const enriched = (data || []).map((inv: any) => ({
          ...inv,
          invoice_items: inv.invoice_items.map((item: any) => ({
            ...item,
            productName: products.find(p => p.id === item.product_id)?.name || "Item"
          }))
        }));
        setPastDocuments(enriched);
      } else if (activeTab === "purchase") {
        let query = supabase
          .from("purchase_orders")
          .select(`
            id, created_at, total_amount,
            purchase_order_items (
              id, product_id, quantity, unit_price, subtotal
            )
          `)
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(25);

        if (selectedPartyId === "cash") {
          query = query.is("supplier_id", null);
        } else {
          query = query.eq("supplier_id", selectedPartyId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const enriched = (data || []).map((po: any) => ({
          ...po,
          purchase_order_items: po.purchase_order_items.map((item: any) => ({
            ...item,
            productName: products.find(p => p.id === item.product_id)?.name || "Item"
          }))
        }));
        setPastDocuments(enriched);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(isUrdu ? "سابقہ بل لوڈ کرنے میں ناکامی" : "Failed to load past documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvoiceSearch() {
    if (!invoiceSearchQuery.trim()) {
      toast.error(isUrdu ? "براہ کرم انوائس یا بل نمبر درج کریں" : "Please enter a bill or invoice number to search");
      return;
    }

    setIsSearchingInvoice(true);
    try {
      let foundDoc: any = null;
      const cleanTerm = invoiceSearchQuery.trim();

      if (activeTab === "sale") {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            id, created_at, total_amount, customer_id,
            invoice_items (
              id, product_id, quantity, unit_price, subtotal
            )
          `)
          .eq("shop_id", shopId)
          .or(`id.ilike.%${cleanTerm}%`)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          foundDoc = {
            ...data,
            invoice_items: data.invoice_items.map((item: any) => ({
              ...item,
              productName: products.find(p => p.id === item.product_id)?.name || "Item"
            }))
          };
        }
      } else {
        const { data, error } = await supabase
          .from("purchase_orders")
          .select(`
            id, created_at, total_amount, supplier_id,
            purchase_order_items (
              id, product_id, quantity, unit_price, subtotal
            )
          `)
          .eq("shop_id", shopId)
          .or(`id.ilike.%${cleanTerm}%`)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          foundDoc = {
            ...data,
            purchase_order_items: data.purchase_order_items.map((item: any) => ({
              ...item,
              productName: products.find(p => p.id === item.product_id)?.name || "Item"
            }))
          };
        }
      }

      if (foundDoc) {
        setSelectedDocId(foundDoc.id);
        if (activeTab === "sale") {
          setSelectedPartyId(foundDoc.customer_id || "walkin");
        } else {
          setSelectedPartyId(foundDoc.supplier_id || "cash");
        }
        setPastDocuments([foundDoc]);
        const items = activeTab === "sale" 
          ? foundDoc.invoice_items.map((i: any) => ({
              productId: i.product_id,
              productName: i.productName || (isUrdu ? "پروڈکٹ" : "Product"),
              quantity: 0,
              price: Number(i.unit_price),
              maxQty: Number(i.quantity)
            }))
          : foundDoc.purchase_order_items.map((i: any) => ({
              productId: i.product_id,
              productName: i.productName || (isUrdu ? "پروڈکٹ" : "Product"),
              quantity: 0,
              price: Number(i.unit_price),
              maxQty: Number(i.quantity)
            }));
        setReturnItems(items);
        toast.success(isUrdu ? `بل مل گیا: #${foundDoc.id.slice(0, 8).toUpperCase()}` : `Found document: #${foundDoc.id.slice(0, 8).toUpperCase()}`);
      } else {
        toast.error(isUrdu ? "کوئی ریکارڈ نہیں ملا۔ بل نمبر کی تصدیق کریں۔" : "Document not found. Please verify the ID.");
      }
    } catch (err: any) {
      toast.error((isUrdu ? "تلاش میں خرابی: " : "Search failed: ") + err.message);
    } finally {
      setIsSearchingInvoice(false);
    }
  }

  function handleAddOpenReturnItem() {
    if (!openReturnProductId) {
      toast.error(isUrdu ? "براہ کرم پروڈکٹ منتخب کریں" : "Please select a product");
      return;
    }
    if (openReturnQty <= 0) {
      toast.error(isUrdu ? "براہ کرم درست مقدار درج کریں" : "Please enter a valid quantity");
      return;
    }
    if (openReturnPrice < 0) {
      toast.error(isUrdu ? "براہ کرم درست قیمت درج کریں" : "Please enter a valid price");
      return;
    }

    const prod = products.find(p => p.id === openReturnProductId);
    if (!prod) return;

    const existingIdx = returnItems.findIndex(item => item.productId === openReturnProductId);
    if (existingIdx !== -1) {
      setReturnItems(prev => prev.map((item, idx) => 
        idx === existingIdx 
          ? { ...item, quantity: item.quantity + openReturnQty } 
          : item
      ));
    } else {
      setReturnItems(prev => [...prev, {
        productId: openReturnProductId,
        productName: prod.name,
        quantity: openReturnQty,
        price: openReturnPrice,
        maxQty: 999999 // no limit
      }]);
    }

    setOpenReturnProductId("");
    setOpenReturnQty(1);
    setOpenReturnPrice(0);
    toast.success(isUrdu ? "ریٹرن کارٹ میں شامل کر دیا گیا!" : "Added to return cart!");
  }

  async function handleSaveReturn(e: React.FormEvent) {
    e.preventDefault();
    const itemsToReturn = returnItems.filter(item => item.quantity > 0);
    if (itemsToReturn.length === 0) {
      toast.error(isUrdu ? "براہ کرم کم از کم ایک پروڈکٹ کی واپسی مقدار درج کریں۔" : "Please specify return quantities for at least one item.");
      return;
    }

    setSubmittingReturn(true);
    try {
      const returnTotal = itemsToReturn.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const isWalkinOrCash = selectedPartyId === "walkin" || selectedPartyId === "cash" || !selectedPartyId;
      const dbPartyId = isWalkinOrCash ? null : selectedPartyId;

      // 1. Insert return record
      const { data: ret, error: retErr } = await supabase
        .from("returns")
        .insert({
          shop_id: shopId,
          invoice_id: (activeTab === "sale" && selectedDocId) ? selectedDocId : null,
          purchase_order_id: (activeTab === "purchase" && selectedDocId) ? selectedDocId : null,
          party_id: dbPartyId,
          type: activeTab,
          total_amount: returnTotal,
          notes: returnNotes.trim() || null
        })
        .select()
        .single();

      if (retErr) throw retErr;

      // 2. Insert items and update stock
      for (const item of itemsToReturn) {
        await supabase.from("return_items").insert({
          return_id: ret.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        });

        // Update stock
        const currentStock = products.find(p => p.id === item.productId)?.current_stock || 0;
        const newStock = activeTab === "sale"
          ? currentStock + item.quantity // Sale return -> plus stock
          : Math.max(0, currentStock - item.quantity); // Purchase return -> minus stock
        
        await supabase.from("products").update({ current_stock: newStock }).eq("id", item.productId);
      }

      // 3. Update customer/supplier Khata balance
      if (dbPartyId) {
        const balanceChange = -returnTotal;
        await supabase.rpc("increment_party_balance", {
          p_party_id: dbPartyId,
          p_amount: balanceChange
        });

        // Log in credit transactions
        await supabase.from("credit_transactions").insert({
          shop_id: shopId,
          customer_id: dbPartyId,
          transaction_type: "payment",
          amount: returnTotal,
          remarks: `${activeTab === "sale" ? (isUrdu ? "سیلز واپسی (کریڈٹ نوٹ)" : "Sale Return (Credit Note)") : (isUrdu ? "پرچیز واپسی (ڈیبٹ نوٹ)" : "Purchase Return (Debit Note)")} ${selectedDocId ? `for Invoice #${selectedDocId.slice(0,8).toUpperCase()}` : (isUrdu ? "(کھلی واپسی)" : "(Open Return)")} | Ref #${ret.id.slice(0, 8).toUpperCase()}`
        });
      }

      toast.success(
        activeTab === "sale" 
          ? (isUrdu ? "کریڈٹ نوٹ اور اسٹاک کامیابی سے محفوظ ہو گیا! 📦" : "Credit Note saved successfully! 📦")
          : (isUrdu ? "ڈیبٹ نوٹ اور اسٹاک کامیابی سے محفوظ ہو گیا! 📦" : "Debit Note saved successfully! 📦")
      );
      setSelectedPartyId("");
      setSelectedDocId("");
      setReturnNotes("");
      setReturnItems([]);
      setReturnMode("invoice");
      setInvoiceSearchQuery("");
      loadBaseData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  }

  async function handleSaveStockAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustProductId || adjustQty <= 0) {
      toast.error(isUrdu ? "براہ کرم پروڈکٹ اور درست مقدار منتخب کریں۔" : "Please select a product and enter a valid quantity.");
      return;
    }

    setSubmittingAdjust(true);
    try {
      const prod = products.find(p => p.id === adjustProductId);
      if (!prod) return;

      const adjustedQty = -adjustQty;

      // 1. Insert adjustment record
      await supabase.from("stock_adjustments").insert({
        shop_id: shopId,
        product_id: adjustProductId,
        quantity: adjustedQty,
        reason: adjustReason,
        notes: adjustNotes.trim() || null
      });

      // 2. Update product stock level
      const newStock = Math.max(0, (prod.current_stock || 0) + adjustedQty);
      await supabase.from("products").update({ current_stock: newStock }).eq("id", adjustProductId);

      toast.success(isUrdu ? "اسٹاک ڈیمیج ایڈجسٹمنٹ کامیابی سے درج ہو گئی! 🗑️" : "Inventory stock adjusted successfully! 🗑️");
      setAdjustProductId("");
      setAdjustQty(0);
      setAdjustNotes("");
      loadBaseData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  }

  const selectedPartyType = activeTab === "sale" ? "customer" : "supplier";
  const filteredParties = parties.filter(p => p.type === selectedPartyType);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* Header Tabs */}
      <div className="flex items-center justify-end pb-4 border-b border-slate-100">

        {/* Tab switch */}
        <div className="flex border border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm gap-1 select-none">
          {(["sale", "purchase", "adjust"] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === tab 
                  ? "bg-violet-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab === "sale" 
                ? (isUrdu ? "سیلز واپسی (کریڈٹ نوٹ)" : "Sale Return") 
                : tab === "purchase" 
                ? (isUrdu ? "پرچیز واپسی (ڈیبٹ نوٹ)" : "Purchase Return") 
                : (isUrdu ? "اسٹاک ڈیمیج و ایڈجسٹمنٹ" : "Stock Adjustment")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left selector panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          {activeTab !== "adjust" ? (
            <form onSubmit={handleSaveReturn} className="space-y-4">
              <h3 className="font-black text-slate-800 text-sm pb-2 border-b border-slate-50 flex items-center gap-1.5">
                <Sparkles size={16} className="text-violet-600" /> 
                {activeTab === "sale" 
                  ? (isUrdu ? "نیا کریڈٹ نوٹ (سیلز ریٹرن)" : "New Credit Note (Sale Return)") 
                  : (isUrdu ? "نیا ڈیبٹ نوٹ (پرچیز ریٹرن)" : "New Debit Note (Purchase Return)")}
              </h3>
              
              {/* Return Mode Toggle */}
              <div className="flex border border-slate-100 bg-slate-50/50 rounded-xl p-1 mb-2 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => { setReturnMode("invoice"); setReturnItems([]); setSelectedDocId(""); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all text-center cursor-pointer ${
                    returnMode === "invoice" ? "bg-white text-slate-800 shadow-sm border border-slate-150" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isUrdu ? "بل / انوائس کے تحت واپسی" : "Against Bill / Invoice"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReturnMode("open"); setReturnItems([]); setSelectedDocId(""); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all text-center cursor-pointer ${
                    returnMode === "open" ? "bg-white text-slate-800 shadow-sm border border-slate-150" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isUrdu ? "کھلی واپسی (بغیر بل)" : "Open Return (No Bill)"}
                </button>
              </div>

              {returnMode === "invoice" ? (
                <div className="space-y-3.5">
                  {/* Direct search */}
                  <div className="space-y-1.5 pb-3 border-b border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      {isUrdu ? "بل نمبر یا انوائس آئی ڈی کے ذریعے تلاش کریں" : "Search by Bill # / Invoice ID (e.g. walk-in or any customer)"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isUrdu ? "بل نمبر یا آئی ڈی درج کریں..." : "Enter Bill # / UUID (e.g. 9c2b...)"}
                        value={invoiceSearchQuery}
                        onChange={e => setInvoiceSearchQuery(e.target.value)}
                        className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleInvoiceSearch}
                        disabled={isSearchingInvoice}
                        className="px-3.5 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSearchingInvoice ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} {isUrdu ? "تلاش" : "Search"}
                      </button>
                    </div>
                  </div>

                  {/* Browse by Customer */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        {isUrdu 
                          ? (activeTab === "sale" ? "یا کسٹمر منتخب کریں" : "یا سپلائر منتخب کریں")
                          : `Or Browse By ${activeTab === "sale" ? "Customer" : "Supplier"}`}
                      </label>
                      <select 
                        value={selectedPartyId}
                        onChange={e => { setSelectedPartyId(e.target.value); setSelectedDocId(""); }}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                      >
                        <option value="">{isUrdu ? "-- منتخب کریں --" : "Choose party..."}</option>
                        {activeTab === "sale" && <option value="walkin">{isUrdu ? "واک ان کسٹمر (نقد واپسی)" : "Walk-in Customer (Cash Refund)"}</option>}
                        {activeTab === "purchase" && <option value="cash">{isUrdu ? "کیش پرچیز (نقد سپلائر)" : "Cash PO (Cash Supplier)"}</option>}
                        {filteredParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {selectedPartyId && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          {isUrdu 
                            ? (activeTab === "sale" ? "انوائس کا انتخاب کریں" : "پرچیز آرڈر کا انتخاب کریں")
                            : `Select ${activeTab === "sale" ? "Invoice" : "Purchase Order"}`}
                        </label>
                        {loading ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-450 p-2"><Loader2 size={13} className="animate-spin" /> {isUrdu ? "دستاویزات لوڈ ہو رہی ہیں..." : "Loading documents..."}</div>
                        ) : pastDocuments.length === 0 ? (
                          <p className="text-xs text-rose-500 font-bold p-1">{isUrdu ? "اس انتخاب کے لیے کوئی سابقہ بل موجود نہیں ہے۔" : "No past entries found for this selection."}</p>
                        ) : (
                          <select 
                            value={selectedDocId}
                            onChange={e => setSelectedDocId(e.target.value)}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                          >
                            <option value="">{isUrdu ? "-- بل منتخب کریں --" : "Select entry..."}</option>
                            {pastDocuments.map(d => (
                              <option key={d.id} value={d.id}>
                                #{d.id.slice(0,8).toUpperCase()} ({new Date(d.created_at).toLocaleDateString()}) - Rs {Number(d.total_amount).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Open Return selection */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      {isUrdu 
                        ? (activeTab === "sale" ? "واپسی کسٹمر" : "واپسی سپلائر")
                        : "Return Customer / Supplier"}
                    </label>
                    <select 
                      value={selectedPartyId}
                      onChange={e => setSelectedPartyId(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                    >
                      <option value="walkin">{activeTab === "sale" ? (isUrdu ? "واک ان کسٹمر (نقد ریفنڈ)" : "Walk-in Customer (Cash Refund)") : (isUrdu ? "کیش پرچیز (نقد واپسی)" : "Cash PO (Cash Refund)")}</option>
                      {filteredParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{isUrdu ? "واپسی کے لیے پروڈکٹ منتخب کریں" : "Select Product to Return"}</label>
                    <select 
                      value={openReturnProductId}
                      onChange={e => {
                        const pid = e.target.value;
                        setOpenReturnProductId(pid);
                        const prod = products.find(p => p.id === pid);
                        if (prod) {
                          setOpenReturnPrice(activeTab === "sale" ? Number(prod.sale_price_single || 0) : Number(prod.purchase_price_single || 0));
                        } else {
                          setOpenReturnPrice(0);
                        }
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                    >
                      <option value="">{isUrdu ? "-- پروڈکٹ منتخب کریں --" : "Choose product..."}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({isUrdu ? "اسٹاک" : "Stock"}: {Number(p.current_stock).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{isUrdu ? "واپسی تعداد" : "Return Qty"}</label>
                      <input 
                        type="number" 
                        value={openReturnQty || ""}
                        onChange={e => setOpenReturnQty(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        placeholder="0"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{isUrdu ? "فی یونٹ قیمت (روپے)" : "Return Unit Price (Rs)"}</label>
                      <input 
                        type="number" 
                        value={openReturnPrice || ""}
                        onChange={e => setOpenReturnPrice(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOpenReturnItem}
                    className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> {isUrdu ? "ریٹرن کارٹ میں شامل کریں" : "Add to Return Cart"}
                  </button>
                </div>
              )}

              {returnItems.length > 0 && (
                <div className="pt-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "واپسی کی وجہ / ریمارکس" : "Remarks / Return Reason"}</label>
                  <textarea 
                    placeholder={isUrdu ? "واپسی کی تفصیل یا وجہ درج کریں..." : "Provide details about return reason..."} 
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold h-16 resize-none"
                  />
                </div>
              )}

              {returnItems.length > 0 && (
                <button 
                  type="submit" 
                  disabled={submittingReturn}
                  className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {submittingReturn && <Loader2 size={13} className="animate-spin" />} {isUrdu ? "واپسی ریکارڈ محفوظ کریں" : "Save Return Record"}
                </button>
              )}

            </form>
          ) : (
            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              <h3 className="font-black text-slate-800 text-sm mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
                <Sparkles size={16} className="text-violet-600" /> {isUrdu ? "اسٹاک ضائع / ڈیمیج کا اندراج" : "Log Stock Damage / Adjustment"}
              </h3>
              
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "پروڈکٹ منتخب کریں" : "Select Product"}</label>
                <select 
                  value={adjustProductId}
                  onChange={e => setAdjustProductId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                  required
                >
                  <option value="">{isUrdu ? "-- پروڈکٹ منتخب کریں --" : "Choose product..."}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({isUrdu ? "اسٹاک" : "Stock"}: {Number(p.current_stock).toLocaleString()})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ضائع شدہ / خراب تعداد" : "Wastage / Damage Quantity"}</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={adjustQty || ""}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "ایڈجسٹمنٹ کی وجہ" : "Adjustment Reason"}</label>
                <select 
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-slate-600"
                >
                  <option value="damaged">{isUrdu ? "ٹوٹ پھوٹ / خراب اشیاء" : "Damaged / Broken"}</option>
                  <option value="expired">{isUrdu ? "ایکسپائرڈ اسٹاک" : "Expired Stock"}</option>
                  <option value="stolen">{isUrdu ? "گمشدہ / چوری شدہ" : "Stolen / Lost"}</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{isUrdu ? "تفصیل / نوٹس" : "Remarks / Details"}</label>
                <textarea 
                  placeholder={isUrdu ? "اختیاری تفصیل..." : "Optional notes..."} 
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-bold h-20 resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingAdjust}
                className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-200 disabled:opacity-50 cursor-pointer"
              >
                {submittingAdjust && <Loader2 size={13} className="animate-spin" />} {isUrdu ? "اسٹاک ایڈجسٹمنٹ محفوظ کریں" : "Adjust Inventory Stock"}
              </button>

            </form>
          )}
        </div>

        {/* Right itemization list / log */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          {activeTab !== "adjust" ? (
            <>
              <div>
                <h3 className="font-black text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span>{isUrdu ? "واپسی شدہ اشیاء کی فہرست" : "Returned Items Cart"}</span>
                  {returnItems.length > 0 && (
                    <span className="text-[9px] text-slate-400 font-bold uppercase font-mono bg-slate-50 border px-2 py-0.5 rounded-md">
                      {returnItems.length} {isUrdu ? "آئٹمز" : (returnItems.length === 1 ? "Item" : "Items")}
                    </span>
                  )}
                </h3>

                {returnItems.length === 0 ? (
                  <div className="text-center py-24 text-slate-400 text-xs font-medium">
                    {returnMode === "invoice" 
                      ? (isUrdu ? "واپسی کے لیے بل تلاش کریں یا منتخب کریں۔" : "Select or search a document to choose items for return") 
                      : (isUrdu ? "پروڈکٹ منتخب کر کے ریٹرن کارٹ میں شامل کریں۔" : "Search and add products to the return cart")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {returnItems.map((item, idx) => (
                        <div key={`${item.productId}-${idx}`} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="min-w-0 flex-1 pr-3">
                            <h4 className="font-extrabold text-slate-800 text-xs leading-snug truncate">{item.productName}</h4>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              {isUrdu ? "واپسی ریٹ" : "Refund Rate"}: Rs {item.price.toLocaleString()} {item.maxQty < 999999 && `• ${isUrdu ? "اصل بل تعداد" : "Original Bill Qty"}: ${item.maxQty}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase font-sans">{isUrdu ? "واپسی تعداد:" : "Return Qty:"}</span>
                            <input 
                              type="number"
                              value={item.quantity || ""}
                              onChange={e => {
                                const val = item.maxQty < 999999 
                                  ? Math.min(item.maxQty, Math.max(0, Number(e.target.value)))
                                  : Math.max(0, Number(e.target.value));
                                setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                              }}
                              className="w-16 h-8 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                              placeholder="0"
                              min="0"
                              max={item.maxQty < 999999 ? item.maxQty : undefined}
                            />
                            <button
                              type="button"
                              onClick={() => setReturnItems(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                              title={isUrdu ? "آئٹم ختم کریں" : "Remove item"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {returnItems.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-4 flex items-baseline justify-between">
                  <span className="text-slate-450 font-bold text-xs">{isUrdu ? "کل ریفنڈ / کریڈٹ رقم:" : "Total Refund/Credit:"}</span>
                  <span className="text-lg font-black text-violet-600">
                    Rs {returnItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <h3 className="font-black text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100">
                  {isUrdu ? "اسٹاک ڈیمیج اور ایڈجسٹمنٹ ریکارڈ" : "Wastage & Damage Adjustments Log"}
                </h3>
                <div className="text-center py-24 text-slate-400 text-xs font-medium">
                  {isUrdu ? "اسٹاک میں کمی یا نقصان درج کرنے کے لیے بائیں جانب فارم پر کریں۔" : "Verify stock adjustments in your database logs or complete form on the left."}
                </div>
              </div>
              <div className="h-4" />
            </>
          )}
        </div>

      </div>

    </div>
  );
}
