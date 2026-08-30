import { describe, expect, it } from 'vitest';
import { analyze, findSpof, lint, costOf } from './analysis';
import { kindMeta } from './catalog';
import type { Design, DuetEdge, DuetNode, NodeKind } from './types';

let n = 0;
const node = (kind: NodeKind, label: string, props: DuetNode['props'] = {}): DuetNode => ({
  id: `n${n++}`,
  kind,
  label,
  position: { x: 0, y: 0 },
  props: { ...kindMeta(kind).defaultProps, ...props },
});
const edge = (s: DuetNode, t: DuetNode): DuetEdge => ({ id: `e${n++}`, source: s.id, target: t.id });
const design = (nodes: DuetNode[], edges: DuetEdge[]): Design => ({
  name: 't',
  provider: 'aws',
  region: 'us-east-1',
  nodes,
  edges,
});

describe('findSpof', () => {
  it('flags a lone service and a non-redundant database on the critical path', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { replicas: 1 });
    const db = node('datastore', 'DB', { multiAz: false, replica: false });
    const d = design([client, api, db], [edge(client, api), edge(api, db)]);

    const spof = findSpof(d);
    const labels = spof.map((f) => f.title);
    expect(labels).toContain('API is a single point of failure');
    expect(labels).toContain('DB is a single point of failure');
  });

  it('clears once the service is scaled and the database is multi-AZ', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { replicas: 3 });
    const db = node('datastore', 'DB', { multiAz: true });
    const d = design([client, api, db], [edge(client, api), edge(api, db)]);
    expect(findSpof(d)).toHaveLength(0);
  });

  it('does not flag a node that is not on any client→storage path', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { replicas: 3 });
    const db = node('datastore', 'DB', { multiAz: true });
    const worker = node('worker', 'Worker', { replicas: 1 }); // dangles off to the side
    const d = design(
      [client, api, db, worker],
      [edge(client, api), edge(api, db), edge(worker, db)],
    );
    expect(findSpof(d).map((f) => f.nodeId)).not.toContain(worker.id);
  });
});

describe('lint', () => {
  it('flags a database a client can reach directly', () => {
    const client = node('client', 'Client');
    const db = node('datastore', 'DB');
    const d = design([client, db], [edge(client, db)]);
    expect(lint(d).some((f) => f.id.startsWith('lint:public-data'))).toBe(true);
  });

  it('does not flag a database that sits behind a service', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { publicIngress: true });
    const db = node('datastore', 'DB');
    const d = design([client, api, db], [edge(client, api), edge(api, db)]);
    expect(lint(d).some((f) => f.id.startsWith('lint:public-data'))).toBe(false);
  });

  it('flags a public service with no load balancer or CDN in front', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { publicIngress: true });
    const d = design([client, api], [edge(client, api)]);
    expect(lint(d).some((f) => f.id.startsWith('lint:bare-origin'))).toBe(true);
  });

  it('flags an unmanaged external dependency', () => {
    const api = node('service', 'API');
    const ext = node('external', 'Stripe', { managed: false });
    const d = design([api, ext], [edge(api, ext)]);
    expect(lint(d).some((f) => f.id.startsWith('lint:hard-external'))).toBe(true);
  });
});

describe('costOf', () => {
  it('sums per-node cost and scales a database with size and replica', () => {
    const small = node('datastore', 'S', { instanceSize: 'small' });
    const big = node('datastore', 'B', { instanceSize: 'large', replica: true, multiAz: true });
    const c = costOf(design([small, big], []));
    expect(c.total).toBe(c.byNode[small.id] + c.byNode[big.id]);
    expect(c.byNode[big.id]).toBeGreaterThan(c.byNode[small.id]);
  });
});

describe('analyze', () => {
  it('produces a lower score when there are findings', () => {
    const clean = design(
      [node('client', 'C'), node('service', 'A', { replicas: 2 })],
      [],
    );
    const [c, a] = clean.nodes;
    clean.edges.push(edge(c, a));
    const messy = design(
      [node('client', 'C'), node('service', 'A', { replicas: 1, publicIngress: true }), node('datastore', 'D')],
      [],
    );
    messy.edges.push(edge(messy.nodes[0], messy.nodes[1]), edge(messy.nodes[1], messy.nodes[2]));

    expect(analyze(messy).score).toBeLessThan(analyze(clean).score);
  });
});
