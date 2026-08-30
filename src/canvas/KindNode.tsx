import { Handle, Position, type NodeProps } from '@xyflow/react';
import { clsx } from 'clsx';
import { kindMeta } from '../model/catalog';
import type { Finding } from '../model/analysis';
import type { DuetNode } from '../model/types';

export interface KindNodeData extends Record<string, unknown> {
  node: DuetNode;
  costUsd: number;
  findings: Finding[];
  flash: boolean;
}

const propSummary = (n: DuetNode): string[] => {
  const p = n.props;
  const bits: string[] = [];
  if (p.engine) bits.push(p.engine);
  if (p.replicas != null && (n.kind === 'service' || n.kind === 'worker'))
    bits.push(`×${p.replicas}`);
  if (p.instanceSize && p.instanceSize !== 'small') bits.push(p.instanceSize);
  if (p.multiAz) bits.push('multi-AZ');
  if (p.replica) bits.push('+replica');
  if (p.publicIngress) bits.push('public');
  if (n.kind === 'external') bits.push(p.managed ? 'managed' : 'unmanaged');
  return bits;
};

export function KindNode({ data, selected }: NodeProps) {
  const { node, costUsd, findings, flash } = data as KindNodeData;
  const meta = kindMeta(node.kind);
  const worst = findings.reduce<'high' | 'medium' | 'low' | null>((acc, f) => {
    if (f.severity === 'high') return 'high';
    if (f.severity === 'medium' && acc !== 'high') return 'medium';
    if (f.severity === 'low' && !acc) return 'low';
    return acc;
  }, null);

  const ring =
    worst === 'high'
      ? 'var(--duet-danger)'
      : worst === 'medium'
        ? 'var(--duet-warn)'
        : selected
          ? 'var(--duet-accent)'
          : 'var(--duet-border)';

  return (
    <div
      className={clsx(
        'group relative w-[190px] rounded-xl border bg-[var(--duet-panel-2)] px-3 py-2.5 shadow-lg transition-shadow',
        flash && 'duet-node-flash',
      )}
      style={{ borderColor: ring, boxShadow: selected ? `0 0 0 2px ${ring}55` : undefined }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="flex items-center gap-2">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[13px]"
          style={{ background: `${meta.accent}22`, color: meta.accent }}
        >
          {meta.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-[var(--duet-text)]">
            {node.label}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--duet-text-dim)]">
            {meta.label}
          </div>
        </div>
        {costUsd > 0 && (
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--duet-text-dim)]">
            ${costUsd}
          </span>
        )}
      </div>

      {propSummary(node).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {propSummary(node).map((b) => (
            <span
              key={b}
              className="rounded bg-[var(--duet-panel)] px-1.5 py-0.5 text-[10px] text-[var(--duet-text-dim)]"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {worst && (
        <div
          className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold"
          style={{
            background:
              worst === 'high'
                ? 'var(--duet-danger)'
                : worst === 'medium'
                  ? 'var(--duet-warn)'
                  : 'var(--duet-text-dim)',
            color: '#1a1206',
          }}
          title={findings.map((f) => f.title).join(' · ')}
        >
          {findings.length}
        </div>
      )}
    </div>
  );
}
