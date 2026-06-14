import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { assertCell, cellForLngLat, cellsForBBox, centerForCell, polygonForCell, virtualHexForCell } from "@/lib/hex";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const h3Index = url.searchParams.get("h3Index");
  const lng = Number(url.searchParams.get("lng"));
  const lat = Number(url.searchParams.get("lat"));
  const bbox = url.searchParams.get("bbox")?.split(",").map(Number);
  const resolution = Math.min(Number(url.searchParams.get("resolution") ?? env.HEX_RESOLUTION), 8);

  if (h3Index) {
    assertCell(h3Index);
    return NextResponse.json({
      hex: virtualHexForCell(h3Index),
      polygon: polygonForCell(h3Index),
      center: centerForCell(h3Index)
    });
  }

  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    const cell = cellForLngLat(lng, lat, resolution);
    return NextResponse.json({
      hex: virtualHexForCell(cell),
      polygon: polygonForCell(cell),
      center: centerForCell(cell)
    });
  }

  if (bbox?.length === 4 && bbox.every(Number.isFinite)) {
    return NextResponse.json({
      resolution,
      cells: cellsForBBox(bbox[0], bbox[1], bbox[2], bbox[3], resolution)
    });
  }

  return NextResponse.json({ error: "Provide h3Index, lng/lat, or bbox." }, { status: 400 });
}
