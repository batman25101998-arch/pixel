import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getAdminDashboardData } from "@/lib/admin-dashboard";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json(await getAdminDashboardData(query));
}
