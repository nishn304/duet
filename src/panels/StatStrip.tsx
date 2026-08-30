import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3.5">
      <span className="figure num" style={{ color: color ?? 'var(--color-fg)' }}>
        {value}
      </span>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

/** Always-visible headline metrics for the whole design. */
export function StatStrip() {
  const report = useAnalysis();
  const design = useDuet((s) => s.design);

  const health = report.score;
  const tone =
    health > 75 ? 'var(--color-ok)' : health > 45 ? 'var(--color-warn)' : 'var(--color-danger)';

  return (
    <div className="shrink-0 rounded-xl bg-white/[0.028]">
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

      <div className="border-t border-line px-3.5 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-muted">Health</span>
          <span className="num text-[12px] font-semibold" style={{ color: tone }}>
            {health}
            <span className="text-faint">/100</span>
          </span>
        </div>
        <div
          className="h-[6px] overflow-hidden rounded-full bg-white/[0.07]"
          role="meter"
          aria-valuenow={health}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Design health"
        >
          <div
            className="h-full rounded-full transition-[width,background-color] duration-700 ease-out"
            style={{
              width: `${Math.max(health, 2)}%`,
              background: `linear-gradient(90deg, color-mix(in oklab, ${tone} 55%, transparent), ${tone})`,
              boxShadow: `0 0 12px -1px ${tone}`,
            }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-faint">
          {design.nodes.length} components · {design.edges.length} connections · costs are rough
          estimates
        </p>
      </div>
    </div>
  );
}
