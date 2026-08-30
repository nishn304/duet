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

/**
 * A floating note for visitors with no WebMCP host, telling them how to get one.
 * Deliberately a toast rather than a banner — it is an aside, not a blocker.
 */
export function WebMCPHint() {
  const agentPresent = useDuet((s) => s.agentPresent);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (agentPresent || dismissed) return null;

  return (
    <div className="rise pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="glass pointer-events-auto flex max-w-2xl items-center gap-3 rounded-full py-2 pl-4 pr-2">
        <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold text-agent">
          Running solo
        </span>
        <span className="min-w-0 text-[12px] leading-snug text-muted">
          To let an agent drive this, open it in ChatGPT&rsquo;s in-app browser, or Chrome&nbsp;146+
          with{' '}
          <code className="num rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-fg">
            chrome://flags/#enable-webmcp-testing
          </code>
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
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-white/[0.08] hover:text-fg"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
