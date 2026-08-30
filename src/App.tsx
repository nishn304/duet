import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './canvas/Canvas';
import { Palette } from './canvas/Palette';
import { useDuet } from './model/store';
import { ActivityFeed } from './panels/ActivityFeed';
import { AnalysisSummary } from './panels/AnalysisSummary';
import { ApprovalLane } from './panels/ApprovalLane';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { TopBar } from './TopBar';
import { WebMCPHint } from './panels/WebMCPHint';
import { Tools } from './webmcp/Tools';
import { Btn, Panel, Pill } from './ui/primitives';

function PendingCount() {
  const n = useDuet((s) => s.proposals.filter((p) => p.status === 'pending').length);
  if (!n) return null;
  return <Pill tone="agent">{n} pending</Pill>;
}

function Inspector() {
  const design = useDuet((s) => s.design);
  const selectedIds = useDuet((s) => s.selectedIds);
  const removeNodes = useDuet((s) => s.removeNodes);
  const selected = design.nodes.filter((n) => selectedIds.includes(n.id));

  if (selected.length === 1) return <PropertiesPanel node={selected[0]} />;
  if (selected.length > 1)
    return (
      <div className="flex flex-col gap-3 p-3 text-[12px] text-[var(--duet-text-dim)]">
        <span>{selected.length} components selected.</span>
        <Btn variant="danger" size="sm" className="self-start" onClick={() => removeNodes(selectedIds)}>
          Delete {selected.length} components
        </Btn>
      </div>
    );
  return <AnalysisSummary />;
}

export default function App() {
  const undo = useDuet((s) => s.undo);
  const redo = useDuet((s) => s.redo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <ReactFlowProvider>
      <Tools />
      <div className="flex h-full flex-col">
        <TopBar />
        <WebMCPHint />
        <div className="flex min-h-0 flex-1">
          <aside className="w-[148px] shrink-0 overflow-hidden border-r border-[var(--duet-border)] bg-[var(--duet-panel)]">
            <Palette />
          </aside>
          <main className="relative min-w-0 flex-1">
            <Canvas />
          </main>
          <aside className="flex w-[344px] shrink-0 flex-col gap-2 border-l border-[var(--duet-border)] bg-[var(--duet-bg)] p-2">
            <Panel title="Inspector" className="min-h-0 flex-1">
              <Inspector />
            </Panel>
            <Panel
              title="Approval lane"
              right={<PendingCount />}
              className="min-h-0 max-h-[44%] shrink-0"
            >
              <ApprovalLane />
            </Panel>
            <Panel title="Activity" className="h-[132px] shrink-0">
              <ActivityFeed />
            </Panel>
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
