import { NextResponse } from "next/server";
import { z } from "zod";
import { publishScheduledPost } from "@/lib/publish-post";
import { verifyPublishAuthToken } from "@/lib/qstash";

const bodySchema = z.object({ postId: z.string().min(1) });

/**
 * Called by QStash at the scheduled time. Authenticated by the forwarded
 * shared-secret header set when the job was published — NOT by user session
 * (QStash has none). Middleware must keep this path public.
 */
export async function POST(request: Request) {
  if (!verifyPublishAuthToken(request.headers.get("x-legent-token"))) {
    return NextResponse.json({ error: "Invalid publish token" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  const result = await publishScheduledPost(parsed.data.postId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
