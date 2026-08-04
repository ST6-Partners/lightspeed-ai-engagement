// ============================================================
// useCapabilities (AIE 2026-08-03)
//
// One hook so every page asks the same question the same way, against the
// same table the server enforces.
//
// Defaults CLOSED while loading. The first version defaulted open on the
// reasoning that the server refuses anyway — true, but it meant a user opened
// the Reviews page on the full authoring screen and only then had it replaced.
// The control was never usable, but it was there to see and to click, which is
// indistinguishable from a bug. Closed-until-known is the only default that
// makes a gate look like a gate.
//
// Use `ready` where a blank moment is worse than a brief absence.
// ============================================================

import { trpc } from './trpc';

export function useCapabilities() {
  const { data, isLoading } = trpc.accessControl.myCapabilities.useQuery();
  const has = (list: readonly string[] | undefined, v: string) => !!list && list.includes(v);
  return {
    loading: isLoading,
    ready: !!data,
    level: data?.level,
    can: (action: string) => has(data?.actions, action),
    canSeePage: (page: string) => has(data?.pages, page),
    canSeeReviewTab: (tab: string) => has(data?.reviewTabs, tab),
    canSeeCoreDataItem: (item: string) => has(data?.coreDataItems, item),
  };
}
