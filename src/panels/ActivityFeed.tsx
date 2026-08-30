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
    <ol className="relative flex flex-col p-3">
      {/* the thread the events hang off */}
      <span className="absolute bottom-5 left-[15px] top-6 w-px bg-line" aria-hidden />
      {activity.map((a) => {
        const isAgent = a.actor === 'agent';
        return (
          <li key={a.id} className="relative flex items-start gap-3 py-1.5">
            <span
              className="relative z-10 mt-[6px] h-2 w-2 shrink-0 rounded-full"
              style={{
                background: isAgent ? 'var(--color-agent)' : 'var(--color-accent)',
                boxShadow: `0 0 0 4px var(--color-panel), 0 0 12px -2px ${
                  isAgent ? 'var(--color-agent)' : 'var(--color-accent)'
                }`,
              }}
            />
            <span className="flex-1 text-[12px] leading-[1.6] text-muted">
              <span className={isAgent ? 'font-semibold text-agent' : 'font-semibold text-accent'}>
                {isAgent ? 'Agent' : 'You'}
              </span>{' '}
              {uncap(a.text)}
            </span>
            <span className="num shrink-0 pt-0.5 text-[10.5px] text-faint">{ago(a.ts)}</span>
          </li>
        );
      })}
    </ol>
  );
}
