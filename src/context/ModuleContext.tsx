"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { resolveModuleFromPath } from "@/lib/moduleRoutes";

export type AppModule = "retail";

export const MODULE_STORAGE_KEY = "argroup_active_module";

function writeModuleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${MODULE_STORAGE_KEY}=retail; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
}

function clearModuleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${MODULE_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function readStoredModule(): AppModule {
  return "retail";
}

export function persistModule(module: AppModule = "retail") {
  localStorage.setItem(MODULE_STORAGE_KEY, module);
  writeModuleCookie();
}

type ModuleContextType = {
  activeModule: AppModule;
  ready: boolean;
  setActiveModule: (module: AppModule) => void;
  clearActiveModule: () => void;
};

const defaultContext: ModuleContextType = {
  activeModule: "retail",
  ready: false,
  setActiveModule: () => {},
  clearActiveModule: () => {},
};

const ModuleContext = createContext<ModuleContextType>(defaultContext);

export const useModule = () => useContext(ModuleContext);

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeModule, setActiveModuleState] = useState<AppModule>("retail");
  const [ready, setReady] = useState(false);

  const applyModule = useCallback((module: AppModule = "retail") => {
    persistModule(module);
    setActiveModuleState(module);
  }, []);

  useEffect(() => {
    const fromPath = resolveModuleFromPath(pathname);
    applyModule(fromPath || readStoredModule());
    setReady(true);
  }, [pathname, applyModule]);

  const setActiveModule = (module: AppModule = "retail") => {
    applyModule(module);
  };

  const clearActiveModule = () => {
    localStorage.removeItem(MODULE_STORAGE_KEY);
    clearModuleCookie();
    setActiveModuleState("retail");
  };

  return (
    <ModuleContext.Provider value={{ activeModule, ready, setActiveModule, clearActiveModule }}>
      {children}
    </ModuleContext.Provider>
  );
}
