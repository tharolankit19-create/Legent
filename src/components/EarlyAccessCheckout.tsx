import { Zap } from "lucide-react";

export const DODO_CHECKOUT_URL =
  "https://checkout.dodopayments.com/buy/pdt_0NhabnGws4BNtu9GcUmhf?quantity=1";

export function EarlyAccessCheckout() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-background/40 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-sm text-muted-foreground line-through">$99</span>
            </div>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            25% OFF FOREVER
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Lifetime 25% off Pro · 30-day refund · Powered by Dodo Payments
        </p>
      </div>
      <a
        href={DODO_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shadow-purple inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <Zap className="h-4 w-4" />
        Claim Early Access — $29
      </a>
      <p className="text-center text-xs text-muted-foreground">
        Secure checkout · Instant access after payment
      </p>
    </div>
  );
}
