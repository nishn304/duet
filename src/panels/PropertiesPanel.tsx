import type { ReactNode } from 'react';
import { kindMeta } from '../model/catalog';
import { nodeFindings } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import type { DuetNode, InstanceSize, NodeProps } from '../model/types';
import { Btn, SeverityDot } from '../ui/primitives';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 text-[12px]">
      <span className="text-[var(--duet-text-dim)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'rounded border border-[var(--duet-border)] bg-[var(--duet-bg)] px-1.5 py-1 text-[12px] text-[var(--duet-text)] outline-none focus:border-[var(--duet-accent)]';

function Check({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-[var(--duet-accent)]"
    />
  );
}

export function PropertiesPanel({ node }: { node: DuetNode }) {
  const update = useDuet((s) => s.updateNode);
  const removeNodes = useDuet((s) => s.removeNodes);
  const report = useAnalysis();
  const meta = kindMeta(node.kind);
  const findings = nodeFindings(report, node.id);
  const set = (props: Partial<NodeProps>) => update(node.id, { props });

  const sizeSelect = (
    <select
      className={inputCls}
      value={node.props.instanceSize ?? 'small'}
      onChange={(e) => set({ instanceSize: e.target.value as InstanceSize })}
    >
      <option value="small">small</option>
      <option value="medium">medium</option>
      <option value="large">large</option>
    </select>
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <span
          className="grid h-6 w-6 place-items-center rounded text-[13px]"
          style={{ background: `${meta.accent}22`, color: meta.accent }}
        >
          {meta.glyph}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-[var(--duet-text-dim)]">
          {meta.label}
        </span>
      </div>

      <input
        className={`${inputCls} w-full`}
        value={node.label}
        onChange={(e) => update(node.id, { label: e.target.value })}
      />

      <div className="rounded-md border border-[var(--duet-border)] bg-[var(--duet-panel-2)] px-2.5 py-1.5">
        {(node.kind === 'service' || node.kind === 'worker') && (
          <>
            <Field label="Replicas">
              <input
                type="number"
                min={1}
                className={`${inputCls} w-16`}
                value={node.props.replicas ?? 1}
                onChange={(e) => set({ replicas: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
            <Field label="Instance size">{sizeSelect}</Field>
          </>
        )}
        {node.kind === 'service' && (
          <Field label="Public ingress">
            <Check value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
          </Field>
        )}
        {node.kind === 'datastore' && (
          <>
            <Field label="Engine">
              <select
                className={inputCls}
                value={node.props.engine ?? 'postgres'}
                onChange={(e) => set({ engine: e.target.value })}
              >
                <option>postgres</option>
                <option>mysql</option>
                <option>mongodb</option>
              </select>
            </Field>
            <Field label="Instance size">{sizeSelect}</Field>
            <Field label="Multi-AZ">
              <Check value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Field>
            <Field label="Read replica">
              <Check value={node.props.replica} onChange={(v) => set({ replica: v })} />
            </Field>
          </>
        )}
        {node.kind === 'cache' && (
          <>
            <Field label="Engine">
              <select
                className={inputCls}
                value={node.props.engine ?? 'redis'}
                onChange={(e) => set({ engine: e.target.value })}
              >
                <option>redis</option>
                <option>memcached</option>
              </select>
            </Field>
            <Field label="Instance size">{sizeSelect}</Field>
            <Field label="Multi-AZ">
              <Check value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Field>
          </>
        )}
        {node.kind === 'queue' && (
          <Field label="Engine">
            <select
              className={inputCls}
              value={node.props.engine ?? 'sqs'}
              onChange={(e) => set({ engine: e.target.value })}
            >
              <option>sqs</option>
              <option>kafka</option>
              <option>rabbitmq</option>
            </select>
          </Field>
        )}
        {node.kind === 'loadbalancer' && (
          <>
            <Field label="Public ingress">
              <Check value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
            </Field>
            <Field label="Multi-AZ">
              <Check value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Field>
          </>
        )}
        {node.kind === 'cdn' && (
          <Field label="Public ingress">
            <Check value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
          </Field>
        )}
        {node.kind === 'external' && (
          <Field label="Managed (has SLA)">
            <Check value={node.props.managed} onChange={(v) => set({ managed: v })} />
          </Field>
        )}
        {(node.kind === 'client' || node.kind === 'objectstore') && (
          <p className="py-1 text-[12px] text-[var(--duet-text-dim)]">No tunable properties.</p>
        )}
      </div>

      <textarea
        placeholder="Notes for you and the agent…"
        className={`${inputCls} w-full resize-none`}
        rows={2}
        value={node.props.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
      />

      {findings.length > 0 && (
        <div className="flex flex-col gap-2">
          {findings.map((f) => (
            <div
              key={f.id}
              className="rounded-md border border-[var(--duet-border)] bg-[var(--duet-panel-2)] p-2 text-[12px]"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <SeverityDot severity={f.severity} />
                {f.title}
              </div>
              <p className="mt-1 text-[var(--duet-text-dim)]">{f.reason}</p>
              <p className="mt-1 text-[var(--duet-accent-2)]">Fix: {f.fix}</p>
            </div>
          ))}
        </div>
      )}

      <Btn variant="danger" size="sm" className="self-start" onClick={() => removeNodes([node.id])}>
        Delete component
      </Btn>
    </div>
  );
}
