import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const name = parsed.data.name?.trim() || null;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const orgName = name ? `${name}'s Organization` : "My Organization";

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      organization: {
        create: { name: orgName },
      },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
