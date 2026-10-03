"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function AdminShopsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);

  // Search & Filter state
  const [shopSearch, setShopSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");

  useEffect(() => {
    loadShopsData();
  }, []);

  const loadShopsData = async () => {
    setLoading(true);
    try {
      const { data: shopsData, error: shopsErr } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });
      if (shopsErr) throw shopsErr;
      setShops(shopsData || []);

      const { data: profilesData, error: profilesErr } = await supabase
        .from("user_profiles")
        .select("*");
      if (profilesErr) throw profilesErr;
      setProfiles(profilesData || []);
    } catch (err: any) {
      toast.error("Failed to load business shops list: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Shop Updates
  const handleUpdateShop = async (shopId: string, updates: any) => {
    setSavingShopId(shopId);
    try {
      const { error } = await supabase
        .from("shops")
        .update(updates)
        .eq("id", shopId);

      if (error) throw error;
      
      toast.success("Business updated successfully!");
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updates } : s));
    } catch (err: any) {
      toast.error("Failed to update business: " + err.message);
    } finally {
      setSavingShopId(null);
    }
  };

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(shopSearch.toLowerCase()) || 
                            (s.phone && s.phone.includes(shopSearch));
      const matchesIndustry = industryFilter === "all" || s.industry_type === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [shops, shopSearch, industryFilter]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col justify-center items-center text-slate-450">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
        <p className="text-xs font-semibold">Loading business registry details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Business Directory</h2>
        <p className="text-xs text-slate-450 mt-0.5">Toggle live features and subscription tiers for any business account.</p>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Search business by name or phone..." 
            value={shopSearch}
            onChange={(e) => setShopSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 h-9 text-xs"
          />
        </div>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="bg-white border border-slate-200 h-9 rounded-lg px-3 text-xs font-semibold cursor-pointer w-full sm:w-48 text-slate-650 focus:outline-none"
        >
          <option value="all">All Industries</option>
          <option value="general">General Retail</option>
          <option value="karyana">Karyana Store</option>
          <option value="restaurant">Restaurant POS</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="fertilizer">Fertilizer Ledger</option>
          <option value="garments">Garments</option>
          <option value="showroom">Showroom</option>
          <option value="tailor">Tailoring Shop</option>
        </select>
      </div>

      {/* Shop Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredShops.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm font-semibold">
            No matching business shops found.
          </div>
        ) : (
          filteredShops.map(shop => {
            const shopOwner = profiles.find(p => p.shop_id === shop.id && p.role === "superadmin");
            
            return (
              <div 
                key={shop.id} 
                className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 rounded-2xl space-y-4"
              >
                {/* Header details */}
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">{shop.name}</h3>
                    <p className="text-[10px] text-indigo-600 font-bold capitalize mt-0.5">
                      {shop.industry_type} • Owner: {shopOwner ? shopOwner.name : "Unregistered owner"}
                    </p>
                    {shopOwner?.email && (
                      <p className="text-[9px] text-slate-400 mt-0.5">{shopOwner.email}</p>
                    )}
                  </div>
                  
                  <select
                    value={shop.subscription_tier || "free"}
                    onChange={(e) => handleUpdateShop(shop.id, { subscription_tier: e.target.value })}
                    className="bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 cursor-pointer text-slate-700 focus:outline-none"
                  >
                    <option value="free">Free Tier</option>
                    <option value="starter">Starter Plan</option>
                    <option value="premium">Premium Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                {/* Features Toggles row */}
                <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-650">
                  {/* Allow Negative Stock */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-[10px]">Negative Stock</span>
                    <button
                      onClick={() => handleUpdateShop(shop.id, { allow_negative_stock: !shop.allow_negative_stock })}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {shop.allow_negative_stock ? (
                        <ToggleRight className="text-emerald-500 h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* EMI Active */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-[10px]">EMI/Installments</span>
                    <button
                      onClick={() => handleUpdateShop(shop.id, { has_emi: !shop.has_emi })}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {shop.has_emi ? (
                        <ToggleRight className="text-emerald-500 h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* Payroll Toggle */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-[10px]">Staff Payroll</span>
                    <button
                      onClick={() => handleUpdateShop(shop.id, { has_payroll: !shop.has_payroll })}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {shop.has_payroll ? (
                        <ToggleRight className="text-emerald-500 h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* Tax Toggles */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-[10px]">Tax Systems</span>
                    <button
                      onClick={() => handleUpdateShop(shop.id, { has_tax: !shop.has_tax })}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {shop.has_tax ? (
                        <ToggleRight className="text-emerald-500 h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* Assets reconcilliation */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-200/60 col-span-2">
                    <span className="font-bold text-[10px]">Fixed Assets Logs</span>
                    <button
                      onClick={() => handleUpdateShop(shop.id, { has_assets_rec: !shop.has_assets_rec })}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {shop.has_assets_rec ? (
                        <ToggleRight className="text-emerald-500 h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Status tracker loading */}
                {savingShopId === shop.id && (
                  <div className="flex items-center justify-center text-[10px] text-indigo-600 font-bold bg-indigo-50 py-1.5 rounded-lg border border-indigo-150 animate-pulse">
                    <Loader2 size={12} className="animate-spin mr-1" /> Saving database alterations...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
