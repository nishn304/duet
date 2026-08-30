import { describe, expect, it } from 'vitest';
import { simulateFailure } from './failure';
import { kindMeta } from './catalog';
import type { Design, DuetEdge, DuetNode, NodeKind } from './types';

let i = 0;
const node = (kind: NodeKind, label: string, props: DuetNode['props'] = {}): DuetNode => ({
  id: `${label.toLowerCase().replace(/\W/g, '')}${i++}`,
  kind,
  label,
  position: { x: 0, y: 0 },
  props: { ...kindMeta(kind).defaultProps, ...props },
});
const edge = (s: DuetNode, t: DuetNode): DuetEdge => ({ id: `e${i++}`, source: s.id, target: t.id });
const design = (nodes: DuetNode[], edges: DuetEdge[]): Design => ({
  name: 't',
  provider: 'aws',
  region: '',
  nodes,
  edges,
});

describe('simulateFailure', () => {
  it('reports everything downstream of the failure as cut off', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API');
    const db = node('datastore', 'DB');
    const d = design([client, api, db], [edge(client, api), edge(api, db)]);

    const blast = simulateFailure(d, api.id)!;
    expect(blast.impact[api.id]).toBe('failed');
    expect(blast.impact[db.id]).toBe('unreachable');
    expect(blast.unreachable).toEqual([db.id]);
    expect(blast.severedStorage).toEqual([db.id]);
    // The client called the thing that died, so it is degraded — its requests
    // fail. "Your users are affected" is the most important line of any blast
    // radius, so clients are not excluded from the report.
    expect(blast.impact[client.id]).toBe('degraded');
  });

  it('marks a caller that survives as degraded, not cut off', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API');
    const cache = node('cache', 'Redis');
    const d = design([client, api, cache], [edge(client, api), edge(api, cache)]);

    const blast = simulateFailure(d, cache.id)!;
    // the API still serves traffic, but it lost its cache
    expect(blast.impact[api.id]).toBe('degraded');
    expect(blast.degraded).toEqual([api.id]);
    expect(blast.unreachable).toEqual([]);
  });

  it('finds no blast radius when a redundant path routes around the failure', () => {
    const client = node('client', 'Client');
    const lb = node('loadbalancer', 'ALB');
    const a = node('service', 'API A');
    const b = node('service', 'API B');
    const db = node('datastore', 'DB');
    const d = design(
      [client, lb, a, b, db],
      [edge(client, lb), edge(lb, a), edge(lb, b), edge(a, db), edge(b, db)],
    );

    const blast = simulateFailure(d, a.id)!;
    // B still reaches the database, so nothing is cut off
    expect(blast.unreachable).toEqual([]);
    expect(blast.impact[db.id]).toBe('unaffected');
  });

  it('flags that a redundant component is being modelled as a total loss', () => {
    const client = node('client', 'Client');
    const api = node('service', 'API', { replicas: 3 });
    const d = design([client, api], [edge(client, api)]);
    expect(simulateFailure(d, api.id)!.redundant).toBe(true);
  });

  it('still simulates a design with no client, using roots as entry points', () => {
    const api = node('service', 'API');
    const db = node('datastore', 'DB');
    const d = design([api, db], [edge(api, db)]);
    expect(simulateFailure(d, api.id)!.unreachable).toEqual([db.id]);
  });

  it('returns null for an unknown component', () => {
    expect(simulateFailure(design([], []), 'nope')).toBeNull();
  });
});
