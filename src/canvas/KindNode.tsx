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
  if ((n.kind === 'service' || n.kind === 'worker') && p.replicas != null)
    out.push(`${p.replicas}×`);
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

  // Selection wins over severity for the ring — you should always be able to
  // see what you've got hold of.
  const ring = selected ? 'var(--color-accent)' : alert;

  return (
    <div
      className={clsx(
        'card group relative w-[206px] rounded-xl px-3 py-2.5 transition-transform duration-150',
        'hover:-translate-y-px',
        flash && 'agent-touch',
      )}
      style={{
        borderColor: ring ? `color-mix(in oklab, ${ring} 55%, transparent)` : undefined,
        boxShadow: ring
          ? `inset 0 1px 0 rgb(255 255 255 / 0.05), 0 0 0 3px color-mix(in oklab, ${ring} 15%, transparent), 0 12px 28px -12px rgb(0 0 0 / 0.7)`
          : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-start gap-2.5">
        <KindChip kind={node.kind} size={24} />

        <div className="min-w-0 flex-1 pt-px">
          <div className="truncate text-[13px] font-semibold leading-tight tracking-[-0.005em]">
            {node.label}
          </div>
          <div
            className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em]"
            style={{ color: `color-mix(in oklab, ${meta.accent} 62%, var(--color-faint))` }}
          >
            {meta.label}
          </div>
        </div>

        {costUsd > 0 && (
          <span className="num shrink-0 pt-0.5 text-[10.5px] text-faint">${costUsd}</span>
        )}
      </div>

      {facts(node).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {facts(node).map((f) => (
            <span
              key={f}
              className="rounded-md bg-white/5 px-1.5 py-[2px] text-[9.5px] font-medium text-muted"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {worst && (
        <span
          className="absolute -right-1.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums"
          style={{
            background: severityColor(worst),
            color: '#0a0a0a',
            boxShadow: `0 0 0 3px var(--color-canvas), 0 0 12px -2px ${severityColor(worst)}`,
          }}
          title={findings.map((f) => f.title).join(' · ')}
        >
          {findings.length}
        </span>
      )}
    </div>
  );
}
