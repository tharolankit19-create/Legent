import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { analytics: { orderBy: { fetchedAt: "desc" } } },
  });
  if (!post || post.orgId !== user.organization.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Latest snapshot per platform.
  const latest: Record<string, (typeof post.analytics)[number]> = {};
  for (const row of post.analytics) {
    if (!latest[row.platform]) latest[row.platform] = row;
  }

  return NextResponse.json({
    post: {
      id: post.id,
      content: post.content,
      platforms: post.platforms,
      status: post.status,
      publishedAt: post.publishedAt,
      platformPostIds: post.platformPostIds,
    },
    analytics: latest,
  });
}
