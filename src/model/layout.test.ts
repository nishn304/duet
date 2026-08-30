import { describe, expect, it } from 'vitest';
import { layeredLayout } from './layout';
import type { Design, DuetNode, NodeKind } from './types';

let i = 0;
const node = (kind: NodeKind): DuetNode => ({
  id: `${kind}${i++}`,
  kind,
  label: kind,
  position: { x: 0, y: 0 },
  props: {},
});

const design = (kinds: NodeKind[]): Design => ({
  name: 't',
  provider: 'aws',
  region: '',
  nodes: kinds.map(node),
  edges: [],
});

const columns = (d: Design) => [...new Set(d.nodes.map((n) => n.position.x))].sort((a, b) => a - b);

describe('layeredLayout', () => {
  it('orders components left to right by traffic flow', () => {
    const out = layeredLayout(design(['datastore', 'client', 'service']));
    const x = (kind: NodeKind) => out.nodes.find((n) => n.kind === kind)!.position.x;
    expect(x('client')).toBeLessThan(x('service'));
    expect(x('service')).toBeLessThan(x('datastore'));
  });

  it('leaves no empty columns when the design skips whole kinds', () => {
    // client(0) → cdn(1) → lb(2) → service(3) → datastore(6): ranks 4 and 5 unused
    const out = layeredLayout(design(['client', 'cdn', 'loadbalancer', 'service', 'datastore']));
    const cols = columns(out);
    expect(cols).toHaveLength(5);
    const gaps = cols.slice(1).map((c, idx) => c - cols[idx]);
    expect(new Set(gaps).size).toBe(1); // evenly spaced, no double-width gap
  });

  it('stacks components that share a rank into one column', () => {
    const out = layeredLayout(design(['client', 'service', 'service', 'service']));
    expect(columns(out)).toHaveLength(2);
    const services = out.nodes.filter((n) => n.kind === 'service');
    expect(new Set(services.map((n) => n.position.y)).size).toBe(3);
  });

  it('handles an empty design', () => {
    expect(layeredLayout(design([])).nodes).toEqual([]);
  });
});
