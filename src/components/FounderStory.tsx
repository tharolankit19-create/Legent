import { motion } from "framer-motion";
import {
  Quote,
  ExternalLink,
  Twitter,
  MapPin,
  Cake,
  Rocket,
  X as XIcon,
  CheckCircle2,
} from "lucide-react";

export const founderStory = {
  name: "Ankit Tharol",
  age: 16,
  location: "India",
  xHandle: "@ankittharol",
  xUrl: "https://x.com/ankittharol",
  photo: "https://unavatar.io/x/ankittharol",
  tagline: "16. Building my third startup from India. Two failures in. Still going.",
  intro:
    "I'm 16. I live in India. In the last 6 months I've shipped two startups that didn't work — and I'm building a third one anyway. This is the honest version, not the polished LinkedIn version.",
  pastStartups: [
    {
      name: "ViralHook AI",
      url: "viralhook.online",
      what: "An AI tool to generate viral content hooks for creators.",
      outcome: "Shipped it. Nobody wanted it enough to pay. Closed it.",
    },
    {
      name: "KryxAI",
      url: "beta.getkryxai.com",
      what: "An AI automation platform for small businesses.",
      outcome: "Built the beta. Couldn't find distribution fast enough. Shut it down.",
    },
  ],
  current: {
    name: "Legent",
    what: "A unified social media management tool built for solo founders — write once, ship to 10 platforms, AI tells you what to fix before you publish.",
    why: "I'm 16, in India, and my first two startups died because nobody saw them. So I built the posting tool I needed. Here it is.",
  },
  lessons: [
    "Distribution beats product. Always. Even great products die quiet.",
    "Pricing matters more than features. $29 lifetime beats $9/mo on day one.",
    "Ship in public. Real users in week one, not month six.",
  ],
  closing:
    "Third time's the one. If you're a founder who's tired of context-switching between 5 social apps — I built this for you. Let's ship.",
};

export function FounderStory() {
  return (
    <section id="founder-story" className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Founder's story
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">The honest version.</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-12 rounded-3xl border border-white/10 bg-surface p-6 sm:p-10"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <img
              src={founderStory.photo}
              alt={founderStory.name}
              className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover"
              loading="lazy"
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-bold">{founderStory.name}</h3>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                <span className="inline-flex items-center gap-1">
                  <Cake className="h-3 w-3" /> {founderStory.age} years old
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {founderStory.location}
                </span>
                <a
                  href={founderStory.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                >
                  <Twitter className="h-3 w-3" /> {founderStory.xHandle}
                </a>
              </div>
              <p className="mt-3 text-sm italic text-muted-foreground">{founderStory.tagline}</p>
            </div>
          </div>

          <div className="mt-8">
            <Quote className="mb-3 h-7 w-7 text-primary/40" />
            <p className="text-base leading-relaxed sm:text-lg">{founderStory.intro}</p>
          </div>

          <div className="mt-10">
            <p className="mb-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              The two that didn't work
            </p>
            <div className="space-y-3">
              {founderStory.pastStartups.map((s) => (
                <div
                  key={s.name}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-background/40 p-4"
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
                    <XIcon className="h-3.5 w-3.5 text-red-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <a
                        href={`https://${s.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary"
                      >
                        {s.url} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.what}</p>
                    <p className="mt-1.5 text-xs text-red-400/90">{s.outcome}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/20">
                <Rocket className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                Third time's the one
              </span>
            </div>
            <h4 className="text-gradient text-lg font-bold">{founderStory.current.name}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{founderStory.current.what}</p>
            <p className="mt-3 text-sm">{founderStory.current.why}</p>
          </div>

          <div className="mt-8">
            <p className="mb-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              What the failures taught me
            </p>
            <div className="space-y-2.5">
              {founderStory.lessons.map((l) => (
                <div key={l} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-sm text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm italic">{founderStory.closing}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
