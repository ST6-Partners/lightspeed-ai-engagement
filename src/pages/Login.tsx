// ============================================================
// LOGIN — email/password (Sequence 3, 2026-06-05)
//
// Three modes: Sign in, Create account, and Forgot password (request a
// reset email). Sign in / Create account are backed by auth.login /
// auth.register; Forgot password calls auth.requestPasswordReset. The
// emailed link opens /reset-password (ResetPassword.tsx).
// ============================================================

import { useState } from 'react';
import { trpc } from '../lib/trpc';

type Mode = 'login' | 'register' | 'forgot';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const ssoErr = new URLSearchParams(window.location.search).get('sso');
  const ssoMsg: Record<string, string> = {
    unconfigured: 'Microsoft sign-in isn’t configured yet. Use email and password for now.',
    domain: 'That Microsoft account isn’t on the Lightspeed domain.',
    inactive: 'Your account is inactive. Contact your admin.',
    state: 'Sign-in expired — please try again.',
    token: 'Microsoft sign-in failed — please try again.',
    noemail: 'No email was returned by Microsoft.',
    error: 'Something went wrong with Microsoft sign-in.',
  };

  const onDone = (data: { token?: string }) => {
    if (data?.token) localStorage.setItem('auth_token', data.token);
    window.location.href = '/';
  };

  const loginMut = trpc.auth.login.useMutation({ onSuccess: onDone, onError: (e) => setError(e.message) });
  const registerMut = trpc.auth.register.useMutation({ onSuccess: onDone, onError: (e) => setError(e.message) });
  const forgotMut = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => setError(e.message),
  });

  const busy = loginMut.isLoading || registerMut.isLoading || forgotMut.isLoading;

  const switchMode = (m: Mode) => { setMode(m); setError(null); setSent(false); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'login') loginMut.mutate({ email, password });
    else if (mode === 'register') registerMut.mutate({ email, password, name: name || undefined });
    else forgotMut.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-ls-bg flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/lightspeed-logo.png" alt="Lightspeed Systems" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-ls-ink">Lightspeed Systems</h1>
          <p className="text-[13px] font-semibold tracking-wide text-ls-blue-deep">AI Engagement</p>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'login' ? 'Sign in to continue' : mode === 'register' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        {/* Mode toggle — hidden in forgot mode */}
        {mode !== 'forgot' && (
          <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-5 text-sm">
            <button type="button" onClick={() => switchMode('login')}
              className={`flex-1 py-2 font-medium ${mode === 'login' ? 'bg-ls-ink text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => switchMode('register')}
              className={`flex-1 py-2 font-medium ${mode === 'register' ? 'bg-ls-ink text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Create account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
        )}
        {ssoErr && ssoMsg[ssoErr] && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2">{ssoMsg[ssoErr]}</div>
        )}

        {mode === 'forgot' && sent ? (
          <div className="space-y-4">
            <div className="bg-ls-blue-50 border border-ls-blue/30 text-ls-ink-2 text-sm rounded-lg px-4 py-3">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              Check your inbox — the link expires in 1 hour.
            </div>
            <button type="button" onClick={() => switchMode('login')}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-500">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-ls-blue-deep hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {mode === 'forgot' && (
              <p className="text-xs text-gray-500">
                Enter your email and we'll send you a link to reset your password.
              </p>
            )}
            <button type="submit" disabled={busy}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" /><span className="text-[11px] uppercase tracking-wide text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
            </div>
            <a href="/auth/microsoft"
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="12" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>
              Sign in with Microsoft
            </a>
          </>
        )}

        {mode === 'forgot' && !sent ? (
          <p className="mt-4 text-xs text-center">
            <button type="button" onClick={() => switchMode('login')} className="text-ls-blue-deep hover:underline">
              ← Back to sign in
            </button>
          </p>
        ) : (
          <p className="mt-4 text-xs text-gray-400 text-center">
            {mode === 'login' ? 'No account yet? Use "Create account" above.' : mode === 'register' ? 'The first account created becomes the admin.' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
