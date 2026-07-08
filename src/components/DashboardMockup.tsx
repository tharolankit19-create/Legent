import { Sparkles, TrendingUp, Heart, MessageCircle, Repeat2 } from "lucide-react";

/**
 * 3D floating dashboard mockup. Pure CSS perspective + glass cards.
 * No external 3D libs (keeps bundle small, works on edge SSR).
 */
export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]" style={{ perspective: "1800px" }}>
      {/* Glow */}
      <div className="absolute -inset-10 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,_oklch(0.82_0.16_210_/_0.35),_transparent_60%)] blur-2xl" />

      {/* Main dashboard card */}
      <div
        className="glass shadow-elev relative rounded-2xl p-5 animate-float-slow"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 pb-4">
          <div className="h-3 w-3 rounded-full bg-red-400/70" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <div className="h-3 w-3 rounded-full bg-green-400/70" />
          <div className="ml-3 text-xs text-muted-foreground">app.legent.io / compose</div>
        </div>

        {/* Composer */}
        <div className="glass rounded-xl p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-5 items-center rounded-md bg-primary/15 px-2 font-medium text-primary">
              X
            </span>
            <span className="inline-flex h-5 items-center rounded-md bg-accent/15 px-2 font-medium text-accent">
              LinkedIn
            </span>
            <span className="inline-flex h-5 items-center rounded-md bg-white/10 px-2 font-medium">
              Threads
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            I managed 4 social platforms manually for 6 months while building my SaaS. <br />
            That's 360 hours. Gone.
          </p>

          {/* AI suggestion bubble */}
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary animate-pulse-glow" />
            <div className="text-xs">
              <div className="font-semibold text-primary">AI suggestion · +34% predicted reach</div>
              <div className="mt-1 text-muted-foreground">
                Add a hook in line 1. LinkedIn: lead with the cost (360 hrs). X: keep as-is.
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: Heart, label: "Likes", val: "2,431", trend: "+18%" },
            { icon: Repeat2, label: "Reposts", val: "486", trend: "+42%" },
            { icon: MessageCircle, label: "Replies", val: "127", trend: "+9%" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                <span className="text-primary">{s.trend}</span>
              </div>
              <div className="mt-1 text-lg font-semibold">{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chip — analytics */}
      <div
        className="glass shadow-elev absolute -left-8 top-1/3 hidden rounded-xl p-3 md:block"
        style={{ transform: "translateZ(80px) rotate(-6deg)" }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/20 p-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">This week</div>
            <div className="text-sm font-semibold">+1,284 followers</div>
          </div>
        </div>
      </div>

      {/* Floating chip — schedule */}
      <div
        className="glass shadow-elev absolute -right-6 bottom-10 hidden rounded-xl p-3 md:block"
        style={{ transform: "translateZ(60px) rotate(5deg)" }}
      >
        <div className="text-xs text-muted-foreground">Next post</div>
        <div className="mt-1 text-sm font-semibold">Tomorrow · 8:00 AM</div>
        <div className="mt-0.5 text-xs text-accent">3 platforms queued</div>
      </div>
    </div>
  );
}
