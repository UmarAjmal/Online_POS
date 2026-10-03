import type { AppModule } from "@/context/ModuleContext";

/** Paths that belong to retail POS (not shared admin pages). */
export function isRetailPath(pathname: string): boolean {
  const retailPrefixes = [
    "/dashboard/pos",
    "/dashboard/sales",
    "/dashboard/khata",
    "/dashboard/purchase",
    "/dashboard/products",
    "/dashboard/registers",
    "/dashboard/reports",
    "/dashboard/returns",
    "/dashboard/expenses",
    "/dashboard/units",
    "/dashboard/pharmacy/",
  ];
  return retailPrefixes.some((p) => pathname === p || pathname.startsWith(p));
}

/** Infer module from URL; returns null on shared pages (staff, etc.). */
export function resolveModuleFromPath(pathname: string): AppModule | null {
  if (isRetailPath(pathname)) return "retail";
  return null;
}

export const MODULE_LANDING: Record<AppModule, string> = {
  retail: "/dashboard/pos",
};
