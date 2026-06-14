import { neighbors } from "@/lib/hex";

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
      for (const next of neighbors(current)) {
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

export function slugifyTerritoryName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
  return `${base || "territory"}-${crypto.randomUUID().slice(0, 8)}`;
}
