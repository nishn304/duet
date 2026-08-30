/**
 * The single source of truth. Both the human UI and the WebMCP tools call these
 * same actions — there is no separate "agent path". Agent-originated *mutations*
 * are the exception: they go through `submitProposal` and wait in the Approval
 * Lane until the human accepts them.
 */
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import type {
  ActivityEntry,
  CloudProvider,
  Design,
  DuetEdge,
  NodeKind,
  NodeProps,
  Proposal,
} from './types';
import { kindMeta } from './catalog';
import { layeredLayout } from './layout';
import { applyOps } from './patch';
import { templateByKey } from './templates';

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));

const HISTORY_LIMIT = 50;

export interface Touch {
  ids: string[];
  ts: number;
  by: 'you' | 'agent';
}

interface DuetState {
  design: Design;
  selectedIds: string[];
  proposals: Proposal[];
  activity: ActivityEntry[];
  past: Design[];
  future: Design[];
  /** last set of nodes changed, for the canvas flash effect */
  touch: Touch | null;
  agentPresent: boolean;
  /** when true, agent proposals apply immediately instead of waiting in the lane */
  autoApply: boolean;

  // --- reads used by tools
  snapshot: () => Design;

  // --- direct edits (human, or agent read-only helpers)
  addNode: (kind: NodeKind, opts?: { label?: string; position?: { x: number; y: number }; props?: NodeProps }) => string;
  updateNode: (id: string, patch: { label?: string; props?: Partial<NodeProps> }) => void;
  removeNodes: (ids: string[]) => void;
  connect: (source: string, target: string, opts?: { label?: string; protocol?: DuetEdge['protocol'] }) => void;
  disconnect: (source: string, target: string) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  setSelection: (ids: string[]) => void;
  renameDesign: (name: string) => void;
  setProvider: (provider: CloudProvider, region?: string) => void;
  loadTemplate: (key: string) => void;
  tidyLayout: () => void;

  // --- proposal flow (agent mutations land here)
  submitProposal: (p: Omit<Proposal, 'id' | 'createdAt' | 'status'>) => string;
  approveProposal: (id: string, opIndexes?: number[]) => void;
  rejectProposal: (id: string) => void;

  // --- misc
  logActivity: (actor: 'you' | 'agent', text: string) => void;
  setAgentPresent: (v: boolean) => void;
  setAutoApply: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  clearTouch: () => void;
}

const START: Design = templateByKey('starter-jobs').build();

function activityEntry(actor: 'you' | 'agent', text: string): ActivityEntry {
  return { id: nanoid(6), ts: Date.now(), actor, text };
}

export const useDuet = create<DuetState>((set, get) => {
  /** Snapshot current design into history, then run `mut` to produce the next one. */
  const commit = (mut: (d: Design) => void, touch?: Omit<Touch, 'ts'>) =>
    set((s) => {
      const prev = s.design;
      const next = clone(prev);
      mut(next);
      return {
        design: next,
        past: [...s.past, prev].slice(-HISTORY_LIMIT),
        future: [],
        touch: touch ? { ...touch, ts: Date.now() } : s.touch,
      };
    });

  return {
    design: START,
    selectedIds: [],
    proposals: [],
    activity: [activityEntry('you', 'Opened the "App with jobs" starter.')],
    past: [],
    future: [],
    touch: null,
    agentPresent: false,
    autoApply: false,

    snapshot: () => clone(get().design),

    addNode: (kind, opts = {}) => {
      const id = nanoid(8);
      const meta = kindMeta(kind);
      commit(
        (d) => {
          d.nodes.push({
            id,
            kind,
            label: opts.label ?? `${meta.label} ${d.nodes.filter((n) => n.kind === kind).length + 1}`,
            position: opts.position ?? { x: 160 + Math.random() * 240, y: 140 + Math.random() * 200 },
            props: { ...meta.defaultProps, ...(opts.props ?? {}) },
          });
        },
        { ids: [id], by: 'you' },
      );
      get().logActivity('you', `Added ${meta.label.toLowerCase()} "${opts.label ?? meta.label}".`);
      return id;
    },

    updateNode: (id, patch) => {
      commit(
        (d) => {
          const n = d.nodes.find((x) => x.id === id);
          if (!n) return;
          if (patch.label != null) n.label = patch.label;
          if (patch.props) n.props = { ...n.props, ...patch.props };
        },
        { ids: [id], by: 'you' },
      );
    },

    removeNodes: (ids) => {
      const set0 = new Set(ids);
      commit((d) => {
        d.nodes = d.nodes.filter((n) => !set0.has(n.id));
        d.edges = d.edges.filter((e) => !set0.has(e.source) && !set0.has(e.target));
      });
      set((s) => ({ selectedIds: s.selectedIds.filter((x) => !set0.has(x)) }));
    },

    connect: (source, target, opts = {}) => {
      if (source === target) return;
      commit(
        (d) => {
          if (d.edges.some((e) => e.source === source && e.target === target)) return;
          if (!d.nodes.find((n) => n.id === source) || !d.nodes.find((n) => n.id === target)) return;
          d.edges.push({ id: nanoid(8), source, target, label: opts.label, protocol: opts.protocol });
        },
        { ids: [source, target], by: 'you' },
      );
    },

    disconnect: (source, target) => {
      commit((d) => {
        d.edges = d.edges.filter((e) => !(e.source === source && e.target === target));
      });
    },

    moveNode: (id, position) =>
      // position drags are frequent and not interesting history — mutate in place
      set((s) => {
        const design = clone(s.design);
        const n = design.nodes.find((x) => x.id === id);
        if (!n) return {};
        n.position = position;
        return { design };
      }),

    setSelection: (ids) => set({ selectedIds: ids }),

    renameDesign: (name) => commit((d) => void (d.name = name)),

    tidyLayout: () =>
      set((s) => ({
        design: layeredLayout(s.design),
        past: [...s.past, s.design].slice(-HISTORY_LIMIT),
        future: [],
      })),

    setProvider: (provider, region) =>
      commit((d) => {
        d.provider = provider;
        if (region != null) d.region = region;
      }),

    loadTemplate: (key) => {
      const def = templateByKey(key);
      set((s) => ({
        design: def.build(),
        past: [...s.past, s.design].slice(-HISTORY_LIMIT),
        future: [],
        selectedIds: [],
        proposals: [],
        touch: null,
        activity: [activityEntry('you', `Loaded template: ${def.name}.`), ...s.activity].slice(0, 60),
      }));
    },

    submitProposal: (p) => {
      const id = nanoid(8);
      const proposal: Proposal = { ...p, id, createdAt: Date.now(), status: 'pending' };
      const auto = get().autoApply;
      set((s) => ({
        proposals: [proposal, ...s.proposals].slice(0, 20),
        activity: [
          activityEntry(
            'agent',
            `Proposed: "${p.title}" (${p.ops.length} change${p.ops.length === 1 ? '' : 's'})${
              auto ? '' : ' — awaiting your review.'
            }`,
          ),
          ...s.activity,
        ].slice(0, 60),
      }));
      if (auto) get().approveProposal(id);
      return id;
    },

    approveProposal: (id, opIndexes) => {
      const prop = get().proposals.find((p) => p.id === id);
      if (!prop || prop.status !== 'pending') return;
      const applied = applyOps(get().design, prop.ops, opIndexes);
      const addedNodes = (opIndexes ? prop.ops.filter((_, i) => opIndexes.includes(i)) : prop.ops).some(
        (o) => o.op === 'add_node',
      );
      // A change set that introduces components re-tidies the diagram so it stays
      // readable; it's a single undo to get the old positions back.
      const design = addedNodes ? layeredLayout(applied.design) : applied.design;
      const touchedIds = design.nodes.map((n) => n.id);
      set((s) => ({
        design,
        past: [...s.past, s.design].slice(-HISTORY_LIMIT),
        future: [],
        touch: { ids: touchedIds, ts: Date.now(), by: 'agent' },
        proposals: s.proposals.map((p) =>
          p.id === id
            ? {
                ...p,
                status: opIndexes && opIndexes.length < p.ops.length ? 'partial' : 'applied',
                appliedOps: opIndexes ?? p.ops.map((_, i) => i),
              }
            : p,
        ),
        activity: [
          activityEntry(
            'you',
            `Approved "${prop.title}"${
              opIndexes && opIndexes.length < prop.ops.length ? ` (${opIndexes.length}/${prop.ops.length} changes)` : ''
            }.`,
          ),
          ...s.activity,
        ].slice(0, 60),
      }));
    },

    rejectProposal: (id) => {
      const prop = get().proposals.find((p) => p.id === id);
      if (!prop) return;
      set((s) => ({
        proposals: s.proposals.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p)),
        activity: [activityEntry('you', `Dismissed "${prop.title}".`), ...s.activity].slice(0, 60),
      }));
    },

    logActivity: (actor, text) =>
      set((s) => ({ activity: [activityEntry(actor, text), ...s.activity].slice(0, 60) })),

    setAgentPresent: (v) => set({ agentPresent: v }),

    setAutoApply: (v) => set({ autoApply: v }),

    undo: () =>
      set((s) => {
        if (!s.past.length) return {};
        const previous = s.past[s.past.length - 1];
        return {
          design: previous,
          past: s.past.slice(0, -1),
          future: [s.design, ...s.future].slice(0, HISTORY_LIMIT),
        };
      }),

    redo: () =>
      set((s) => {
        if (!s.future.length) return {};
        const [next, ...rest] = s.future;
        return { design: next, past: [...s.past, s.design].slice(-HISTORY_LIMIT), future: rest };
      }),

    clearTouch: () => set({ touch: null }),
  };
});

/* Convenience selectors */
export const selectDesign = (s: DuetState) => s.design;
export const selectPending = (s: DuetState) => s.proposals.filter((p) => p.status === 'pending');
