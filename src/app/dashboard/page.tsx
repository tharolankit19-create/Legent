import { requireAuth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-semibold text-primary">Legent</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.organization?.name}</span>
          <LogoutButton />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Welcome, {user.email}</h1>
        <p className="mt-1 text-muted-foreground">
          Organization: {user.organization?.name ?? "—"}
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Connected platforms, compose, and scheduling land in Phase 1.2+.
          </p>
        </div>
      </main>
    </div>
  );
}
