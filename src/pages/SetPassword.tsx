// ============================================================
// SET PASSWORD — the one screen between a first sign-in and the app
//
// Reached when auth.me reports mustChangePassword, which a sysadmin sets by
// activating the account with its derived first-time password (see
// server/src/services/activation.ts). Layout routes every page here until it
// clears, so there is no way past it other than choosing a password.
//
// WHY IT IS COMPULSORY. The first-time password is derivable from the person's
// name, and names are searchable on the sign-in screen, so while it is still in
// force it is a key to that account for anyone who can reach the app — which
// holds assessment scores, PIPs and exit surveys. Requiring the change turns the
// derived password into a one-time handover instead of a standing credential,
// and costs the person this single screen.
//
// The PM's original preference was to make this optional. Flip
// REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN in services/activation.ts to get that;
// this page then only appears when someone chooses Change password from Profile.
// ============================================================

import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { trpc } from '../lib/trpc';

const MIN = 8;

export default function SetPassword() {
  const { data: me, isLoading } = trpc.auth.me.useQuery();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changeMut = trpc.auth.changePassword.useMutation({
    // Full reload rather than a client-side navigate: auth.me is cached in a
    // dozen places and every one needs to see mustChangePassword go false.
    onSuccess: () => { window.location.href = '/'; },
    onError: (e) => setError(e.message),
  });
  const logoutMut = trpc.auth.logout.useMutation();

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    try { await logoutMut.mutateAsync(); } catch { /* redirect regardless */ }
    window.location.href = '/login';
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < MIN) { setError(`Your new password needs at least ${MIN} characters.`); return; }
    if (next !== confirm) { setError("Those two passwords don't match."); return; }
    if (next === current) { setError('Choose a password different from the one you were given.'); return; }
    changeMut.mutate({ currentPassword: current, newPassword: next });
  };

  // This page sits outside <Layout>, so it has no auth gate of its own. Without
  // this an unauthenticated visitor would get the form and, on submit, a raw
  // "Not authenticated" error instead of being sent to sign in.
  if (!isLoading && !me) { window.location.replace('/login'); return null; }
  // Somebody who has already chosen a password has no business here.
  if (!isLoading && me && !me.mustChangePassword) { window.location.replace('/'); return null; }

  return (
    <div className="min-h-screen bg-ls-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-ls-blue-50 text-ls-blue-deep mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-ls-ink">Choose your password</h1>
          <p className="text-sm text-gray-500 mt-2">
            {me?.name ? `Welcome, ${me.name.split(' ')[0]}. ` : ''}
            You're signed in with a password someone set up for you. Pick your own to carry on.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">The password you were given</label>
            <input type="password" required autoFocus value={current} onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Your new password</label>
            <input type="password" required value={next} onChange={(e) => setNext(e.target.value)}
              placeholder={`At least ${MIN} characters`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type it again</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={changeMut.isLoading}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {changeMut.isLoading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        <p className="mt-5 pt-4 border-t border-ls-line text-center">
          <button type="button" onClick={signOut}
            className="text-[11px] text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sign out instead
          </button>
        </p>
      </div>
    </div>
  );
}
