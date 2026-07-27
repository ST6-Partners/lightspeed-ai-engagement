// Profile — the signed-in user's own profile, reached from the avatar (bottom-left).
// Shows exactly the data the engagement survey reads for attribution. Personal
// fields + start date are editable; org-structure fields are read-only (managed by
// your admin via the employee upload) so analytics stay trustworthy.
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
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
        {p.avatarUrl
          ? <img src={p.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
          : <div className="w-14 h-14 rounded-full bg-ls-active text-white flex items-center justify-center text-lg font-bold">{p.name?.charAt(0) || '?'}</div>}
        <div>
          <h1 className="text-2xl font-bold text-ls-blue-deep">{p.name || 'Your profile'}</h1>
          <p className="text-sm text-ls-ink-3">{p.email}</p>
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
              <select className={inputCls} value={month} disabled={!year}
                onChange={(e) => { setMonth(e.target.value); setSaved(false); }}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <select className={inputCls} value={day} disabled={!year}
                onChange={(e) => { setDay(e.target.value); setSaved(false); }}>
                <option value="">Day</option>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {yearMissing && <p className="text-[12px] text-ls-risk mt-1">Please select a year to set a start date.</p>}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onSave} disabled={save.isPending || yearMissing} className="ls-btn ls-btn-primary disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="ls-chip bg-ls-thrive-bg text-ls-thrive">Saved</span>}
          {save.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Couldn’t save — try again</span>}
        </div>
      </div>

      {/* About you — editable, self-reported */}
      <div className="ls-card p-5 mb-5">
        <h2 className="text-lg font-bold text-ls-ink-1 mb-1">About you</h2>
        <p className="text-[13px] text-ls-ink-3 mb-4">Optional and self-reported. Share as much or as little as you like.</p>
        <div>
          <label className={lblCls}>Date of birth <span className="text-ls-ink-3 normal-case">(year required; month &amp; day optional)</span></label>
          <div className="grid grid-cols-4 gap-3 max-w-xl">
            <select className={inputCls} value={dYear} onChange={(e) => { setDYear(e.target.value); setSaved(false); }}>
              <option value="">Year</option>
              {DOB_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className={inputCls} value={dMonth} disabled={!dYear} onChange={(e) => { setDMonth(e.target.value); setSaved(false); }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className={inputCls} value={dDay} disabled={!dYear} onChange={(e) => { setDDay(e.target.value); setSaved(false); }}>
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
            <select className={inputCls} value={gender} onChange={(e) => { setGender(e.target.value); setSaved(false); }}>
              <option value="">—</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              {gender && !GENDERS.includes(gender) && <option value={gender}>{gender}</option>}
            </select>
          </div>
          <div>
            <label className={lblCls}>Ethnicity</label>
            <input className={inputCls} value={ethnicity} placeholder="Self-described (optional)" onChange={(e) => { setEthnicity(e.target.value); setSaved(false); }} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={onSave} disabled={save.isPending || yearMissing} className="ls-btn ls-btn-primary disabled:opacity-50">
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
    </div>
  );
}
