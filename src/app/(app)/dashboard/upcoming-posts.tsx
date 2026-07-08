"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type UpcomingPost = {
  id: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
};

export function UpcomingPosts({ posts }: { posts: UpcomingPost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UpcomingPost | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(post: UpcomingPost) {
    if (!window.confirm("Cancel this scheduled post? The delivery job is removed too.")) return;
    setBusy(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Post deleted.");
      router.refresh();
    } catch {
      toast.error("Delete failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(editing.id);
    try {
      const res = await fetch(`/api/posts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Edit failed.");
        return;
      }
      toast.success("Post updated.");
      setEditing(null);
      router.refresh();
    } catch {
      toast.error("Edit failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (posts.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Nothing scheduled yet.</p>;
  }

  return (
    <>
      <ul className="mt-3 space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-md border border-border p-3">
            <p className="truncate text-sm">{post.content.slice(0, 50)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{post.platforms.map((p) => (p === "LINKEDIN" ? "LinkedIn" : p)).join(" · ")}</span>
              <span>{new Date(post.scheduledAt).toLocaleString()}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">scheduled</span>
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    setEditing(post);
                    setDraft(post.content);
                  }}
                  className="hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(post)}
                  disabled={busy === post.id}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium">Edit post</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Content only — schedule time stays {new Date(editing.scheduledAt).toLocaleString()}.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              rows={5}
              className="mt-3 w-full rounded-md border border-input bg-secondary p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="h-10 rounded-md border border-border px-4 text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={busy === editing.id || draft.trim().length === 0}
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
