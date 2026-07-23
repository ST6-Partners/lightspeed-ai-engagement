import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './lib/trpc';
import App from './App';
import './styles.css';

// SSO redirect returns with ?token=… — capture it into localStorage (same slot
// as password login), then strip it from the URL so it isn't left in history.
(() => {
  try {
    const u = new URL(window.location.href);
    const t = u.searchParams.get('token');
    if (t) {
      localStorage.setItem('auth_token', t);
      u.searchParams.delete('token');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    }
  } catch { /* no-op */ }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
