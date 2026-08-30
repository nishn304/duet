import { useMemo } from 'react';
import { analyze } from './analysis';
import { useDuet } from './store';

/** Memoised analysis of the current design. Cheap enough to call per panel. */
export function useAnalysis() {
  const design = useDuet((s) => s.design);
  return useMemo(() => analyze(design), [design]);
}
