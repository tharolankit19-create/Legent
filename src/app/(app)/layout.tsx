import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuth();
  return <AppShell orgName={user.organization?.name ?? "My Organization"}>{children}</AppShell>;
}
