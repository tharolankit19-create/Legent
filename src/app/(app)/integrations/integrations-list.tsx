"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
  connected: { label: "Connected", className: "bg-green-500/15 text-green-500" },
  needs_refresh: { label: "Needs refresh", className: "bg-yellow-500/15 text-yellow-500" },
  reconnect: { label: "Reconnect", className: "bg-yellow-500/15 text-yellow-500" },
};

export function IntegrationsList({ cards }: { cards: PlatformCard[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);

  // Surface ?success= / ?error= from OAuth callback redirects as toasts.
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) toast.success(success);
    else if (error) toast.error(error);
    if (success || error) {
      window.history.replaceState(null, "", "/integrations");
    }
  }, [searchParams]);

  async function disconnect(platform: string, label: string) {
    if (!window.confirm(`Disconnect ${label}? Scheduled posts to ${label} will fail.`)) return;
    setBusy(platform);
    try {
      const res = await fetch(`/api/integrations/${platform.toLowerCase()}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`${label} disconnected.`);
      router.refresh();
    } catch {
      toast.error(`Failed to disconnect ${label}. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {cards.map((card, index) => {
        const status = STATUS_STYLES[card.status];
        return (
          <div
            key={card.platform}
            style={{ animationDelay: `${index * 50}ms` }}
            className="card-lift animate-fade-in-up flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
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
                    Connected as {card.platform === "X" ? `@${card.username}` : card.username}
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
                <div className="flex gap-2">
                  {card.status !== "connected" && (
                    <a
                      href={`/api/auth/${card.platform.toLowerCase()}/authorize`}
                      className="h-12 rounded-md bg-primary px-3 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Reconnect
                    </a>
                  )}
                  <button
                    onClick={() => disconnect(card.platform, card.label)}
                    disabled={busy === card.platform}
                    className="h-12 rounded-md border border-border px-3 text-sm hover:bg-secondary disabled:opacity-50"
                  >
                    {busy === card.platform ? "Disconnecting…" : `Disconnect ${card.label}`}
                  </button>
                </div>
              ) : card.available && !card.comingSoon ? (
                <a
                  href={`/api/auth/${card.platform.toLowerCase()}/authorize`}
                  className="flex h-12 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
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
