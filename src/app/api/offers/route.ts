import { NextResponse } from "next/server";

const unavailable = { pendingCount: 0, received: [], sent: [], error: "Offers are not available in the permanent-ownership MVP." };

export async function GET() {
  return NextResponse.json(unavailable, { status: 410 });
}

export async function POST() {
  return NextResponse.json(unavailable, { status: 410 });
}
