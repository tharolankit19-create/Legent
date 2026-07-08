import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { joinWaitlist } from "@/lib/waitlist.functions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Check, Copy } from "lucide-react";
import confetti from "canvas-confetti";

export function WaitlistForm() {
  const submit = useServerFn(joinWaitlist);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await submit({ data: { email, source: "waitlist" } });
      const c = Math.random().toString(36).slice(2, 10);
      setCode(c);
      setDone(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#7C3AED", "#06B6D4", "#A855F7"],
      });
      toast.success("You're on the list!");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto w-full max-w-lg rounded-2xl bg-surface p-8 shadow-purple"
    >
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 blur-xl opacity-40" />
      <div className="rounded-2xl">
        {!done ? (
          <>
            <h3 className="font-display text-2xl font-bold">Get early access.</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Join 42+ founders on the waitlist. Free forever.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="h-12 w-full rounded-lg border border-white/10 bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-purple transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join Waitlist →</>}
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              🔒 No spam. Cancel anytime.
            </p>
          </>
        ) : (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500/20"
            >
              <Check className="h-7 w-7 text-green-400" />
            </motion.div>
            <h3 className="mt-4 font-display text-2xl font-bold">You're in! 🎉</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Check your email — and share your link to move up.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/10 bg-background p-2 pl-4 text-sm">
              <span className="flex-1 truncate text-muted-foreground">legent.io/?ref={code}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://legent.io/?ref=${code}`);
                  toast.success("Copied!");
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
