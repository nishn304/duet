import { kindMeta } from '../model/catalog';
import { NODE_KINDS } from '../model/types';
import { useDuet } from '../model/store';
import { TEMPLATES } from '../model/templates';
import { KindChip } from '../ui/primitives';

export function Palette() {
  const addNode = useDuet((s) => s.addNode);
  const loadTemplate = useDuet((s) => s.loadTemplate);
  const templateKey = useDuet((s) => s.templateKey);

  return (
    <aside className="glass scroll flex w-[186px] shrink-0 flex-col overflow-y-auto rounded-xl pb-4">
      <div className="px-4 pb-2 pt-4">
        <span className="eyebrow">Components</span>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {NODE_KINDS.map((kind) => (
          <button
            key={kind}
            onClick={() => addNode(kind)}
            title={kindMeta(kind).blurb}
            className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-white/[0.06]"
          >
            <KindChip kind={kind} size={24} />
            <span className="truncate text-[13px] font-medium text-muted transition-colors group-hover:text-fg">
              {kindMeta(kind).label}
            </span>
          </button>
        ))}
      </div>

      <div className="mx-4 my-3.5 h-px bg-line" />

      <div className="px-4 pb-2">
        <span className="eyebrow">Start from</span>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {TEMPLATES.map((t) => {
          const active = t.key === templateKey;
          return (
            <button
              key={t.key}
              onClick={() => loadTemplate(t.key)}
              title={t.blurb}
              className={
                'rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium leading-snug transition-colors duration-150 ' +
                (active
                  ? 'bg-accent/14 text-accent'
                  : 'text-faint hover:bg-white/[0.06] hover:text-fg')
              }
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
