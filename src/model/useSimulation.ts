import { useMemo } from 'react';
import { simulateFailure, type BlastRadius } from './failure';
import { useDuet } from './store';

/**
 * The active blast radius, or null. Returns null when the simulated component no
 * longer exists, so a stale id can never render a misleading result.
 */
export function useSimulation(): BlastRadius | null {
  const design = useDuet((s) => s.design);
  const failedId = useDuet((s) => s.simulatedFailureId);
  return useMemo(
    () => (failedId ? simulateFailure(design, failedId) : null),
    [design, failedId],
  );
}
