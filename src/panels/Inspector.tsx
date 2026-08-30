import { useDuet } from '../model/store';
import { Btn, KindChip } from '../ui/primitives';
import { TrashIcon } from '../ui/icons';
import { FindingsList } from './FindingsList';
import { PropertiesPanel } from './PropertiesPanel';

/**
 * Context-sensitive: one component selected → its properties; several → a bulk
 * action; nothing → the whole design's findings.
 */
export function Inspector() {
  const design = useDuet((s) => s.design);
  const selectedIds = useDuet((s) => s.selectedIds);
  const removeNodes = useDuet((s) => s.removeNodes);
  const setSelection = useDuet((s) => s.setSelection);
  const selected = design.nodes.filter((n) => selectedIds.includes(n.id));

  if (selected.length === 1) return <PropertiesPanel node={selected[0]} />;

  if (selected.length > 1) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">{selected.length} selected</span>
          <Btn variant="bare" size="xs" onClick={() => setSelection([])}>
            Clear
          </Btn>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selected.map((n) => (
            <span
              key={n.id}
              className="panel flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 text-[11.5px]"
            >
              <KindChip kind={n.kind} size={16} />
              {n.label}
            </span>
          ))}
        </div>
        <Btn
          variant="danger"
          size="sm"
          className="self-start"
          onClick={() => removeNodes(selectedIds)}
          icon={<TrashIcon className="h-3.5 w-3.5" />}
        >
          Delete {selected.length}
        </Btn>
      </div>
    );
  }

  return <FindingsList />;
}
