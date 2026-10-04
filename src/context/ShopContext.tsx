"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "argroup_user";

type ShopContextType = {
  userId: string | null;
  shopId: string | null;
  industryType: string | null;
  shopName: string | null;
  userRole: string | null;
  userName: string | null;
  permissions: any | null;
  loading: boolean;
  ready: boolean;
  allowNegativeStock: boolean;
  hasEmi: boolean;
  hasPayroll: boolean;
  hasTax: boolean;
  hasAssetsRec: boolean;
  subscriptionTier: string | null;
  subscriptionExpiresAt: string | null;
  allowAccounts: boolean;
  allowReports: boolean;
  allowExpenses: boolean;
  allowIndustrialAccounts: boolean;
  allowSimpleAccounts: boolean;
  allowBarcode: boolean;
  allowMultiShop: boolean;
  allowUniversalImport: boolean;
  allowAiProductAdd: boolean;
  allowAiPurchaseOrder: boolean;
  allowWhatsapp: boolean;
  maxDevices: string;
  systemAnnouncement: { message: string; type: string; active: boolean } | null;
};

const fullUnlockedPermissions = {
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
    reports: true,
    staff: true,
    pharmacy: true,
    expiry: true,
    formulas: true,
  },
  actions: {
    edit_bill: true,
    delete_bill: true,
    edit_account: true,
    delete_account: true,
    allow_wholesale: true,
    allow_discounts: true,
    view_cost: true,
  },
};

function readCachedUser(): Record<string, any> | null {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(SESSION_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function stateFromUser(user: Record<string, any>): ShopContextType {
  return {
    userId: user.id,
    shopId: user.shop_id,
    industryType: user.industry_type || "pharmacy",
    shopName: user.shop_name || "Falcon Swift PVT. LTD. Pharmacy",
    userRole: user.role || "superadmin",
    userName: user.name || "Staff",
    permissions: fullUnlockedPermissions,
    loading: false,
    ready: true,
    allowNegativeStock: true,
    hasEmi: true,
    hasPayroll: true,
    hasTax: true,
    hasAssetsRec: true,
    subscriptionTier: user.subscription_tier || "enterprise",
    subscriptionExpiresAt: null,
    allowAccounts: true,
    allowReports: true,
    allowExpenses: true,
    allowIndustrialAccounts: true,
    allowSimpleAccounts: true,
    allowBarcode: true,
    allowMultiShop: false,
    allowUniversalImport: true,
    allowAiProductAdd: true,
    allowAiPurchaseOrder: true,
    allowWhatsapp: true,
    maxDevices: "unlimited",
    systemAnnouncement: null,
  };
}

const defaultContext: ShopContextType = {
  userId: null,
  shopId: null,
  industryType: null,
  shopName: null,
  userRole: null,
  userName: null,
  permissions: null,
  loading: true,
  ready: false,
  allowNegativeStock: true,
  hasEmi: true,
  hasPayroll: true,
  hasTax: true,
  hasAssetsRec: true,
  subscriptionTier: "enterprise",
  subscriptionExpiresAt: null,
  allowAccounts: true,
  allowReports: true,
  allowExpenses: true,
  allowIndustrialAccounts: true,
  allowSimpleAccounts: true,
  allowBarcode: true,
  allowMultiShop: false,
  allowUniversalImport: true,
  allowAiProductAdd: true,
  allowAiPurchaseOrder: true,
  allowWhatsapp: true,
  maxDevices: "unlimited",
  systemAnnouncement: null,
};

const ShopContext = createContext<ShopContextType>(defaultContext);

export const useShop = () => useContext(ShopContext);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ShopContextType>(() => {
    const cached = readCachedUser();
    if (cached?.shop_id) {
      return stateFromUser(cached);
    }
    return defaultContext;
  });

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const cached = readCachedUser();

      if (cached?.id) {
        // If state is not yet hydrated with cached user, hydrate immediately
        if (cached.shop_id) {
          if (active) setState(stateFromUser(cached));
        }

        try {
          const res = await fetch("/api/sqlite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "refresh_session", userId: cached.id }),
          });
          const json = await res.json();
          if (active && res.ok && json.data?.user?.shop_id) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(json.data.user));
            setState(stateFromUser(json.data.user));
            return;
          }
        } catch (err) {
          console.error("Session refresh failed:", err);
        }

        if (active && cached.shop_id) {
          setState(stateFromUser(cached));
          return;
        }
      }

      // If no cached user or session is invalid, mark as ready and redirect if on private route
      if (active) {
        setState({ ...defaultContext, loading: false, ready: true });
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path.startsWith("/dashboard") || path.startsWith("/welcome")) {
            window.location.href = "/login";
          }
        }
      }
    };

    syncSession();

    return () => {
      active = false;
    };
  }, []);

  return <ShopContext.Provider value={state}>{children}</ShopContext.Provider>;
}
