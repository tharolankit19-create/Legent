"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const X_LIMIT = 280;

type ConnectedPlatform = { platform: "X" | "LINKEDIN"; username: string | null };

type Feedback = {
  score: number;
  issues: string[];
  suggestions: string[];
  rewrites: { X: string; LINKEDIN: string };
};

// Fixed-offset zones keep scheduling predictable; DST zones intentionally
// deferred (IST — the default audience — has no DST).
const TIMEZONES = [
  { id: "IST", label: "IST (UTC+5:30)", offsetMinutes: 330 },
  { id: "UTC", label: "UTC", offsetMinutes: 0 },
  { id: "LOCAL", label: "Browser local", offsetMinutes: null },
] as const;

function scoreColor(score: number): string {
  if (score <= 3) return "text-red-500";
  if (score <= 6) return "text-yellow-500";
  return "text-green-500";
}

/** Convert a datetime-local string interpreted in the chosen zone to a UTC ISO string. */
function toUtcIso(local: string, offsetMinutes: number | null): string {
  if (offsetMinutes === null) {
    return new Date(local).toISOString();
  }
  const asUtc = new Date(`${local}:00.000Z`).getTime();
  return new Date(asUtc - offsetMinutes * 60 * 1000).toISOString();
}

export function ComposeForm({ connected }: { connected: ConnectedPlatform[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Set<"X" | "LINKEDIN">>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [rewriteTab, setRewriteTab] = useState<"X" | "LINKEDIN">("X");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [timezone, setTimezone] = useState<(typeof TIMEZONES)[number]["id"]>("IST");

  const charCount = content.length;
  const overXLimit = charCount > X_LIMIT;
  const canRequestFeedback = charCount > 0 && charCount <= MAX_CHARS && !loadingFeedback;
  const feedbackDone = feedback !== null || feedbackDismissed;
  const canSchedule =
    feedbackDone && charCount > 0 && charCount <= MAX_CHARS && selected.size > 0 && !scheduling;

  const connectedPlatforms = useMemo(() => new Set(connected.map((c) => c.platform)), [connected]);

  function togglePlatform(platform: "X" | "LINKEDIN") {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  async function getFeedback() {
    setLoadingFeedback(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platforms: [...selected] }),
      });
      const data = (await res.json()) as Feedback & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "AI feedback failed. Try again.");
        return;
      }
      setFeedback(data);
      setFeedbackDismissed(false);
      toast.success("Feedback fetched!");
    } catch {
      toast.error("AI feedback failed. Try again.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function schedule() {
    if (!scheduledLocal) {
      toast.error("Pick a date and time first.");
      return;
    }
    const zone = TIMEZONES.find((t) => t.id === timezone)!;
    const scheduledAt = toUtcIso(scheduledLocal, zone.offsetMinutes);
    if (new Date(scheduledAt).getTime() < Date.now() + 5 * 60 * 1000) {
      toast.error("Schedule at least 5 minutes in the future.");
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch("/api/posts/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platforms: [...selected],
          scheduledAt,
          aiScore: feedback?.score,
          aiSuggestions: feedback
            ? { issues: feedback.issues, suggestions: feedback.suggestions }
            : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Scheduling failed. Try again.");
        return;
      }
      toast.success("Post scheduled!");
      setContent("");
      setFeedback(null);
      setFeedbackDismissed(false);
      setScheduledLocal("");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Scheduling failed. Try again.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Editor column */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="What did you ship today?"
            rows={8}
            className="w-full resize-y rounded-md border border-input bg-secondary p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span
              className={cn(
                "tabular-nums",
                charCount > MAX_CHARS - 100 ? "text-yellow-500" : "text-muted-foreground",
              )}
            >
              {charCount}/{MAX_CHARS}
              {overXLimit && selected.has("X") && (
                <span className="ml-2 text-red-500">X truncates past {X_LIMIT}</span>
              )}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
            {(["X", "LINKEDIN"] as const).map((platform) => {
              const isConnected = connectedPlatforms.has(platform);
              const account = connected.find((c) => c.platform === platform);
              return (
                <label
                  key={platform}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                    !isConnected && "cursor-not-allowed opacity-50",
                    selected.has(platform) ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={!isConnected}
                    checked={selected.has(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="accent-[hsl(var(--primary))]"
                  />
                  Post to {platform === "X" ? "X" : "LinkedIn"}
                  {account?.username && (
                    <span className="text-xs text-muted-foreground">({account.username})</span>
                  )}
                </label>
              );
            })}
            {connected.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No platforms connected yet —{" "}
                <Link href="/integrations" className="text-primary hover:underline">
                  connect X or LinkedIn
                </Link>{" "}
                to publish.
              </p>
            )}
          </div>
        </div>

        {/* Platform previews */}
        {content && selected.size > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {selected.has("X") && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">X preview</p>
                <p className="whitespace-pre-wrap text-sm">
                  {content.slice(0, X_LIMIT)}
                  {overXLimit && <span className="text-red-500">…</span>}
                </p>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  {Math.min(charCount, X_LIMIT)}/{X_LIMIT}
                </p>
              </div>
            )}
            {selected.has("LINKEDIN") && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">LinkedIn preview</p>
                <p className="whitespace-pre-wrap text-sm">{content}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={getFeedback}
            disabled={!canRequestFeedback}
            className="flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loadingFeedback ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loadingFeedback ? "Analyzing…" : "Get AI Feedback"}
          </button>
          {!feedbackDone && content && (
            <button
              onClick={() => setFeedbackDismissed(true)}
              className="h-12 rounded-md border border-border px-5 text-sm hover:bg-secondary"
            >
              Skip feedback
            </button>
          )}
        </div>

        {/* Schedule section — unlocked after feedback is fetched or skipped */}
        {feedbackDone && (
          <div className="animate-fade-in-up rounded-xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" /> Schedule
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date &amp; time
                <input
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  className="h-12 rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Timezone
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as typeof timezone)}
                  className="h-12 rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.id} value={tz.id}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={schedule}
                disabled={!canSchedule}
                className="h-12 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {scheduling ? "Scheduling…" : "Schedule Post"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI feedback panel */}
      <aside className="space-y-4">
        {loadingFeedback && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="h-16 w-16 animate-shimmer rounded-lg bg-secondary" />
            <div className="mt-4 h-3 w-3/4 animate-shimmer rounded bg-secondary" />
            <div className="mt-2 h-3 w-1/2 animate-shimmer rounded bg-secondary" />
          </div>
        )}

        {feedback && (
          <div className="animate-fade-in-up rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline gap-3">
              <span className={cn("text-5xl font-bold tabular-nums", scoreColor(feedback.score))}>
                {feedback.score}
              </span>
              <span className="text-sm text-muted-foreground">/ 10 engagement score</span>
            </div>

            {feedback.issues.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Issues
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {feedback.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.suggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggestions
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {feedback.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rewrites
              </p>
              <div className="mt-2 flex gap-1 rounded-md bg-secondary p-1">
                {(["X", "LINKEDIN"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRewriteTab(tab)}
                    className={cn(
                      "flex-1 rounded px-3 py-1.5 text-xs font-medium",
                      rewriteTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {tab === "X" ? "X" : "LinkedIn"}
                  </button>
                ))}
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-secondary/50 p-3 text-sm">
                {feedback.rewrites[rewriteTab]}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setContent(feedback.rewrites[rewriteTab].slice(0, MAX_CHARS));
                    toast.success("Rewrite applied.");
                  }}
                  className="h-10 flex-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Use this rewrite
                </button>
                <button
                  onClick={() => setFeedbackDismissed(true)}
                  className="h-10 rounded-md border border-border px-3 text-xs hover:bg-secondary"
                >
                  Ignore feedback
                </button>
              </div>
            </div>
          </div>
        )}

        {!feedback && !loadingFeedback && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
            AI feedback appears here before you schedule.
          </div>
        )}
      </aside>
    </div>
  );
}
