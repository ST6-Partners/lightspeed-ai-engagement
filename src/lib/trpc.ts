import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, createTRPCProxyClient } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../server/src/router.js';

export const trpc = createTRPCReact<AppRouter>();

// One link factory, two clients. Keeping this in a function rather than a shared
// array instance means each client gets its own batch queue, so the chunked bulk
// calls in lib/chunkedQueries.ts cannot re-combine with ordinary UI queries into
// one over-long GET URL — which is the failure this whole path exists to avoid.
function links() {
  return [
    httpBatchLink({
      url: '/api/trpc',
      // Split a batch before its GET URL can grow past a safe request line.
      // This alone would NOT have fixed the 431 (a single oversized call still
      // exceeds the limit — see lib/chunkedQueries.ts), but it stops unrelated
      // batches from ever combining into an over-long URL.
      maxURLLength: 4000,
      // Send the bearer token (set at login) so auth works inside Replit's
      // cross-site preview iframe, where the session cookie is blocked as a
      // third-party cookie. `credentials: 'include'` keeps the cookie path
      // working too for first-party / new-tab use.
      headers() {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' });
      },
    }),
  ];
}

export const trpcClient = trpc.createClient({ transformer: superjson, links: links() });

// Typed proxy client for imperative calls outside a React hook (chunked bulk
// queries). `trpc.createClient` returns the untyped client, which has no
// router-shaped accessors.
export const trpcProxy = createTRPCProxyClient<AppRouter>({ transformer: superjson, links: links() });
