// ============================================================
// LOGIN — find your name, then enter your password
//
// PHASE 1 of the three-phase sign-in plan (PM, 2026-08-05). A sysadmin switches
// an employee's access on in Core Data -> Employees; the employee then finds
// themselves here by name and signs in with the password they were given.
// Phase 2 replaces this with Microsoft sign-in (the server handler already
// exists in server/src/http/microsoftSso.ts, deliberately not mounted).
//
// WHY A SEARCH RATHER THAN A FULL DROPDOWN. The PM asked for a drop list of
// active users. This is that list, filtered: it needs two characters before it
// returns anything and it caps at 25. An unauthenticated endpoint that returned
// every activated employee would publish the staff directory to anyone who
// loaded this page. The person still picks their name from a list; they just
// type a couple of letters first.
//
// The endpoint returns an opaque id, never an email address, and auth.login
// accepts that id — so no address is exposed here either.
//
// WHAT IS DELIBERATELY NOT ON THIS PAGE: the first-time password rule. It is
// derivable from a name, and names are searchable here, so printing the rule
// would make every not-yet-changed account openable by anyone. The sysadmin sees
// each password when they activate the person, and hands it over.
//
// 'Create account' is gone: self-registration is closed (auth.register). Accounts
// come from the roster import or Core Data -> Employees.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { trpc } from '../lib/trpc';

type Mode = 'login' | 'email' | 'forgot';
type Person = { id: string; name: string | null; title: string | null };

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Person | null>(null);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Keystroke debounce — the lookup runs on a settled value, not every letter.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  // No keepPreviousData: it would show the previous query's people while a new
  // one is in flight, so someone could pick a name that no longer matches what
  // they typed. A brief empty list is better than a briefly wrong one.
  const matches = trpc.auth.lookupForSignIn.useQuery(
    { query: debounced },
    { enabled: !picked && debounced.length >= 3 },
  );

  const onDone = (data: { token?: string; mustChangePassword?: boolean }) => {
    if (data?.token) localStorage.setItem('auth_token', data.token);
    // The server is the authority on this; Layout re-checks and holds the person
    // on /set-password regardless of where they land.
    window.location.href = data?.mustChangePassword ? '/set-password' : '/';
  };

  const loginMut = trpc.auth.login.useMutation({ onSuccess: onDone, onError: (e) => setError(e.message) });
  const forgotMut = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => setError(e.message),
  });

  const busy = loginMut.isLoading || forgotMut.isLoading;
  const list = useMemo<Person[]>(() => matches.data ?? [], [matches.data]);

  const choose = (p: Person) => { setPicked(p); setError(null); setQuery(p.name ?? ''); };
  const startOver = () => { setPicked(null); setPassword(''); setQuery(''); setDebounced(''); setError(null); };
  const go = (m: Mode) => { setMode(m); setError(null); setSent(false); setPicked(null); setPassword(''); setQuery(''); setDebounced(''); };
  const toForgot = () => go('forgot');
  const toLogin = () => go('login');
  const toEmail = () => go('email');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'forgot') { forgotMut.mutate({ email }); return; }
    if (mode === 'email') { loginMut.mutate({ email, password }); return; }
    if (picked) loginMut.mutate({ userId: picked.id, password });
  };

  return (
    <div className="min-h-screen bg-ls-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/lightspeed-logo.png" alt="Lightspeed Systems" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-ls-ink">Lightspeed Systems</h1>
          <p className="text-[13px] font-semibold tracking-wide text-ls-blue-deep">AI Engagement</p>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'forgot' ? 'Reset your password'
              : mode === 'email' ? 'Sign in with your email'
              : picked ? 'Enter your password' : 'Find your name to sign in'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
        )}

        {/* ── Forgot password ─────────────────────────────────── */}
        {mode === 'forgot' ? (
          sent ? (
            <div className="space-y-4">
              <div className="bg-ls-blue-50 border border-ls-blue/30 text-ls-ink-2 text-sm rounded-lg px-4 py-3">
                If an account exists for <strong>{email}</strong>, we've sent it a link to set a new password.
                Check your inbox.
              </div>
              <button type="button" onClick={toLogin}
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Work email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@lightspeedsystems.com" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <p className="text-xs text-gray-500">We'll email you a link to set a new password.</p>
              <button type="submit" disabled={busy}
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {busy ? 'Please wait…' : 'Send me a link'}
              </button>
              <p className="text-xs text-center pt-1">
                <button type="button" onClick={toLogin} className="text-ls-blue-deep hover:underline">← Back to sign in</button>
              </p>
            </form>
          )
        ) : mode === 'email' ? (
          /* ── Email + password fallback ───────────────────────
             Not everyone can be found by name: an account whose display name is
             blank never matches the picker, and the bootstrap sysadmin was created
             through a form where the name field was optional. Without this route
             that account is locked out of the UI with no recovery short of
             database access. It is also the honest answer for anyone whose name is
             spelled differently from what they expect. */
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lightspeedsystems.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={busy}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-xs text-center pt-1 space-x-3">
              <button type="button" onClick={toLogin} className="text-ls-blue-deep hover:underline">← Find me by name</button>
              <button type="button" onClick={toForgot} className="text-ls-blue-deep hover:underline">Forgot your password?</button>
            </p>
          </form>
        ) : picked ? (
          /* ── Step 2: password ───────────────────────────────── */
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-2 bg-ls-bg-2 border border-ls-line rounded-lg px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ls-ink truncate">{picked.name}</div>
                {picked.title && <div className="text-[11px] text-ls-ink-3 truncate">{picked.title}</div>}
              </div>
              <button type="button" onClick={startOver}
                className="text-[11px] font-medium text-ls-blue-deep hover:underline shrink-0">
                Not you?
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={busy}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-xs text-center pt-1">
              <button type="button" onClick={toForgot} className="text-ls-blue-deep hover:underline">Forgot your password?</button>
            </p>
          </form>
        ) : (
          /* ── Step 1: find your name ─────────────────────────── */
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Your name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                  placeholder="Start typing your name…" aria-label="Search for your name"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {debounced.length < 3 ? (
              <p className="text-xs text-gray-500 px-1">Type at least three letters of your name.</p>
            ) : matches.isFetching ? (
              <p className="text-xs text-gray-500 px-1">Looking…</p>
            ) : list.length === 0 ? (
              <div className="text-xs text-gray-500 bg-ls-bg-2 border border-ls-line rounded-lg px-3 py-2.5">
                No match. Check the spelling — and if you've never signed in before, your access may not be
                switched on yet. Ask your administrator.
              </div>
            ) : (
              <ul className="border border-ls-line rounded-lg divide-y divide-ls-line max-h-64 overflow-y-auto">
                {list.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => choose(p)}
                      className="w-full text-left px-3 py-2 hover:bg-ls-bg-2 transition-colors">
                      <div className="text-sm font-medium text-ls-ink">{p.name}</div>
                      {p.title && <div className="text-[11px] text-ls-ink-3">{p.title}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-gray-400 text-center pt-1">
              Signing in for the first time? Your administrator will give you your password.
            </p>
            <p className="text-xs text-center space-x-3">
              <button type="button" onClick={toEmail} className="text-ls-blue-deep hover:underline">
                Use my email instead
              </button>
              <button type="button" onClick={toForgot} className="text-ls-blue-deep hover:underline">
                Forgot your password?
              </button>
            </p>
          </div>
        )}

        {mode === 'login' && !picked && (
          <p className="mt-5 pt-4 border-t border-ls-line text-[11px] text-gray-400 text-center">
            Accounts are created by your administrator
          </p>
        )}

        {/* Microsoft sign-in removed 2026-08-04 at the PM's direction and kept out
            here: it was built but never given its Entra credentials, so the button
            only ever produced an "isn't configured yet" notice. It returns in
            phase 2 — re-add the button and re-mount registerMicrosoftSso in
            server.ts. Self-registration was closed 2026-08-05; see auth.register. */}
      </div>
    </div>
  );
}
