import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type NodeChange,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import { kindMeta } from '../model/catalog';
import { nodeFindings } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import { KindNode, type KindNodeData } from './KindNode';

const nodeTypes = { kind: KindNode };
const FLASH_MS = 1600;

export function Canvas() {
  const design = useDuet((s) => s.design);
  const selectedIds = useDuet((s) => s.selectedIds);
  const touch = useDuet((s) => s.touch);
  const report = useAnalysis();
  const { setCenter, fitView } = useReactFlow();

  const moveNode = useDuet((s) => s.moveNode);
  const setSelection = useDuet((s) => s.setSelection);
  const connect = useDuet((s) => s.connect);
  const disconnect = useDuet((s) => s.disconnect);
  const removeNodes = useDuet((s) => s.removeNodes);

  const flashing = touch && Date.now() - touch.ts < FLASH_MS ? new Set(touch.ids) : new Set<string>();

  const nodes = useMemo<Node<KindNodeData>[]>(
    () =>
      design.nodes.map((n) => ({
        id: n.id,
        type: 'kind',
        position: n.position,
        selected: selectedIds.includes(n.id),
        data: {
          node: n,
          costUsd: report.cost.byNode[n.id] ?? 0,
          findings: nodeFindings(report, n.id),
          flash: flashing.has(n.id),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [design.nodes, selectedIds, report, touch],
  );

  const edges = useMemo<Edge[]>(
    () =>
      design.edges.map((e) => {
        const targetKind = design.nodes.find((n) => n.id === e.target)?.kind;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: e.protocol === 'queue' || e.protocol === 'event',
          style: { stroke: targetKind ? `${kindMeta(targetKind).accent}99` : undefined },
          labelStyle: { fill: 'var(--duet-text-dim)', fontSize: 10 },
          labelBgStyle: { fill: 'var(--duet-panel)' },
        };
      }),
    [design.edges, design.nodes],
  );

  // The node list is fully controlled from the store, so React Flow's own change
  // events have to be translated back into store actions here.
  //  - `position` while dragging  -> moveNode (ignore the programmatic position /
  //    dimension changes RF emits while measuring the graph, or we loop)
  //  - `select`                   -> setSelection (without this, clicking a node
  //    does nothing, because RF never gets to mutate the array it doesn't own)
  //  - `remove`                   -> removeNodes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
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

  useEffect(() => {
    const handler = (ev: Event) => {
      const id = (ev as CustomEvent<{ id: string }>).detail?.id;
      const node = design.nodes.find((n) => n.id === id);
      if (node) setCenter(node.position.x + 95, node.position.y + 30, { zoom: 1.15, duration: 500 });
    };
    const refit = () => fitView({ padding: 0.3, duration: 450 });
    window.addEventListener('duet:focus', handler);
    window.addEventListener('duet:refit', refit);
    return () => {
      window.removeEventListener('duet:focus', handler);
      window.removeEventListener('duet:refit', refit);
    };
  }, [design.nodes, setCenter, fitView]);

  // Refit the view after the graph is re-laid-out (agent change approved, Tidy).
  // Two passes: React Flow needs a tick to apply the new positions and measure
  // the nodes before fitView has anything correct to work with.
  useEffect(() => {
    if (touch?.by !== 'agent') return;
    const fit = () => fitView({ padding: 0.25, duration: 400 });
    const a = setTimeout(fit, 120);
    const b = setTimeout(fit, 500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [touch, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={(c) => c.source && c.target && connect(c.source, c.target)}
      onEdgesDelete={(deleted) => deleted.forEach((e) => disconnect(e.source, e.target))}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'default' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1c2432" />
      <Controls showInteractive={false} />
      {design.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="max-w-xs text-center text-[13px] leading-relaxed text-[var(--duet-text-dim)]">
            <div className="mb-1 text-[var(--duet-text)]">Empty canvas</div>
            Add components from the left, load a template, or ask your agent to draft something.
          </div>
        </div>
      )}
    </ReactFlow>
  );
}
