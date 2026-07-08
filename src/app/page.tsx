import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="text-3xl font-semibold text-primary">Legent</span>
      <p className="mt-3 max-w-md text-muted-foreground">
        Your social media co-founder. Write, optimize, schedule, and publish across platforms — with
        an AI agent that drafts in your voice.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/auth/login"
          className="rounded-md border border-border px-6 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get started
        </Link>
      </div>

      <a
        href="https://legent.getkryxai.com"
        className="mt-10 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        ← Back to legent.getkryxai.com
      </a>
    </main>
  );
}
