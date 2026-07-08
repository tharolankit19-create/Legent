import { Star } from "lucide-react";
import { SiX, SiInstagram, SiThreads } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import type { IconType } from "react-icons";

type T = {
  text: string;
  name: string;
  handle: string;
  platform: IconType;
  avatar: string;
  color: string;
};

// Bold key numbers via **markers**
const all: T[] = [
  {
    text: "Legent saved me **2 hours every week**. I used to manually post to 4 platforms. Now it's one click.",
    name: "Priya Sharma",
    handle: "@priyabuilds",
    platform: SiX,
    avatar: "PS",
    color: "#7C3AED",
  },
  {
    text: "The AI optimizer actually makes my posts better. It told me my LinkedIn posts were too long — it was right.",
    name: "Marcus Chen",
    handle: "@marcusdev",
    platform: FaLinkedinIn,
    avatar: "MC",
    color: "#06B6D4",
  },
  {
    text: "Finally something built for indie hackers and not agencies. Clean, fast, does exactly what I need.",
    name: "Anika Patel",
    handle: "@anikamakes",
    platform: SiX,
    avatar: "AP",
    color: "#F59E0B",
  },
  {
    text: "Went from **200 to 800 followers** in 3 weeks after I started using Legent consistently. The analytics are fire.",
    name: "Diego Reyes",
    handle: "@diegoships",
    platform: SiThreads,
    avatar: "DR",
    color: "#10B981",
  },
  {
    text: "I was using 3 different tools. Legent replaced all of them for **$29**. No brainer.",
    name: "Sarah Kim",
    handle: "@sarahkimdev",
    platform: FaLinkedinIn,
    avatar: "SK",
    color: "#EC4899",
  },
  {
    text: "The content calendar alone is worth it. I can see my whole month at a glance.",
    name: "Tom Okafor",
    handle: "@tomokafor",
    platform: SiX,
    avatar: "TO",
    color: "#8B5CF6",
  },
  {
    text: "Best **$29** I've spent on my business. Got **3 new customers** from posts I scheduled through Legent.",
    name: "Mei Lin",
    handle: "@meilinbuilds",
    platform: SiInstagram,
    avatar: "ML",
    color: "#EF4444",
  },
  {
    text: "Legent's AI suggested I post at 8am instead of noon. My impressions **doubled** the next day.",
    name: "Raj Mehta",
    handle: "@rajmehta_io",
    platform: SiX,
    avatar: "RM",
    color: "#0EA5E9",
  },
];

function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Card({ t }: { t: T }) {
  const Ic = t.platform;
  return (
    <div className="glass w-[320px] shrink-0 rounded-xl p-5">
      <div className="mb-3 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">"{renderText(t.text)}"</p>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ background: t.color }}
        >
          {t.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{t.name}</p>
          <p className="truncate text-xs text-muted-foreground">{t.handle}</p>
        </div>
        <Ic className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function Testimonials() {
  const row1 = [...all, ...all];
  const row2 = [...all.slice().reverse(), ...all.slice().reverse()];
  return (
    <section className="py-24">
      <div className="mx-auto mb-12 max-w-3xl px-4 text-center">
        <h2 className="font-display text-4xl font-bold sm:text-5xl">Founders love Legent.</h2>
        <p className="mt-4 text-muted-foreground">
          Real feedback from indie hackers shipping content with us.
        </p>
      </div>
      {/* Mobile: horizontal snap carousel, 1 card at a time */}
      <div className="md:hidden">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-160px)] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {all.map((t, i) => (
            <div key={`m-${i}`} className="snap-center">
              <Card t={t} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: dual marquee */}
      <div className="hidden space-y-4 overflow-hidden mask-fade-x md:block">
        <div className="animate-marquee-left pause-on-hover flex w-max gap-4">
          {row1.map((t, i) => (
            <Card key={`a-${i}`} t={t} />
          ))}
        </div>
        <div
          className="animate-marquee-right pause-on-hover flex w-max gap-4"
          style={{ animationDuration: "50s" }}
        >
          {row2.map((t, i) => (
            <Card key={`b-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
