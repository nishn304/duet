import { describe, expect, it } from 'vitest';
import { applyOps, describeProposal } from './patch';
import { kindMeta } from './catalog';
import type { Design, Op } from './types';

const base = (): Design => {
  const client = { id: 'c', kind: 'client' as const, label: 'Client', position: { x: 0, y: 0 }, props: {} };
  const api = {
    id: 'a',
    kind: 'service' as const,
    label: 'API',
    position: { x: 0, y: 0 },
    props: { ...kindMeta('service').defaultProps, replicas: 1, publicIngress: true },
  };
  const db = {
    id: 'd',
    kind: 'datastore' as const,
    label: 'DB',
    position: { x: 0, y: 0 },
    props: { ...kindMeta('datastore').defaultProps },
  };
  return {
    name: 't',
    provider: 'aws',
    region: 'us-east-1',
    nodes: [client, api, db],
    edges: [
      { id: 'e1', source: 'c', target: 'a' },
      { id: 'e2', source: 'a', target: 'd' },
    ],
  };
};

describe('applyOps', () => {
  it('wires new nodes together via tempIds within one batch', () => {
    const ops: Op[] = [
      { op: 'add_node', tempId: 'lb', kind: 'loadbalancer', label: 'ALB', props: { multiAz: true } },
      { op: 'connect', source: 'c', target: 'lb' },
      { op: 'connect', source: 'lb', target: 'a' },
      { op: 'disconnect', source: 'c', target: 'a' },
    ];
    const { design, created } = applyOps(base(), ops);
    const lbId = created.lb;
    expect(lbId).toBeTruthy();
    expect(design.nodes.find((x) => x.id === lbId)?.label).toBe('ALB');
    expect(design.edges.some((e) => e.source === 'c' && e.target === lbId)).toBe(true);
    expect(design.edges.some((e) => e.source === lbId && e.target === 'a')).toBe(true);
    expect(design.edges.some((e) => e.source === 'c' && e.target === 'a')).toBe(false);
  });

  it('applies only the selected op indexes', () => {
    const ops: Op[] = [
      { op: 'update_node', id: 'a', props: { replicas: 3 } },
      { op: 'update_node', id: 'd', props: { multiAz: true } },
    ];
    const { design } = applyOps(base(), ops, [0]);
    expect(design.nodes.find((x) => x.id === 'a')?.props.replicas).toBe(3);
    expect(design.nodes.find((x) => x.id === 'd')?.props.multiAz).toBeFalsy();
  });

  it('removing a node also removes its edges', () => {
    const { design } = applyOps(base(), [{ op: 'remove_node', id: 'a' }]);
    expect(design.nodes.some((x) => x.id === 'a')).toBe(false);
    expect(design.edges).toHaveLength(0);
  });

  it('reports the real ids it created, so callers can highlight them', () => {
    const { design, created } = applyOps(base(), [
      { op: 'add_node', tempId: 'lb', kind: 'loadbalancer', label: 'ALB' },
      { op: 'add_node', tempId: 'ch', kind: 'cache', label: 'Redis' },
    ]);
    expect(Object.keys(created).sort()).toEqual(['ch', 'lb']);
    for (const id of Object.values(created)) {
      expect(design.nodes.some((n) => n.id === id)).toBe(true);
    }
  });

  it('does not mutate the input design', () => {
    const input = base();
    const before = JSON.stringify(input);
    applyOps(input, [{ op: 'remove_node', id: 'a' }]);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('describeProposal', () => {
  it('reports the SPOF and cost delta a proposal would produce', () => {
    const ops: Op[] = [
      { op: 'update_node', id: 'a', props: { replicas: 3, publicIngress: false } },
      { op: 'update_node', id: 'd', props: { multiAz: true, replica: true } },
    ];
    const diff = describeProposal(
      { id: 'p', title: 'harden', ops, createdAt: 0, status: 'pending' },
      base(),
    );
    expect(diff.spofBefore).toBeGreaterThan(0);
    expect(diff.spofAfter).toBe(0);
    expect(diff.costAfter).toBeGreaterThan(diff.costBefore);
    expect(diff.lines).toHaveLength(2);
  });

  it('labels connect ops to a new node by its label, not the raw tempId', () => {
    const ops: Op[] = [
      { op: 'add_node', tempId: 'lb', kind: 'loadbalancer', label: 'ALB' },
      { op: 'connect', source: 'c', target: 'lb' },
    ];
    const diff = describeProposal(
      { id: 'p', title: 't', ops, createdAt: 0, status: 'pending' },
      base(),
    );
    expect(diff.lines[1].text).toContain('ALB');
    expect(diff.lines[1].text).not.toContain('lb');
  });
});
