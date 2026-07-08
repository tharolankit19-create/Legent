import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { DODO_CHECKOUT_URL } from "./EarlyAccessCheckout";

const defaults = { hourlyRate: 75, postsPerWeek: 8, platformsPerPost: 4, minutesPerPlatform: 3 };

export function RoiCalculator() {
  const [hourlyRate, setHourlyRate] = useState(defaults.hourlyRate);
  const [postsPerWeek, setPostsPerWeek] = useState(defaults.postsPerWeek);
  const [platforms, setPlatforms] = useState(defaults.platformsPerPost);
  const [minutes, setMinutes] = useState(defaults.minutesPerPlatform);

  const r = useMemo(() => {
    const manual = postsPerWeek * platforms * minutes;
    const legent = postsPerWeek * 0.5;
    const saved = Math.max(0, manual - legent);
    const hoursMonth = (saved * 4) / 60;
    const dollarsMonth = hoursMonth * hourlyRate;
    return { manual, legent, saved, hoursMonth, dollarsMonth, year: dollarsMonth * 12 };
  }, [hourlyRate, postsPerWeek, platforms, minutes]);

  return (
    <section id="roi" className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            ROI calculator
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            At $75/hr, manual posting costs you{" "}
            <span className="text-gradient">$460 a month.</span> Legent costs $29 once.
          </h2>
          <p className="mt-3 text-muted-foreground">Drag the sliders. We'll do the math.</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6 rounded-2xl border border-white/10 bg-surface p-6 sm:p-8">
            <SliderRow
              icon={DollarSign}
              label="Your hourly rate"
              value={hourlyRate}
              min={20}
              max={300}
              step={5}
              format={(v) => `$${v}/hr`}
              onChange={setHourlyRate}
            />
            <SliderRow
              icon={Calendar}
              label="Posts per week"
              value={postsPerWeek}
              min={1}
              max={30}
              step={1}
              format={(v) => `${v} posts`}
              onChange={setPostsPerWeek}
            />
            <SliderRow
              icon={TrendingUp}
              label="Platforms per post"
              value={platforms}
              min={1}
              max={10}
              step={1}
              format={(v) => `${v} platforms`}
              onChange={setPlatforms}
            />
            <SliderRow
              icon={Clock}
              label="Minutes per platform (manual)"
              value={minutes}
              min={1}
              max={15}
              step={1}
              format={(v) => `${v} min`}
              onChange={setMinutes}
            />
          </div>

          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-purple sm:p-8">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">You save</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-gradient text-6xl font-bold tabular-nums">
                {r.hoursMonth.toFixed(1)}
              </span>
              <span className="text-muted-foreground">hours / month</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-emerald-400">
                ${Math.round(r.dollarsMonth).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">in recovered time</span>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <Row label="Manual time / week" value={`${Math.round(r.manual)} min`} muted />
              <Row label="With Legent / week" value={`${r.legent.toFixed(1)} min`} muted />
              <div className="my-2 h-px bg-white/10" />
              <Row label="Saved / month" value={`${r.hoursMonth.toFixed(1)} hrs`} />
              <Row
                label="Saved / year"
                value={`$${Math.round(r.year).toLocaleString()}`}
                highlight
              />
            </div>
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-3 text-center text-xs">
              Legent pays for itself in{" "}
              <span className="text-gradient font-bold">&lt; 1 month</span>
            </div>
            <a
              href={DODO_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Claim Early Access — $29
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderRow({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </label>
        <span className="rounded-md border border-white/10 bg-background px-2 py-0.5 text-sm font-semibold tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
        style={{
          background: `linear-gradient(90deg, hsl(var(--primary, 270 80% 55%)) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground/70" : "text-muted-foreground"}>{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ? "text-emerald-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}
