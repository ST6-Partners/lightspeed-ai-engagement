// Take Survey — the engagement survey form. Questions are loaded from the
// admin-managed question bank (engagementSurveyQuestions.listActive), grouped by
// section, then eNPS 0..10 + open text. Anonymous: no name is collected; only
// job title + department (for aggregate rollups). Submits via engagementSurvey.submit.
import { useMemo, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { LIKERT, ENPS_INTRO, ENPS_QUESTION, ENPS_REASON_QUESTION } from '../../lib/engagementSurvey';

type Likert = Record<string, number>;
type TextAns = Record<string, string>;

const selectCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const labelCls = 'block text-xs font-medium text-gray-500 uppercase mb-1';

export default function SurveyForm() {
  const [answers, setAnswers] = useState<Likert>({});
  const [textAnswers, setTextAnswers] = useState<TextAns>({});
  const [jobTitleId, setJobTitleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [enpsReason, setEnpsReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const { data: versions } = trpc.engagementSurveyVersions.list.useQuery();
  const [versionId, setVersionId] = useState<string | undefined>(undefined);
  const effectiveVersionId = versionId ?? versions?.find((v) => v.isDefault)?.id ?? versions?.[0]?.id;
  const { data: versionData } = trpc.engagementSurveyVersions.getQuestions.useQuery(
    { versionId: effectiveVersionId }, { enabled: !!effectiveVersionId });
  const questions = versionData?.questions;
  const { data: titles } = trpc.jobTitles.list.useQuery();
  const { data: depts } = trpc.departments.list.useQuery();

  const submit = trpc.engagementSurvey.submit.useMutation({
    onSuccess: () => { setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  });

  // Group active questions into sections, preserving order.
  const sections = useMemo(() => {
    const out: { key: string; title: string; intro: string; questions: NonNullable<typeof questions> }[] = [];
    for (const q of questions ?? []) {
      let sec = out.find((s) => s.key === q.section);
      if (!sec) { sec = { key: q.section, title: q.sectionTitle, intro: q.sectionIntro, questions: [] }; out.push(sec); }
      sec.questions.push(q);
    }
    return out;
  }, [questions]);

  const likertIds = useMemo(() => (questions ?? []).filter((q) => q.type === 'likert5').map((q) => q.id), [questions]);
  const likertCount = likertIds.length;
  const answeredCount = useMemo(
    () => likertIds.filter((id) => typeof answers[id] === 'number').length,
    [likertIds, answers],
  );
  const aboutComplete = !!jobTitleId && !!departmentId;
  const complete = aboutComplete && likertCount > 0 && answeredCount === likertCount && enpsScore != null;
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
      versionId: effectiveVersionId,
      textAnswers: Object.keys(textAnswers).length ? textAnswers : undefined,
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
        Rate how strongly you agree or disagree with each statement. Your responses are anonymous. Takes ~6 minutes.
      </p>
      <div className="ls-card p-3 mb-5 text-[13px] text-ls-ink-2">
        ℹ️ This survey is <b>anonymous</b> — your name is not recorded. Only your job title and department are saved, so results can be organized by role and team, and always reported in aggregate.
      </div>

      {(versions?.length ?? 0) > 1 && (
        <div className="ls-card p-4 mb-5 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-semibold text-ls-ink-2">Survey version:</span>
          <select className={selectCls + " max-w-xs"} value={effectiveVersionId ?? ''}
            onChange={(e) => { setVersionId(e.target.value); setAnswers({}); setTextAnswers({}); setEnpsScore(null); setShowGaps(false); }}>
            {(versions ?? []).map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.isDefault ? ' (default)' : ''}</option>
            ))}
          </select>
          <span className="text-[12px] text-ls-ink-3">{questions?.length ?? 0} questions</span>
        </div>
      )}

      {/* About you */}
      <div className="ls-card p-5 mb-6">
        <h3 className="text-lg font-bold text-ls-blue-deep mb-1">About you</h3>
        <p className="text-[13px] text-ls-ink-3 mb-3">So results can be organized by role and team. Your responses stay anonymous — no name is collected.</p>
        <div className="grid sm:grid-cols-2 gap-3">
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
            {answeredCount} of {likertCount} statements answered{enpsScore != null ? ' · recommendation rated' : ''}
          </div>
          <span className={`ls-chip ${complete ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-bg-2 text-ls-ink-3'}`}>
            {complete ? 'Ready to submit' : `${Math.max(0, likertCount - answeredCount) + (enpsScore == null ? 1 : 0)} remaining`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-ls-bg-2 overflow-hidden">
          <div className="h-full bg-ls-active transition-all" style={{ width: `${((answeredCount + (enpsScore != null ? 1 : 0)) / (likertCount + 1)) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key}>
            <div className="mb-3">
              <h3 className="text-lg font-bold text-ls-blue-deep">{section.title}</h3>
              {section.intro && <p className="text-[13px] text-ls-ink-3">{section.intro}</p>}
            </div>
            <div className="space-y-3">
              {section.questions.map((q) => (
                q.type === 'text' ? (
                  <div key={q.id} className="ls-card p-5">
                    <div className="text-[15px] font-semibold mb-1">{q.text}</div>
                    <p className="text-[12px] text-ls-ink-3 mb-2">Optional.</p>
                    <textarea value={textAnswers[q.id] ?? ''} onChange={(e) => setTextAnswers((p) => ({ ...p, [q.id]: e.target.value }))} rows={3}
                      placeholder="Write your response here…"
                      className="w-full text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
                  </div>
                ) : (
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
                )
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
            {aboutComplete ? 'Please answer every required question' : 'Please select your title and department'}
          </span>
        )}
        {submit.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Something went wrong — try again</span>}
      </div>
    </div>
  );
}
