/**
 * A small layered auto-layout so a design — especially one the agent just added
 * to — reads as a left-to-right architecture diagram. Not a general graph layout;
 * it ranks nodes by kind (traffic flows client → edge → compute → state) and
 * spaces them out within each rank.
 */
import type { Design, NodeKind } from './types';

const RANK: Record<NodeKind, number> = {
  client: 0,
  cdn: 1,
  loadbalancer: 2,
  service: 3,
  worker: 4,
  queue: 4,
  cache: 5,
  external: 5,
  datastore: 6,
  objectstore: 6,
};

const COL_W = 240;
const ROW_H = 132;
const X0 = 80;
const Y0 = 80;

export function layeredLayout(design: Design): Design {
  const columns = new Map<number, string[]>();
  for (const n of design.nodes) {
    const r = RANK[n.kind];
    if (!columns.has(r)) columns.set(r, []);
    columns.get(r)!.push(n.id);
  }

  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));
  const pos = new Map<string, { x: number; y: number }>();

  for (const [rank, ids] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    const colHeight = ids.length;
    const yStart = Y0 + ((tallest - colHeight) * ROW_H) / 2;
    ids.forEach((id, i) => {
      pos.set(id, { x: X0 + rank * COL_W, y: yStart + i * ROW_H });
    });
  }

  return {
    ...design,
    nodes: design.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })),
  };
}
