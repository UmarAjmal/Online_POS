"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <AlertTriangle className="h-12 w-12 text-amber-600 mb-4" />
      <h2 className="text-xl font-semibold text-stone-800 mb-2">This page couldn&apos;t load</h2>
      <p className="text-sm text-stone-500 max-w-md mb-6">
        The server or database may still be starting. Reload to try again, or go back to another page.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw size={16} />
          Reload
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>
    </div>
  );
}
