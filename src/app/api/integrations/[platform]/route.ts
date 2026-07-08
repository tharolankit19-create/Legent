import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const SUPPORTED = new Set<Platform>([Platform.X, Platform.LINKEDIN]);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform: raw } = await params;
  const platform = raw.toUpperCase() as Platform;
  if (!SUPPORTED.has(platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  await db.integration.deleteMany({
    where: { orgId: user.organization.id, platform },
  });

  return NextResponse.json({ ok: true });
}
