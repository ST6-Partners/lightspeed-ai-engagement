// Profile — the signed-in user's own profile, reached from the avatar (bottom-left).
// Shows exactly the data the engagement survey reads for attribution. Personal
// fields + start date are editable; org-structure fields are read-only (managed by
// your admin via the employee upload) so analytics stay trustworthy.
import { useEffect, useRef, useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { trpc } from '../lib/trpc';

const inputCls =
  'w-full px-3 py-2 border border-ls-line rounded-md text-sm focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50';
const lblCls = 'block text-xs font-medium text-ls-ink-3 uppercase tracking-wide mb-1';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CUR = new Date().getFullYear();
const YEARS = Array.from({ length: CUR - 1969 }, (_, i) => CUR - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
// DOB years span ~1940 -> current year.
const DOB_YEARS = Array.from({ length: CUR - 1939 }, (_, i) => CUR - i);
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'];
const ETHNICITIES = ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Hispanic or Latino', 'Native Hawaiian or Other Pacific Islander', 'White', 'Two or More Races', 'Prefer not to say'];

function fmtDate(y?: number | null, m?: number | null, d?: number | null): string | null {
  if (!y) return null;
  if (m && d) return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
  if (m) return `${MONTHS_SHORT[m - 1]} ${y}`;
  return String(y);
}
function tenure(y?: number | null): string | null {
  if (!y) return null;
  const t = CUR - y;
  return t < 1 ? '<1 yr' : `${t} yr${t === 1 ? '' : 's'}`;
}

function ReadonlyRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ls-line last:border-0">
      <span className="text-[13px] text-ls-ink-3">{label}</span>
      <span className="text-[13px] font-medium text-ls-ink-1">{value?.trim() ? value : '—'}</span>
    </div>
  );
}

export default function Profile() {
  const utils = trpc.useContext();
  const { data: p, isLoading } = trpc.profile.get.useQuery();
  // Person records are HR-owned as of 2026-08-03. Everyone can still SEE their
  // own details; only HR and sysadmins can change them. The fields are disabled
  // rather than hidden so people can check what the company holds about them.
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = me?.accessLevel === 'hr' || me?.accessLevel === 'sysadmin';

  // Profile picture is the one thing on this page everyone owns (2026-08-03).
  // It used to live on Settings > Access, which now sits behind the Admin
  // screen gate — so an ordinary employee had no way to reach it at all.
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const savePhoto = trpc.auth.updateProfile.useMutation({
    onSuccess: () => { utils.profile.get.invalidate(); utils.auth.me.invalidate(); },
    onError: (e) => setPhotoErr(e.message),
  });
  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErr(null);
    if (!file.type.startsWith('image/')) { setPhotoErr('Please choose an image file.'); return; }
    if (file.size > 1_500_000) { setPhotoErr('Please choose an image under 1.5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => savePhoto.mutate({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const save = trpc.profile.updateSelf.useMutation({
    onSuccess: () => { utils.profile.get.invalidate(); utils.auth.me.invalidate(); setSaved(true); },
  });

  const [name, setName] = useState('');
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [timezone, setTimezone] = useState('');
  const [dYear, setDYear] = useState<string>('');
  const [dMonth, setDMonth] = useState<string>('');
  const [dDay, setDDay] = useState<string>('');
  const [gender, setGender] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!p) return;
    setName(p.name ?? '');
    setYear(p.hireYear ? String(p.hireYear) : '');
    setMonth(p.hireMonth ? String(p.hireMonth) : '');
    setDay(p.hireDay ? String(p.hireDay) : '');
    setTimezone(p.timezone ?? '');
    setDYear(p.dobYear ? String(p.dobYear) : '');
    setDMonth(p.dobMonth ? String(p.dobMonth) : '');
    setDDay(p.dobDay ? String(p.dobDay) : '');
    setGender(p.gender ?? '');
    setEthnicity(p.ethnicity ?? '');
  }, [p]);

  if (isLoading) return <div className="text-sm text-ls-ink-3">Loading your profile…</div>;
  if (!p) return <div className="text-sm text-ls-ink-3">Profile unavailable.</div>;

  const yearMissing = (!!month || !!day) && !year;
  const onSave = () => {
    if (yearMissing) return;
    setSaved(false);
    save.mutate({
      name: name.trim(),
      timezone: timezone.trim() || null,
      hireYear: year ? Number(year) : null,
      hireMonth: year && month ? Number(month) : null,
      hireDay: year && day ? Number(day) : null,
      dobYear: dYear ? Number(dYear) : null,
      dobMonth: dYear && dMonth ? Number(dMonth) : null,
      dobDay: dYear && dDay ? Number(dDay) : null,
      gender: gender || null,
      ethnicity: ethnicity.trim() || null,
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          disabled={savePhoto.isPending}
          title="Change your photo"
          className="relative group w-14 h-14 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-ls-blue disabled:opacity-60"
        >
          {p.avatarUrl
            ? <img src={p.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
            : <div className="w-14 h-14 rounded-full bg-ls-active text-white flex items-center justify-center text-lg font-bold">{p.name?.charAt(0) || '?'}</div>}
          <span className="absolute inset-0 bg-black/45 text-white text-[10px] font-medium flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
            {savePhoto.isPending ? 'Saving' : 'Change'}
          </span>
        </button>
        <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        <div>
          <h1 className="text-2xl font-bold text-ls-blue-deep">{p.name || 'Your profile'}</h1>
          <p className="text-sm text-ls-ink-3">{p.email}</p>
          <button type="button" onClick={() => photoInput.current?.click()}
            className="text-xs text-ls-blue-deep hover:underline mt-0.5">
            {p.avatarUrl ? 'Change photo' : 'Add a photo'}
          </button>
          {photoErr && <p className="text-xs text-ls-risk mt-1">{photoErr}</p>}
        </div>
      </div>

      {/* Editable */}
      <div className="ls-card p-5 mb-5">
        <h2 className="text-lg font-bold text-ls-ink-1 mb-1">Your details</h2>
        <p className="text-[13px] text-ls-ink-3 mb-4">You can edit these. Your start date is used to calculate tenure in engagement analytics.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lblCls}>Full name</label>
            <input className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          </div>
          <div>
            <label className={lblCls}>Time zone</label>
            <input className={inputCls} value={timezone} placeholder="e.g. America/Chicago" onChange={(e) => { setTimezone(e.target.value); setSaved(false); }} />
          </div>
        </div>

        <div className="mt-4">
          <label className={lblCls}>Start date <span className="text-ls-ink-3 normal-case">(year required; month &amp; day optional)</span></label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <div>
              <select className={inputCls + (yearMissing ? ' border-ls-risk ring-1 ring-ls-risk' : '')} value={year}
                onChange={(e) => { setYear(e.target.value); setSaved(false); }}>
                <option value="">Year *</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <select className={inputCls} value={month} disabled={!canEdit || !year}
                onChange={(e) => { setMonth(e.target.value); setSaved(false); }}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <select className={inputCls} value={day} disabled={!canEdit || !year}
                onChange={(e) => { setDay(e.target.value); setSaved(false); }}>
                <option value="">Day</option>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {yearMissing && <p className="text-[12px] text-ls-risk mt-1">Please select a year to set a start date.</p>}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onSave} disabled={!canEdit || save.isPending || yearMissing} className="ls-btn ls-btn-primary disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="ls-chip bg-ls-thrive-bg text-ls-thrive">Saved</span>}
          {save.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Couldn’t save — try again</span>}
        </div>
      </div>

      {/* About you — editable, self-reported */}
      <div className="ls-card p-5 mb-5">
        <h2 className="text-lg font-bold text-ls-ink-1 mb-1">About you</h2>
        <p className="text-[13px] text-ls-ink-3 mb-4">{canEdit ? 'Maintained by HR.' : 'Maintained by HR. Contact them if anything here is wrong.'}</p>
        <div>
          <label className={lblCls}>Date of birth <span className="text-ls-ink-3 normal-case">(year required; month &amp; day optional)</span></label>
          <div className="grid grid-cols-4 gap-3 max-w-xl">
            <select className={inputCls} value={dYear} disabled={!canEdit} onChange={(e) => { setDYear(e.target.value); setSaved(false); }}>
              <option value="">Year</option>
              {DOB_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className={inputCls} value={dMonth} disabled={!canEdit || !dYear} onChange={(e) => { setDMonth(e.target.value); setSaved(false); }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className={inputCls} value={dDay} disabled={!canEdit || !dYear} onChange={(e) => { setDDay(e.target.value); setSaved(false); }}>
              <option value="">Day</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div>
              <div className="w-full px-3 py-2 border border-ls-line rounded-md text-sm bg-ls-bg-2 text-ls-ink-2">
                {dYear ? `Age ${CUR - Number(dYear)}` : 'Age —'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={lblCls}>Gender</label>
            <select className={inputCls} value={gender} disabled={!canEdit} onChange={(e) => { setGender(e.target.value); setSaved(false); }}>
              <option value="">—</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              {gender && !GENDERS.includes(gender) && <option value={gender}>{gender}</option>}
            </select>
          </div>
          <div>
            <label className={lblCls}>Ethnicity</label>
            <select className={inputCls} value={ethnicity} disabled={!canEdit} onChange={(e) => { setEthnicity(e.target.value); setSaved(false); }}>
              <option value="">Select… (optional)</option>
              {ETHNICITIES.map((x) => <option key={x} value={x}>{x}</option>)}
              {ethnicity && !ETHNICITIES.includes(ethnicity) && <option value={ethnicity}>{ethnicity}</option>}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onSave} disabled={!canEdit || save.isPending || yearMissing} className="ls-btn ls-btn-primary disabled:opacity-50">
            {save.isPending ? 'Saving\u2026' : 'Save changes'}
          </button>
          {saved && <span className="ls-chip bg-ls-thrive-bg text-ls-thrive">Saved</span>}
          {save.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Couldn\u2019t save \u2014 try again</span>}
        </div>
      </div>

      {/* Employment & Org — read-only, admin-managed */}
      <div className="ls-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-ls-ink-3" />
          <h2 className="text-lg font-bold text-ls-ink-1">Employment &amp; Org</h2>
        </div>
        <p className="text-[13px] text-ls-ink-3 mb-4">
          These come from your admin (via the employee directory) and can\u2019t be edited here. The engagement survey reads them automatically, so results organize by team, manager, tenure, and so on \u2014 without asking you anything.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <ReadonlyRow label="Employee ID" value={p.employeeId} />
            <ReadonlyRow label="Title" value={p.title} />
            <ReadonlyRow label="Department" value={p.department} />
            <ReadonlyRow label="Manager" value={p.manager} />
            <ReadonlyRow label="Reporting line" value={p.reportingLine} />
          </div>
          <div>
            <ReadonlyRow label="Work location" value={p.location} />
            <ReadonlyRow label="Business unit" value={p.businessUnit} />
            <ReadonlyRow label="ELT leader" value={p.eltLeader} />
            <ReadonlyRow label="Hire date" value={fmtDate(p.hireYear, p.hireMonth, p.hireDay)} />
            <ReadonlyRow label="Tenure" value={tenure(p.hireYear)} />
          </div>
        </div>
      </div>

      <PasswordCard />
    </div>
  );
}

// Change password. The mutation (auth.changePassword) has existed since the login
// rebuild but its only UI was a tab inside Settings labelled "Access" — nobody
// looked there, so people believed they could not change their own password. This
// puts the control where they go looking for it. The Settings copy is left in place
// so no existing path breaks; both call the same mutation.
function PasswordCard() {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const changePassword = trpc.auth.changePassword.useMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPw.length < 8) { setMsg({ kind: 'err', text: 'Your new password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setMsg({ kind: 'err', text: "Those two new passwords don't match." }); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: curPw, newPassword: newPw });
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setMsg({ kind: 'ok', text: 'Password updated.' });
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message ?? "Couldn't update your password." });
    }
  };

  return (
    <div className="ls-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4 text-ls-blue" />
        <h2 className="text-lg font-bold text-ls-ink-1">Password</h2>
      </div>
      <p className="text-[13px] text-ls-ink-3 mb-4">
        Change the password you use to sign in. You&rsquo;ll need your current one. If you&rsquo;ve
        forgotten it, sign out and use &ldquo;Forgot password?&rdquo; on the sign-in screen.
      </p>
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={lblCls} htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" className={inputCls}
              value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          </div>
          <div>
            <label className={lblCls} htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" autoComplete="new-password" className={inputCls}
              value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className={lblCls} htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className={inputCls}
              value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="ls-btn ls-btn-primary"
            disabled={changePassword.isLoading || !curPw || !newPw || !confirmPw}>
            {changePassword.isLoading ? 'Updating…' : 'Update password'}
          </button>
          {msg && (
            <span className={`text-[13px] ${msg.kind === 'ok' ? 'text-ls-thrive' : 'text-ls-risk'}`}>{msg.text}</span>
          )}
        </div>
      </form>
    </div>
  );
}
