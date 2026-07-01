// Take Survey — the engagement survey form (under the Engagement Survey page's
// "Take Survey" tab). Starts with an "About you" block (name / job title /
// department dropdowns) so results can be organized, then 5 Likert sections
// (66 statements) + eNPS 0..10 + open text. Submits via engagementSurvey.submit.
import { useMemo, useState } from 'react';
import { trpc } from '../../lib/trpc';
import {
  SECTIONS, LIKERT, ALL_LIKERT_IDS, LIKERT_COUNT,
  ENPS_INTRO, ENPS_QUESTION, ENPS_REASON_QUESTION,
} from '../../lib/engagementSurvey';

type Likert = Record<string, number>;

// Shared field styling (matches the PIP / Core Data forms).
const selectCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const labelCls = 'block text-xs font-medium text-gray-500 uppercase mb-1';

export default function SurveyForm() {
  const [answers, setAnswers] = useState<Likert>({});
  const [employeeId, setEmployeeId] = useState('');
  const [jobTitleId, setJobTitleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [enpsReason, setEnpsReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const { data: users } = trpc.pip.listUsers.useQuery();
  const { data: titles } = trpc.jobTitles.list.useQuery();
  const { data: depts } = trpc.departments.list.useQuery();

  const submit = trpc.engagementSurvey.submit.useMutation({
    onSuccess: () => { setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  });

  const answeredCount = useMemo(
    () => ALL_LIKERT_IDS.filter((id) => typeof answers[id] === 'number').length,
    [answers],
  );
  const aboutComplete = !!employeeId && !!jobTitleId && !!departmentId;
  const complete = aboutComplete && answeredCount === LIKERT_COUNT && enpsScore != null;
  const set = (id: string, v: number) => setAnswers((p) => ({ ...p, [id]: v }));
  const missing = (id: string) => showGaps && typeof answers[id] !== 'number';

  const handleSubmit = () => {
    if (!complete) {
      setShowGaps(true);
      document.querySelector('[data-missing="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    submit.mutate({
      answers,
      respondentName: (users ?? []).find((u) => u.id === employeeId)?.name ?? undefined,
      jobTitle: (titles ?? []).find((t) => t.id === jobTitleId)?.title ?? undefined,
      department: (depts ?? []).find((d) => d.id === departmentId)?.name ?? undefined,
      enpsScore: enpsScore ?? undefined,
      enpsReason: enpsReason.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="ls-card p-8 text-center border-l-4 border-ls-thrive">
        <div className="text-3xl mb-2">✓</div>
        <h2 className="text-xl font-bold mb-1">Thank you — your response was recorded.</h2>
        <p className="text-sm text-ls-ink-2 max-w-lg mx-auto">
          Your answers feed the aggregate engagement read on the other tabs.
        </p>
      </div>
    );
  }

  const gapCls = (empty: boolean) => (showGaps && empty ? ' border-ls-risk ring-1 ring-ls-risk' : '');

  return (
    <div>
      <p className="text-sm text-ls-ink-3 mb-4">
        Tell us who you are, then rate how strongly you agree or disagree with each statement. Takes ~6 minutes.
      </p>
      <div className="ls-card p-3 mb-5 text-[13px] text-ls-ink-2">
        ℹ️ Your name, job title, and department are recorded with your responses so results can be organized by team. Results are reported in aggregate.
      </div>

      {/* About you */}
      <div className="ls-card p-5 mb-6">
        <h3 className="text-lg font-bold text-ls-blue-deep mb-1">About you</h3>
        <p className="text-[13px] text-ls-ink-3 mb-3">So we can organize results by person, role, and team.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Name</label>
            <select className={selectCls + gapCls(!employeeId)} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select your name…</option>
              {(users ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Job Title</label>
            <select className={selectCls + gapCls(!jobTitleId)} value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)}>
              <option value="">Select your title…</option>
              {(titles ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.title}{t.level ? ` · ${t.level}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Department</label>
            <select className={selectCls + gapCls(!departmentId)} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Select your department…</option>
              {(depts ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ls-card p-4 mb-5 sticky top-2 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-semibold text-ls-ink-2">
            {answeredCount} of {LIKERT_COUNT} statements answered{enpsScore != null ? ' · recommendation rated' : ''}
          </div>
          <span className={`ls-chip ${complete ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-bg-2 text-ls-ink-3'}`}>
            {complete ? 'Ready to submit' : `${LIKERT_COUNT - answeredCount + (enpsScore == null ? 1 : 0)} remaining`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-ls-bg-2 overflow-hidden">
          <div className="h-full bg-ls-active transition-all" style={{ width: `${((answeredCount + (enpsScore != null ? 1 : 0)) / (LIKERT_COUNT + 1)) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.key}>
            <div className="mb-3">
              <h3 className="text-lg font-bold text-ls-blue-deep">{section.title}</h3>
              <p className="text-[13px] text-ls-ink-3">{section.intro}</p>
            </div>
            <div className="space-y-3">
              {section.questions.map((q) => (
                <div key={q.id} data-missing={missing(q.id) ? '1' : undefined}
                  className={`ls-card p-5 ${missing(q.id) ? 'border-ls-risk ring-1 ring-ls-risk' : ''}`}>
                  <div className="text-[15px] font-semibold mb-3">{q.text}</div>
                  <div className="grid grid-cols-5 gap-2">
                    {LIKERT.map((opt) => {
                      const active = answers[q.id] === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => set(q.id, opt.value)} title={opt.label}
                          className={`flex flex-col items-center text-center border rounded-lg px-1.5 py-2 transition-colors ${
                            active ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep' : 'border-ls-line text-ls-ink-2 hover:border-ls-blue'
                          }`}>
                          <span className={`text-base font-bold ${active ? 'text-ls-blue-deep' : 'text-ls-ink-2'}`}>{opt.value}</span>
                          <span className="text-[10.5px] leading-tight mt-0.5 text-ls-ink-3">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <div className="mb-3">
            <h3 className="text-lg font-bold text-ls-blue-deep">Your work experience at Lightspeed Systems</h3>
            <p className="text-[13px] text-ls-ink-3">{ENPS_INTRO}</p>
          </div>
          <div data-missing={showGaps && enpsScore == null ? '1' : undefined}
            className={`ls-card p-5 ${showGaps && enpsScore == null ? 'border-ls-risk ring-1 ring-ls-risk' : ''}`}>
            <div className="text-[15px] font-semibold mb-3">{ENPS_QUESTION}</div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                <button key={num} type="button" onClick={() => setEnpsScore(num)}
                  className={`w-10 text-center text-sm border rounded-lg py-2 transition-colors ${
                    enpsScore === num ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep font-bold' : 'border-ls-line text-ls-ink-2 hover:border-ls-blue'
                  }`}>{num}</button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-ls-ink-3 mt-1.5 max-w-[30rem]"><span>Very Unlikely</span><span>Very Likely</span></div>
          </div>
          <div className="ls-card p-5 mt-3">
            <div className="text-[15px] font-semibold mb-1">{ENPS_REASON_QUESTION}</div>
            <p className="text-[12px] text-ls-ink-3 mb-2">Optional.</p>
            <textarea value={enpsReason} onChange={(e) => setEnpsReason(e.target.value)} rows={4}
              placeholder="Write your response here…"
              className="w-full text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3 mt-6 mb-10">
        <button disabled={submit.isPending} onClick={handleSubmit} className="ls-btn ls-btn-primary disabled:opacity-50">
          {submit.isPending ? 'Submitting…' : 'Submit survey'}
        </button>
        {!complete && showGaps && (
          <span className="ls-chip bg-ls-watch-bg text-ls-watch">
            {aboutComplete ? 'Please answer every required question' : 'Please fill in your name, title, and department'}
          </span>
        )}
        {submit.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Something went wrong — try again</span>}
      </div>
    </div>
  );
}
