import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 className="h-14 w-14 text-green-500" />
      <h1 className="mt-4 text-2xl font-semibold">Payment successful!</h1>
      <span className="mt-3 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
        Early Access · 40% off Pro for life
      </span>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        Welcome aboard. Your account upgrades automatically as soon as the payment webhook lands
        (usually within seconds). You&apos;ve unlocked X + LinkedIn publishing, AI feedback, and
        scheduling.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
