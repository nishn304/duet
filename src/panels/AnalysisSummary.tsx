import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import { Empty, SeverityDot } from '../ui/primitives';

export function AnalysisSummary() {
  const report = useAnalysis();
  const design = useDuet((s) => s.design);
  const setSelection = useDuet((s) => s.setSelection);
  const findings = [...report.spof, ...report.security];

  const focus = (id?: string) => {
    if (!id) return;
    setSelection([id]);
    window.dispatchEvent(new CustomEvent('duet:focus', { detail: { id } }));
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Est. / mo" value={`$${report.cost.total.toLocaleString()}`} />
        <Stat label="SPOFs" value={String(report.spof.length)} tone={report.spof.length ? 'bad' : 'ok'} />
        <Stat
          label="Security"
          value={String(report.security.length)}
          tone={report.security.length ? 'warn' : 'ok'}
        />
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--duet-panel-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${report.score}%`,
            background:
              report.score > 75
                ? 'var(--duet-ok)'
                : report.score > 45
                  ? 'var(--duet-warn)'
                  : 'var(--duet-danger)',
          }}
        />
      </div>
      <p className="text-[11px] text-[var(--duet-text-dim)]">
        Health {report.score}/100 · {design.nodes.length} components · {design.edges.length}{' '}
        connections. Cost figures are rough estimates.
      </p>

      {findings.length === 0 ? (
        <Empty>No findings. Select a component to edit it, or add one from the left.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {findings.map((f) => (
            <button
              key={f.id}
              onClick={() => focus(f.nodeId)}
              className="rounded-md border border-[var(--duet-border)] bg-[var(--duet-panel-2)] p-2 text-left text-[12px] hover:border-[#39445c]"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <SeverityDot severity={f.severity} />
                {f.title}
              </div>
              <p className="mt-1 text-[var(--duet-text-dim)]">{f.reason}</p>
              <p className="mt-1 text-[var(--duet-accent-2)]">Fix: {f.fix}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'bad' | 'warn';
}) {
  const color =
    tone === 'ok'
      ? 'var(--duet-ok)'
      : tone === 'bad'
        ? 'var(--duet-danger)'
        : tone === 'warn'
          ? 'var(--duet-warn)'
          : 'var(--duet-text)';
  return (
    <div className="rounded-md border border-[var(--duet-border)] bg-[var(--duet-panel-2)] px-1 py-1.5">
      <div className="text-[15px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--duet-text-dim)]">{label}</div>
    </div>
  );
}
