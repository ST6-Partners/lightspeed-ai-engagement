// ============================================================
// RESET PASSWORD — target of the emailed "forgot password" link.
// Reads ?token= from the URL, collects a new password (with confirm),
// and calls auth.resetPassword. Public route (no auth required).
// ============================================================

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetMut = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    resetMut.mutate({ token, newPassword: password });
  };

  return (
    <div className="min-h-screen bg-ls-bg flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/lightspeed-logo.png" alt="Lightspeed Systems" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-ls-ink">Lightspeed Systems</h1>
          <p className="text-[13px] font-semibold tracking-wide text-ls-blue-deep">AI Engagement</p>
          <p className="text-sm text-gray-500 mt-2">Choose a new password</p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              This reset link is missing its token. Please use the most recent link from your email, or request a new one.
            </div>
            <Link to="/login" className="block text-center w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="bg-ls-thrive-bg border border-ls-thrive/30 text-ls-ink-2 text-sm rounded-lg px-4 py-3">
              Your password has been updated. You can now sign in with your new password.
            </div>
            <Link to="/login" className="block text-center w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
                <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your new password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={resetMut.isLoading}
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {resetMut.isLoading ? 'Please wait…' : 'Set new password'}
              </button>
            </form>
            <p className="mt-4 text-xs text-center">
              <Link to="/login" className="text-ls-blue-deep hover:underline">← Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
