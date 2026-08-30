/**
 * Proposal application.
 *
 * The agent never edits the design directly. It submits a Proposal — an ordered
 * list of Ops — which the human reviews in the Approval Lane. `applyOps` is the
 * single code path that turns approved ops into a new Design, used for both
 * "approve all" and partial (per-op) approval. `describeProposal` produces the
 * human-readable diff, including the cost and reliability delta, that makes the
 * lane a real review surface rather than a yes/no button.
 */
import { nanoid } from 'nanoid';
import { analyze } from './analysis';
import { kindMeta } from './catalog';
import type { Design, DuetEdge, DuetNode, Op, Proposal } from './types';

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));

export interface ApplyResult {
  design: Design;
  /** tempId -> real id for nodes created by this batch */
  created: Record<string, string>;
  notes: string[];
}

/** Apply a subset of a proposal's ops (by index) to a design, returning a new one. */
export function applyOps(base: Design, ops: Op[], opIndexes?: number[]): ApplyResult {
  const design = clone(base);
  const created: Record<string, string> = {};
  const notes: string[] = [];
  const chosen = opIndexes ? ops.filter((_, i) => opIndexes.includes(i)) : ops;

  const resolve = (ref: string): string | undefined => {
    if (created[ref]) return created[ref];
    return design.nodes.find((n) => n.id === ref)?.id;
  };
  const hasEdge = (s: string, t: string) =>
    design.edges.some((e) => e.source === s && e.target === t);

  let spawnIndex = 0;
  for (const op of chosen) {
    switch (op.op) {
      case 'add_node': {
        const id = nanoid(8);
        created[op.tempId] = id;
        const meta = kindMeta(op.kind);
        const spread = spawnIndex++;
        const node: DuetNode = {
          id,
          kind: op.kind,
          label: op.label || meta.label,
          position: op.position ?? {
            x: 120 + (spread % 4) * 220,
            y: 120 + Math.floor(spread / 4) * 160,
          },
          props: { ...meta.defaultProps, ...(op.props ?? {}) },
        };
        design.nodes.push(node);
        notes.push(`+ ${meta.label} "${node.label}"`);
        break;
      }
      case 'update_node': {
        const target = design.nodes.find((n) => n.id === op.id || created[op.id] === n.id);
        if (!target) {
          notes.push(`! update skipped — no node ${op.id}`);
          break;
        }
        if (op.label != null) target.label = op.label;
        if (op.props) target.props = { ...target.props, ...op.props };
        notes.push(`~ ${target.label}`);
        break;
      }
      case 'remove_node': {
        const target = design.nodes.find((n) => n.id === op.id);
        if (!target) {
          notes.push(`! remove skipped — no node ${op.id}`);
          break;
        }
        design.nodes = design.nodes.filter((n) => n.id !== target.id);
        design.edges = design.edges.filter(
          (e) => e.source !== target.id && e.target !== target.id,
        );
        notes.push(`− ${target.label}`);
        break;
      }
      case 'connect': {
        const s = resolve(op.source);
        const t = resolve(op.target);
        if (!s || !t) {
          notes.push(`! connect skipped — unknown endpoint`);
          break;
        }
        if (s === t || hasEdge(s, t)) break;
        const edge: DuetEdge = {
          id: nanoid(8),
          source: s,
          target: t,
          label: op.label,
          protocol: op.protocol,
        };
        design.edges.push(edge);
        const sl = design.nodes.find((n) => n.id === s)?.label ?? s;
        const tl = design.nodes.find((n) => n.id === t)?.label ?? t;
        notes.push(`→ ${sl} to ${tl}`);
        break;
      }
      case 'disconnect': {
        const s = resolve(op.source);
        const t = resolve(op.target);
        const before = design.edges.length;
        design.edges = design.edges.filter((e) => !(e.source === s && e.target === t));
        if (design.edges.length < before) notes.push(`⇥ removed edge`);
        break;
      }
    }
  }
  return { design, created, notes };
}

export interface OpLine {
  index: number;
  text: string;
}

export interface ProposalDiff {
  lines: OpLine[];
  costBefore: number;
  costAfter: number;
  spofBefore: number;
  spofAfter: number;
  securityBefore: number;
  securityAfter: number;
}

export function describeOp(op: Op, design: Design): string {
  const label = (ref: string) =>
    design.nodes.find((n) => n.id === ref)?.label ?? ref;
  switch (op.op) {
    case 'add_node':
      return `Add ${kindMeta(op.kind).label} "${op.label}"${
        op.props && Object.keys(op.props).length
          ? ` (${Object.entries(op.props)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')})`
          : ''
      }`;
    case 'update_node':
      return `Update ${label(op.id)}${
        op.props
          ? `: ${Object.entries(op.props)
              .map(([k, v]) => `${k}→${v}`)
              .join(', ')}`
          : ''
      }${op.label ? ` rename to "${op.label}"` : ''}`;
    case 'remove_node':
      return `Remove ${label(op.id)}`;
    case 'connect':
      return `Connect ${label(op.source)} → ${label(op.target)}${op.label ? ` (${op.label})` : ''}`;
    case 'disconnect':
      return `Disconnect ${label(op.source)} → ${label(op.target)}`;
  }
}

export function describeProposal(proposal: Proposal, design: Design): ProposalDiff {
  const before = analyze(design);
  const { design: after } = applyOps(design, proposal.ops);
  const afterReport = analyze(after);
  return {
    lines: proposal.ops.map((op, index) => ({ index, text: describeOp(op, design) })),
    costBefore: before.cost.total,
    costAfter: afterReport.cost.total,
    spofBefore: before.spof.length,
    spofAfter: afterReport.spof.length,
    securityBefore: before.security.length,
    securityAfter: afterReport.security.length,
  };
}
