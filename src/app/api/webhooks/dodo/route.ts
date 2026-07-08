import { NextResponse } from "next/server";
import { PlanStatus, PlanType } from "@prisma/client";
import { db } from "@/lib/db";
import { parseDodoEvent, verifyDodoSignature } from "@/lib/dodo";
import { earlyAccessWelcomeEmail, sendEmail } from "@/lib/resend";

const COMPLETED_EVENTS = new Set(["payment.completed", "payment.succeeded"]);

/**
 * Dodo payment webhook. Public route (middleware allows /api/webhooks/*) —
 * authenticity comes exclusively from the HMAC signature check.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyDodoSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = parseDodoEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  if (!COMPLETED_EVENTS.has(event.type)) {
    // Acknowledge everything else so Dodo stops retrying.
    return NextResponse.json({ received: true });
  }

  const userId = event.data?.metadata?.userId;
  const paymentId = event.data?.payment_id ?? null;
  if (!userId) {
    console.error("[webhooks/dodo] payment completed without userId metadata");
    return NextResponse.json({ received: true });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!user?.organization) {
    console.error("[webhooks/dodo] user/org not found for payment");
    return NextResponse.json({ received: true });
  }

  // Idempotency: Dodo retries webhooks; a known payment id means we're done.
  if (paymentId) {
    const existing = await db.subscription.findUnique({ where: { dodoPaymentId: paymentId } });
    if (existing) {
      return NextResponse.json({ received: true });
    }
  }

  await db.$transaction([
    db.organization.update({
      where: { id: user.organization.id },
      data: { planType: PlanType.EARLY_ACCESS, planStatus: PlanStatus.ACTIVE },
    }),
    db.subscription.upsert({
      where: { orgId: user.organization.id },
      create: {
        orgId: user.organization.id,
        planType: PlanType.EARLY_ACCESS,
        status: PlanStatus.ACTIVE,
        dodoPaymentId: paymentId,
        paidAt: new Date(),
      },
      update: {
        planType: PlanType.EARLY_ACCESS,
        status: PlanStatus.ACTIVE,
        dodoPaymentId: paymentId,
        paidAt: new Date(),
      },
    }),
  ]);

  await db.waitlistEntry
    .updateMany({
      where: { email: user.email },
      data: { earlyAccessPaid: true, dodoPaymentId: paymentId ?? undefined },
    })
    .catch(() => undefined);

  const email = earlyAccessWelcomeEmail(user.name);
  await sendEmail({ to: user.email, subject: email.subject, html: email.html });

  return NextResponse.json({ received: true });
}
