import { useState } from "react";
import { X, Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHECKOUT_URL =
  "https://checkout.dodopayments.com/buy/pdt_0NhabnGws4BNtu9GcUmhf?quantity=1";

interface Props {
  orgId: string;
  onClose: () => void;
}

export function TrialModal({ orgId, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const startTrial = async () => {
    setLoading(true);
    const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("organizations")
      .update({
        trial_started: true,
        trial_ends_at: trialEnd,
        plan_type: "trial",
        plan_status: "trialing",
      })
      .eq("id", orgId);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("3-day trial started. Complete payment to keep access after trial.");
    window.open(CHECKOUT_URL, "_blank", "noopener");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 shadow-purple">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Welcome to Legent
          </span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold">
          Start your 3-day free trial
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Full Pro access for 3 days. After that, keep going for{" "}
          <span className="font-semibold text-foreground">$29/month</span> — unlimited
          posts, X + LinkedIn (more platforms rolling out), and the AI Agent that
          drafts your week.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {[
            "Unlimited posts across connected platforms",
            "AI Agent drafts 7 posts per week from your top performers",
            "Post to X and LinkedIn today · Instagram, Threads soon",
            "Cancel anytime during trial — no charge",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-primary" /> {t}
            </li>
          ))}
        </ul>
        <button
          onClick={startTrial}
          disabled={loading}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Start 3-day free trial →"
          )}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Payment secured by Dodo Payments. You can cancel anytime.
        </p>
      </div>
    </div>
  );
}
