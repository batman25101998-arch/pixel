import { NextResponse } from "next/server";
import { getGlobalRankings } from "@/lib/rankings";
import { demoRankings } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  return NextResponse.json(isDemoMode ? demoRankings : await getGlobalRankings(25));
}
