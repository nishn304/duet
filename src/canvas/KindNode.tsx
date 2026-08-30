import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { kindMeta } from '../model/catalog';
import type { Finding, Severity } from '../model/analysis';
import type { FailureImpact } from '../model/failure';
import type { DuetNode } from '../model/types';
import { KindChip, severityColor } from '../ui/primitives';

export interface KindNodeData extends Record<string, unknown> {
  node: DuetNode;
  costUsd: number;
  findings: Finding[];
  flash: boolean;
  /** set only while a failure simulation is running */
  impact?: FailureImpact;
}

/** The handful of properties worth showing on the card face. */
const facts = (n: DuetNode): string[] => {
  const p = n.props;
  const out: string[] = [];
  if (p.engine) out.push(p.engine);
  if ((n.kind === 'service' || n.kind === 'worker') && p.replicas != null) out.push(`${p.replicas}×`);
  if (p.instanceSize && p.instanceSize !== 'small') out.push(p.instanceSize);
  if (p.multiAz) out.push('multi-AZ');
  if (p.replica) out.push('replica');
  if (p.publicIngress) out.push('public');
  if (n.kind === 'external') out.push(p.managed ? 'managed' : 'unmanaged');
  return out;
};

const worstOf = (findings: Finding[]): Severity | null =>
  findings.reduce<Severity | null>((acc, f) => {
    if (f.severity === 'high') return 'high';
    if (f.severity === 'medium' && acc !== 'high') return 'medium';
    if (f.severity === 'low' && !acc) return 'low';
    return acc;
  }, null);

const IMPACT_LABEL: Record<Exclude<FailureImpact, 'unaffected'>, string> = {
  failed: 'FAILED',
  unreachable: 'CUT OFF',
  degraded: 'DEGRADED',
};

const IMPACT_COLOR: Record<Exclude<FailureImpact, 'unaffected'>, string> = {
  failed: 'var(--color-danger)',
  unreachable: 'var(--color-danger)',
  degraded: 'var(--color-warn)',
};

export function KindNode({ data, selected }: NodeProps) {
  const { node, costUsd, findings, flash, impact } = data as KindNodeData;
  const meta = kindMeta(node.kind);
  const worst = worstOf(findings);

  const simulating = impact != null;
  const hit = impact && impact !== 'unaffected' ? impact : null;

  // While a simulation runs it owns the node's appearance entirely — findings and
  // selection step aside so the blast radius reads unambiguously.
  const ring = hit
    ? IMPACT_COLOR[hit]
    : selected
      ? 'var(--color-accent)'
      : worst
        ? severityColor(worst)
        : null;

  return (
    <div
      className={clsx(
        'group relative w-[216px] rounded-[14px] px-3.5 py-3 transition-all duration-300 ease-out',
        !simulating && 'hover:-translate-y-[2px]',
        // unaffected components recede so the damage is what you see
        simulating && !hit && 'opacity-30 saturate-0',
        impact === 'failed' && 'saturate-50',
        flash && 'agent-touch',
      )}
      style={{
        background:
          impact === 'failed'
            ? 'linear-gradient(180deg, #2a1418, #1a0f12)'
            : impact === 'unreachable'
              ? 'linear-gradient(180deg, #241518, #171014)'
              : impact === 'degraded'
                ? 'linear-gradient(180deg, #262017, #191510)'
                : 'linear-gradient(180deg, #1d1d24, #141419)',
        border: `1px solid ${ring ? `color-mix(in oklab, ${ring} ${hit ? 65 : 50}%, transparent)` : 'rgb(255 255 255 / 0.08)'}`,
        boxShadow: ring
          ? `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 0 0 4px color-mix(in oklab, ${ring} ${hit ? 16 : 12}%, transparent), 0 18px 40px -18px rgb(0 0 0 / 0.9)`
          : 'inset 0 1px 0 rgb(255 255 255 / 0.06), 0 14px 34px -16px rgb(0 0 0 / 0.85)',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-start gap-3">
        <KindChip kind={node.kind} size={28} />

        <div className="min-w-0 flex-1">
          <div
            className={clsx(
              'truncate text-[14px] font-semibold leading-[1.2] tracking-[-0.02em]',
              impact === 'failed' && 'line-through decoration-danger/70 decoration-2',
            )}
          >
            {node.label}
          </div>
          <div
            className="mt-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.1em]"
            style={{
              color: hit
                ? IMPACT_COLOR[hit]
                : `color-mix(in oklab, ${meta.accent} 68%, var(--color-faint))`,
            }}
          >
            {hit ? IMPACT_LABEL[hit] : meta.label}
          </div>
        </div>

        {costUsd > 0 && !simulating && (
          <span className="num shrink-0 pt-0.5 text-[11px] text-faint">${costUsd}</span>
        )}
      </div>

      {facts(node).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {facts(node).map((f) => (
            <span
              key={f}
              className="rounded-md bg-white/[0.06] px-1.5 py-[3px] text-[10px] font-medium leading-none text-muted"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {worst && !simulating && (
        <span
          className="num absolute -right-1.5 -top-1.5 grid h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[10.5px] font-bold"
          style={{
            background: severityColor(worst),
            color: '#0a0a0a',
            boxShadow: `0 0 0 3.5px var(--color-ground), 0 0 16px -2px ${severityColor(worst)}`,
          }}
          title={findings.map((f) => f.title).join(' · ')}
        >
          {findings.length}
        </span>
      )}

      {impact === 'failed' && (
        <span
          className="absolute -right-2 -top-2 grid h-[22px] w-[22px] place-items-center rounded-full text-[13px] font-bold"
          style={{
            background: 'var(--color-danger)',
            color: '#1a0509',
            boxShadow: '0 0 0 3.5px var(--color-ground), 0 0 20px -2px var(--color-danger)',
          }}
          title="Simulated failure"
        >
          ✕
        </span>
      )}
    </div>
  );
}
