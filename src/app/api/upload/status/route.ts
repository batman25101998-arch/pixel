import { NextResponse } from "next/server";
import { isBlobUploadConfigured } from "@/lib/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { available: isBlobUploadConfigured() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
