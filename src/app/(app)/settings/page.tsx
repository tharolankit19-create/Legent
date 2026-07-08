import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireAuth();
  const org = user.organization!;

  const integrations = await db.integration.findMany({
    where: { orgId: org.id },
    select: { platform: true, username: true, isActive: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm
        email={user.email}
        orgName={org.name}
        notifyOnPublish={org.notifyOnPublish}
        weeklyDigest={org.weeklyDigest}
        integrations={integrations.map((i) => ({
          platform: i.platform,
          username: i.username,
          isActive: i.isActive,
        }))}
      />
    </div>
  );
}
