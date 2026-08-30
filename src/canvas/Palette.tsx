import { CATALOG } from '../model/catalog';
import { NODE_KINDS } from '../model/types';
import { useDuet } from '../model/store';
import { TEMPLATES } from '../model/templates';

export function Palette() {
  const addNode = useDuet((s) => s.addNode);
  const loadTemplate = useDuet((s) => s.loadTemplate);

  return (
    <div className="duet-scroll flex h-full flex-col gap-4 overflow-auto p-2">
      <div>
        <h2 className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--duet-text-dim)]">
          Add
        </h2>
        <div className="flex flex-col gap-1">
          {NODE_KINDS.map((k) => {
            const m = CATALOG[k];
            return (
              <button
                key={k}
                onClick={() => addNode(k)}
                title={m.blurb}
                className="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-left text-[12px] text-[var(--duet-text)] hover:border-[var(--duet-border)] hover:bg-[var(--duet-panel-2)]"
              >
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded text-[11px]"
                  style={{ background: `${m.accent}22`, color: m.accent }}
                >
                  {m.glyph}
                </span>
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--duet-text-dim)]">
          Templates
        </h2>
        <div className="flex flex-col gap-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => loadTemplate(t.key)}
              title={t.blurb}
              className="rounded-md border border-transparent px-1.5 py-1.5 text-left text-[12px] text-[var(--duet-text-dim)] hover:border-[var(--duet-border)] hover:bg-[var(--duet-panel-2)] hover:text-[var(--duet-text)]"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
