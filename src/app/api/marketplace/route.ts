import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ listings: [], error: "Marketplace is not available in the permanent-ownership MVP." }, { status: 410 });
}
