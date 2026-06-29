import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import {
  Plus, Pencil, Trash2, ArrowLeft, Check, RotateCcw,
} from 'lucide-react';
import PipForm from '../components/pip/PipForm';
import ConcernForm from '../components/pip/ConcernForm';
import GoalForm from '../components/pip/GoalForm';
import SupportForm from '../components/pip/SupportForm';
import CheckInForm from '../components/pip/CheckInForm';
import type {
  PipDetail as PipDetailT, PipConcern, PipGoal, PipSupport, PipCheckin, PipStatus,
} from '../components/pip/types';
import {
  STATUS_LABELS, STATUS_CLASS, STATUS_TRANSITIONS,
  GOAL_STATUS_LABELS, CHECKIN_STATUS_LABELS, CHECKIN_STATUS_CLASS, SIGNATURE_LABELS,
} from '../components/pip/types';

// ---- small presentational helpers -----------------------------------------

function SectionHead({ n, title, right }: { n: number; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="flex-none w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-sm font-bold flex items-center justify-center">{n}</span>
      <h2 className="text-base font-bold text-gray-900 flex-1">{title}</h2>
      {right}
    </div>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
      <Plus size={14} /> {label}
    </button>
  );
}

function RowActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
      <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-600" title="Remove"><Trash2 size={14} /></button>
    </div>
  );
}

// Modal routing for the page.
type Modal =
  | { kind: 'editPip' }
  | { kind: 'concern'; initial?: PipConcern }
  | { kind: 'goal'; initial?: PipGoal }
  | { kind: 'support'; initial?: PipSupport }
  | { kind: 'checkin'; initial?: PipCheckin }
  | null;

// ---- page -----------------------------------------------------------------

export default function PipDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, refetch, isLoading } = trpc.pip.get.useQuery({ id }, { enabled: !!id });
  const pip = data as PipDetailT | undefined;

  const setStatus = trpc.pip.setStatus.useMutation({ onSuccess: () => refetch() });
  const saveComments = trpc.pip.saveEmployeeComments.useMutation({ onSuccess: () => refetch() });
  const updatePip = trpc.pip.update.useMutation({ onSuccess: () => refetch() });
  const updateGoal = trpc.pip.updateGoal.useMutation({ onSuccess: () => refetch() });
  const updateCheckin = trpc.pip.updateCheckin.useMutation({ onSuccess: () => refetch() });
  const sign = trpc.pip.sign.useMutation({ onSuccess: () => refetch() });
  const unsign = trpc.pip.unsign.useMutation({ onSuccess: () => refetch() });
  const removeConcern = trpc.pip.removeConcern.useMutation({ onSuccess: () => refetch() });
  const removeGoal = trpc.pip.removeGoal.useMutation({ onSuccess: () => refetch() });
  const removeSupport = trpc.pip.removeSupport.useMutation({ onSuccess: () => refetch() });
  const removeCheckin = trpc.pip.removeCheckin.useMutation({ onSuccess: () => refetch() });

  const [modal, setModal] = useState<Modal>(null);
  const [comments, setComments] = useState('');
  const [outMet, setOutMet] = useState('');
  const [outNot, setOutNot] = useState('');

  useEffect(() => {
    if (pip) {
      setComments(pip.employeeComments ?? '');
      setOutMet(pip.outcomeMet ?? '');
      setOutNot(pip.outcomeNotMet ?? '');
    }
  }, [pip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>;
  if (!pip) return <div className="p-8 text-center text-gray-500">Plan not found. <Link className="text-blue-600" to="/pips">Back to list</Link></div>;

  const canEdit = pip.canEdit;
  const closed = ['completed_met', 'completed_not_met', 'cancelled'].includes(pip.status);
  const closeRefetch = () => { setModal(null); refetch(); };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Back + header */}
      <button onClick={() => navigate('/pips')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> All plans
      </button>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-500 text-white rounded-2xl px-8 py-7 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 border border-white/30 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider mb-3">
              Confidential · Performance Improvement Plan
            </span>
            <h1 className="text-2xl font-bold">Performance Improvement Plan</h1>
            <p className="text-white/90 text-sm mt-1">{pip.employeeName ?? 'Unassigned employee'}{pip.roleLevel ? ` · ${pip.roleLevel}` : ''}</p>
          </div>
          <span className={`flex-none px-2.5 py-1 text-xs rounded-full font-medium ${STATUS_CLASS[pip.status]}`}>
            {STATUS_LABELS[pip.status]}
          </span>
        </div>
      </div>

      {/* Status workflow */}
      {canEdit && STATUS_TRANSITIONS[pip.status].length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-500 mr-1">Move plan to:</span>
          {STATUS_TRANSITIONS[pip.status].map((s: PipStatus) => (
            <button key={s} onClick={() => setStatus.mutate({ id: pip.id, status: s })}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-9">

        {/* §1 Plan details */}
        <section>
          <SectionHead n={1} title="Plan Details" right={canEdit ? (
            <button onClick={() => setModal({ kind: 'editPip' })}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md">
              <Pencil size={14} /> Edit
            </button>
          ) : undefined} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Detail label="Employee" value={pip.employeeName} />
            <Detail label="Role / Level" value={pip.roleLevel} />
            <Detail label="Team / Department" value={pip.team} />
            <Detail label="Manager" value={pip.managerName} />
            <Detail label="HR Partner" value={pip.hrPartnerName} />
            <Detail label="Plan Duration" value={`${pip.durationDays} days`} />
            <Detail label="Start Date" value={fmtDate(pip.startDate)} />
            <Detail label="Mid-Point Review" value={fmtDate(pip.midpointDate)} />
            <Detail label="Final Review" value={fmtDate(pip.finalReviewDate)} />
          </div>
        </section>

        {/* §2 Purpose */}
        <section>
          <SectionHead n={2} title="Purpose of This Plan" right={
            <span className="text-[11px] font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">Supportive, not punitive</span>
          } />
          <div className="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg px-4 py-3 text-sm text-gray-700">
            {pip.purpose}
          </div>
        </section>

        {/* §3 Concerns */}
        <section>
          <SectionHead n={3} title="Summary of Performance Concerns"
            right={canEdit ? <AddBtn label="Add concern" onClick={() => setModal({ kind: 'concern' })} /> : undefined} />
          <p className="text-xs text-gray-500 mb-3">Each concern ties to a role expectation, with specific examples and where it was first raised.</p>
          {pip.concerns.length === 0 ? (
            <Empty>No concerns recorded yet.</Empty>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 font-medium">Area</th>
                    <th className="px-3 py-2 font-medium">Observations &amp; examples</th>
                    <th className="px-3 py-2 font-medium">Expectation not met</th>
                    <th className="px-3 py-2 font-medium">Previously raised</th>
                    {canEdit && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {pip.concerns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 align-top">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{c.area}</td>
                      <td className="px-3 py-2.5 text-gray-600">{c.observations ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{c.expectation ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{c.previouslyRaised ?? '—'}</td>
                      {canEdit && (
                        <td className="px-3 py-2.5 text-right">
                          <RowActions onEdit={() => setModal({ kind: 'concern', initial: c })}
                            onRemove={() => removeConcern.mutate({ id: c.id })} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* §4 Goals */}
        <section>
          <SectionHead n={4} title="Expectations & Success Criteria"
            right={canEdit ? <AddBtn label="Add goal" onClick={() => setModal({ kind: 'goal' })} /> : undefined} />
          <p className="text-xs text-gray-500 mb-3">Specific, measurable, time-bound. "Meeting expectations" is defined up front.</p>
          {pip.goals.length === 0 ? (
            <Empty>No goals defined yet.</Empty>
          ) : (
            <div className="space-y-3">
              {pip.goals.map((g, i) => (
                <div key={g.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">Goal {i + 1}</span>
                      {g.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <select
                          value={g.status}
                          onChange={(e) => updateGoal.mutate({ id: g.id, status: e.target.value as PipGoal['status'] })}
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
                        >
                          {(Object.keys(GOAL_STATUS_LABELS) as PipGoal['status'][]).map((s) => (
                            <option key={s} value={s}>{GOAL_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500">{GOAL_STATUS_LABELS[g.status]}</span>
                      )}
                      {canEdit && <RowActions onEdit={() => setModal({ kind: 'goal', initial: g })} onRemove={() => removeGoal.mutate({ id: g.id })} />}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <Field label="What success looks like" value={g.successCriteria} />
                    <Field label="How it will be measured" value={g.measurement} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* §5 Supports */}
        <section>
          <SectionHead n={5} title="Support & Resources We Will Provide"
            right={canEdit ? <AddBtn label="Add support" onClick={() => setModal({ kind: 'support' })} /> : undefined} />
          <p className="text-xs text-gray-500 mb-3">A two-way commitment — what the company provides so the plan is fair.</p>
          {pip.supports.length === 0 ? (
            <Empty>No support items yet.</Empty>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 font-medium">Support</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Cadence</th>
                    {canEdit && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {pip.supports.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2.5 text-gray-900">{s.support}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.owner ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.cadence ?? '—'}</td>
                      {canEdit && (
                        <td className="px-3 py-2.5 text-right">
                          <RowActions onEdit={() => setModal({ kind: 'support', initial: s })} onRemove={() => removeSupport.mutate({ id: s.id })} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* §6 Check-in log */}
        <section>
          <SectionHead n={6} title="Check-In Log"
            right={canEdit ? <AddBtn label="Add check-in" onClick={() => setModal({ kind: 'checkin' })} /> : undefined} />
          <p className="text-xs text-gray-500 mb-3">Progress reviewed on a regular cadence — not saved for the end.</p>
          {pip.checkins.length === 0 ? (
            <Empty>No check-ins scheduled yet.</Empty>
          ) : (
            <div className="space-y-3">
              {pip.checkins.map((ci) => (
                <div key={ci.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
                    <div className="text-sm font-semibold text-gray-900">
                      {ci.label}{ci.checkinDate ? <span className="font-normal text-gray-500"> · {fmtDate(ci.checkinDate)}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {ci.attendees && <span className="text-xs text-gray-500">{ci.attendees}</span>}
                      {canEdit && <RowActions onEdit={() => setModal({ kind: 'checkin', initial: ci })} onRemove={() => removeCheckin.mutate({ id: ci.id })} />}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-600 min-h-[1.5rem]">{ci.notes ?? <span className="text-gray-300">No notes yet.</span>}</p>
                    <div className="flex gap-2 mt-2">
                      {(['on_track', 'partial', 'off_track'] as const).map((s) => {
                        const on = ci.status === s;
                        const base = on ? CHECKIN_STATUS_CLASS[s] : 'border-gray-200 text-gray-400';
                        return (
                          <button key={s}
                            disabled={!canEdit}
                            onClick={() => updateCheckin.mutate({ id: ci.id, status: on ? null : s })}
                            className={`text-[12px] px-2.5 py-1 rounded-full border ${base} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}>
                            {CHECKIN_STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* §7 Outcomes */}
        <section>
          <SectionHead n={7} title="Outcomes" />
          <p className="text-xs text-gray-500 mb-3">Both paths stated plainly and in advance.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 border-t-[3px] border-t-green-500 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1.5">If expectations are met</h4>
              {canEdit ? (
                <textarea value={outMet} onChange={(e) => setOutMet(e.target.value)}
                  onBlur={() => outMet !== (pip.outcomeMet ?? '') && updatePip.mutate({ id: pip.id, outcomeMet: outMet })}
                  rows={3} className="w-full text-sm text-gray-600 border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-600" />
              ) : <p className="text-sm text-gray-600">{pip.outcomeMet}</p>}
            </div>
            <div className="border border-gray-200 border-t-[3px] border-t-red-500 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1.5">If expectations are not met</h4>
              {canEdit ? (
                <textarea value={outNot} onChange={(e) => setOutNot(e.target.value)}
                  onBlur={() => outNot !== (pip.outcomeNotMet ?? '') && updatePip.mutate({ id: pip.id, outcomeNotMet: outNot })}
                  rows={3} className="w-full text-sm text-gray-600 border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-600" />
              ) : <p className="text-sm text-gray-600">{pip.outcomeNotMet}</p>}
            </div>
          </div>
        </section>

        {/* §8 Employee comments */}
        <section>
          <SectionHead n={8} title="Employee Comments" />
          <p className="text-xs text-gray-500 mb-3">The employee's perspective becomes part of the record.</p>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={!pip.isEmployee && !canEdit}
            rows={4}
            placeholder={pip.isEmployee ? 'Add your comments…' : 'No employee comments yet.'}
            className="w-full text-sm border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-50 disabled:text-gray-500"
          />
          {(pip.isEmployee || canEdit) && (
            <button
              onClick={() => saveComments.mutate({ id: pip.id, employeeComments: comments })}
              disabled={saveComments.isLoading || comments === (pip.employeeComments ?? '')}
              className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {saveComments.isLoading ? 'Saving…' : 'Save comments'}
            </button>
          )}
        </section>

        {/* §9 Signatures */}
        <section>
          <SectionHead n={9} title="Acknowledgment & Signatures" />
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 mb-4">
            Signing confirms the plan was discussed and a copy received — receipt and understanding, not necessarily agreement.
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {pip.signatures.map((sig) => {
              const mayThisRole =
                sig.role === 'employee' ? (pip.isEmployee || canEdit) : canEdit;
              return (
                <div key={sig.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{SIGNATURE_LABELS[sig.role]}</div>
                  {sig.signedAt ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                          <Check size={14} className="text-green-600" /> {sig.signerName || 'Signed'}
                        </div>
                        <div className="text-[11px] text-gray-400">{new Date(sig.signedAt).toLocaleString()}</div>
                      </div>
                      {mayThisRole && (
                        <button onClick={() => unsign.mutate({ id: sig.id })}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600" title="Clear signature">
                          <RotateCcw size={13} /> Clear
                        </button>
                      )}
                    </div>
                  ) : mayThisRole && !closed ? (
                    <button onClick={() => {
                      const name = prompt(`Name for the ${SIGNATURE_LABELS[sig.role]} signature:`) ?? undefined;
                      sign.mutate({ id: sig.id, signerName: name });
                    }} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700">
                      Sign
                    </button>
                  ) : (
                    <div className="text-sm text-gray-300">Awaiting signature</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modals */}
      {modal?.kind === 'editPip' && <PipForm initial={pip} onClose={() => setModal(null)} onSaved={closeRefetch} />}
      {modal?.kind === 'concern' && <ConcernForm pipId={pip.id} initial={modal.initial} onClose={() => setModal(null)} onSaved={closeRefetch} />}
      {modal?.kind === 'goal' && <GoalForm pipId={pip.id} initial={modal.initial} onClose={() => setModal(null)} onSaved={closeRefetch} />}
      {modal?.kind === 'support' && <SupportForm pipId={pip.id} initial={modal.initial} onClose={() => setModal(null)} onSaved={closeRefetch} />}
      {modal?.kind === 'checkin' && <CheckInForm pipId={pip.id} initial={modal.initial} onClose={() => setModal(null)} onSaved={closeRefetch} />}
    </div>
  );
}

// ---- tiny field helpers ----------------------------------------------------

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-gray-900">{value || '—'}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
      <div className="text-gray-700">{value || '—'}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-5 text-center">{children}</div>;
}
