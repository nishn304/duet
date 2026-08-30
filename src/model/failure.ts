/**
 * Blast-radius simulation.
 *
 * Answers one question against the graph: if this component goes away entirely,
 * what stops working? The whole point of modelling infrastructure as a typed
 * graph rather than a drawing is that this question has an actual answer — an
 * agent reading a diagram as pixels could never compute it.
 *
 * Like the rest of Duet's analysis this is a bounded heuristic: reachability
 * from the system's entry points, not a simulator. It models *total loss* of a
 * component, which is why a redundant component still shows a blast radius —
 * the report says so explicitly rather than pretending redundancy means immune.
 */
import { reachable } from './analysis';
import type { Design, DuetNode } from './types';

export type FailureImpact = 'failed' | 'unreachable' | 'degraded' | 'unaffected';

export interface BlastRadius {
  failedId: string;
  failedLabel: string;
  /** every node id → how this failure affects it */
  impact: Record<string, FailureImpact>;
  /** reachable before, not reachable after */
  unreachable: string[];
  /** still reachable, but directly depended on the failed component */
  degraded: string[];
  /** storage the system can no longer get to */
  severedStorage: string[];
  /** the failed component had redundancy configured */
  redundant: boolean;
  summary: string;
}

/**
 * Where traffic enters. Clients if there are any; otherwise anything with no
 * inbound edges, so a partial sketch still simulates sensibly.
 */
function entryPoints(design: Design): string[] {
  const clients = design.nodes.filter((n) => n.kind === 'client').map((n) => n.id);
  if (clients.length) return clients;

  const hasInbound = new Set(design.edges.map((e) => e.target));
  const roots = design.nodes.filter((n) => !hasInbound.has(n.id)).map((n) => n.id);
  return roots.length ? roots : design.nodes.map((n) => n.id);
}

function isRedundant(n: DuetNode): boolean {
  const p = n.props;
  switch (n.kind) {
    case 'service':
    case 'worker':
      return (p.replicas ?? 1) >= 2;
    case 'datastore':
      return Boolean(p.multiAz) || Boolean(p.replica);
    case 'cache':
    case 'loadbalancer':
      return Boolean(p.multiAz);
    default:
      return false;
  }
}

export function simulateFailure(design: Design, failedId: string): BlastRadius | null {
  const failed = design.nodes.find((n) => n.id === failedId);
  if (!failed) return null;

  const entries = entryPoints(design);
  const before = reachable(design, entries);
  const after = reachable(design, entries, new Set([failedId]));

  const unreachable = design.nodes
    .filter((n) => n.id !== failedId && before.has(n.id) && !after.has(n.id))
    .map((n) => n.id);

  // Still standing, but it called the thing that just died.
  const callers = new Set(design.edges.filter((e) => e.target === failedId).map((e) => e.source));
  const degraded = design.nodes
    .filter((n) => n.id !== failedId && after.has(n.id) && callers.has(n.id))
    .map((n) => n.id);

  const unreachableSet = new Set(unreachable);
  const degradedSet = new Set(degraded);
  const severedStorage = design.nodes
    .filter((n) => (n.kind === 'datastore' || n.kind === 'objectstore') && unreachableSet.has(n.id))
    .map((n) => n.id);

  const impact: Record<string, FailureImpact> = {};
  for (const n of design.nodes) {
    impact[n.id] =
      n.id === failedId
        ? 'failed'
        : unreachableSet.has(n.id)
          ? 'unreachable'
          : degradedSet.has(n.id)
            ? 'degraded'
            : 'unaffected';
  }

  const redundant = isRedundant(failed);
  const parts: string[] = [];
  if (unreachable.length) {
    parts.push(`${unreachable.length} component${unreachable.length > 1 ? 's' : ''} cut off`);
  }
  if (degraded.length) {
    parts.push(`${degraded.length} degraded`);
  }
  if (!parts.length) parts.push('nothing else is affected');
  if (severedStorage.length) {
    parts.push(`${severedStorage.length} storage node${severedStorage.length > 1 ? 's' : ''} unreachable`);
  }

  const summary =
    `If ${failed.label} is lost: ${parts.join(', ')}.` +
    (redundant
      ? ' It has redundancy configured, so this models losing the whole component, not one instance.'
      : '');

  return {
    failedId,
    failedLabel: failed.label,
    impact,
    unreachable,
    degraded,
    severedStorage,
    redundant,
    summary,
  };
}
