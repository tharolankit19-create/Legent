"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type IntegrationRow = { platform: string; username: string | null; isActive: boolean };

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-sm">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function SettingsForm({
  email,
  orgName: initialOrgName,
  notifyOnPublish: initialNotify,
  weeklyDigest: initialDigest,
  integrations,
}: {
  email: string;
  orgName: string;
  notifyOnPublish: boolean;
  weeklyDigest: boolean;
  integrations: IntegrationRow[];
}) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(initialOrgName);
  const [notifyOnPublish, setNotifyOnPublish] = useState(initialNotify);
  const [weeklyDigest, setWeeklyDigest] = useState(initialDigest);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);

  async function save(partial: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved.");
      router.refresh();
    } catch {
      toast.error("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(platform: string) {
    if (!window.confirm(`Disconnect ${platform}?`)) return;
    setBusyPlatform(platform);
    try {
      const res = await fetch(`/api/integrations/${platform.toLowerCase()}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`${platform} disconnected.`);
      router.refresh();
    } catch {
      toast.error("Disconnect failed. Try again.");
    } finally {
      setBusyPlatform(null);
    }
  }

  async function deleteAccount() {
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteText }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Deletion failed.");
        return;
      }
      await signOut({ callbackUrl: "/auth/signup" });
    } catch {
      toast.error("Deletion failed. Try again.");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Profile */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Profile</h2>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              value={email}
              readOnly
              className="mt-1 h-12 w-full cursor-not-allowed rounded-md border border-input bg-secondary/50 px-3 text-sm text-muted-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Organization name</span>
            <div className="mt-1 flex gap-2">
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="h-12 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                onClick={() => save({ name: orgName })}
                disabled={saving || orgName.trim().length === 0 || orgName === initialOrgName}
                className="h-12 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </label>
        </div>
      </section>

      {/* Integrations */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Integrations</h2>
        {integrations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            None connected —{" "}
            <Link href="/integrations" className="text-primary hover:underline">
              connect a platform
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {integrations.map((integration) => (
              <li
                key={integration.platform}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <span>
                  {integration.platform === "LINKEDIN" ? "LinkedIn" : integration.platform}
                  {integration.username && (
                    <span className="ml-2 text-muted-foreground">{integration.username}</span>
                  )}
                  {!integration.isActive && (
                    <span className="ml-2 text-yellow-500">needs reconnect</span>
                  )}
                </span>
                <span className="flex gap-3 text-xs">
                  <Link href="/integrations" className="text-primary hover:underline">
                    Edit
                  </Link>
                  <button
                    onClick={() => disconnect(integration.platform)}
                    disabled={busyPlatform === integration.platform}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Notifications</h2>
        <div className="mt-3 space-y-1">
          <Toggle
            checked={notifyOnPublish}
            onChange={(next) => {
              setNotifyOnPublish(next);
              void save({ notifyOnPublish: next });
            }}
            label="Email when a post is published"
          />
          <Toggle
            checked={weeklyDigest}
            onChange={(next) => {
              setWeeklyDigest(next);
              void save({ weeklyDigest: next });
            }}
            label="Weekly digest"
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/40 bg-card p-5">
        <h2 className="font-medium text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deletes your account, organization, integrations, and posts. Irreversible.
        </p>
        <button
          onClick={() => setConfirmingDelete(true)}
          className="mt-3 h-12 rounded-md border border-destructive/60 px-4 text-sm text-destructive hover:bg-destructive/10"
        >
          Delete account
        </button>
      </section>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmingDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium">Delete account?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This cannot be undone. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="mt-3 h-12 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="h-10 rounded-md border border-border px-4 text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteText !== "DELETE"}
                className="h-10 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
