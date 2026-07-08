import {
  SiX,
  SiInstagram,
  SiTiktok,
  SiThreads,
  SiYoutube,
  SiPinterest,
  SiFacebook,
  SiBluesky,
  SiMastodon,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import type { IconType } from "react-icons";
const SiLinkedin = FaLinkedinIn;

type Platform = { name: string; Icon: IconType; bg: string; color?: string };

const platforms: Platform[] = [
  { name: "X", Icon: SiX, bg: "#000000" },
  { name: "LinkedIn", Icon: SiLinkedin, bg: "#0A66C2" },
  {
    name: "Instagram",
    Icon: SiInstagram,
    bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
  },
  { name: "TikTok", Icon: SiTiktok, bg: "#010101" },
  { name: "Threads", Icon: SiThreads, bg: "#101010" },
  { name: "YouTube", Icon: SiYoutube, bg: "#FF0000" },
  { name: "Pinterest", Icon: SiPinterest, bg: "#E60023" },
  { name: "Facebook", Icon: SiFacebook, bg: "#1877F2" },
  { name: "Bluesky", Icon: SiBluesky, bg: "#0085FF" },
  { name: "Mastodon", Icon: SiMastodon, bg: "#6364FF" },
];

function Pill({ p }: { p: Platform }) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-full border border-white/10 bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap">
      <span
        className="grid h-7 w-7 place-items-center rounded-full text-white"
        style={{ background: p.bg }}
      >
        <p.Icon className="h-3.5 w-3.5" />
      </span>
      <span>{p.name}</span>
    </div>
  );
}

export function SocialTicker() {
  const items = [...platforms, ...platforms, ...platforms];
  return (
    <section className="border-y border-white/5 bg-surface/30 py-10">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Schedule across every major platform →
      </p>
      <div className="mask-fade-x overflow-hidden">
        <div className="animate-marquee-right pause-on-hover flex w-max gap-4">
          {items.map((p, i) => (
            <Pill key={`${p.name}-${i}`} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
