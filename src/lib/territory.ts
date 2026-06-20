import { cellArea, cellsToMultiPolygon, gridDisk, UNITS } from "h3-js";

export type TerritoryStatistics = {
  hexCount: number;
  areaKm2: number;
  borderEdges: number;
  totalValueCents: number;
  averageValueCents: number;
};

export const CUSTOM_TERRITORY_HEX_REQUIREMENT = 10;

function adjacentCells(h3Index: string) {
  return gridDisk(h3Index, 1).filter((cell) => cell !== h3Index);
}

export function connectedComponents(cells: string[]) {
  const remaining = new Set(cells);
  const components: string[][] = [];

  for (const start of cells) {
    if (!remaining.has(start)) continue;
    const queue = [start];
    const component: string[] = [];
    remaining.delete(start);

    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const next of adjacentCells(current)) {
        if (remaining.delete(next)) {
          queue.push(next);
        }
      }
    }

    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

export function areContiguous(cells: string[]) {
  if (cells.length === 0) return false;
  return connectedComponents(cells).length === 1;
}

export function territoryStatistics(cells: { h3Index: string; priceCents: bigint | number }[]): TerritoryStatistics {
  const indexes = cells.map((cell) => cell.h3Index);
  const indexSet = new Set(indexes);
  const totalValueCents = cells.reduce((sum, cell) => sum + Number(cell.priceCents), 0);
  const borderEdges = indexes.reduce(
    (total, index) => total + adjacentCells(index).filter((neighbor) => !indexSet.has(neighbor)).length,
    0
  );

  return {
    hexCount: cells.length,
    areaKm2: Number(indexes.reduce((total, index) => total + cellArea(index, UNITS.km2), 0).toFixed(2)),
    borderEdges,
    totalValueCents,
    averageValueCents: cells.length ? Math.round(totalValueCents / cells.length) : 0
  };
}

export function territoryGeometry(cells: string[]): GeoJSON.MultiPolygon {
  const polygons = cellsToMultiPolygon(cells);
  const coordinates = polygons.map((polygon) =>
    polygon.map((loop) => {
      const ring = loop.map(([lat, lng]) => [lng, lat]);
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        ring.push([...first]);
      }
      return ring;
    })
  );

  return {
    type: "MultiPolygon",
    coordinates
  };
}

export function slugifyTerritoryName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
  return `${base || "territory"}-${crypto.randomUUID().slice(0, 8)}`;
}
