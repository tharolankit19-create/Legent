"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? "Checkout failed. Try again.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Checkout failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={checkout}
      disabled={loading}
      className="flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      Get Early Access — $29
    </button>
  );
}
