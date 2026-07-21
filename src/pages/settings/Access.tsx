// ============================================================
// SETTINGS → ACCESS — shows the user which version of the app they
// see (their access level), lets them request access to locked
// sections (notifies IT), and manages their account (photo, name,
// password). Admins also see the pending access requests to review.
// ============================================================

import { useState } from 'react';
import { KeyRound, Lock, Check, ShieldCheck, Upload, Bell } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { ACCESS_SECTIONS, ROLE_META, hasMinRole, type RoleTier } from '../../lib/access';

export default function Access() {
  const utils = trpc.useContext();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: myRequests } = trpc.access.myRequests.useQuery();

  const role = (me?.role ?? 'user') as RoleTier;
  const meta = ROLE_META[role] ?? ROLE_META.user;
  const isAdmin = hasMinRole(role, 'admin');

  const pendingKeys = new Set((myRequests ?? []).filter((r) => r.status === 'pending').map((r) => r.sectionKey));

  const requestMut = trpc.access.request.useMutation({
    onSuccess: () => utils.access.myRequests.invalidate(),
  });

  const lockedCount = ACCESS_SECTIONS.filter((s) => !hasMinRole(role, s.requiredRole)).length;

  return (
    <div className="max-w-3xl">
      {/* Your access */}
      <div className="ls-card p-5 mb-4">
        <div className="text-sm text-ls-ink-2 mb-2">Your access</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="ls-chip bg-ls-blue-50 text-ls-blue-deeper">
            <ShieldCheck className="w-3.5 h-3.5" /> {meta.label}
          </span>
        </div>
        <p className="text-[13px] text-ls-ink-2 leading-relaxed mb-4">{meta.description}</p>

        <div className="text-[12px] text-ls-ink-3 mb-2">Sections available to you</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESS_SECTIONS.map((s) => {
            const unlocked = hasMinRole(role, s.requiredRole);
            const requested = pendingKeys.has(s.key);
            return (
              <div key={s.key}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${unlocked ? 'border-ls-line bg-white' : 'border-ls-line bg-ls-bg-2'}`}>
                <div className="flex items-start gap-2.5 min-w-0">
                  {unlocked
                    ? <Check className="w-4 h-4 mt-0.5 text-ls-thrive shrink-0" />
                    : <Lock className="w-4 h-4 mt-0.5 text-ls-ink-3 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-ls-ink">{s.label}</div>
                    <div className="text-[11px] text-ls-ink-3 leading-snug">{s.description}</div>
                  </div>
                </div>
                {!unlocked && (
                  <div className="shrink-0">
                    {requested ? (
                      <span className="text-[12px] text-ls-thrive whitespace-nowrap inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Requested
                      </span>
                    ) : (
                      <button
                        onClick={() => requestMut.mutate({ sectionKey: s.key, sectionLabel: s.label })}
                        disabled={requestMut.isLoading}
                        className="ls-btn ls-btn-ghost !px-2.5 !py-1 !text-[12px]">
                        Request access
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[12px] text-ls-ink-3 mt-3">
          {lockedCount > 0
            ? 'Requesting a locked section notifies IT (everyone with the admin role) to review and grant access.'
            : 'You have access to every section.'}
        </div>
      </div>

      {/* Account */}
      <AccountPanel me={me} onSaved={() => utils.auth.me.invalidate()} />

      {/* Admin: requests to review */}
      {isAdmin && <RequestsToReview />}
    </div>
  );
}

function AccountPanel({ me, onSaved }: { me: any; onSaved: () => void }) {
  const [name, setName] = useState<string>(me?.name ?? '');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const updateProfile = trpc.auth.updateProfile.useMutation({ onSuccess: onSaved });
  const changePassword = trpc.auth.changePassword.useMutation();

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { setMsg({ kind: 'err', text: 'Please choose an image under 1.5 MB.' }); return; }
    const reader = new FileReader();
    reader.onload = () => updateProfile.mutate({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveName = () => updateProfile.mutate({ name });

  const submitPassword = async () => {
    setMsg(null);
    if (newPw.length < 8) { setMsg({ kind: 'err', text: 'New password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setMsg({ kind: 'err', text: "New passwords don't match." }); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: curPw, newPassword: newPw });
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setMsg({ kind: 'ok', text: 'Password updated.' });
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message ?? 'Could not update password.' });
    }
  };

  const initial = (me?.name?.charAt(0) || me?.email?.charAt(0) || '?').toUpperCase();

  return (
    <div className="ls-card p-5 mb-4">
      <div className="text-sm text-ls-ink-2 mb-4">Account</div>

      <div className="flex items-center gap-4 mb-5">
        {me?.avatarUrl
          ? <img src={me.avatarUrl} alt="Profile photo" className="w-14 h-14 rounded-full object-cover" />
          : <div className="w-14 h-14 rounded-full bg-ls-slate text-white flex items-center justify-center text-lg font-bold">{initial}</div>}
        <label className="ls-btn ls-btn-ghost cursor-pointer">
          <Upload className="w-4 h-4" /> Change photo
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[12px] text-ls-ink-2 mb-1">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-ls-line rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-[12px] text-ls-ink-2 mb-1">Email</label>
          <input value={me?.email ?? ''} disabled
            className="w-full border border-ls-line rounded-lg px-3 py-2 text-sm bg-ls-bg-2 text-ls-ink-3" />
        </div>
      </div>
      <div className="mt-3">
        <button onClick={saveName} disabled={updateProfile.isLoading} className="ls-btn ls-btn-primary">Save profile</button>
      </div>

      <div className="border-t border-ls-line mt-5 pt-5">
        <div className="flex items-center gap-2 text-sm text-ls-ink mb-3"><KeyRound className="w-4 h-4 text-ls-blue" /> Change password</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <input type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)}
            className="w-full border border-ls-line rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
            className="w-full border border-ls-line rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full border border-ls-line rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={submitPassword} disabled={changePassword.isLoading} className="ls-btn ls-btn-primary">Update password</button>
          {msg && <span className={`text-[12px] ${msg.kind === 'ok' ? 'text-ls-thrive' : 'text-ls-risk'}`}>{msg.text}</span>}
        </div>
      </div>

      <div className="border-t border-ls-line mt-5 pt-4 flex items-center justify-between">
        <span className="text-[13px] text-ls-ink-2 inline-flex items-center gap-2"><Bell className="w-4 h-4 text-ls-ink-3" /> Email notifications</span>
        <span className="text-[12px] text-ls-ink-3">Managed with your notification preferences</span>
      </div>
    </div>
  );
}

function RequestsToReview() {
  const utils = trpc.useContext();
  const { data: requests } = trpc.access.listRequests.useQuery();
  const decide = trpc.access.decide.useMutation({
    onSuccess: () => { utils.access.listRequests.invalidate(); },
  });

  if (!requests || requests.length === 0) {
    return (
      <div className="ls-card p-5">
        <div className="text-sm text-ls-ink-2 mb-1">Access requests</div>
        <div className="text-[13px] text-ls-ink-3">No pending requests.</div>
      </div>
    );
  }

  return (
    <div className="ls-card p-5">
      <div className="text-sm text-ls-ink-2 mb-3">Access requests <span className="text-ls-ink-3">({requests.length})</span></div>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-ls-line">
            <div className="min-w-0">
              <div className="text-[13px] text-ls-ink">
                <span className="font-medium">{r.userName || r.userEmail}</span> requested <span className="font-medium">{r.sectionLabel}</span>
              </div>
              <div className="text-[11px] text-ls-ink-3">Would grant the “{r.requestedRole}” role</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => decide.mutate({ id: r.id, decision: 'approved' })} disabled={decide.isLoading}
                className="ls-btn ls-btn-primary !px-3 !py-1 !text-[12px]">Approve</button>
              <button onClick={() => decide.mutate({ id: r.id, decision: 'denied' })} disabled={decide.isLoading}
                className="ls-btn ls-btn-ghost !px-3 !py-1 !text-[12px]">Deny</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
