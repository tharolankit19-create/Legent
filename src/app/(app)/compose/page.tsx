import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ComposeForm } from "./compose-form";

export default async function ComposePage() {
  const user = await requireAuth();

  const integrations = await db.integration.findMany({
    where: { orgId: user.organization!.id, isActive: true },
    select: { platform: true, username: true },
  });

  const connected = integrations
    .filter((i) => i.platform === "X" || i.platform === "LINKEDIN")
    .map((i) => ({ platform: i.platform as "X" | "LINKEDIN", username: i.username }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Compose</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Write once, get AI feedback, schedule everywhere.
      </p>
      <ComposeForm connected={connected} />
    </div>
  );
}
