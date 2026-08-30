import type { Finding } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import { Empty, SeverityDot, severityColor } from '../ui/primitives';
import { CheckIcon } from '../ui/icons';

export function FindingCard({ finding, onClick }: { finding: Finding; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  const color = severityColor(finding.severity);
  return (
    <Tag
      onClick={onClick}
      className={
        'card relative w-full overflow-hidden rounded-xl py-2.5 pl-4 pr-3 text-left transition-colors duration-150 ' +
        (onClick ? 'hover:bg-white/[0.04]' : '')
      }
    >
      {/* severity reads from the spine before any text is parsed */}
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
      <div className="flex items-start gap-2.5">
        <span className="mt-[6px]">
          <SeverityDot severity={finding.severity} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug tracking-[-0.01em]">
            {finding.title}
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-muted">{finding.reason}</p>
          <p className="mt-2 text-[12px] leading-[1.6]">
            <span className="font-semibold text-ok">Fix</span>{' '}
            <span className="text-muted">{finding.fix}</span>
          </p>
        </div>
      </div>
    </Tag>
  );
}

/** Every finding on the design. */
export function FindingsList() {
  const report = useAnalysis();
  const setSelection = useDuet((s) => s.setSelection);
  const findings = [...report.spof, ...report.security];

  if (findings.length === 0) {
    return (
      <Empty icon={<CheckIcon className="h-5 w-5" />}>
        No findings. Select a component to edit it, or add one from the left.
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {findings.map((f) => (
        <FindingCard
          key={f.id}
          finding={f}
          onClick={
            f.nodeId
              ? () => {
                  setSelection([f.nodeId!]);
                  window.dispatchEvent(new CustomEvent('duet:focus', { detail: { id: f.nodeId } }));
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
