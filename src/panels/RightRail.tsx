import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useDuet } from '../model/store';
import { ActivityFeed } from './ActivityFeed';
import { ApprovalLane } from './ApprovalLane';
import { Inspector } from './Inspector';
import { StatStrip } from './StatStrip';

type TabKey = 'inspector' | 'review' | 'activity';

/**
 * One panel at a time instead of three stacked and cramped. The rail switches
 * itself to Review the moment a proposal arrives — an agent asking for a
 * decision should not be something you have to go looking for.
 */
export function RightRail() {
  const [tab, setTab] = useState<TabKey>('inspector');
  const pending = useDuet((s) => s.proposals.filter((p) => p.status === 'pending').length);
  const selectedIds = useDuet((s) => s.selectedIds);

  const prevPending = useRef(pending);
  useEffect(() => {
    if (pending > prevPending.current) setTab('review');
    prevPending.current = pending;
  }, [pending]);

  // Selecting a component on the canvas is a request to inspect it.
  const prevSel = useRef(selectedIds.length);
  useEffect(() => {
    if (selectedIds.length && !prevSel.current) setTab('inspector');
    prevSel.current = selectedIds.length;
  }, [selectedIds]);

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: 'inspector', label: 'Inspector' },
    { key: 'review', label: 'Review', badge: pending || undefined },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <aside className="flex w-[352px] shrink-0 flex-col gap-2 border-l border-line bg-surface p-2">
      <StatStrip />

      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div
          role="tablist"
          className="flex shrink-0 items-center gap-0.5 border-b border-line px-1.5 py-1.5"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors',
                tab === t.key
                  ? 'bg-float text-fg shadow-[0_1px_0_rgb(255_255_255/0.05)_inset]'
                  : 'text-faint hover:text-muted',
              )}
            >
              {t.label}
              {t.badge != null && (
                <span className="num grid h-[15px] min-w-[15px] place-items-center rounded-full bg-agent px-1 text-[9.5px] font-bold text-[#0f0518]">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="scroll min-h-0 flex-1 overflow-y-auto">
          {tab === 'inspector' && <Inspector />}
          {tab === 'review' && <ApprovalLane />}
          {tab === 'activity' && <ActivityFeed />}
        </div>
      </div>
    </aside>
  );
}
