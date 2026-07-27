import { useState } from 'react';
import { trpc } from '../lib/trpc';
import {
  Sparkles, CircleAlert, UserCheck, Bell, Plus, MessageCircle, ListChecks,
  ClipboardCheck, ClipboardList, FileText, CheckCircle2, Clock, Award, Users, AlertTriangle,
} from 'lucide-react';

type Signal = 'thrive' | 'watch' | 'risk';
const SIG_LABEL: Record<Signal, string> = { thrive: 'Thriving', watch: 'Watch', risk: 'Needs a conversation' };
const SIG_CLS: Record<Signal, string> = {
  thrive: 'bg-emerald-50 text-emerald-700',
  watch: 'bg-amber-50 text-amber-700',
  risk: 'bg-rose-50 text-rose-700',
};
const PRI_CLS: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

type Stage = 'not_started' | 'in_progress' | 'scored' | 'plan_ready' | 'closed';
const STAGE_META: Record<Stage, { label: string; chip: string; filled: number; warn?: boolean; green?: boolean }> = {
  not_started: { label: 'Not started', chip: 'bg-rose-50 text-rose-700', filled: 0, warn: true },
  in_progress: { label: 'In progress', chip: 'bg-gray-100 text-gray-600', filled: 2 },
  scored: { label: 'Scored · draft plan', chip: 'bg-blue-50 text-blue-700', filled: 3 },
  plan_ready: { label: 'Plan ready', chip: 'bg-emerald-50 text-emerald-700', filled: 4, green: true },
  closed: { label: 'Closed', chip: 'bg-emerald-50 text-emerald-700', filled: 4 },
};

function signalOf(p: { concernCount: number; mood: number | null }): Signal {
  if (p.concernCount >= 2) return 'risk';
  if (p.concernCount === 1 || (p.mood != null && p.mood <= 2)) return 'watch';
  return 'thrive';
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
function avatarColor(name: string) {
  const palette = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500', 'bg-teal-600'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
function scoreCls(n: number | null) {
  if (n == null) return 'text-gray-400';
  return n >= 4 ? 'text-emerald-600' : n >= 3 ? 'text-blue-600' : n >= 2 ? 'text-amber-600' : 'text-rose-600';
}
function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ACTIVITY_ICON: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  review: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  checkin: { icon: ClipboardCheck, cls: 'bg-blue-50 text-blue-600' },
  coaching: { icon: FileText, cls: 'bg-blue-50 text-blue-600' },
  win: { icon: Award, cls: 'bg-emerald-50 text-emerald-600' },
  peer: { icon: Users, cls: 'bg-gray-100 text-gray-600' },
};

export default function ManagerBrief() {
  const utils = trpc.useContext();
  const weekly = trpc.metrics.weekly.useQuery();
  const teamQ = trpc.metrics.teamProfiles.useQuery();
  const reviewsQ = trpc.reviewSession.teamReviews.useQuery();
  const activityQ = trpc.metrics.recentActivity.useQuery();
  const actionsQ = trpc.actions.listForManager.useQuery();
  const alertsQ = trpc.oneOnOne.talkingPointAlerts.useQuery();

  const createAction = trpc.actions.create.useMutation({
    onSuccess: () => { utils.actions.listForManager.invalidate(); setJustAssigned(form.assigneeName); setForm((f) => ({ ...f, title: '' })); },
    onError: (e) => setErr(e.message),
  });
  const toggleAction = trpc.actions.toggleDone.useMutation({ onSuccess: () => utils.actions.listForManager.invalidate() });

  const profiles = teamQ.data?.profiles ?? [];
  const recap = weekly.data?.recap;
  const concerns = weekly.data?.concerns ?? [];
  const wins = weekly.data?.wins ?? [];
  const teamSize = weekly.data?.teamSize ?? profiles.length;
  const reviewRows = reviewsQ.data?.reviews ?? [];
  const reviewPeriod = reviewsQ.data?.period ?? null;
  const activity = activityQ.data?.items ?? [];
  const talkingPoints = alertsQ.data ?? [];
  const talkingPointCount = talkingPoints.reduce((n, g) => n + g.count, 0);

  const dist = profiles.reduce((acc, p) => { acc[signalOf(p)]++; return acc; }, { thrive: 0, watch: 0, risk: 0 } as Record<Signal, number>);

  // Review roll-up counts.
  const reviewsClosed = reviewRows.filter((r) => r.stage === 'closed').length;
  const reviewsNeedAction = reviewRows.filter((r) => r.stage === 'not_started' || r.stage === 'in_progress' || r.stage === 'scored').length;
  const plansReady = reviewRows.filter((r) => r.stage === 'plan_ready').length;

  const [form, setForm] = useState({ title: '', assigneeId: '', assigneeName: '', priority: 'medium', dueDate: '' });
  const [err, setErr] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    if (!form.title.trim()) { setErr('Give the action a title.'); return; }
    if (!form.assigneeId) { setErr('Pick who it is for.'); return; }
    createAction.mutate({ title: form.title.trim(), assigneeId: form.assigneeId, priority: form.priority as 'high' | 'medium' | 'low', dueDate: form.dueDate || undefined });
  };
  const prefill = (title: string, assigneeId: string, assigneeName: string, priority = 'medium') => {
    setJustAssigned(null);
    setForm({ title, assigneeId, assigneeName, priority, dueDate: '' });
    document.getElementById('action-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const actions = actionsQ.data ?? [];
  const openActions = actions.filter((a) => !a.done);

  // Merged "needs attention" — stacks check-in concerns and review needs per person.
  const concernByUser = new Map(concerns.map((c) => [c.userId, c]));
  const reviewByUser = new Map(reviewRows.map((r) => [r.employeeId, r]));
  const attention = profiles.map((p) => {
    const reasons: string[] = [];
    let cta: { label: string; title: string; priority: string } | null = null;
    const notIn = !p.checkedIn;
    if (notIn) reasons.push('No check-in this week');
    const c = concernByUser.get(p.id);
    if (c) reasons.push(...c.reasons.slice(0, 2));
    const rv = reviewByUser.get(p.id);
    if (rv) {
      if (rv.stage === 'not_started') { reasons.push('Review not started'); cta = { label: 'Start review', title: `Start ${p.name}'s review`, priority: 'medium' }; }
      else if (rv.stage === 'scored') { reasons.push('Scored — coaching plan not drafted'); cta = { label: 'Draft coaching plan', title: `Draft ${p.name}'s coaching plan`, priority: 'medium' }; }
      else if (rv.stage === 'plan_ready') { reasons.push('Coaching plan ready to share'); cta = { label: 'Review & share plan', title: `Share ${p.name}'s coaching plan`, priority: 'medium' }; }
    }
    const risk = reasons.length >= 2;
    if (!cta) cta = { label: 'Create action', title: `Check in with ${p.name}`, priority: risk ? 'high' : 'medium' };
    return { p, reasons, cta, risk };
  }).filter((x) => x.reasons.length > 0).sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 6);

  // Brief narrative composed from this week's signals.
  const briefLine = (() => {
    if (teamSize === 0) return 'You don’t have any direct reports set up yet. Once people report to you, their weekly signals show up here.';
    const checkedIn = recap?.checkedIn ?? 0;
    const worry = concerns.length;
    let s = `Your team of ${teamSize} is ${dist.risk === 0 ? 'in a good place' : 'mostly steady'} this week. ${checkedIn} of ${teamSize} have checked in.`;
    if (worry > 0) s += ` ${worry === 1 ? 'One person' : `${worry} people`} worth a look: ${concerns.slice(0, 3).map((c) => c.name).join(', ')}${worry > 3 ? '…' : ''}.`;
    if (reviewRows.length) s += ` On reviews, ${reviewsClosed} ${reviewsClosed === 1 ? 'cycle is' : 'cycles are'} wrapped${reviewsNeedAction ? `, ${reviewsNeedAction} need your next move` : ''}${plansReady ? `, and ${plansReady} coaching ${plansReady === 1 ? 'plan is' : 'plans are'} ready to share` : ''}.`;
    if (wins.length) s += ` ${wins.length === 1 ? 'One win' : `${wins.length} wins`} logged worth recognizing.`;
    return s;
  })();

  const Stat = ({ icon: Icon, label, value, sub, note, tone }: { icon: typeof CheckCircle2; label: string; value: string; sub?: string; note?: string; tone?: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-400 text-[11.5px] font-bold"><Icon size={14} /> {label}</div>
      <div className="text-[23px] font-extrabold mt-1.5 tracking-tight tabular-nums">{value}{sub && <span className="text-[13px] text-gray-400 font-bold">{sub}</span>}</div>
      {note && <div className={`text-[11px] mt-0.5 font-semibold ${tone ?? 'text-gray-400'}`}>{note}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* AI brief */}
      <div className="rounded-2xl p-6 text-white shadow-sm" style={{ background: 'linear-gradient(92deg,#00629B,#00AFD7)' }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-90"><Sparkles size={14} /> AI brief · your team this week</div>
        <p className="mt-3 text-[15px] leading-relaxed max-w-3xl">{briefLine}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 max-w-md">
          {(['thrive', 'watch', 'risk'] as Signal[]).map((s) => (
            <div key={s} className="rounded-xl bg-white/15 px-3 py-2.5">
              <div className="text-2xl font-extrabold leading-none">{dist[s]}</div>
              <div className="text-[11.5px] opacity-90 mt-1">{SIG_LABEL[s]}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] opacity-80">Drawn from this week’s check-ins, weekly plans, and open review cycles{recap?.avgMood != null ? ` · avg mood ${recap.avgMood}/5` : ''}{reviewPeriod ? ` · review period ${reviewPeriod}` : ''}.</div>
      </div>

      {/* At a glance */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">This week at a glance</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat icon={ClipboardCheck} label="Checked in" value={`${recap?.checkedIn ?? 0}`} sub={`/${teamSize}`} note={recap && recap.notCheckedIn.length > 0 ? `${recap.notCheckedIn.length} still to check in` : 'everyone in'} tone={recap && recap.notCheckedIn.length > 0 ? 'text-amber-600' : 'text-emerald-600'} />
          <Stat icon={CheckCircle2} label="Reviews on track" value={`${reviewsClosed}`} sub={`/${reviewRows.length}`} note="cycles complete" tone="text-emerald-600" />
          <Stat icon={AlertTriangle} label="Reviews need action" value={`${reviewsNeedAction}`} note="not started or mid-cycle" tone={reviewsNeedAction ? 'text-rose-600' : 'text-gray-400'} />
          <Stat icon={FileText} label="Coaching plans" value={`${plansReady}`} note="drafted, ready to share" />
          <Stat icon={ClipboardList} label="Open actions" value={`${openActions.length}`} note={`${actions.length} total`} />
          <Stat icon={ListChecks} label="Priorities done" value={recap?.completionPct != null ? `${recap.completionPct}%` : '—'} note={`${recap?.donePrio ?? 0}/${recap?.totalPrio ?? 0} done`} />
        </div>
      </div>

      {/* Parallel: check-ins + reviews */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Where your team stands</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Check-ins */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><ClipboardCheck size={16} className="text-blue-600" /> Your team this week</div>
              <span className="text-xs text-gray-400 font-semibold">{recap?.checkedIn ?? 0} of {teamSize} in</span>
            </div>
            <div className="divide-y divide-gray-100">
              {profiles.length === 0 && <div className="p-6 text-sm text-gray-500">No direct reports yet.</div>}
              {profiles.map((p) => {
                const sig = signalOf(p);
                return (
                  <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${!p.checkedIn && sig === 'risk' ? 'bg-rose-50/40' : ''}`}>
                    <div className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center flex-none ${avatarColor(p.name)}`}>{initials(p.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                      <div className="text-[11.5px] text-gray-500 truncate">{p.title ?? p.role}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 flex-wrap">
                        <span className={p.checkedIn ? 'text-emerald-600' : 'text-gray-400'}>{p.checkedIn ? '● Checked in' : '○ No check-in'}</span>
                        <span>· Mood {p.mood != null ? `${p.mood}/5` : '—'}</span>
                        <span>· Priorities {p.priorityTotal ? `${p.priorityDone}/${p.priorityTotal}` : '—'}</span>
                      </div>
                    </div>
                    <span className={`ml-auto flex-none text-[11px] font-bold px-2.5 py-1 rounded-full ${SIG_CLS[sig]}`}>{SIG_LABEL[sig]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden ring-1 ring-blue-50">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-blue-50/60">
              <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><ClipboardList size={16} className="text-blue-700" /> Reviews in progress</div>
              <span className="text-xs text-gray-400 font-semibold">{reviewPeriod ?? 'current period'}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {reviewRows.length === 0 && <div className="p-6 text-sm text-gray-500">No review data for your team this period.</div>}
              {reviewRows.map((r) => {
                const m = STAGE_META[r.stage as Stage];
                return (
                  <div key={r.employeeId} className={`px-4 py-3 flex items-center gap-3 ${r.stage === 'not_started' ? 'bg-rose-50/40' : ''}`}>
                    <div className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center flex-none ${avatarColor(r.name)}`}>{initials(r.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{r.name}</div>
                      <div className="flex items-center gap-[3px] mt-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={`h-[5px] flex-1 rounded-sm ${i < m.filled ? (m.green && i === 3 ? 'bg-emerald-500' : 'bg-blue-500') : (m.warn && i === 0 ? 'bg-amber-400' : 'bg-gray-200')}`} />
                        ))}
                      </div>
                      <div className={`text-[11px] font-semibold mt-1 ${r.stage === 'not_started' ? 'text-rose-600' : 'text-gray-500'}`}>{m.label}{r.planTrack === 'pip' ? ' · PIP' : ''}</div>
                    </div>
                    <div className="text-right flex-none">
                      <div className="text-[12.5px] font-extrabold tabular-nums">
                        <span className={scoreCls(r.values)}>{r.values ?? '—'}</span> <span className="text-gray-400 font-semibold">V</span> · <span className={scoreCls(r.performance)}>{r.performance ?? '—'}</span> <span className="text-gray-400 font-semibold">P</span>
                      </div>
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mt-1 ${m.chip}`}>{m.label.split(' · ')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* New talking points from your team (from the 1:1 hub) */}
      {talkingPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><MessageCircle size={16} className="text-blue-600" /> New talking points from your team</div>
            <span className="text-xs text-gray-400 font-semibold">{talkingPointCount} new</span>
          </div>
          <div className="divide-y divide-gray-100">
            {talkingPoints.map((g) => (
              <div key={g.employeeId} className="px-4 py-3 bg-blue-50/30">
                <div className="text-sm font-semibold text-gray-900">{g.employeeName} <span className="text-[11px] font-normal text-gray-400">· {g.count} new</span></div>
                <ul className="mt-1 space-y-1">
                  {g.items.map((it) => (
                    <li key={it.id} className="text-[12.5px] text-gray-600 flex items-start gap-2">
                      <MessageCircle size={13} className="text-blue-500 mt-0.5 flex-none" />
                      <span>{it.message.replace(/^.*?added a talking point: /, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent updates + Needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Recent updates */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><Clock size={16} className="text-blue-600" /> Recent updates</div>
            <span className="text-xs text-gray-400 font-semibold">last 7 days</span>
          </div>
          <div className="divide-y divide-gray-100">
            {activity.length === 0 && <div className="p-6 text-sm text-gray-500">No activity in the last week.</div>}
            {activity.map((a, i) => {
              const meta = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON.checkin;
              const Icon = meta.icon;
              return (
                <div key={i} className="px-4 py-3 flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${meta.cls}`}><Icon size={15} /></div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-gray-800 leading-snug">{a.text}</div>
                    <div className="text-[11px] text-gray-400 font-semibold mt-0.5">{timeAgo(a.at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs attention */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><AlertTriangle size={16} className="text-amber-500" /> Needs your attention</div>
            <span className="text-xs text-gray-400 font-semibold">{attention.length} items</span>
          </div>
          <div className="divide-y divide-gray-100">
            {attention.length === 0 && <div className="p-6 text-sm text-gray-500">Nothing flagged. {wins.length > 0 ? `${wins.length} ${wins.length === 1 ? 'win' : 'wins'} logged worth recognizing.` : 'Your team is in good shape.'}</div>}
            {attention.map(({ p, reasons, cta, risk }) => (
              <div key={p.id} className="px-4 py-3 flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-none ${risk ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{risk ? <AlertTriangle size={16} /> : <CircleAlert size={16} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                  <div className="text-[12.5px] text-gray-600 mt-0.5">{reasons.join(' · ')}</div>
                  <button onClick={() => prefill(cta.title, p.id, p.name, cta.priority)}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"><Plus size={13} /> {cta.label}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team actions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2 text-gray-900"><ClipboardList size={16} className="text-blue-600" /> Actions you’ve assigned</div>
          <span className="text-xs text-gray-400 font-semibold">{openActions.length} open</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0">
          <div className="divide-y divide-gray-100 lg:border-r border-gray-100 max-h-80 overflow-auto">
            {actions.length === 0 && <div className="p-4 text-sm text-gray-500">No actions yet. Assign one on the right.</div>}
            {actions.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <button onClick={() => toggleAction.mutate({ id: a.id, done: !a.done })}
                  className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border-2 flex-none flex items-center justify-center ${a.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>{a.done ? '✓' : ''}</button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${a.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{a.title}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase ${PRI_CLS[a.priority] ?? PRI_CLS.low}`}>{a.priority}</span>
                    <span>{a.assigneeName}</span>
                    {a.dueDate && <span>· due {a.dueDate}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* composer */}
          <div id="action-composer" className="p-4 bg-gray-50 lg:rounded-br-2xl space-y-2">
            <div className="font-semibold text-sm text-gray-900">New action</div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What needs to happen?"
              className="w-full px-2.5 py-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <div className="flex gap-2">
              <select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value, assigneeName: e.target.selectedOptions[0]?.text ?? '' }))}
                className="flex-1 px-2 py-2 rounded-md border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">Assign to…</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="px-2 py-2 rounded-md border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-2.5 py-2 rounded-md border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {err && <div className="text-xs text-rose-600">{err}</div>}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-500"><Bell size={12} /> The assignee gets a notification</span>
              <button onClick={submit} disabled={createAction.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {createAction.isPending ? 'Assigning…' : 'Assign'}</button>
            </div>
            {justAssigned && <div className="text-xs text-emerald-700 inline-flex items-center gap-1.5"><UserCheck size={13} /> Assigned — {justAssigned} was notified.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
