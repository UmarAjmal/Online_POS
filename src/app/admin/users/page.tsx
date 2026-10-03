"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Loader2, Search, Trash2, Mail, Award, Store, 
  Calendar, CreditCard, Clock, CheckCircle2, XCircle,
  Building2, Users, Activity
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface OwnerBusiness {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  shop_id: string;
  shops: {
    id: string;
    name: string;
    industry_type: string;
    subscription_tier: string;
    subscription_expires_at: string | null;
    created_at: string;
    has_payroll: boolean;
    has_tax: boolean;
    has_emi: boolean;
  } | null;
}

export default function AdminRegistrationsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<OwnerBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadOwnersData();
  }, []);

  const loadOwnersData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          id, name, email, role, created_at, shop_id,
          shops (
            id, name, industry_type, subscription_tier,
            subscription_expires_at, created_at,
            has_payroll, has_tax, has_emi
          )
        `)
        .eq("role", "superadmin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Exclude our own superadmin account
      const filtered = (data as any[] || []).filter(
        (u: any) => u.email !== "superadmin@hisabx.com"
      );
      setOwners(filtered);
    } catch (err: any) {
      toast.error("Failed to load business registrations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOwner = async (owner: OwnerBusiness) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete the registration for "${owner.shops?.name || owner.name}"? This will remove the owner profile. This action is irreversible.`
    );
    if (!confirmDelete) return;

    setDeletingId(owner.id);
    const toastId = toast.loading("Deleting registration...");
    try {
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", owner.id);

      if (error) throw error;
      toast.success("Registration deleted successfully!", { id: toastId });
      setOwners(prev => prev.filter(o => o.id !== owner.id));
    } catch (err: any) {
      toast.error("Delete failed: " + err.message, { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const getSubStatus = (shop: OwnerBusiness["shops"]) => {
    if (!shop) return { isActive: false, isExpired: false, daysLeft: 0 };
    const expires = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : null;
    if (!expires) return { isActive: false, isExpired: true, daysLeft: 0 };
    const now = new Date();
    const isActive = expires > now;
    const daysLeft = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { isActive, isExpired: !isActive, daysLeft, expires };
  };

  const filteredOwners = useMemo(() => {
    return owners.filter(o => {
      const shop = o.shops;
      const { isActive } = getSubStatus(shop);

      const matchesSearch =
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase()) ||
        (shop?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (shop?.industry_type || "").toLowerCase().includes(search.toLowerCase());

      const matchesTier =
        tierFilter === "all" || (shop?.subscription_tier || "free") === tierFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "expired" && !isActive);

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [owners, search, tierFilter, statusFilter]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col justify-center items-center text-slate-450">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs font-semibold">Loading business registrations...</p>
      </div>
    );
  }

  // Stats counts
  const activeCount = owners.filter(o => getSubStatus(o.shops).isActive).length;
  const expiredCount = owners.filter(o => !getSubStatus(o.shops).isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            Business Registrations Directory
          </h2>
          <p className="text-xs text-slate-450 mt-0.5">
            View all registered business owners, their active module configurations, subscription tier, and billing status.
          </p>
        </div>
        <button
          onClick={loadOwnersData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200/60 border border-slate-200 text-slate-700 text-xs font-black rounded-xl shrink-0"
        >
          Refresh List
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Owners</span>
            <span className="text-2xl font-black text-slate-800">{owners.length}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Active Plans</span>
            <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
            <XCircle size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Expired Plans</span>
            <span className="text-2xl font-black text-rose-500">{expiredCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by owner name, email, business name, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 h-9 text-xs"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white border border-slate-200 h-9 rounded-lg px-3 text-xs font-semibold cursor-pointer text-slate-700 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Tier</option>
            <option value="starter">Starter</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 h-9 rounded-lg px-3 text-xs font-semibold cursor-pointer text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>
      </div>

      {/* Registrations List */}
      <div className="space-y-4">
        {filteredOwners.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm font-semibold bg-white border border-slate-200/80 rounded-3xl">
            No matching business registrations found.
          </div>
        ) : (
          filteredOwners.map(owner => {
            const shop = owner.shops;
            const { isActive, daysLeft, expires } = getSubStatus(shop);
            const isExpanded = expandedId === owner.id;

            return (
              <div
                key={owner.id}
                className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden"
              >
                {/* Main row */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Owner + Business details */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-black text-base shrink-0">
                      {owner.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-2.5">
                      {/* Owner row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-800 text-sm leading-tight">
                          {owner.name}
                        </h3>
                        <span title="Business Owner">
                          <Award size={12} className="text-amber-500 fill-amber-500" />
                        </span>
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          Business Owner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Mail size={10} className="shrink-0" /> {owner.email}
                      </p>
                      
                      {/* Business row */}
                      {shop && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                            <Store size={11} className="text-indigo-500" />
                            <span>{shop.name}</span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <span className="text-[11px] text-slate-400 capitalize font-semibold">{shop.industry_type} Industry</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Subscription status + Actions */}
                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    {/* Subscription status */}
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                        (shop?.subscription_tier || "free") === "premium"
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : (shop?.subscription_tier || "free") === "starter"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {shop?.subscription_tier || "Free"}
                      </span>
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border flex items-center gap-1 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {isActive ? (
                          <CheckCircle2 size={9} />
                        ) : (
                          <XCircle size={9} />
                        )}
                        {isActive ? `Active (${daysLeft}d left)` : "Expired"}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="text-[10px] text-slate-400 font-mono sm:text-right space-y-0.5">
                      <div className="flex items-center gap-1 sm:justify-end">
                        <Calendar size={9} />
                        <span>Registered: {new Date(owner.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                      {expires && (
                        <div className="flex items-center gap-1 sm:justify-end">
                          <Clock size={9} />
                          <span>Expires: {expires.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : owner.id)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-black transition-all"
                      >
                        {isExpanded ? "Less Details ▲" : "More Details ▼"}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === owner.id}
                        onClick={() => handleDeleteOwner(owner)}
                        className="p-2 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 rounded-xl transition-all"
                        title="Delete Registration"
                      >
                        {deletingId === owner.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && shop && (
                  <div className="border-t border-slate-100 bg-slate-50 p-5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Module Features</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Subscription Plan", value: shop.subscription_tier || "Free", mono: true },
                        { label: "Business Registration", value: new Date(shop.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }), mono: true },
                        { label: "Plan Expiry Date", value: expires ? expires.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "No active plan", mono: true },
                        { label: "Days Remaining", value: isActive ? `${daysLeft} Days` : "Expired", highlight: isActive ? "green" : "red" },
                        { label: "Staff Payroll", value: shop.has_payroll ? "Active ✓" : "Not Active", highlight: shop.has_payroll ? "green" : "gray" },
                        { label: "Tax System", value: shop.has_tax ? "Active ✓" : "Not Active", highlight: shop.has_tax ? "green" : "gray" },
                        { label: "EMI / Installments", value: shop.has_emi ? "Active ✓" : "Not Active", highlight: shop.has_emi ? "green" : "gray" },
                        { label: "Industry Type", value: shop.industry_type || "General", mono: true },
                      ].map((item) => (
                        <div key={item.label} className="bg-white border border-slate-200/60 rounded-xl p-3">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{item.label}</span>
                          <span className={`text-xs font-extrabold block mt-0.5 capitalize ${
                            item.highlight === "green" 
                              ? "text-emerald-600"
                              : item.highlight === "red"
                                ? "text-rose-500"
                                : item.highlight === "gray"
                                  ? "text-slate-400"
                                  : "text-slate-800"
                          } ${item.mono ? "font-mono" : ""}`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
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
