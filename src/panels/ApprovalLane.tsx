import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { describeProposal } from '../model/patch';
import { useDuet } from '../model/store';
import type { Proposal } from '../model/types';
import { Btn, Empty } from '../ui/primitives';
import { CheckIcon, SparkIcon } from '../ui/icons';

/** A before→after metric, coloured by whether the change is an improvement. */
function Delta({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  if (before === after) return null;
  const improved = after < before;
  return (
    <span
      className={clsx(
        'num inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium',
        improved ? 'bg-ok/12 text-ok' : 'bg-warn/12 text-warn',
      )}
    >
      <span className="font-sans text-[10px] font-semibold uppercase tracking-wider opacity-60">
        {label}
      </span>
      {before}
      <span className="opacity-45">→</span>
      {after}
    </span>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const design = useDuet((s) => s.design);
  const approve = useDuet((s) => s.approveProposal);
  const reject = useDuet((s) => s.rejectProposal);
  const diff = useMemo(() => describeProposal(proposal, design), [proposal, design]);
  const [checked, setChecked] = useState<Set<number>>(() => new Set(proposal.ops.map((_, i) => i)));

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const all = checked.size === proposal.ops.length;

  return (
    <div
      className="rise overflow-hidden rounded-xl border border-agent/30 bg-agent/[0.055]"
      style={{ boxShadow: '0 14px 40px -18px rgb(199 125 255 / 0.55)' }}
    >
      <div className="flex items-start gap-2.5 px-3.5 pb-2.5 pt-3">
        <span className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg bg-agent/20 text-agent">
          <SparkIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold leading-snug tracking-[-0.015em]">
            {proposal.title}
          </div>
          {proposal.rationale && (
            <p className="mt-1.5 text-[12px] leading-[1.6] text-muted">{proposal.rationale}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
        <Delta label="$/mo" before={diff.costBefore} after={diff.costAfter} />
        <Delta label="spof" before={diff.spofBefore} after={diff.spofAfter} />
        <Delta label="sec" before={diff.securityBefore} after={diff.securityAfter} />
      </div>

      <ul className="flex flex-col gap-px border-t border-agent/15 px-2 py-2">
        {diff.lines.map((l) => {
          const on = checked.has(l.index);
          return (
            <li key={l.index}>
              <button
                onClick={() => toggle(l.index)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/[0.05]"
              >
                <span
                  className={clsx(
                    'mt-[1px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150',
                    on
                      ? 'border-agent bg-agent text-[#1a0426]'
                      : 'border-line-strong bg-transparent',
                  )}
                >
                  {on && <CheckIcon className="h-2.5 w-2.5 [stroke-width:2.8]" />}
                </span>
                <span
                  className={clsx(
                    'text-[12px] leading-[1.55]',
                    on ? 'text-fg' : 'text-faint line-through',
                  )}
                >
                  {l.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2 border-t border-agent/15 px-3 py-2.5">
        <Btn
          variant="agent"
          size="sm"
          disabled={checked.size === 0}
          onClick={() => approve(proposal.id, all ? undefined : [...checked].sort((a, b) => a - b))}
        >
          {all ? 'Approve' : `Approve ${checked.size} of ${proposal.ops.length}`}
        </Btn>
        <Btn variant="bare" size="sm" onClick={() => reject(proposal.id)}>
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
    <div className="flex flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5">
        <span className="min-w-0">
          <span className="block text-[12.5px] font-medium">Auto-apply</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-faint">
            Skip review; changes land immediately
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={autoApply}
          aria-label="Auto-apply agent changes"
          onClick={() => setAutoApply(!autoApply)}
          className={clsx(
            'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200',
            autoApply ? 'bg-agent' : 'bg-white/[0.13]',
          )}
        >
          <span
            className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-md transition-[left] duration-200 ease-out"
            style={{ left: autoApply ? 19 : 3 }}
          />
        </button>
      </div>

      {pending.length === 0 ? (
        <Empty icon={<SparkIcon className="h-5 w-5" />}>
          Nothing to review. When your agent proposes changes they land here as an itemised diff you
          approve.
        </Empty>
      ) : (
        <>
          {pending.length > 1 && (
            <Btn
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => pending.forEach((p) => approve(p.id))}
            >
              Approve all {pending.length}
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
