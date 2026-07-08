import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { openrouter } from "@/lib/openrouter";

const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60 * 60;

const bodySchema = z.object({
  content: z.string().min(1, "Write something first").max(2000),
  platforms: z.array(z.enum(["X", "LINKEDIN"])).min(1).optional(),
});

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

  const limit = await rateLimit(`ratelimit:ai:${user.id}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. You get 10 AI reviews per hour — try again soon." },
      { status: 429 },
    );
  }

  try {
    const feedback = await openrouter.composeFeedback(parsed.data.content);
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("[ai/optimize] failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "AI feedback is unavailable right now. Try again in a minute." },
      { status: 500 },
    );
  }
}
