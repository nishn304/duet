import { useState } from 'react';
import { useDuet } from './model/store';
import type { CloudProvider } from './model/types';
import { ExportDialog } from './panels/ExportDialog';
import { Btn, Pill } from './ui/primitives';
import { ExportIcon, RedoIcon, TidyIcon, UndoIcon } from './ui/icons';

const PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'cloudflare', 'generic'];

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid h-[22px] w-[22px] place-items-center rounded-[7px] text-[13px] font-bold"
        style={{
          background: 'linear-gradient(140deg, var(--color-accent), var(--color-agent))',
          color: '#05070e',
          boxShadow: '0 2px 12px -3px var(--color-accent)',
        }}
      >
        D
      </span>
      <span className="text-[14px] font-bold tracking-[-0.02em]">Duet</span>
    </div>
  );
}

function AgentBadge() {
  const present = useDuet((s) => s.agentPresent);
  return present ? (
    <Pill tone="agent">
      <span className="live-dot inline-block h-[6px] w-[6px] rounded-full bg-agent" />
      Agent connected
    </Pill>
  ) : (
    <Pill tone="neutral">
      <span className="inline-block h-[6px] w-[6px] rounded-full bg-faint" />
      No agent
    </Pill>
  );
}

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
  const [exporting, setExporting] = useState(false);

  return (
    <header className="panel flex h-[52px] shrink-0 items-center gap-3 border-x-0 border-t-0 px-3.5">
      <Wordmark />

      <div className="h-5 w-px bg-line" />

      <input
        value={design.name}
        onChange={(e) => rename(e.target.value)}
        aria-label="Design name"
        className="w-52 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13.5px] font-semibold tracking-[-0.01em] outline-none transition-colors hover:border-line focus:border-accent/60 focus:bg-canvas"
      />

      <select
        value={design.provider}
        onChange={(e) => setProvider(e.target.value as CloudProvider)}
        aria-label="Cloud provider"
        className="field h-7 cursor-pointer text-muted"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5">
          <Btn
            variant="bare"
            size="xs"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
            icon={<UndoIcon className="h-3.5 w-3.5" />}
          />
          <Btn
            variant="bare"
            size="xs"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
            icon={<RedoIcon className="h-3.5 w-3.5" />}
          />
          <Btn
            variant="bare"
            size="xs"
            onClick={() => {
              tidy();
              window.dispatchEvent(new Event('duet:refit'));
            }}
            disabled={!hasNodes}
            title="Auto-arrange the diagram"
            aria-label="Tidy layout"
            icon={<TidyIcon className="h-3.5 w-3.5" />}
          />
        </div>

        <Btn
          size="sm"
          variant="primary"
          onClick={() => setExporting(true)}
          disabled={!hasNodes}
          icon={<ExportIcon className="h-3.5 w-3.5" />}
        >
          Export
        </Btn>

        <div className="ml-1">
          <AgentBadge />
        </div>
      </div>

      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </header>
  );
}
