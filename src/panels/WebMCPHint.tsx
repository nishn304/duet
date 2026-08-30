import { useState } from 'react';
import { useDuet } from '../model/store';

const KEY = 'duet.hint.dismissed';

function readDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function WebMCPHint() {
  const agentPresent = useDuet((s) => s.agentPresent);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (agentPresent || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-[var(--duet-border)] bg-[#c8a2ff12] px-3 py-1.5 text-[12px] text-[var(--duet-text-dim)]">
      <span className="text-[var(--duet-agent)]">No agent host detected.</span>
      <span>
        Duet still works solo. To let an agent use it, open this page in ChatGPT’s in-app browser, or
        Chrome 146+ with{' '}
        <code className="rounded bg-[var(--duet-panel-2)] px-1 py-0.5 text-[11px]">
          chrome://flags/#enable-webmcp-testing
        </code>
        .
      </span>
      <button
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[var(--duet-text-dim)] hover:bg-[var(--duet-panel-2)] hover:text-[var(--duet-text)]"
      >
        Dismiss
      </button>
    </div>
  );
}
