import { NextResponse } from "next/server";
import { getBlobTokenStatus } from "@/lib/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getBlobTokenStatus();
  return NextResponse.json(
    { available: status.reason === "configured", reason: status.reason },
    { headers: { "Cache-Control": "no-store" } }
  );
}
