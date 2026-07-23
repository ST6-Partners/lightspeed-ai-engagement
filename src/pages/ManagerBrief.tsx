import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, CircleAlert, UserCheck, Bell, Plus, ChevronRight } from 'lucide-react';

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

export default function ManagerBrief() {
  const utils = trpc.useContext();
  const weekly = trpc.metrics.weekly.useQuery();
  const teamQ = trpc.metrics.teamProfiles.useQuery();
  const actionsQ = trpc.actions.listForManager.useQuery();

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

  const dist = profiles.reduce((acc, p) => { acc[signalOf(p)]++; return acc; }, { thrive: 0, watch: 0, risk: 0 } as Record<Signal, number>);

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

  // Brief narrative composed from this week's signals.
  const briefLine = (() => {
    if (teamSize === 0) return 'You don’t have any direct reports set up yet. Once people report to you, their weekly signals show up here.';
    const checkedIn = recap?.checkedIn ?? 0;
    const worry = concerns.length;
    let s = `Your team of ${teamSize} is ${dist.risk === 0 ? 'in a good place' : 'mostly steady'} this week. ${checkedIn} of ${teamSize} have checked in.`;
    if (worry > 0) s += ` ${worry === 1 ? 'One person' : `${worry} people`} worth a look: ${concerns.slice(0, 3).map((c) => c.name).join(', ')}${worry > 3 ? '…' : ''}.`;
    if (wins.length) s += ` ${wins.length === 1 ? 'One win' : `${wins.length} wins`} logged worth recognizing.`;
    return s;
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Manager brief</h1>
        <p className="text-sm text-gray-500">Where your team stands this week, and the few things worth your time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* LEFT: brief + attention + team */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI brief */}
          <div className="rounded-2xl p-6 text-white shadow-sm" style={{ background: 'linear-gradient(135deg,#31596F,#2E89B8)' }}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-90"><Sparkles size={14} /> AI brief · your team this week</div>
            <p className="mt-3 text-[15px] leading-relaxed max-w-2xl">{briefLine}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(['thrive', 'watch', 'risk'] as Signal[]).map((s) => (
                <div key={s} className="rounded-xl bg-white/15 px-3 py-2.5">
                  <div className="text-2xl font-extrabold leading-none">{dist[s]}</div>
                  <div className="text-[11.5px] opacity-90 mt-1">{SIG_LABEL[s]}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] opacity-80">Drawn from this week’s check-ins and weekly plans{recap?.avgMood != null ? ` · avg mood ${recap.avgMood}/5` : ''}.</div>
          </div>

          {/* Needs attention */}
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Needs your attention</div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {concerns.length === 0 && wins.length === 0 && (
                <div className="p-6 text-sm text-gray-500">Nothing flagged this week. {recap && recap.notCheckedIn.length > 0 ? `${recap.notCheckedIn.length} still to check in.` : 'Everyone has checked in.'}</div>
              )}
              {concerns.map((c) => {
                const risk = c.reasons.length >= 2;
                return (
                  <div key={c.userId} className="p-4 flex gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-none ${risk ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{risk ? <TrendingDown size={16} /> : <CircleAlert size={16} />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      <div className="text-[13px] text-gray-600 mt-0.5">{c.reasons.slice(0, 3).join(' · ')}</div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => prefill(`Check in with ${c.name}`, c.userId, c.name, risk ? 'high' : 'medium')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"><Plus size={13} /> Create action</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {wins.map((w) => (
                <div key={w.userId} className="p-4 flex gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-none bg-emerald-50 text-emerald-600"><TrendingUp size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{w.name} logged a win</div>
                    <div className="text-[13px] text-gray-600 mt-0.5">“{w.wins}”</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My team */}
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">My team · {profiles.length} {profiles.length === 1 ? 'person' : 'people'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => {
                const sig = signalOf(p);
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center ${avatarColor(p.name)}`}>{initials(p.name)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.title ?? p.role}{p.department ? ` · ${p.department}` : ''}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${SIG_CLS[sig]}`}>{SIG_LABEL[sig]}</span>
                      <div className="flex items-center gap-2">
                        {!p.checkedIn && <span className="text-[11px] text-gray-400">no check-in</span>}
                        <button onClick={() => prefill('', p.id, p.name)} title="Assign an action" className="text-gray-400 hover:text-blue-600"><Plus size={15} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: actions */}
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">Actions you’ve assigned</div>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-sm text-gray-900">Team actions</div>
              <span className="text-xs text-gray-400">{openActions.length} open</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-auto">
              {actions.length === 0 && <div className="p-4 text-sm text-gray-500">No actions yet. Assign one below.</div>}
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
            <div id="action-composer" className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-2">
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
    </div>
  );
}
