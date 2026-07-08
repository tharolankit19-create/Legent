import { PostStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publishToPlatform, type PublishOutcome } from "@/lib/publisher";
import { sendEmail } from "@/lib/resend";

export function getPostStatusAfterPublish(outcomes: PublishOutcome[]): PostStatus {
  const succeeded = outcomes.filter((o) => o.ok).length;
  if (succeeded === outcomes.length) return PostStatus.PUBLISHED;
  if (succeeded > 0) return PostStatus.PUBLISHED_PARTIAL;
  return PostStatus.FAILED;
}

type PublishResult =
  | { error: string; status: number }
  | { postId: string; status: PostStatus; outcomes: PublishOutcome[] };

/** Core publish flow, shared by the QStash webhook route. */
export async function publishScheduledPost(postId: string): Promise<PublishResult> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { organization: { include: { integrations: true, user: true } } },
  });

  if (!post) {
    return { error: "Post not found", status: 404 };
  }
  // Idempotency: QStash retries must not double-publish.
  if (post.status !== PostStatus.SCHEDULED) {
    return { postId: post.id, status: post.status, outcomes: [] };
  }

  const integrationsByPlatform = new Map(
    post.organization.integrations.map((i) => [i.platform, i]),
  );

  const outcomes: PublishOutcome[] = [];
  for (const platform of post.platforms) {
    const integration = integrationsByPlatform.get(platform);
    if (!integration) {
      outcomes.push({ ok: false, platform, reason: `${platform} is not connected.` });
      continue;
    }
    outcomes.push(await publishToPlatform(platform, integration, post.content));
  }

  const status = getPostStatusAfterPublish(outcomes);
  const platformPostIds: Record<string, string> = {};
  const failures: string[] = [];
  for (const outcome of outcomes) {
    if (outcome.ok) platformPostIds[outcome.platform] = outcome.platformPostId;
    else failures.push(`${outcome.platform}: ${outcome.reason}`);
  }

  await db.post.update({
    where: { id: post.id },
    data: {
      status,
      publishedAt: status === PostStatus.FAILED ? null : new Date(),
      platformPostIds: Object.keys(platformPostIds).length > 0 ? platformPostIds : undefined,
      failureReason: failures.length > 0 ? failures.join(" | ") : null,
    },
  });

  if (status !== PostStatus.FAILED && post.organization.notifyOnPublish) {
    const preview = post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content;
    await sendEmail({
      to: post.organization.user.email,
      subject: "Your post just went live 🚀",
      html: `<p>Published to ${Object.keys(platformPostIds).join(", ")}:</p><blockquote>${preview}</blockquote>`,
    });
  }

  return { postId: post.id, status, outcomes };
}
