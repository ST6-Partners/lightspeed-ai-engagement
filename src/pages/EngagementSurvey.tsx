// Engagement Survey — periodic engagement survey (15Five "Engage" parity).
// Renders the full instrument: 5 Likert sections (66 statements) + an eNPS 0..10
// with a confidential open-text reason. One submission per sitting; responses
// are confidential and stored via engagementSurvey.submit.
import { useMemo, useState } from 'react';
import { trpc } from '../lib/trpc';
import {
  SECTIONS, LIKERT, ALL_LIKERT_IDS, LIKERT_COUNT,
  ENPS_INTRO, ENPS_QUESTION, ENPS_REASON_QUESTION,
} from '../lib/engagementSurvey';

type Likert = Record<string, number>;

export default function EngagementSurvey() {
  const [answers, setAnswers] = useState<Likert>({});
  const [enpsScore, setEnpsScore] = useState<number | null>(null);
  const [enpsReason, setEnpsReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const stats = trpc.engagementSurvey.stats.useQuery();
  const submit = trpc.engagementSurvey.submit.useMutation({
    onSuccess: () => { setSubmitted(true); stats.refetch(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  });

  const answeredCount = useMemo(
    () => ALL_LIKERT_IDS.filter((id) => typeof answers[id] === 'number').length,
    [answers],
  );
  const likertComplete = answeredCount === LIKERT_COUNT;
  const complete = likertComplete && enpsScore != null;
  const set = (id: string, v: number) => setAnswers((p) => ({ ...p, [id]: v }));
  const missing = (id: string) => showGaps && typeof answers[id] !== 'number';

  const handleSubmit = () => {
    if (!complete) { setShowGaps(true); const el = document.querySelector('[data-missing="1"]'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    submit.mutate({ answers, enpsScore: enpsScore ?? undefined, enpsReason: enpsReason.trim() || undefined });
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="ls-eyebrow mb-1">Engagement</div>
        <h1 className="text-2xl font-bold tracking-tight">Engagement Survey</h1>
        <div className="ls-card p-8 mt-5 text-center border-l-4 border-ls-thrive">
          <div className="text-3xl mb-2">✓</div>
          <h2 className="text-xl font-bold mb-1">Thank you — your response was recorded.</h2>
          <p className="text-sm text-ls-ink-2 max-w-lg mx-auto">
            Your answers are confidential and feed the aggregate engagement read. There's nothing
            more to do — you can close this tab.
          </p>
          {typeof stats.data?.count === 'number' && (
            <div className="mt-5 inline-flex items-center gap-2 ls-chip bg-ls-blue-50 text-ls-blue-deep">
              {stats.data.count} response{stats.data.count === 1 ? '' : 's'} collected
              {stats.data.favorabilityPct != null && <> · {stats.data.favorabilityPct}% favorable</>}
              {stats.data.avgEnps != null && <> · eNPS avg {stats.data.avgEnps}/10</>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight">Engagement Survey</h1>
      <p className="text-sm text-ls-ink-3 mb-4">
        Please rate how strongly you agree or disagree with each of the following statements by
        selecting the appropriate option. This survey takes an average of 6 minutes to complete.
      </p>
      <div className="ls-card p-3 mb-5 text-[13px] text-ls-ink-2">
        🔒 <b>Confidential.</b> Your individual responses are kept confidential and are used only in
        aggregate. No manager sees your personal answers.
      </div>

      {/* Progress */}
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
          <div className="h-full bg-ls-active transition-all" style={{ width: `${(answeredCount / (LIKERT_COUNT + 1) + (enpsScore != null ? 1 / (LIKERT_COUNT + 1) : 0)) * 100}%` }} />
        </div>
      </div>

      {/* Likert sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.key}>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-ls-blue-deep">{section.title}</h2>
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
                          className={`flex flex-col items-center justify-start text-center border rounded-lg px-1.5 py-2 transition-colors ${
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

        {/* eNPS */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-ls-blue-deep">Your work experience at Lightspeed Systems</h2>
            <p className="text-[13px] text-ls-ink-3">{ENPS_INTRO}</p>
          </div>
          <div data-missing={showGaps && enpsScore == null ? '1' : undefined}
            className={`ls-card p-5 ${showGaps && enpsScore == null ? 'border-ls-risk ring-1 ring-ls-risk' : ''}`}>
            <div className="text-[15px] font-semibold mb-3">{ENPS_QUESTION}</div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                const active = enpsScore === n;
                return (
                  <button key={n} type="button" onClick={() => setEnpsScore(n)}
                    className={`w-10 text-center text-sm border rounded-lg py-2 transition-colors ${
                      active ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep font-bold' : 'border-ls-line text-ls-ink-2 hover:border-ls-blue'
                    }`}>{n}</button>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-ls-ink-3 mt-1.5 max-w-[30rem]">
              <span>Very Unlikely</span><span>Very Likely</span>
            </div>
          </div>
          <div className="ls-card p-5 mt-3">
            <div className="text-[15px] font-semibold mb-1">{ENPS_REASON_QUESTION}</div>
            <p className="text-[12px] text-ls-ink-3 mb-2">Optional. Your written response is confidential.</p>
            <textarea value={enpsReason} onChange={(e) => setEnpsReason(e.target.value)} rows={4}
              placeholder="Write your confidential response here…"
              className="w-full text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
          </div>
        </section>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 mt-6 mb-10">
        <button disabled={submit.isPending} onClick={handleSubmit}
          className="ls-btn ls-btn-primary disabled:opacity-50">
          {submit.isPending ? 'Submitting…' : 'Submit survey'}
        </button>
        {!complete && showGaps && (
          <span className="ls-chip bg-ls-watch-bg text-ls-watch">Please answer every required question</span>
        )}
        {submit.isError && <span className="ls-chip bg-ls-risk-bg text-ls-risk">Something went wrong — try again</span>}
      </div>
    </div>
  );
}
