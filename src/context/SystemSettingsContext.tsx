"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export interface SystemSettings {
  shopName: string;
  industryType: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  ntn: string;
  currency: string;
  footerNote: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  shopName: "Al Madina Enterprise (Falcon Swift PVT. LTD.)",
  industryType: "pharmacy",
  ownerName: "Aamish Rehmani",
  phone: "+92 300 1234567",
  email: "contact@argroup.pk",
  address: "Main Commercial Market, Lahore, Pakistan",
  logoUrl: "",
  ntn: "1234567-8",
  currency: "PKR",
  footerNote: "Thank you for your business! Goods once sold cannot be returned without original receipt.",
};

const SYSTEM_STORAGE_KEY = "argroup_system_settings";

type SystemSettingsContextType = {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  reloadSettings: () => Promise<void>;
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);

  const getActiveShopId = () => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("argroup_user");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.shop_id) return parsed.shop_id;
        }
      } catch {}
    }
    return "ar-group-shop-001";
  };

  const fetchFromDb = async () => {
    try {
      const activeShopId = getActiveShopId();
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          table: "shops",
          filters: [{ col: "id", op: "eq", val: activeShopId }],
          limit: 1,
          maybeSingle: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const shop = json.data;
        const loaded: SystemSettings = {
          shopName: shop.name || DEFAULT_SYSTEM_SETTINGS.shopName,
          industryType: shop.industry_type || DEFAULT_SYSTEM_SETTINGS.industryType,
          ownerName: DEFAULT_SYSTEM_SETTINGS.ownerName,
          phone: shop.phone || DEFAULT_SYSTEM_SETTINGS.phone,
          email: shop.email || DEFAULT_SYSTEM_SETTINGS.email,
          address: shop.address || DEFAULT_SYSTEM_SETTINGS.address,
          logoUrl: shop.logo_url || "",
          ntn: shop.ntn || DEFAULT_SYSTEM_SETTINGS.ntn,
          currency: shop.currency || DEFAULT_SYSTEM_SETTINGS.currency,
          footerNote: shop.footer_note || DEFAULT_SYSTEM_SETTINGS.footerNote,
        };
        setSettings(loaded);
        try {
          localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(loaded));
        } catch { }
      }
    } catch (err) {
      console.error("Error fetching system settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial fast load from localStorage cache
    try {
      const cached = localStorage.getItem(SYSTEM_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.shopName) {
          setSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...parsed });
        }
      }
    } catch { }

    // 2. Fetch fresh from DB
    fetchFromDb();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>): Promise<boolean> => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(merged));
    } catch { }

    try {
      const activeShopId = getActiveShopId();
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "shops",
          data: {
            name: merged.shopName,
            industry_type: merged.industryType,
            phone: merged.phone,
            email: merged.email,
            address: merged.address,
            logo_url: merged.logoUrl,
            ntn: merged.ntn,
            currency: merged.currency,
            footer_note: merged.footerNote,
            updated_at: new Date().toISOString(),
          },
          filters: [{ col: "id", op: "eq", val: activeShopId }],
        }),
      });

      if (res.ok) {
        // Also update cached session user shop_name if present
        try {
          const cachedUser = localStorage.getItem("argroup_user");
          if (cachedUser) {
            const parsedUser = JSON.parse(cachedUser);
            parsedUser.shop_name = merged.shopName;
            parsedUser.industry_type = merged.industryType;
            localStorage.setItem("argroup_user", JSON.stringify(parsedUser));
          }
        } catch { }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update system settings:", err);
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    return updateSettings(DEFAULT_SYSTEM_SETTINGS);
  };

  const contextValue = React.useMemo(() => ({
    settings,
    loading,
    updateSettings,
    resetToDefaults,
    reloadSettings: fetchFromDb,
  }), [settings, loading]);

  return (
    <SystemSettingsContext.Provider value={contextValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
}
