import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Payment cancelled</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        No worries — nothing was charged and you&apos;re still on the waitlist. Early Access will be
        here when you&apos;re ready.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-md border border-border px-6 py-3 text-sm hover:bg-secondary"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
