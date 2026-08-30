/**
 * Every WebMCP tool Duet exposes, in one component. Mounted once, near the root.
 *
 * Design rules:
 *  - Read tools carry `readOnlyHint` and return structured JSON.
 *  - Tools that would change the shared design NEVER mutate it. They create a
 *    Proposal in the Approval Lane and return what the change *would* do (cost
 *    and reliability deltas), so the agent gets immediate feedback while the
 *    human stays the one who commits it.
 *  - `focus_component` is the exception among the non-read tools: it moves the
 *    human's view, not the design — that co-presence ("show me the risky part")
 *    is the point of running this in a shared tab.
 *  - `get_pending_proposals` is only registered while something is pending, so
 *    the agent's tool list tracks the actual state of the review queue.
 */
import { useEffect } from 'react';
import { useWebMCP } from 'use-webmcp-tool';
import { CATALOG } from '../model/catalog';
import { analyze, nodeFindings } from '../model/analysis';
import { compile } from '../model/iac';
import { describeProposal } from '../model/patch';
import { useDuet } from '../model/store';
import type { EdgeProtocol, NodeKind, NodeProps, Op } from '../model/types';
import {
  addComponentSchema,
  connectComponentsSchema,
  exportSchema,
  idSchema,
  proposeChangesSchema,
  updateComponentSchema,
} from './schemas';

const RO = { readOnlyHint: true } as const;

/** Compact, agent-readable summary of what a proposal would do if approved. */
function proposalFeedback(title: string, ops: Op[]) {
  const design = useDuet.getState().design;
  const diff = describeProposal(
    { id: 'preview', title, ops, createdAt: 0, status: 'pending' },
    design,
  );
  return {
    status: 'pending_review',
    message: `Proposal "${title}" is in the Approval Lane. The human decides whether to apply it.`,
    wouldChange: diff.lines.map((l) => l.text),
    costPerMonthUsd: { before: diff.costBefore, after: diff.costAfter },
    singlePointsOfFailure: { before: diff.spofBefore, after: diff.spofAfter },
    securityFindings: { before: diff.securityBefore, after: diff.securityAfter },
  };
}

function submit(title: string, ops: Op[], rationale?: string) {
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('ops must be a non-empty array');
  const id = useDuet.getState().submitProposal({ title, rationale, ops });
  return { proposalId: id, ...proposalFeedback(title, ops) };
}

export function Tools() {
  const setAgentPresent = useDuet((s) => s.setAgentPresent);
  const pendingCount = useDuet((s) => s.proposals.filter((p) => p.status === 'pending').length);

  /* ---------------------------------------------------------------- read tools */

  const first = useWebMCP({
    name: 'get_design',
    description:
      'Return the entire design as structured JSON: every component (id, kind, label, properties) and every connection (source, target, protocol). Call this first to see the board.',
    annotations: RO,
    async execute() {
      const d = useDuet.getState().design;
      return {
        name: d.name,
        provider: d.provider,
        region: d.region,
        nodes: d.nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label, props: n.props })),
        edges: d.edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
          protocol: e.protocol,
        })),
      };
    },
  });

  useEffect(() => {
    setAgentPresent(first.supported);
  }, [first.supported, setAgentPresent]);

  useWebMCP({
    name: 'list_component_types',
    description:
      'Return Duet’s component vocabulary: each kind, what it means, its default properties, and which upstream kinds normally connect into it. Use this to choose valid kinds for propose_changes / add_component.',
    annotations: RO,
    async execute() {
      return Object.values(CATALOG).map((m) => ({
        kind: m.kind,
        label: m.label,
        description: m.blurb,
        stateful: m.stateful,
        defaultProps: m.defaultProps,
        expectedSources: m.expectedSources,
      }));
    },
  });

  useWebMCP({
    name: 'analyze_design',
    description:
      'Run Duet’s analysis over the current design: rough monthly cost (with per-component breakdown), single points of failure, and security findings. Every finding includes the reason it fired and the concrete fix that clears it.',
    annotations: RO,
    async execute() {
      const d = useDuet.getState().design;
      const r = analyze(d);
      const label = (id?: string) => d.nodes.find((n) => n.id === id)?.label;
      return {
        summary: r.summary,
        headlineScore: r.score,
        estimatedMonthlyCostUsd: r.cost.total,
        costByComponent: d.nodes.map((n) => ({ id: n.id, label: n.label, usd: r.cost.byNode[n.id] })),
        singlePointsOfFailure: r.spof.map((f) => ({
          component: label(f.nodeId),
          id: f.nodeId,
          severity: f.severity,
          reason: f.reason,
          fix: f.fix,
        })),
        securityFindings: r.security.map((f) => ({
          component: label(f.nodeId),
          id: f.nodeId,
          severity: f.severity,
          title: f.title,
          reason: f.reason,
          fix: f.fix,
        })),
      };
    },
  });

  useWebMCP({
    name: 'get_selection',
    description:
      'Return the components the human currently has selected on the canvas (id, kind, label) plus any analysis findings attached to them. Use this to act on "fix what I’ve selected" / "explain this".',
    annotations: RO,
    async execute() {
      const s = useDuet.getState();
      const report = analyze(s.design);
      const sel = s.design.nodes.filter((n) => s.selectedIds.includes(n.id));
      return {
        count: sel.length,
        components: sel.map((n) => ({
          id: n.id,
          kind: n.kind,
          label: n.label,
          props: n.props,
          findings: nodeFindings(report, n.id).map((f) => ({ severity: f.severity, title: f.title, fix: f.fix })),
        })),
      };
    },
  });

  useWebMCP<{ format: 'compose' | 'terraform' }>({
    name: 'export_config',
    description:
      'Compile the current design to infrastructure config and return it as text. format: "compose" for a docker-compose.yml, "terraform" for a main.tf sketch. Output is a structural starting point, not apply-ready.',
    inputSchema: exportSchema,
    annotations: RO,
    async execute({ format }) {
      const d = useDuet.getState().design;
      const { filename, body } = compile(d, format === 'terraform' ? 'terraform' : 'compose');
      return { filename, contents: body };
    },
  });

  useWebMCP<{ id: string }>({
    name: 'focus_component',
    description:
      'Select a component by id and center the human’s view on it. Moves the shared view only — does not change the design. Use it to point the person at something ("here’s the single point of failure").',
    inputSchema: idSchema,
    async execute({ id }) {
      const s = useDuet.getState();
      const node = s.design.nodes.find((n) => n.id === id);
      if (!node) throw new Error(`No component with id "${id}"`);
      s.setSelection([id]);
      s.logActivity('agent', `Pointed at "${node.label}".`);
      window.dispatchEvent(new CustomEvent('duet:focus', { detail: { id } }));
      return `Focused "${node.label}".`;
    },
  });

  /* ------------------------------------------------------- proposal-making tools */

  useWebMCP<{ title: string; rationale?: string; ops: Op[] }>({
    name: 'propose_changes',
    description:
      'Propose a batch of changes to the design. Does NOT apply them — it puts an itemised, reviewable diff in the Approval Lane for the human. Returns what the change would do to cost and reliability. Use tempIds in add_node ops to wire up new components within the same proposal. Get real node ids from get_design first.',
    inputSchema: proposeChangesSchema,
    async execute({ title, rationale, ops }) {
      return submit(String(title || 'Proposed changes'), ops as Op[], rationale);
    },
  });

  useWebMCP<{
    kind: NodeKind;
    label: string;
    props?: NodeProps;
    connectFrom?: string[];
    connectTo?: string[];
  }>({
    name: 'add_component',
    description:
      'Convenience wrapper over propose_changes for adding one component and (optionally) wiring it to existing ones. Creates a pending proposal for the human to approve.',
    inputSchema: addComponentSchema,
    async execute({ kind, label, props, connectFrom, connectTo }) {
      const tempId = 'new1';
      const ops: Op[] = [{ op: 'add_node', tempId, kind, label, props }];
      for (const s of connectFrom ?? []) ops.push({ op: 'connect', source: s, target: tempId });
      for (const t of connectTo ?? []) ops.push({ op: 'connect', source: tempId, target: t });
      return submit(`Add ${label}`, ops);
    },
  });

  useWebMCP<{ source: string; target: string; label?: string; protocol?: EdgeProtocol }>({
    name: 'connect_components',
    description:
      'Convenience wrapper over propose_changes for adding a single connection between two existing components. Creates a pending proposal.',
    inputSchema: connectComponentsSchema,
    async execute({ source, target, label, protocol }) {
      return submit(`Connect ${source} → ${target}`, [
        { op: 'connect', source, target, label, protocol },
      ]);
    },
  });

  useWebMCP<{ id: string; label?: string; props?: NodeProps }>({
    name: 'update_component',
    description:
      'Convenience wrapper over propose_changes for changing one component’s label or properties (e.g. bump replicas, enable multiAz). Creates a pending proposal.',
    inputSchema: updateComponentSchema,
    async execute({ id, label, props }) {
      const node = useDuet.getState().design.nodes.find((n) => n.id === id);
      return submit(`Update ${node?.label ?? id}`, [{ op: 'update_node', id, label, props }]);
    },
  });

  useWebMCP<{ id: string }>({
    name: 'remove_component',
    description:
      'Convenience wrapper over propose_changes for removing one component (and its connections). Creates a pending proposal.',
    inputSchema: idSchema,
    async execute({ id }) {
      const node = useDuet.getState().design.nodes.find((n) => n.id === id);
      if (!node) throw new Error(`No component with id "${id}"`);
      return submit(`Remove ${node.label}`, [{ op: 'remove_node', id }]);
    },
  });

  /* ------------------------------------- dynamic: only present while pending > 0 */

  useWebMCP({
    name: 'get_pending_proposals',
    description:
      'List the proposals currently waiting in the Approval Lane, with their per-op diff and status. Only available while something is pending.',
    annotations: RO,
    enabled: pendingCount > 0,
    async execute() {
      const s = useDuet.getState();
      return s.proposals
        .filter((p) => p.status === 'pending')
        .map((p) => {
          const diff = describeProposal(p, s.design);
          return {
            proposalId: p.id,
            title: p.title,
            rationale: p.rationale,
            changes: diff.lines.map((l) => l.text),
            costPerMonthUsd: { before: diff.costBefore, after: diff.costAfter },
            singlePointsOfFailure: { before: diff.spofBefore, after: diff.spofAfter },
          };
        });
    },
  });

  return null;
}
