import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { IntegrationsList, type PlatformCard } from "./integrations-list";

const REFRESH_WINDOW_MS = 60 * 60 * 1000;
const LINKEDIN_RECONNECT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function statusFor(
  isActive: boolean,
  expiresAt: Date | null,
  staleWindowMs: number,
): PlatformCard["status"] {
  if (!isActive) return "reconnect";
  if (expiresAt && expiresAt.getTime() <= Date.now() + staleWindowMs) return "needs_refresh";
  return "connected";
}

export default async function IntegrationsPage() {
  const user = await requireAuth();

  const integrations = await db.integration.findMany({
    where: { orgId: user.organization!.id },
  });

  const byPlatform = new Map(integrations.map((i) => [i.platform, i]));

  const x = byPlatform.get("X");
  const linkedin = byPlatform.get("LINKEDIN");

  const cards: PlatformCard[] = [
    {
      platform: "X",
      label: "X",
      available: true,
      connected: Boolean(x),
      username: x?.username ?? null,
      avatar: x?.avatar ?? null,
      updatedAt: x?.updatedAt.toISOString() ?? null,
      status: x ? statusFor(x.isActive, x.expiresAt, REFRESH_WINDOW_MS) : "connected",
    },
    {
      platform: "LINKEDIN",
      label: "LinkedIn",
      available: true,
      connected: Boolean(linkedin),
      username: linkedin?.username ?? null,
      avatar: linkedin?.avatar ?? null,
      updatedAt: linkedin?.updatedAt.toISOString() ?? null,
      status: linkedin
        ? statusFor(linkedin.isActive, linkedin.expiresAt, LINKEDIN_RECONNECT_WINDOW_MS)
        : "connected",
    },
    { platform: "INSTAGRAM", label: "Instagram", available: false, connected: false, username: null, avatar: null, updatedAt: null, status: "connected", comingSoon: true },
    { platform: "TIKTOK", label: "TikTok", available: false, connected: false, username: null, avatar: null, updatedAt: null, status: "connected", comingSoon: true },
    { platform: "THREADS", label: "Threads", available: false, connected: false, username: null, avatar: null, updatedAt: null, status: "connected", comingSoon: true },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect the platforms you want Legent to publish to.
      </p>

      <IntegrationsList cards={cards} />
    </div>
  );
}
