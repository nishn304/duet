import { useDuet } from '../model/store';

const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};

export function ActivityFeed() {
  const activity = useDuet((s) => s.activity);
  return (
    <ul className="flex flex-col gap-1.5 p-2.5">
      {activity.map((a) => (
        <li key={a.id} className="flex items-baseline gap-2 text-[12px]">
          <span
            className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background: a.actor === 'agent' ? 'var(--duet-agent)' : 'var(--duet-accent)',
            }}
          />
          <span className="flex-1 text-[var(--duet-text)]">{a.text}</span>
          <span className="shrink-0 tabular-nums text-[10px] text-[var(--duet-text-dim)]">
            {ago(a.ts)}
          </span>
        </li>
      ))}
    </ul>
  );
}
