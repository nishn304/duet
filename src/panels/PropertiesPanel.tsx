import type { ReactNode } from 'react';
import { kindMeta } from '../model/catalog';
import { nodeFindings } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import type { DuetNode, InstanceSize, NodeProps } from '../model/types';
import { Btn, KindChip } from '../ui/primitives';
import { TrashIcon } from '../ui/icons';
import { FindingCard } from './FindingsList';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-h-[30px] items-center justify-between gap-3">
      <span className="text-[12px] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  const on = Boolean(value);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={
        'relative h-[19px] w-[32px] shrink-0 rounded-full transition-colors duration-200 ' +
        (on ? 'bg-accent' : 'bg-white/12')
      }
    >
      <span
        className="absolute top-[2.5px] h-[14px] w-[14px] rounded-full bg-white shadow transition-[left] duration-200"
        style={{ left: on ? 15 : 3 }}
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      className="field h-7 w-[104px] cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function PropertiesPanel({ node }: { node: DuetNode }) {
  const update = useDuet((s) => s.updateNode);
  const removeNodes = useDuet((s) => s.removeNodes);
  const report = useAnalysis();
  const meta = kindMeta(node.kind);
  const findings = nodeFindings(report, node.id);
  const set = (props: Partial<NodeProps>) => update(node.id, { props });

  const sizeRow = (
    <Row label="Instance size">
      <Select
        value={node.props.instanceSize ?? 'small'}
        onChange={(v) => set({ instanceSize: v as InstanceSize })}
        options={['small', 'medium', 'large']}
      />
    </Row>
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2.5">
        <KindChip kind={node.kind} size={26} />
        <div className="min-w-0 flex-1">
          <input
            className="field w-full font-semibold"
            value={node.label}
            onChange={(e) => update(node.id, { label: e.target.value })}
            aria-label="Component name"
          />
        </div>
      </div>
      <p className="-mt-1 px-0.5 text-[11px] leading-relaxed text-faint">{meta.blurb}</p>

      <div className="panel flex flex-col gap-1 rounded-lg px-3 py-2">
        {(node.kind === 'service' || node.kind === 'worker') && (
          <>
            <Row label="Replicas">
              <div className="flex items-center gap-1">
                <Btn
                  size="xs"
                  variant="ghost"
                  className="w-6 px-0"
                  onClick={() => set({ replicas: Math.max(1, (node.props.replicas ?? 1) - 1) })}
                  aria-label="Fewer replicas"
                >
                  −
                </Btn>
                <span className="num w-7 text-center text-[12.5px] font-semibold">
                  {node.props.replicas ?? 1}
                </span>
                <Btn
                  size="xs"
                  variant="ghost"
                  className="w-6 px-0"
                  onClick={() => set({ replicas: (node.props.replicas ?? 1) + 1 })}
                  aria-label="More replicas"
                >
                  +
                </Btn>
              </div>
            </Row>
            {sizeRow}
          </>
        )}

        {node.kind === 'service' && (
          <Row label="Public ingress">
            <Toggle value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
          </Row>
        )}

        {node.kind === 'datastore' && (
          <>
            <Row label="Engine">
              <Select
                value={node.props.engine ?? 'postgres'}
                onChange={(v) => set({ engine: v })}
                options={['postgres', 'mysql', 'mongodb']}
              />
            </Row>
            {sizeRow}
            <Row label="Multi-AZ">
              <Toggle value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Row>
            <Row label="Read replica">
              <Toggle value={node.props.replica} onChange={(v) => set({ replica: v })} />
            </Row>
          </>
        )}

        {node.kind === 'cache' && (
          <>
            <Row label="Engine">
              <Select
                value={node.props.engine ?? 'redis'}
                onChange={(v) => set({ engine: v })}
                options={['redis', 'memcached']}
              />
            </Row>
            {sizeRow}
            <Row label="Multi-AZ">
              <Toggle value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Row>
          </>
        )}

        {node.kind === 'queue' && (
          <Row label="Engine">
            <Select
              value={node.props.engine ?? 'sqs'}
              onChange={(v) => set({ engine: v })}
              options={['sqs', 'kafka', 'rabbitmq']}
            />
          </Row>
        )}

        {node.kind === 'loadbalancer' && (
          <>
            <Row label="Public ingress">
              <Toggle value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
            </Row>
            <Row label="Multi-AZ">
              <Toggle value={node.props.multiAz} onChange={(v) => set({ multiAz: v })} />
            </Row>
          </>
        )}

        {node.kind === 'cdn' && (
          <Row label="Public ingress">
            <Toggle value={node.props.publicIngress} onChange={(v) => set({ publicIngress: v })} />
          </Row>
        )}

        {node.kind === 'external' && (
          <Row label="Managed (has SLA)">
            <Toggle value={node.props.managed} onChange={(v) => set({ managed: v })} />
          </Row>
        )}

        {(node.kind === 'client' || node.kind === 'objectstore') && (
          <p className="py-1.5 text-[12px] text-faint">No tunable properties.</p>
        )}
      </div>

      <textarea
        placeholder="Notes for you and the agent…"
        className="field w-full resize-none leading-relaxed placeholder:text-faint"
        rows={2}
        value={node.props.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
      />

      {findings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}

      <Btn
        variant="danger"
        size="sm"
        className="self-start"
        onClick={() => removeNodes([node.id])}
        icon={<TrashIcon className="h-3.5 w-3.5" />}
      >
        Delete
      </Btn>
    </div>
  );
}
