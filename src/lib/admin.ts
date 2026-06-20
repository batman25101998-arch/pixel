import { auth } from "@/auth";

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN" || session.user.banned) return null;
  return session;
}
