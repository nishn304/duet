import { useState } from 'react';
import { useDuet } from './model/store';
import type { CloudProvider } from './model/types';
import { ExportDialog } from './panels/ExportDialog';
import { Btn } from './ui/primitives';
import { ExportIcon, RedoIcon, TidyIcon, UndoIcon } from './ui/icons';

const PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'cloudflare', 'generic'];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 pl-1">
      <span
        className="grid h-7 w-7 place-items-center rounded-[9px] text-[14px] font-bold"
        style={{
          background: 'linear-gradient(145deg, var(--color-accent), var(--color-agent))',
          color: '#fff',
          boxShadow: '0 3px 16px -4px var(--color-accent), inset 0 1px 0 rgb(255 255 255 / 0.3)',
        }}
      >
        D
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.03em]">Duet</span>
    </div>
  );
}

function AgentBadge() {
  const present = useDuet((s) => s.agentPresent);
  return (
    <span
      className={
        'inline-flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3 text-[12px] font-medium ' +
        (present ? 'bg-agent/14 text-agent' : 'bg-white/[0.06] text-faint')
      }
    >
      <span
        className={
          'h-[6px] w-[6px] rounded-full ' + (present ? 'live-dot bg-agent' : 'bg-faint')
        }
        style={present ? { boxShadow: '0 0 10px var(--color-agent)' } : undefined}
      />
      {present ? 'Agent connected' : 'No agent'}
    </span>
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
    <header className="glass flex h-[54px] shrink-0 items-center gap-3 rounded-xl px-3">
      <Wordmark />

      <span className="h-5 w-px bg-line" />

      <input
        value={design.name}
        onChange={(e) => rename(e.target.value)}
        aria-label="Design name"
        className="w-56 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] font-medium tracking-[-0.015em] outline-none transition-colors hover:bg-white/[0.05] focus:border-accent/50 focus:bg-white/[0.05]"
      />

      <select
        value={design.provider}
        onChange={(e) => setProvider(e.target.value as CloudProvider)}
        aria-label="Cloud provider"
        className="field h-[30px] cursor-pointer py-0 text-muted"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.045] p-1">
          <Btn
            variant="bare"
            size="xs"
            className="w-[30px] px-0"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
            icon={<UndoIcon className="h-[15px] w-[15px]" />}
          />
          <Btn
            variant="bare"
            size="xs"
            className="w-[30px] px-0"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
            icon={<RedoIcon className="h-[15px] w-[15px]" />}
          />
          <Btn
            variant="bare"
            size="xs"
            className="w-[30px] px-0"
            onClick={() => {
              tidy();
              window.dispatchEvent(new Event('duet:refit'));
            }}
            disabled={!hasNodes}
            title="Auto-arrange the diagram"
            aria-label="Tidy layout"
            icon={<TidyIcon className="h-[15px] w-[15px]" />}
          />
        </div>

        <Btn
          size="sm"
          variant="primary"
          onClick={() => setExporting(true)}
          disabled={!hasNodes}
          icon={<ExportIcon className="h-[15px] w-[15px]" />}
        >
          Export
        </Btn>

        <AgentBadge />
      </div>

      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </header>
  );
}
