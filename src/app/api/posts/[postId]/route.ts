import { NextResponse } from "next/server";
import { z } from "zod";
import { PostStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { qstashDeleteMessage } from "@/lib/qstash";

const patchSchema = z.object({
  content: z.string().min(1).max(2000),
});

async function loadOwnedPost(postId: string) {
  const user = await getCurrentUser();
  if (!user?.organization) return { error: 401 as const };
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.orgId !== user.organization.id) return { error: 404 as const };
  return { post };
}

/** Edit content of a still-scheduled post (time and platforms unchanged). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const result = await loadOwnedPost(postId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === 401 ? "Unauthorized" : "Post not found" },
      { status: result.error },
    );
  }

  if (result.post.status !== PostStatus.SCHEDULED) {
    return NextResponse.json({ error: "Only scheduled posts can be edited." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  const updated = await db.post.update({
    where: { id: result.post.id },
    data: { content: parsed.data.content },
  });
  return NextResponse.json({ id: updated.id, content: updated.content });
}

/** Cancel a scheduled post: remove the QStash job, then the record. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const result = await loadOwnedPost(postId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === 401 ? "Unauthorized" : "Post not found" },
      { status: result.error },
    );
  }

  if (result.post.qstashMessageId) {
    await qstashDeleteMessage(result.post.qstashMessageId).catch((error) => {
      console.error("[posts/delete] QStash cancel failed:", error instanceof Error ? error.message : "unknown");
    });
  }

  await db.post.delete({ where: { id: result.post.id } });
  return NextResponse.json({ ok: true });
}
