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
    <div className="scroll flex h-full flex-col overflow-y-auto pb-4">
      <div className="px-3.5 pb-1.5 pt-3.5">
        <span className="eyebrow">Components</span>
      </div>

      <div className="flex flex-col gap-px px-2">
        {NODE_KINDS.map((kind) => (
          <button
            key={kind}
            onClick={() => addNode(kind)}
            title={kindMeta(kind).blurb}
            className="group flex items-center gap-2.5 rounded-lg px-1.5 py-[7px] text-left transition-colors hover:bg-white/5"
          >
            <KindChip kind={kind} size={20} />
            <span className="truncate text-[12.5px] font-medium text-muted transition-colors group-hover:text-fg">
              {kindMeta(kind).label}
            </span>
          </button>
        ))}
      </div>

      <div className="mx-3.5 my-3 h-px bg-line" />

      <div className="px-3.5 pb-1.5">
        <span className="eyebrow">Start from</span>
      </div>

      <div className="flex flex-col gap-px px-2">
        {TEMPLATES.map((t) => {
          const active = t.key === templateKey;
          return (
            <button
              key={t.key}
              onClick={() => loadTemplate(t.key)}
              title={t.blurb}
              className={
                'rounded-lg px-2.5 py-[7px] text-left text-[12px] font-medium transition-colors ' +
                (active ? 'bg-accent/12 text-accent' : 'text-faint hover:bg-white/5 hover:text-fg')
              }
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
