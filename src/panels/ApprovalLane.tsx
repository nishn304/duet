import { useMemo, useState } from 'react';
import { describeProposal } from '../model/patch';
import { useDuet } from '../model/store';
import type { Proposal } from '../model/types';
import { Btn, Empty, Pill } from '../ui/primitives';

function Delta({ label, before, after }: { label: string; before: number; after: number }) {
  if (before === after) return null;
  const good = after < before || (label === '$/mo' && after < before);
  const worse = after > before;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] tabular-nums"
      style={{
        background: good ? '#7ee7c722' : worse ? '#ff8f8f22' : 'var(--duet-panel-2)',
        color: good ? 'var(--duet-ok)' : worse ? 'var(--duet-danger)' : 'var(--duet-text-dim)',
      }}
    >
      {label} {before}→{after}
    </span>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const design = useDuet((s) => s.design);
  const approve = useDuet((s) => s.approveProposal);
  const reject = useDuet((s) => s.rejectProposal);
  const diff = useMemo(() => describeProposal(proposal, design), [proposal, design]);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(proposal.ops.map((_, i) => i)),
  );
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allChecked = checked.size === proposal.ops.length;

  return (
    <div className="rounded-lg border border-[var(--duet-agent)] bg-[#c8a2ff0d] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Pill tone="agent">agent</Pill>
            <span className="truncate text-[13px] font-semibold">{proposal.title}</span>
          </div>
          {proposal.rationale && (
            <p className="mt-1 text-[11px] text-[var(--duet-text-dim)]">{proposal.rationale}</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Delta label="$/mo" before={diff.costBefore} after={diff.costAfter} />
        <Delta label="SPOF" before={diff.spofBefore} after={diff.spofAfter} />
        <Delta label="sec" before={diff.securityBefore} after={diff.securityAfter} />
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {diff.lines.map((l) => (
          <li key={l.index} className="flex items-start gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={checked.has(l.index)}
              onChange={() => toggle(l.index)}
              className="mt-0.5 h-3.5 w-3.5 accent-[var(--duet-agent)]"
            />
            <span className={checked.has(l.index) ? '' : 'text-[var(--duet-text-dim)] line-through'}>
              {l.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Btn
          variant="agent"
          size="sm"
          disabled={checked.size === 0}
          onClick={() =>
            approve(proposal.id, allChecked ? undefined : [...checked].sort((a, b) => a - b))
          }
        >
          {allChecked ? 'Approve all' : `Approve ${checked.size}`}
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => reject(proposal.id)}>
          Dismiss
        </Btn>
      </div>
    </div>
  );
}

export function ApprovalLane() {
  const proposals = useDuet((s) => s.proposals);
  const approve = useDuet((s) => s.approveProposal);
  const autoApply = useDuet((s) => s.autoApply);
  const setAutoApply = useDuet((s) => s.setAutoApply);
  const pending = proposals.filter((p) => p.status === 'pending');

  return (
    <div className="flex flex-col gap-2 p-2.5">
      <label className="flex items-center justify-between rounded-md border border-[var(--duet-border)] bg-[var(--duet-panel-2)] px-2.5 py-1.5 text-[12px]">
        <span className="text-[var(--duet-text-dim)]">Auto-apply agent changes</span>
        <input
          type="checkbox"
          checked={autoApply}
          onChange={(e) => setAutoApply(e.target.checked)}
          className="h-4 w-4 accent-[var(--duet-agent)]"
        />
      </label>

      {pending.length === 0 ? (
        <Empty>
          Nothing to review. When your agent proposes changes, they land here as an itemised diff
          you approve.
        </Empty>
      ) : (
        <>
          {pending.length > 1 && (
            <Btn
              variant="agent"
              size="sm"
              className="self-start"
              onClick={() => pending.forEach((p) => approve(p.id))}
            >
              Approve all {pending.length} proposals
            </Btn>
          )}
          {pending.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </>
      )}
    </div>
  );
}
