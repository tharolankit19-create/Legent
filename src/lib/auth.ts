import { getServerSession as getNextAuthServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export function getServerSession() {
  return getNextAuthServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}
