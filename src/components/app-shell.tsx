"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import {
  PencilLine,
  CalendarClock,
  BarChart3,
  Plug,
  Settings,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/compose", label: "Compose", icon: PencilLine },
  { href: "/dashboard", label: "Scheduled", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:h-10 md:w-full md:justify-start md:gap-3 md:px-3"
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
      <span className="hidden text-sm md:inline">Theme</span>
    </button>
  );
}

export function AppShell({
  orgName,
  children,
}: {
  orgName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const nav = (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-md md:h-10 md:w-full md:justify-start md:gap-3 md:px-3",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm font-medium md:inline">{label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-col border-r border-border p-4 md:flex">
        <Link href="/dashboard" className="mb-8 px-3 text-xl font-semibold text-primary">
          Legent
        </Link>
        <nav className="flex flex-1 flex-col gap-1">{nav}</nav>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <p className="truncate px-3 pb-1 text-xs text-muted-foreground">{orgName}</p>
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="text-lg font-semibold text-primary">
          Legent
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          aria-label="Log out"
          className="flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 py-1 backdrop-blur md:hidden">
        {nav}
        <ThemeToggle />
      </nav>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-20 md:px-8 md:pb-10 md:pt-8">{children}</main>
    </div>
  );
}
