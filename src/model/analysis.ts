/**
 * Duet's analysis engine — pure functions over a Design.
 *
 * Everything here is a bounded, explainable heuristic, not a simulator. Each
 * finding carries a `reason` (why Duet flagged it) and a `fix` (the concrete
 * change that clears it) so the agent can act on findings without guessing, and
 * the human can see Duet's reasoning rather than a black-box score.
 */
import { kindMeta, nodeCost } from './catalog';
import type { Design, DuetNode, NodeKind } from './types';

/* --------------------------------------------------------------- graph helpers */

export function adjacency(design: Design): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of design.nodes) adj.set(n.id, []);
  for (const e of design.edges) {
    if (adj.has(e.source)) adj.get(e.source)!.push(e.target);
  }
  return adj;
}

/** Directed reachability from `startIds`, optionally with a set of nodes removed. */
export function reachable(
  design: Design,
  startIds: string[],
  removed: Set<string> = new Set(),
): Set<string> {
  const adj = adjacency(design);
  const seen = new Set<string>();
  const stack = startIds.filter((id) => !removed.has(id));
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) {
      if (!removed.has(next) && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

const idsOfKind = (design: Design, ...kinds: NodeKind[]) =>
  design.nodes.filter((n) => kinds.includes(n.kind)).map((n) => n.id);

/** Data-bearing sinks users ultimately depend on. */
const persistenceKinds: NodeKind[] = ['datastore', 'objectstore'];

/* ----------------------------------------------------------------------- cost */

export interface CostBreakdown {
  total: number;
  byNode: Record<string, number>;
  byKind: Partial<Record<NodeKind, number>>;
}

export function costOf(design: Design): CostBreakdown {
  const byNode: Record<string, number> = {};
  const byKind: Partial<Record<NodeKind, number>> = {};
  let total = 0;
  for (const n of design.nodes) {
    const c = Math.round(nodeCost(n));
    byNode[n.id] = c;
    byKind[n.kind] = (byKind[n.kind] ?? 0) + c;
    total += c;
  }
  return { total, byNode, byKind };
}

/* ------------------------------------------------------- reliability / SPOF */

export type Severity = 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  nodeId?: string;
  severity: Severity;
  title: string;
  reason: string;
  fix: string;
}

/**
 * A node is a single point of failure if it sits on the critical path — some
 * client can currently reach persistent storage, but cannot if this node is
 * removed — and it is not itself made redundant.
 */
export function findSpof(design: Design): Finding[] {
  const clients = idsOfKind(design, 'client');
  const sinks = new Set(idsOfKind(design, ...persistenceKinds));
  if (!clients.length || !sinks.size) return [];

  const baseline = reachable(design, clients);
  const servedSinks = [...sinks].filter((s) => baseline.has(s));
  if (!servedSinks.length) return [];

  const out: Finding[] = [];
  for (const n of design.nodes) {
    if (n.kind === 'client') continue;

    const withoutNode = reachable(design, clients, new Set([n.id]));
    const nowUnreachable = servedSinks.filter((s) => !withoutNode.has(s));
    if (!nowUnreachable.length) continue; // not on the critical path

    const redundant = isRedundant(n);
    if (redundant) continue;

    out.push({
      id: `spof:${n.id}`,
      nodeId: n.id,
      severity: n.kind === 'datastore' ? 'high' : 'high',
      title: `${n.label} is a single point of failure`,
      reason: `Removing "${n.label}" cuts every client off from ${nowUnreachable.length} storage node${
        nowUnreachable.length > 1 ? 's' : ''
      }, and it has no redundancy configured.`,
      fix: redundancyFix(n.kind),
    });
  }
  return out;
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
    case 'cdn':
    case 'objectstore':
    case 'queue':
      return true; // treated as managed / inherently multi-node
    default:
      return false;
  }
}

function redundancyFix(k: NodeKind): string {
  switch (k) {
    case 'service':
    case 'worker':
      return 'Raise replicas to 2 or more.';
    case 'datastore':
      return 'Enable multi-AZ, or add a read replica for failover.';
    case 'cache':
      return 'Enable multi-AZ so a node loss does not drop the cache tier.';
    case 'loadbalancer':
      return 'Enable multi-AZ so the load balancer is not itself a single node.';
    default:
      return 'Add redundancy for this component.';
  }
}

/* --------------------------------------------------------------- security lint */

export function lint(design: Design): Finding[] {
  const out: Finding[] = [];
  const byId = new Map(design.nodes.map((n) => [n.id, n]));
  const inbound = new Map<string, DuetNode[]>();
  for (const n of design.nodes) inbound.set(n.id, []);
  for (const e of design.edges) {
    const src = byId.get(e.source);
    if (src && inbound.has(e.target)) inbound.get(e.target)!.push(src);
  }
  // The "internet edge" is a client or a CDN — the things that actually sit on
  // the public side. A service with publicIngress is public itself, but it
  // pointing at a database is normal and not a finding.
  const isInternetEdge = (n: DuetNode) => n.kind === 'client' || n.kind === 'cdn';

  for (const n of design.nodes) {
    const sources = inbound.get(n.id) ?? [];
    const outTargets = design.edges
      .filter((e) => e.source === n.id)
      .map((e) => byId.get(e.target))
      .filter(Boolean) as DuetNode[];

    // 1. Stateful tier directly reachable from the internet.
    if (
      ['datastore', 'cache', 'queue'].includes(n.kind) &&
      (n.props.publicIngress || sources.some(isInternetEdge))
    ) {
      out.push({
        id: `lint:public-data:${n.id}`,
        nodeId: n.id,
        severity: 'high',
        title: `${n.label} is reachable from the public internet`,
        reason: n.props.publicIngress
          ? `"${n.label}" has public ingress enabled — a ${kindMeta(n.kind).label.toLowerCase()} should never be internet-facing.`
          : `A client or CDN points straight at ${kindMeta(n.kind).label.toLowerCase()} "${n.label}", with no service tier in between.`,
        fix: 'Put a service in front of it and remove any public ingress into the data tier.',
      });
    }

    // 2. Compute exposed with nothing in front.
    if (n.kind === 'service' && n.props.publicIngress) {
      const frontedByEdge = sources.some((s) => s.kind === 'loadbalancer' || s.kind === 'cdn');
      if (!frontedByEdge) {
        out.push({
          id: `lint:bare-origin:${n.id}`,
          nodeId: n.id,
          severity: 'medium',
          title: `${n.label} is exposed with no load balancer or CDN`,
          reason: `"${n.label}" has public ingress but nothing terminating traffic in front of it.`,
          fix: 'Put a load balancer or CDN in front and drop public ingress on the service.',
        });
      }
    }

    // 3. Synchronous dependency on an unmanaged third party.
    if (n.kind === 'service' || n.kind === 'worker') {
      for (const t of outTargets) {
        if (t.kind === 'external' && !t.props.managed) {
          out.push({
            id: `lint:hard-external:${n.id}:${t.id}`,
            nodeId: t.id,
            severity: 'medium',
            title: `Unmanaged dependency: ${t.label}`,
            reason: `"${n.label}" depends on third-party "${t.label}", which has no SLA marked. An outage there is an outage here.`,
            fix: 'Add a circuit breaker / retry with backoff, buffer via a queue, or mark it managed if it does have an SLA.',
          });
        }
      }
    }

    // 4. Orphan.
    if (sources.length === 0 && outTargets.length === 0 && n.kind !== 'client') {
      out.push({
        id: `lint:orphan:${n.id}`,
        nodeId: n.id,
        severity: 'low',
        title: `${n.label} is not connected to anything`,
        reason: `"${n.label}" has no edges, so it plays no role in the design yet.`,
        fix: 'Connect it, or remove it.',
      });
    }
  }
  return out;
}

/* --------------------------------------------------------------- roll-up */

export interface AnalysisReport {
  cost: CostBreakdown;
  spof: Finding[];
  security: Finding[];
  score: number; // 0–100, purely a headline signal
  summary: string;
}

export function analyze(design: Design): AnalysisReport {
  const cost = costOf(design);
  const spof = findSpof(design);
  const security = lint(design);
  const penalty =
    spof.reduce((s, f) => s + (f.severity === 'high' ? 22 : 12), 0) +
    security.reduce((s, f) => s + (f.severity === 'high' ? 18 : f.severity === 'medium' ? 9 : 3), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const bits: string[] = [];
  bits.push(`~$${cost.total.toLocaleString()}/mo est.`);
  bits.push(spof.length ? `${spof.length} single point(s) of failure` : 'no single points of failure');
  bits.push(
    security.length ? `${security.length} security finding(s)` : 'no security findings',
  );
  return { cost, spof, security, score, summary: bits.join(' · ') };
}

export const nodeFindings = (report: AnalysisReport, nodeId: string): Finding[] =>
  [...report.spof, ...report.security].filter((f) => f.nodeId === nodeId);
