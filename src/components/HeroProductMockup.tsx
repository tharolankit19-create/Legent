import { LayoutDashboard, Calendar, BarChart3, Sparkles, Settings, Check } from "lucide-react";
import { SiX, SiInstagram, SiThreads, SiTiktok } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

const nav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Calendar, label: "Schedule", active: true },
  { icon: BarChart3, label: "Analytics" },
  { icon: Sparkles, label: "AI Optimizer" },
  { icon: Settings, label: "Settings" },
];

const platforms = [
  { icon: SiX, name: "X" },
  { icon: FaLinkedinIn, name: "LinkedIn" },
  { icon: SiInstagram, name: "Instagram" },
  { icon: SiThreads, name: "Threads" },
  { icon: SiTiktok, name: "TikTok" },
];

export function HeroProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12] shadow-2xl shadow-primary/20 sm:rounded-3xl">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#0a0a0f] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <span className="h-3 w-3 rounded-full bg-green-400/80" />
          <div className="ml-4 hidden text-xs text-white/40 sm:block">
            app.legent.io / compose
          </div>
        </div>

        <div className="flex min-h-[360px] sm:min-h-[440px]">
          {/* Sidebar */}
          <aside className="flex w-[38%] flex-col gap-1 border-r border-white/5 bg-[#0a0a0f] p-3 sm:w-[22%] sm:p-4">
            <div className="mb-4 px-2">
              <span className="font-display text-lg font-bold text-gradient">Legent</span>
            </div>
            {nav.map((n) => (
              <div
                key={n.label}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] sm:text-xs ${
                  n.active
                    ? "bg-primary/15 text-primary"
                    : "text-white/50"
                }`}
              >
                <n.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{n.label}</span>
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="relative flex-1 bg-[#f6f6f9] p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">New Post</h3>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground sm:text-xs">
                Publish to all →
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
              <p className="text-xs leading-relaxed text-neutral-800 sm:text-sm">
                Just shipped the AI optimizer in Legent. It tells you what to fix before you
                publish. Saves founders 6 hours/month on social 🚀
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {platforms.map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] text-neutral-700"
                  >
                    <p.icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{p.name}</span>
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  </span>
                ))}
              </div>
            </div>

            {/* Floating AI card */}
            <div className="pointer-events-none absolute bottom-4 right-4 hidden w-[240px] rotate-[2deg] rounded-xl border border-primary/30 bg-white p-3 shadow-xl shadow-primary/10 sm:block">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> AI Optimizer
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-neutral-700">
                +34% predicted reach if you add a number to your hook.
              </p>
              <button className="mt-2 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
