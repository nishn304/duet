import { useState } from 'react';
import { useDuet } from '../model/store';
import { CloseIcon } from '../ui/icons';

const KEY = 'duet.hint.dismissed';

function readDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Tells a visitor with no WebMCP host how to get one, without blocking them. */
export function WebMCPHint() {
  const agentPresent = useDuet((s) => s.agentPresent);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (agentPresent || dismissed) return null;

  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-agent/[0.06] px-3.5 py-1.5">
      <span className="text-[11.5px] font-semibold text-agent">Running solo</span>
      <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
        Duet works on its own — but to let an agent drive it, open this page in ChatGPT&rsquo;s in-app
        browser, or Chrome&nbsp;146+ with{' '}
        <code className="num rounded bg-white/8 px-1 py-px text-[10.5px] text-fg">
          chrome://flags/#enable-webmcp-testing
        </code>
        .
      </span>
      <button
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* private mode — dismiss for this session only */
          }
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-white/8 hover:text-fg"
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
