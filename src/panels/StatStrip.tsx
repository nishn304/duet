import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';

function Stat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5">
      <span
        className="num text-[17px] font-semibold leading-none"
        style={{ color: color ?? 'var(--color-fg)' }}
      >
        {value}
      </span>
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-faint">
        {label}
      </span>
    </div>
  );
}

/** Always-visible headline metrics for the whole design. */
export function StatStrip() {
  const report = useAnalysis();
  const design = useDuet((s) => s.design);

  const health = report.score;
  const healthColor =
    health > 75 ? 'var(--color-ok)' : health > 45 ? 'var(--color-warn)' : 'var(--color-danger)';

  return (
    <div className="panel shrink-0 rounded-xl">
      <div className="grid grid-cols-3 divide-x divide-line">
        <Stat value={`$${report.cost.total.toLocaleString()}`} label="per mo" />
        <Stat
          value={String(report.spof.length)}
          label="spof"
          color={report.spof.length ? 'var(--color-danger)' : 'var(--color-ok)'}
        />
        <Stat
          value={String(report.security.length)}
          label="findings"
          color={report.security.length ? 'var(--color-warn)' : 'var(--color-ok)'}
        />
      </div>

      <div className="border-t border-line px-3 py-2.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-muted">Health</span>
          <span className="num text-[11px] font-semibold" style={{ color: healthColor }}>
            {health}
            <span className="text-faint">/100</span>
          </span>
        </div>
        <div
          className="h-[5px] overflow-hidden rounded-full bg-white/6"
          role="meter"
          aria-valuenow={health}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Design health"
        >
          <div
            className="h-full rounded-full transition-[width,background-color] duration-500 ease-out"
            style={{
              width: `${Math.max(health, 2)}%`,
              background: `linear-gradient(90deg, color-mix(in oklab, ${healthColor} 60%, transparent), ${healthColor})`,
              boxShadow: `0 0 10px -1px ${healthColor}`,
            }}
          />
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
          {design.nodes.length} components · {design.edges.length} connections · costs are rough
          estimates
        </p>
      </div>
    </div>
  );
}
