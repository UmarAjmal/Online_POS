"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Pill, AlertTriangle, CheckCircle, Search, Calendar, 
  Trash2, FileText, Loader2, RefreshCw, Archive 
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StockBatch = {
  id: string;
  batch_number: string | null;
  expiry_date: string | null;
  stock_quantity: number;
  products?: any;
};

export default function ExpiryTrackerPage() {
  const { shopId } = useShop();
  const { language, t } = useLanguage();
  const isUrdu = language === "ur";
  const supabase = createClient();

  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (shopId) {
      fetchStockBatches();
    }

    const handleAppRefresh = () => {
      if (shopId) fetchStockBatches();
    };

    window.addEventListener("app-refresh", handleAppRefresh);
    return () => window.removeEventListener("app-refresh", handleAppRefresh);
  }, [shopId]);

  const fetchStockBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_batches")
        .select(`
          id, batch_number, expiry_date, stock_quantity,
          products ( name )
        `)
        .eq("shop_id", shopId)
        .not("expiry_date", "is", null)
        .gt("stock_quantity", 0)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (err: any) {
      toast.error((isUrdu ? "ایکسپائری ڈیٹا لوڈ کرنے میں مسئلہ ہوا: " : "Failed to load expiry logs: ") + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispose = async (id: string) => {
    if (!confirm(isUrdu ? "کیا آپ واقعی یہ ایکسپائرڈ بیچ ضائع (Dispose) کر کے ریکارڈ سے ختم کرنا چاہتے ہیں؟" : "Are you sure you want to dispose of this expired batch stock? This will delete the batch record.")) return;
    try {
      const { error } = await supabase
        .from("product_batches")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(isUrdu ? "ایکسپائرڈ میڈیسن اسٹاک کامیابی سے ضائع اور لاگز سے خارج کر دیا گیا۔" : "Expired medicine stock successfully disposed and removed from logs.");
      fetchStockBatches();
    } catch (err: any) {
      toast.error((isUrdu ? "ضائع کرنے میں خرابی: " : "Failed to dispose batch: ") + err.message);
    }
  };

  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return { 
      text: isUrdu ? "کوئی ایکسپائری نہیں" : "No Expiry", 
      color: "text-slate-500 bg-slate-100 border-slate-200", 
      days: 999 
    };
    
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: isUrdu ? "ایکسپائرڈ" : "Expired", 
        color: "bg-red-50 border-red-200 text-red-700 shadow-sm shadow-red-50", 
        days: diffDays 
      };
    } else if (diffDays <= 90) {
      return { 
        text: isUrdu ? `قریب المیعاد (${diffDays} دن)` : `Near Expiry (${diffDays}d)`, 
        color: "bg-amber-50 border-amber-200 text-amber-700", 
        days: diffDays 
      };
    } else {
      return { 
        text: isUrdu ? "محفوظ اسٹاک" : "Safe", 
        color: "bg-emerald-50 border-emerald-200 text-emerald-700", 
        days: diffDays 
      };
    }
  };

  const getProductName = (products: any) => {
    if (!products) return isUrdu ? "نامعلوم" : "Unknown";
    if (Array.isArray(products)) {
      return products[0]?.name || (isUrdu ? "نامعلوم" : "Unknown");
    }
    return products.name || (isUrdu ? "نامعلوم" : "Unknown");
  };

  const filtered = batches.filter(b => {
    const pName = getProductName(b.products);
    return pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.batch_number && b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredCount = batches.filter(b => b.expiry_date && new Date(b.expiry_date) < today).length;
  const nearExpiryCount = batches.filter(b => {
    if (!b.expiry_date) return false;
    const exp = new Date(b.expiry_date);
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 90;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder={isUrdu ? "دوا یا بیچ نمبر تلاش کریں..." : "Search medicine or batch..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[250px] bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Expiry Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "ایکسپائرڈ بیجز" : "Expired Batches"}</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{expiredCount} {isUrdu ? "بیچ" : "Batches"}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "قریب المیعاد (90 دن)" : "Near Expiry (90 Days)"}</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{nearExpiryCount} {isUrdu ? "بیچ" : "Batches"}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">{isUrdu ? "محفوظ اسٹاک بیجز" : "Safe Batches"}</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{batches.length - expiredCount - nearExpiryCount} {isUrdu ? "بیچ" : "Batches"}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4">{isUrdu ? "دوا کا نام" : "Medicine Name"}</th>
                <th className="px-6 py-4">{isUrdu ? "بیچ نمبر" : "Batch Number"}</th>
                <th className="px-6 py-4">{isUrdu ? "تاریخ معیاد (Expiry)" : "Expiry Date"}</th>
                <th className="px-6 py-4 text-center">{isUrdu ? "باقی اسٹاک" : "Remaining Stock"}</th>
                <th className="px-6 py-4 text-center">{isUrdu ? "حالت (Status)" : "Status"}</th>
                <th className="px-6 py-4 text-right">{isUrdu ? "ایکشنز" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-sans">{isUrdu ? "بیچ ڈیٹا لوڈ ہو رہا ہے..." : "Loading batch data..."}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-sans">
                    {isUrdu ? "ایکسپائری تاریخ کے ساتھ کوئی بیچ لاگ موجود نہیں ہے۔" : "No batch logs with expiry dates found."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const status = getExpiryStatus(item.expiry_date);
                  const isExpired = status.text === "Expired" || status.text === "ایکسپائرڈ";

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isExpired ? 'bg-red-50/10' : ''}`}>
                      <td className="px-6 py-4 font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Pill size={16} className="text-slate-400" /> {getProductName(item.products)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{item.batch_number || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        }) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center font-sans">
                        <span className="font-bold text-slate-700">
                          {item.stock_quantity} {isUrdu ? "یونٹس" : "units"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-sans">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-sans">
                        {isExpired ? (
                          <Button 
                            onClick={() => handleDispose(item.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs h-8 border border-red-200 cursor-pointer"
                          >
                            <Archive size={12} className="mr-1" /> {isUrdu ? "ضائع کریں" : "Dispose"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">{isUrdu ? "کوئی ضرورت نہیں" : "No action"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
