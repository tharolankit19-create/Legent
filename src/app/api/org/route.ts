import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  notifyOnPublish: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await db.organization.update({
    where: { id: user.organization.id },
    data: parsed.data,
  });

  return NextResponse.json({
    name: updated.name,
    notifyOnPublish: updated.notifyOnPublish,
    weeklyDigest: updated.weeklyDigest,
  });
}
