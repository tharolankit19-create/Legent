import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { qstashPublishJSON } from "@/lib/qstash";

const MIN_LEAD_MS = 5 * 60 * 1000;

const bodySchema = z.object({
  content: z.string().min(1).max(2000),
  platforms: z.array(z.enum(["X", "LINKEDIN"])).min(1),
  scheduledAt: z.string().datetime({ offset: true }),
  aiScore: z.number().int().min(1).max(10).optional(),
  aiSuggestions: z
    .object({
      issues: z.array(z.string()),
      suggestions: z.array(z.string()),
    })
    .optional(),
});

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt.getTime() < Date.now() + MIN_LEAD_MS) {
    return NextResponse.json(
      { error: "Schedule at least 5 minutes in the future." },
      { status: 400 },
    );
  }

  // Every requested platform must have an active connected integration.
  const integrations = await db.integration.findMany({
    where: {
      orgId: user.organization.id,
      platform: { in: parsed.data.platforms as Platform[] },
      isActive: true,
    },
    select: { platform: true },
  });
  const connected = new Set(integrations.map((i) => i.platform));
  const missing = parsed.data.platforms.filter((p) => !connected.has(p as Platform));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Connect ${missing.join(" and ")} before scheduling to it.` },
      { status: 400 },
    );
  }

  const post = await db.post.create({
    data: {
      orgId: user.organization.id,
      content: parsed.data.content,
      platforms: parsed.data.platforms as Platform[],
      scheduledAt,
      status: "SCHEDULED",
      aiScore: parsed.data.aiScore,
      aiSuggestions: parsed.data.aiSuggestions,
    },
  });

  try {
    const { messageId } = await qstashPublishJSON({
      url: `${appUrl()}/api/posts/publish`,
      body: { postId: post.id },
      notBefore: scheduledAt,
    });
    await db.post.update({ where: { id: post.id }, data: { qstashMessageId: messageId } });
  } catch (error) {
    // Roll back so a post never sits SCHEDULED with no delivery job.
    await db.post.delete({ where: { id: post.id } });
    console.error("[posts/schedule] QStash enqueue failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not queue the post for delivery. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      id: post.id,
      status: "SCHEDULED",
      scheduledAt: scheduledAt.toISOString(),
      platforms: parsed.data.platforms,
    },
    { status: 201 },
  );
}
