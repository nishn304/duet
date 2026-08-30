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
  lowerIsBetter = true,
}: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter?: boolean;
}) {
  if (before === after) return null;
  const improved = lowerIsBetter ? after < before : after > before;
  return (
    <span
      className={clsx(
        'num inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-medium',
        improved ? 'bg-ok/12 text-ok' : 'bg-warn/12 text-warn',
      )}
    >
      <span className="font-sans text-faint">{label}</span>
      {before}
      <span className="opacity-50">→</span>
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
      className="rise overflow-hidden rounded-xl border border-agent/35 bg-agent/[0.055]"
      style={{ boxShadow: '0 0 0 1px rgb(181 124 255 / 0.06), 0 10px 30px -14px rgb(181 124 255 / 0.5)' }}
    >
      <div className="flex items-start gap-2 px-3 pb-2 pt-2.5">
        <span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md bg-agent/20 text-agent">
          <SparkIcon className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug">{proposal.title}</div>
          {proposal.rationale && (
            <p className="mt-1 text-[11.5px] leading-[1.55] text-muted">{proposal.rationale}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-3 pb-2">
        <Delta label="$/mo" before={diff.costBefore} after={diff.costAfter} />
        <Delta label="spof" before={diff.spofBefore} after={diff.spofAfter} />
        <Delta label="sec" before={diff.securityBefore} after={diff.securityAfter} />
      </div>

      <ul className="flex flex-col gap-px border-t border-agent/15 px-1.5 py-1.5">
        {diff.lines.map((l) => {
          const on = checked.has(l.index);
          return (
            <li key={l.index}>
              <button
                onClick={() => toggle(l.index)}
                className="flex w-full items-start gap-2 rounded-md px-1.5 py-[5px] text-left transition-colors hover:bg-white/5"
              >
                <span
                  className={clsx(
                    'mt-[1px] grid h-[14px] w-[14px] shrink-0 place-items-center rounded-[4px] border transition-colors',
                    on ? 'border-agent bg-agent text-[#0f0518]' : 'border-line-strong bg-transparent',
                  )}
                >
                  {on && <CheckIcon className="h-2.5 w-2.5 [stroke-width:2.6]" />}
                </span>
                <span
                  className={clsx(
                    'text-[11.5px] leading-[1.5]',
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

      <div className="flex gap-1.5 border-t border-agent/15 px-2.5 py-2">
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
    <div className="flex flex-col gap-2 p-2.5">
      <div className="panel flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
        <span className="min-w-0">
          <span className="block text-[12px] font-medium">Auto-apply</span>
          <span className="block text-[10.5px] leading-snug text-faint">
            Skip review; agent changes land immediately
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={autoApply}
          aria-label="Auto-apply agent changes"
          onClick={() => setAutoApply(!autoApply)}
          className={clsx(
            'relative h-[19px] w-[32px] shrink-0 rounded-full transition-colors duration-200',
            autoApply ? 'bg-agent' : 'bg-white/12',
          )}
        >
          <span
            className="absolute top-[2.5px] h-[14px] w-[14px] rounded-full bg-white shadow transition-[left] duration-200"
            style={{ left: autoApply ? 15 : 3 }}
          />
        </button>
      </div>

      {pending.length === 0 ? (
        <Empty icon={<SparkIcon className="h-6 w-6" />}>
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
