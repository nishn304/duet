import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type NodeChange,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import { kindMeta } from '../model/catalog';
import { nodeFindings } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useSimulation } from '../model/useSimulation';
import { useDuet } from '../model/store';
import { KindNode, type KindNodeData } from './KindNode';

const nodeTypes = { kind: KindNode };
const FLASH_MS = 1600;
const FIT = { padding: 0.16, maxZoom: 1.05 } as const;
/** Rendered size of a KindNode. Fixed width; height is the tallest common case
 *  (title + kind + a row of property pills). Used to frame the graph from the
 *  model instead of waiting on DOM measurement. */
const NODE_W = 216;
const NODE_H = 96;

export function Canvas() {
  const design = useDuet((s) => s.design);
  const selectedIds = useDuet((s) => s.selectedIds);
  const touch = useDuet((s) => s.touch);
  const report = useAnalysis();
  const blast = useSimulation();
  const { setCenter, fitBounds } = useReactFlow();
  const nodeCount = design.nodes.length;

  const moveNode = useDuet((s) => s.moveNode);
  const setSelection = useDuet((s) => s.setSelection);
  const connect = useDuet((s) => s.connect);
  const disconnect = useDuet((s) => s.disconnect);
  const removeNodes = useDuet((s) => s.removeNodes);

  /*
   * React Flow's node list is kept in local state rather than rebuilt from the
   * store on every render. React Flow owns fields on each node that the design
   * model knows nothing about — chiefly `measured`, the rendered size — and it
   * drops them when handed brand-new objects, hiding each node until a fresh
   * measurement arrives. The store stays the source of truth for the *design*;
   * this state carries React Flow's own fields forward across every rebuild so
   * nothing has to be re-measured.
   */
  const [rfNodes, setRfNodes] = useState<Node<KindNodeData>[]>([]);

  useEffect(() => {
    const flashing =
      touch && Date.now() - touch.ts < FLASH_MS ? new Set(touch.ids) : new Set<string>();

    // Deriving this during render is not possible: building the next list needs
    // the previous one (to carry `measured` forward), and the previous one is
    // also written by onNodesChange. Two writers means it has to be state.
    // oxlint-disable-next-line react/set-state-in-effect
    setRfNodes((prev) => {
      const carry = new Map(prev.map((n) => [n.id, n]));
      return design.nodes.map((n) => {
        const kept = carry.get(n.id);
        return {
          ...kept,
          id: n.id,
          type: 'kind',
          position: n.position,
          selected: selectedIds.includes(n.id),
          data: {
            node: n,
            costUsd: report.cost.byNode[n.id] ?? 0,
            findings: nodeFindings(report, n.id),
            flash: flashing.has(n.id),
            impact: blast?.impact[n.id],
          },
        } as Node<KindNodeData>;
      });
    });
  }, [design.nodes, selectedIds, report, touch, blast]);

  // Edges take the colour of the component they lead into, so a glance at the
  // canvas reads as "traffic flowing toward state".
  const edges = useMemo<Edge[]>(
    () =>
      design.edges.map((e) => {
        const targetKind = design.nodes.find((n) => n.id === e.target)?.kind;
        const accent = targetKind ? kindMeta(targetKind).accent : '#5a6070';
        const async = e.protocol === 'queue' || e.protocol === 'event';
        // Under simulation, an edge that touches the failed component is a broken
        // link; everything else recedes with the rest of the unaffected system.
        const severed =
          blast != null && (e.source === blast.failedId || e.target === blast.failedId);
        const dimmed = blast != null && !severed;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          pathOptions: { borderRadius: 18 },
          label: e.label,
          animated: async,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 13,
            height: 13,
            color: `color-mix(in oklab, ${accent} 62%, transparent)`,
          },
          style: {
            stroke: severed
              ? 'var(--color-danger)'
              : `color-mix(in oklab, ${accent} 55%, transparent)`,
            strokeWidth: severed ? 2 : 1.5,
            strokeDasharray: severed ? '3 5' : async ? '5 4' : undefined,
            opacity: dimmed ? 0.18 : 1,
          },
          labelStyle: { fill: 'var(--color-faint)', fontSize: 9.5, fontWeight: 500 },
          labelBgStyle: { fill: 'var(--color-ground)' },
          labelBgPadding: [5, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      }),
    [design.edges, design.nodes, blast],
  );

  /*
   * Changes flow two ways: React Flow's own bookkeeping (measurements above all)
   * is applied to local state, and the ones that mean something to the design —
   * a drag, a selection, a deletion — are translated into store actions.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds) as Node<KindNodeData>[]);

      let nextSel: string[] | null = null;
      for (const c of changes) {
        if (c.type === 'position') {
          if (c.dragging && c.position) moveNode(c.id, c.position);
        } else if (c.type === 'select') {
          if (!nextSel) nextSel = [...useDuet.getState().selectedIds];
          nextSel = c.selected
            ? nextSel.includes(c.id)
              ? nextSel
              : [...nextSel, c.id]
            : nextSel.filter((id) => id !== c.id);
        } else if (c.type === 'remove') {
          removeNodes([c.id]);
        }
      }
      if (nextSel) {
        const cur = useDuet.getState().selectedIds;
        if (nextSel.length !== cur.length || nextSel.some((id) => !cur.includes(id))) {
          setSelection(nextSel);
        }
      }
    },
    [moveNode, removeNodes, setSelection],
  );

  /*
   * Framing the graph is done from the model, not from the DOM. `fitView` reads
   * *measured* node sizes, and a node a proposal just added has none until React
   * Flow has rendered it — so fitting right after an approval would frame the old
   * graph and leave the new components off screen. Node size on this canvas is a
   * known constant, so the bounds can be derived from the design directly and
   * framed immediately, with no waiting on measurement.
   */
  const frameDesign = useCallback(
    (duration = 420) => {
      const ns = useDuet.getState().design.nodes;
      if (!ns.length) return;
      const xs = ns.map((n) => n.position.x);
      const ys = ns.map((n) => n.position.y);
      fitBounds(
        {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) + NODE_W - Math.min(...xs),
          height: Math.max(...ys) + NODE_H - Math.min(...ys),
        },
        { padding: FIT.padding, duration },
      );
    },
    [fitBounds],
  );

  useEffect(() => {
    const focus = (ev: Event) => {
      const id = (ev as CustomEvent<{ id: string }>).detail?.id;
      const node = design.nodes.find((n) => n.id === id);
      if (node)
        setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, {
          zoom: 1.15,
          duration: 480,
        });
    };
    const refit = () => frameDesign();
    window.addEventListener('duet:focus', focus);
    window.addEventListener('duet:refit', refit);
    return () => {
      window.removeEventListener('duet:focus', focus);
      window.removeEventListener('duet:refit', refit);
    };
  }, [design.nodes, setCenter, frameDesign]);

  // Reframe after an approved agent change re-lays-out the graph.
  useEffect(() => {
    if (touch?.by === 'agent') frameDesign();
  }, [touch, frameDesign]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={(c) => c.source && c.target && connect(c.source, c.target)}
      onEdgesDelete={(deleted) => deleted.forEach((e) => disconnect(e.source, e.target))}
      fitView
      fitViewOptions={FIT}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1a1f2e" />
      <Controls showInteractive={false} position="bottom-left" />
      {nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="max-w-[30ch] text-center">
            <p className="text-[14px] font-semibold">Empty canvas</p>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-faint">
              Add components from the left, pick a starting point, or ask your agent to draft
              something.
            </p>
          </div>
        </div>
      )}
    </ReactFlow>
  );
}
