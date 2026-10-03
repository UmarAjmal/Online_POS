"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, Search, Sliders, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSubscriptionsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, industry_type, subscription_tier, subscription_expires_at")
        .order("name", { ascending: true });
      if (error) throw error;
      setShops(data || []);
    } catch (err: any) {
      toast.error("Failed to load SaaS subscriptions list: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpiry = async (shopId: string, expiryDate: string) => {
    setSavingShopId(shopId);
    try {
      const { error } = await supabase
        .from("shops")
        .update({ subscription_expires_at: expiryDate })
        .eq("id", shopId);
      if (error) throw error;
      toast.success("Subscription expiry date updated successfully!");
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, subscription_expires_at: expiryDate } : s));
    } catch (err: any) {
      toast.error("Failed to update subscription expiry: " + err.message);
    } finally {
      setSavingShopId(null);
    }
  };

  const handleExtend30Days = (shop: any) => {
    const baseDate = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : new Date();
    // If expired, start from today
    const start = baseDate < new Date() ? new Date() : baseDate;
    start.setDate(start.getDate() + 30);
    handleUpdateExpiry(shop.id, start.toISOString());
  };

  const handleChangeSubscriptionTier = async (shopId: string, newTier: string) => {
    setSavingShopId(shopId);
    try {
      const { error } = await supabase
        .from("shops")
        .update({ subscription_tier: newTier })
        .eq("id", shopId);
      if (error) throw error;
      toast.success("Subscription plan updated successfully!");
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, subscription_tier: newTier } : s));
    } catch (err: any) {
      toast.error("Failed to update subscription plan: " + err.message);
    } finally {
      setSavingShopId(null);
    }
  };

  // Filtered Shops list
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const expires = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : null;
      const isExpired = expires ? expires < new Date() : true;

      const matchesSearch = 
        shop.name.toLowerCase().includes(search.toLowerCase()) ||
        shop.industry_type.toLowerCase().includes(search.toLowerCase());

      const matchesTier = tierFilter === "all" || shop.subscription_tier === tierFilter;
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && !isExpired) ||
        (statusFilter === "expired" && isExpired);

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [shops, search, tierFilter, statusFilter]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col justify-center items-center text-slate-450">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
        <p className="text-xs font-semibold">Loading subscription scheduler...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Subscription Scheduler</h2>
          <p className="text-xs text-slate-450 mt-0.5">Extend, review, or manually override standard active plan dates.</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Search business by name or industry..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 h-9 text-xs"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white border border-slate-200 h-9 rounded-lg px-3 text-xs font-semibold cursor-pointer w-full md:w-40 text-slate-650 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Tier</option>
            <option value="starter">Starter Plan</option>
            <option value="premium">Premium Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 h-9 rounded-lg px-3 text-xs font-semibold cursor-pointer w-full md:w-40 text-slate-650 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>
      </div>

      {/* Scheduler list */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 font-bold border-b text-slate-400 uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Business Name</th>
                <th className="py-3 px-4">Industry Type</th>
                <th className="py-3 px-4">Tier Plan</th>
                <th className="py-3 px-4">SaaS Status</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4 text-center">Modify Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans font-semibold">
                    No active subscriptions match the filters.
                  </td>
                </tr>
              ) : (
                filteredShops.map(shop => {
                  const expires = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : null;
                  const isExpired = expires ? expires < new Date() : true;
                  
                  return (
                    <tr key={shop.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-sans font-bold text-slate-800">{shop.name}</td>
                      <td className="py-3.5 px-4 capitalize font-sans">{shop.industry_type}</td>
                      <td className="py-2.5 px-4 font-sans">
                        <select
                          value={shop.subscription_tier || "free"}
                          disabled={savingShopId === shop.id}
                          onChange={(e) => handleChangeSubscriptionTier(shop.id, e.target.value)}
                          className={`bg-white border rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-wider focus:outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 ${
                            shop.subscription_tier === "premium"
                              ? "text-purple-750 border-purple-200 bg-purple-50/40"
                              : shop.subscription_tier === "starter"
                                ? "text-blue-650 border-blue-200 bg-blue-50/40"
                                : "text-slate-600 border-slate-200 bg-slate-50/40"
                          }`}
                        >
                          <option value="free">FREE</option>
                          <option value="starter">STARTER</option>
                          <option value="premium">PREMIUM</option>
                          <option value="enterprise">ENTERPRISE</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-sans font-black uppercase ${
                          isExpired 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {isExpired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-sans font-bold">
                        {expires ? expires.toLocaleDateString() : "No active expiration"}
                      </td>
                      <td className="py-2 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            key={shop.id + "-" + (shop.subscription_expires_at || "none")}
                            type="date"
                            defaultValue={shop.subscription_expires_at ? shop.subscription_expires_at.split("T")[0] : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleUpdateExpiry(shop.id, new Date(val).toISOString());
                              }
                            }}
                            className="h-8 text-[11px] border-slate-200 bg-white w-36 px-2 focus-visible:ring-1 focus-visible:ring-indigo-500"
                          />
                          <Button
                            size="sm"
                            disabled={savingShopId === shop.id}
                            onClick={() => handleExtend30Days(shop)}
                            className="h-8 bg-indigo-600 hover:bg-indigo-750 text-[10px] font-black text-white px-2.5 shadow-sm rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles size={10} /> +30 Days
                          </Button>
                        </div>
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
