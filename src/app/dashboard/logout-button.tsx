"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary"
    >
      Log out
    </button>
  );
}
