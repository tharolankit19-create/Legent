"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type PlatformCard = {
  platform: "X" | "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "THREADS";
  label: string;
  available: boolean;
  connected: boolean;
  username: string | null;
  avatar: string | null;
  updatedAt: string | null;
  status: "connected" | "needs_refresh" | "reconnect";
  comingSoon?: boolean;
};

const STATUS_STYLES: Record<PlatformCard["status"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-green-500/15 text-green-400" },
  needs_refresh: { label: "Needs refresh", className: "bg-yellow-500/15 text-yellow-400" },
  reconnect: { label: "Reconnect", className: "bg-yellow-500/15 text-yellow-400" },
};

type Toast = { kind: "success" | "error"; message: string };

export function IntegrationsList({ cards }: { cards: PlatformCard[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Surface ?success= / ?error= from the OAuth callback redirect as a toast.
  const [toast, setToast] = useState<Toast | null>(() => {
    const success = searchParams.get("success");
    if (success) return { kind: "success", message: success };
    const error = searchParams.get("error");
    if (error) return { kind: "error", message: error };
    return null;
  });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    // Clean the query string so refreshes don't re-toast.
    window.history.replaceState(null, "", "/integrations");
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function disconnect(platform: string, label: string) {
    if (!window.confirm(`Disconnect ${label}? Scheduled posts to ${label} will fail.`)) return;
    setBusy(platform);
    try {
      const res = await fetch(`/api/integrations/${platform.toLowerCase()}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToast({ kind: "success", message: `${label} disconnected.` });
      router.refresh();
    } catch {
      setToast({ kind: "error", message: `Failed to disconnect ${label}. Try again.` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {toast && (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            toast.kind === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.message}
        </div>
      )}

      {cards.map((card) => {
        const status = STATUS_STYLES[card.status];
        return (
          <div
            key={card.platform}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {card.avatar ? (
                <img src={card.avatar} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                  {card.label[0]}
                </div>
              )}
              <div>
                <p className="font-medium">{card.label}</p>
                {card.connected && card.username ? (
                  <p className="text-sm text-muted-foreground">
                    Connected as @{card.username}
                    {card.updatedAt && (
                      <span className="ml-2 text-xs">
                        · updated {new Date(card.updatedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {card.available && !card.comingSoon ? "Not connected" : "Coming soon"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {card.connected && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              )}

              {card.connected ? (
                <button
                  onClick={() => disconnect(card.platform, card.label)}
                  disabled={busy === card.platform}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  {busy === card.platform ? "Disconnecting…" : `Disconnect ${card.label}`}
                </button>
              ) : card.available && !card.comingSoon ? (
                <a
                  href={`/api/auth/${card.platform.toLowerCase()}/authorize`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Connect {card.label}
                </a>
              ) : (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  Coming soon
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
