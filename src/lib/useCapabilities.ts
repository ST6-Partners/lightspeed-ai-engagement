// ============================================================
// useCapabilities (AIE 2026-08-03)
//
// One hook so every page asks the same question the same way, against the
// same table the server enforces. Defaults to permissive while loading, then
// settles — the server refuses regardless, so a control that flickers into
// view for a moment cannot actually do anything.
// ============================================================

import { trpc } from './trpc';

export function useCapabilities() {
  const { data, isLoading } = trpc.accessControl.myCapabilities.useQuery();
  const has = (list: readonly string[] | undefined, v: string) => !list || list.includes(v);
  return {
    loading: isLoading,
    level: data?.level,
    can: (action: string) => has(data?.actions, action),
    canSeePage: (page: string) => has(data?.pages, page),
    canSeeReviewTab: (tab: string) => has(data?.reviewTabs, tab),
    canSeeCoreDataItem: (item: string) => has(data?.coreDataItems, item),
  };
}
