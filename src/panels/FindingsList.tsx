import type { Finding } from '../model/analysis';
import { useAnalysis } from '../model/useAnalysis';
import { useDuet } from '../model/store';
import { Empty, SeverityDot, severityColor } from '../ui/primitives';
import { CheckIcon } from '../ui/icons';

export function FindingCard({
  finding,
  onClick,
}: {
  finding: Finding;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  const color = severityColor(finding.severity);
  return (
    <Tag
      onClick={onClick}
      className={
        'card relative w-full overflow-hidden rounded-lg py-2 pl-3 pr-2.5 text-left transition-colors ' +
        (onClick ? 'hover:border-line-strong' : '')
      }
    >
      {/* severity reads at a glance from the spine, before any text is parsed */}
      <span className="absolute inset-y-0 left-0 w-[2.5px]" style={{ background: color }} />
      <div className="flex items-start gap-2">
        <span className="mt-[5px]">
          <SeverityDot severity={finding.severity} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold leading-snug">{finding.title}</div>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-muted">{finding.reason}</p>
          <p className="mt-1.5 text-[11.5px] leading-[1.55]">
            <span className="font-semibold text-ok">Fix</span>{' '}
            <span className="text-muted">{finding.fix}</span>
          </p>
        </div>
      </div>
    </Tag>
  );
}

/** Every finding on the design, newest severity first. */
export function FindingsList() {
  const report = useAnalysis();
  const setSelection = useDuet((s) => s.setSelection);
  const findings = [...report.spof, ...report.security];

  if (findings.length === 0) {
    return (
      <Empty icon={<CheckIcon className="h-6 w-6" />}>
        No findings. Select a component to edit it, or add one from the left.
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2.5">
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
