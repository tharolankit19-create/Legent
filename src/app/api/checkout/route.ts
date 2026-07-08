import { NextResponse } from "next/server";
import { PlanType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { createDodoCheckout } from "@/lib/dodo";

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.organization.planType === PlanType.EARLY_ACCESS) {
    return NextResponse.json({ error: "You already have Early Access." }, { status: 400 });
  }
  if (user.organization.planType === PlanType.PRO) {
    return NextResponse.json({ error: "You're already on Pro." }, { status: 400 });
  }

  try {
    const { checkoutUrl } = await createDodoCheckout({
      amountCents: 2900,
      currency: "INR",
      description: "Legent Early Access — lifetime 40% off Pro",
      customerEmail: user.email,
      metadata: { userId: user.id, orgId: user.organization.id },
      successUrl: `${appUrl()}/success`,
      cancelUrl: `${appUrl()}/cancel`,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("[checkout] failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not start checkout. Try again in a moment." },
      { status: 502 },
    );
  }
}
