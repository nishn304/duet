import { useDuet } from '../model/store';
import { useSimulation } from '../model/useSimulation';
import { Btn } from '../ui/primitives';
import { CloseIcon } from '../ui/icons';

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  if (!n) return null;
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="num text-[15px] font-semibold" style={{ color }}>
        {n}
      </span>
      <span className="text-[11.5px] text-muted">{label}</span>
    </span>
  );
}

/**
 * The heads-up display for an active blast radius. Floats over the canvas rather
 * than sitting in the rail — the simulation is a mode the whole board is in.
 */
export function SimulationBar() {
  const blast = useSimulation();
  const clear = useDuet((s) => s.setSimulatedFailure);

  if (!blast) return null;

  const clean = blast.unreachable.length === 0 && blast.degraded.length === 0;

  return (
    <div className="rise pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
      <div
        className="glass pointer-events-auto flex max-w-3xl items-center gap-4 rounded-full py-2 pl-4 pr-2"
        style={{ borderColor: 'color-mix(in oklab, var(--color-danger) 32%, transparent)' }}
      >
        <span className="flex shrink-0 items-center gap-2">
          <span
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[11px] font-bold"
            style={{ background: 'var(--color-danger)', color: '#1a0509' }}
          >
            ✕
          </span>
          <span className="whitespace-nowrap text-[12.5px] font-semibold">
            {blast.failedLabel} down
          </span>
        </span>

        <span className="h-4 w-px shrink-0 bg-line" />

        {clean ? (
          <span className="text-[12px] text-ok">Nothing else is affected.</span>
        ) : (
          <span className="flex items-center gap-4">
            <Count n={blast.unreachable.length} label="cut off" color="var(--color-danger)" />
            <Count n={blast.degraded.length} label="degraded" color="var(--color-warn)" />
            <Count
              n={blast.severedStorage.length}
              label="storage unreachable"
              color="var(--color-danger)"
            />
          </span>
        )}

        {blast.redundant && (
          <span className="hidden whitespace-nowrap text-[11px] text-faint lg:inline">
            models total loss, not one instance
          </span>
        )}

        <Btn
          variant="bare"
          size="xs"
          className="ml-auto w-7 shrink-0 rounded-full px-0"
          onClick={() => clear(null)}
          aria-label="Exit simulation"
          icon={<CloseIcon className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}
