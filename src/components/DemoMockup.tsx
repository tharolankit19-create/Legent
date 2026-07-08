import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, BarChart3, Check, Play, Pause } from "lucide-react";
import { SiX, SiInstagram, SiThreads, SiYoutube } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

const frames = [
  { id: 0, label: "Dashboard" },
  { id: 1, label: "Composer" },
  { id: 2, label: "AI Score" },
  { id: 3, label: "Previews" },
  { id: 4, label: "Scheduled" },
];

const typedText = "I just shipped v2 of my SaaS — here's what changed →";

export function DemoMockup() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 3000);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (frame !== 1) {
      setTyped("");
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(typedText.slice(0, i));
      if (i >= typedText.length) clearInterval(t);
    }, 32);
    return () => clearInterval(t);
  }, [frame]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Browser chrome */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-purple">
        <div className="flex items-center gap-2 border-b border-white/5 bg-surface-2 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
          <div className="ml-4 flex flex-1 items-center gap-2 rounded-md bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            app.legent.io
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Screen */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-background to-surface">
          <AnimatePresence mode="wait">
            {frame === 0 && <DashboardFrame key="0" />}
            {frame === 1 && <ComposerFrame key="1" typed={typed} />}
            {frame === 2 && <ScoreFrame key="2" />}
            {frame === 3 && <PreviewsFrame key="3" />}
            {frame === 4 && <ScheduledFrame key="4" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Frame indicator */}
      <div className="mt-4 flex justify-center gap-1.5">
        {frames.map((f) => (
          <button
            key={f.id}
            onClick={() => setFrame(f.id)}
            className={`h-1.5 rounded-full transition-all ${frame === f.id ? "w-8 bg-primary" : "w-1.5 bg-white/20"}`}
            aria-label={f.label}
          />
        ))}
      </div>
    </div>
  );
}

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.4 },
};

function DashboardFrame() {
  return (
    <motion.div {...fade} className="absolute inset-0 grid grid-cols-12 gap-3 p-5">
      <div className="col-span-3 space-y-2">
        {["Dashboard", "Composer", "Calendar", "Analytics", "Settings"].map((l, i) => (
          <div
            key={l}
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {l}
          </div>
        ))}
      </div>
      <div className="col-span-9 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Impressions", value: "48.2k", delta: "+12%" },
            { label: "Engagement", value: "5.4%", delta: "+8%" },
            { label: "Followers", value: "+312", delta: "+22%" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-lg border border-white/5 bg-surface-2 p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{s.value}</p>
              <p className="text-[10px] text-green-400">{s.delta}</p>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-surface-2 p-3">
          <span className="text-xs text-muted-foreground">Connected:</span>
          {[SiX, FaLinkedinIn, SiInstagram, SiThreads, SiYoutube].map((Ic, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="grid h-6 w-6 place-items-center rounded-full bg-background"
            >
              <Ic className="h-3 w-3" />
            </motion.span>
          ))}
        </div>
        <div className="rounded-lg border border-white/5 bg-surface-2 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Last 7 days</p>
          <div className="flex h-20 items-end gap-1.5">
            {[40, 65, 50, 80, 70, 92, 88].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                className="flex-1 rounded-t bg-gradient-to-t from-primary to-accent"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ComposerFrame({ typed }: { typed: string }) {
  return (
    <motion.div {...fade} className="absolute inset-0 p-5">
      <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">New post</p>
        </div>
        <div className="min-h-[120px] rounded-md bg-background/50 p-3 text-sm">
          {typed}
          <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary align-middle" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[SiX, FaLinkedinIn, SiThreads].map((Ic, i) => (
            <span
              key={i}
              className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary"
            >
              <Ic className="h-3 w-3" />
            </span>
          ))}
          <div className="flex-1" />
          <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Optimize
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ScoreFrame() {
  return (
    <motion.div {...fade} className="absolute inset-0 grid place-items-center p-5">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-2 p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Optimizer Score</p>
        <motion.p
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-2 font-display text-6xl font-bold text-gradient"
        >
          84<span className="text-2xl text-muted-foreground">/100</span>
        </motion.p>
        <div className="mt-4 space-y-2 text-left">
          {["Hook is strong", "Add 1 emoji for X", "Consider posting at 8am"].map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-2 text-sm"
            >
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-muted-foreground">{t}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PreviewsFrame() {
  const previews = [
    { Ic: SiX, name: "X / Twitter", text: "I just shipped v2 of my SaaS — here's what changed 🚀" },
    {
      Ic: FaLinkedinIn,
      name: "LinkedIn",
      text: "Excited to announce v2 of our platform. Here's the full breakdown...",
    },
    {
      Ic: SiThreads,
      name: "Threads",
      text: "v2 is live. Three big changes you'll notice immediately:",
    },
  ];
  return (
    <motion.div {...fade} className="absolute inset-0 grid grid-cols-3 gap-3 p-5">
      {previews.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="rounded-lg border border-white/10 bg-surface-2 p-3"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <p.Ic className="h-3 w-3" />
            <span className="text-[10px] font-semibold text-muted-foreground">{p.name}</span>
          </div>
          <p className="text-xs leading-relaxed">{p.text}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ScheduledFrame() {
  return (
    <motion.div {...fade} className="absolute inset-0 grid place-items-center p-5">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-green-500/20">
          <div className="absolute inset-0 animate-pulse-ring rounded-full" />
          <Check className="h-10 w-10 text-green-400" />
        </div>
        <p className="font-display text-2xl font-semibold">Scheduled across 3 platforms</p>
        <p className="mt-1 text-sm text-muted-foreground">Tomorrow at 8:00 AM</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> View in calendar
          <span className="mx-2">·</span>
          <BarChart3 className="h-3.5 w-3.5" /> Track analytics
        </div>
      </motion.div>
    </motion.div>
  );
}
