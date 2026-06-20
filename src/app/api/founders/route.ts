import { NextResponse } from "next/server";
import { getFounderAvailability } from "@/lib/founders";

export async function GET() {
  return NextResponse.json(await getFounderAvailability(), {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
