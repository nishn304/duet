import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './canvas/Canvas';
import { Palette } from './canvas/Palette';
import { useDuet } from './model/store';
import { RightRail } from './panels/RightRail';
import { WebMCPHint } from './panels/WebMCPHint';
import { TopBar } from './TopBar';
import { Tools } from './webmcp/Tools';

export default function App() {
  const undo = useDuet((s) => s.undo);
  const redo = useDuet((s) => s.redo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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
      <div className="flex h-full flex-col bg-canvas">
        <TopBar />
        <WebMCPHint />
        <div className="flex min-h-0 flex-1">
          <aside className="w-[172px] shrink-0 border-r border-line bg-surface">
            <Palette />
          </aside>
          <main className="canvas-lit relative min-w-0 flex-1">
            <Canvas />
          </main>
          <RightRail />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
