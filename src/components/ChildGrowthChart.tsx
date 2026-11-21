import { ChildGrowthTracker, type ChildGrowthTrackerProps } from './ChildGrowthTracker';

export type ChildGrowthChartProps = ChildGrowthTrackerProps;

/**
 * Backward-compatible wrapper around `ChildGrowthTracker` so existing imports
 * and tests referencing `ChildGrowthChart` receive the full upgraded experience.
 */
export function ChildGrowthChart(props: ChildGrowthChartProps) {
  return <ChildGrowthTracker {...props} />;
}
