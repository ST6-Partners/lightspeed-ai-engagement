// ============================================================
// CHUNKED BULK QUERIES — the HTTP 431 fix. AI Engagement, 2026-07-30.
//
// tRPC's httpBatchLink sends queries as GET with the whole input encoded in the
// URL. orgScreen.nineboxByIds and cadence.status both take an array of user ids,
// and the Organization screen passes the entire company. At 232 employees the two
// batched together produced a ~17 KB request line and Railway answered
// 431 Request Header Fields Too Large — so the 9 Box sat on "Loading…" forever at
// company-wide scope and the cadence Due/Overdue badges never loaded anywhere.
//
// Fix: stop sending one giant id list. These helpers slice the ids into chunks and
// call the vanilla tRPC client per chunk, merging the results behind a single
// react-query cache entry. Deliberately chosen over the alternatives:
//   * raising the server header limit only moves the ceiling;
//   * httpBatchLink({ maxURLLength }) splits the BATCH but not a single oversized
//     call, so it also only moves the ceiling (~400 employees here);
//   * making the server derive the population from the viewer would be smaller,
//     but neither procedure authorizes per id today, so widening them to "return
//     everything you may see" is not a change to make casually.
// This version has no practical ceiling and needs no server or authz change.
//
// CHUNK is sized so one chunk's URL stays well inside a few KB:
// 60 uuids ≈ 60 × 38 chars ≈ 2.3 KB encoded.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { trpcProxy } from './trpc';

const CHUNK = 60;

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

export type NineBoxRow = { userId: string; name: string; box: number | null; ratedAt: string | null };

export function useNineBoxByIds(
  ids: string[],
  startISO?: string,
  endISO?: string,
) {
  return useQuery({
    // ids are part of the key so a filter change refetches, as the tRPC hook did.
    queryKey: ['chunked', 'nineboxByIds', ids, startISO ?? null, endISO ?? null],
    enabled: ids.length > 0,
    queryFn: async (): Promise<{ people: NineBoxRow[] }> => {
      const parts = await Promise.all(
        chunk(ids, CHUNK).map((slice) =>
          trpcProxy.orgScreen.nineboxByIds.query({ ids: slice, startISO, endISO }),
        ),
      );
      return { people: parts.flatMap((p: any) => p.people) };
    },
  });
}

export type CadenceStatusRow = {
  userId: string;
  ninebox: 'done' | 'due' | 'overdue';
  priorities: 'done' | 'due' | 'overdue';
  reviews: 'done' | 'due' | 'overdue';
};

export function useCadenceStatus(userIds: string[]) {
  return useQuery({
    queryKey: ['chunked', 'cadenceStatus', userIds],
    enabled: userIds.length > 0,
    queryFn: async (): Promise<{ people: CadenceStatusRow[] }> => {
      const parts = await Promise.all(
        chunk(userIds, CHUNK).map((slice) => trpcProxy.cadence.status.query({ userIds: slice })),
      );
      return { people: parts.flatMap((p: any) => p.people) };
    },
  });
}
