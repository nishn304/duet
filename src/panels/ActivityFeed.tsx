import { useDuet } from '../model/store';
import { Empty } from '../ui/primitives';

/** Store messages are written as standalone sentences; here they follow an
 *  actor name ("You approved…"), so the leading capital has to go. */
const uncap = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};

export function ActivityFeed() {
  const activity = useDuet((s) => s.activity);

  if (!activity.length) return <Empty>Nothing has happened yet.</Empty>;

  return (
    <ol className="relative flex flex-col gap-0 p-2.5">
      {/* the thread the events hang off */}
      <span className="absolute bottom-3 left-[13px] top-4 w-px bg-line" aria-hidden />
      {activity.map((a) => (
        <li key={a.id} className="relative flex items-start gap-2.5 py-[5px] pl-0">
          <span
            className="relative z-10 mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full ring-[3px] ring-surface"
            style={{
              background: a.actor === 'agent' ? 'var(--color-agent)' : 'var(--color-accent)',
            }}
          />
          <span className="flex-1 text-[11.5px] leading-[1.5] text-muted">
            <span className={a.actor === 'agent' ? 'font-semibold text-agent' : 'font-semibold text-accent'}>
              {a.actor === 'agent' ? 'Agent' : 'You'}
            </span>{' '}
            {uncap(a.text)}
          </span>
          <span className="num shrink-0 pt-px text-[10px] text-faint">{ago(a.ts)}</span>
        </li>
      ))}
    </ol>
  );
}
