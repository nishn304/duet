import { useState } from 'react';
import { useDuet } from './model/store';
import type { CloudProvider } from './model/types';
import { ExportDialog } from './panels/ExportDialog';
import { Btn, Pill } from './ui/primitives';

const PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'cloudflare', 'generic'];

export function TopBar() {
  const design = useDuet((s) => s.design);
  const rename = useDuet((s) => s.renameDesign);
  const setProvider = useDuet((s) => s.setProvider);
  const undo = useDuet((s) => s.undo);
  const redo = useDuet((s) => s.redo);
  const tidy = useDuet((s) => s.tidyLayout);
  const canUndo = useDuet((s) => s.past.length > 0);
  const canRedo = useDuet((s) => s.future.length > 0);
  const hasNodes = useDuet((s) => s.design.nodes.length > 0);
  const agentPresent = useDuet((s) => s.agentPresent);
  const [exporting, setExporting] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b border-[var(--duet-border)] bg-[var(--duet-panel)] px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-bold tracking-tight text-[var(--duet-text)]">Duet</span>
        <span className="hidden text-[11px] text-[var(--duet-text-dim)] sm:inline">
          design infra with your agent
        </span>
      </div>

      <div className="mx-1 h-4 w-px bg-[var(--duet-border)]" />

      <input
        value={design.name}
        onChange={(e) => rename(e.target.value)}
        className="w-44 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium text-[var(--duet-text)] outline-none hover:border-[var(--duet-border)] focus:border-[var(--duet-accent)]"
      />

      <select
        value={design.provider}
        onChange={(e) => setProvider(e.target.value as CloudProvider)}
        className="rounded border border-[var(--duet-border)] bg-[var(--duet-bg)] px-1.5 py-1 text-[12px] text-[var(--duet-text-dim)] outline-none"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1.5">
        <Btn size="sm" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
          Undo
        </Btn>
        <Btn size="sm" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          Redo
        </Btn>
        <Btn
          size="sm"
          onClick={() => {
            tidy();
            window.dispatchEvent(new Event('duet:refit'));
          }}
          disabled={!hasNodes}
          title="Auto-arrange the diagram"
        >
          Tidy
        </Btn>
        <Btn size="sm" variant="primary" onClick={() => setExporting(true)} disabled={!hasNodes}>
          Export config
        </Btn>
        {agentPresent ? (
          <Pill tone="agent">
            <span className="duet-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--duet-agent)]" />
            agent connected
          </Pill>
        ) : (
          <Pill tone="neutral" >agent not detected</Pill>
        )}
      </div>

      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </header>
  );
}
