import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { kindMeta } from '../model/catalog';
import type { Finding, Severity } from '../model/analysis';
import type { DuetNode } from '../model/types';
import { KindChip, severityColor } from '../ui/primitives';

export interface KindNodeData extends Record<string, unknown> {
  node: DuetNode;
  costUsd: number;
  findings: Finding[];
  flash: boolean;
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

export function KindNode({ data, selected }: NodeProps) {
  const { node, costUsd, findings, flash } = data as KindNodeData;
  const meta = kindMeta(node.kind);
  const worst = worstOf(findings);
  const alert = worst ? severityColor(worst) : null;

  // Selection wins over severity for the ring — you should always be able to see
  // what you have hold of.
  const ring = selected ? 'var(--color-accent)' : alert;

  return (
    <div
      className={clsx(
        'group relative w-[216px] rounded-[14px] px-3.5 py-3 transition-transform duration-150 ease-out',
        'hover:-translate-y-[2px]',
        flash && 'agent-touch',
      )}
      style={{
        background: 'linear-gradient(180deg, #1d1d24, #141419)',
        border: `1px solid ${ring ? `color-mix(in oklab, ${ring} 50%, transparent)` : 'rgb(255 255 255 / 0.08)'}`,
        boxShadow: ring
          ? `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 0 0 4px color-mix(in oklab, ${ring} 12%, transparent), 0 18px 40px -18px rgb(0 0 0 / 0.9)`
          : 'inset 0 1px 0 rgb(255 255 255 / 0.06), 0 14px 34px -16px rgb(0 0 0 / 0.85)',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-start gap-3">
        <KindChip kind={node.kind} size={28} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold leading-[1.2] tracking-[-0.02em]">
            {node.label}
          </div>
          <div
            className="mt-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.1em]"
            style={{ color: `color-mix(in oklab, ${meta.accent} 68%, var(--color-faint))` }}
          >
            {meta.label}
          </div>
        </div>

        {costUsd > 0 && (
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

      {worst && (
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
    </div>
  );
}
