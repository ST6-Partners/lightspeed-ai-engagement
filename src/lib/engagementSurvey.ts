// ============================================================
// ENGAGEMENT SURVEY — question definition + driver taxonomy (15Five "Engage").
// The full instrument: 5 Likert sections (66 statements) + an eNPS 0..10 with a
// confidential open-text reason. Each statement is tagged with a `driver` theme
// so results can be rolled up by driver (see engagementAnalytics). Rendered by
// the Take Survey tab and keyed into the `answers` jsonb by question `id`.
// ============================================================

export type DriverKey =
  | 'purpose' | 'autonomy' | 'utilization' | 'capacity' | 'manager_relationship'
  | 'manager_effectiveness' | 'coworkers' | 'leadership' | 'rewards_fairness' | 'commitment'
  | 'dei' | 'wellbeing' | 'remote_work' | 'retention';

export interface Driver { key: DriverKey; label: string; meaning: string; }

// The ~10 engagement drivers the 66 statements roll up into. `meaning` is the
// short plain-English definition shown on the Drivers tab.
export const DRIVERS: Driver[] = [
  { key: 'purpose', label: 'Purpose & Meaning', meaning: 'People find meaning in their work and see how it connects to the mission.' },
  { key: 'autonomy', label: 'Autonomy', meaning: 'Freedom and latitude to decide how the work gets done.' },
  { key: 'utilization', label: 'Growth & Utilization', meaning: 'Skills are put to good use and there is room to grow.' },
  { key: 'capacity', label: 'Capacity & Focus', meaning: 'The ability to focus, manage competing demands, and recharge.' },
  { key: 'manager_relationship', label: 'Manager Relationship', meaning: 'Fairness, feedback, and psychological safety with one’s direct manager.' },
  { key: 'manager_effectiveness', label: 'Manager Effectiveness', meaning: 'How well the manager directs, coaches, and develops the team.' },
  { key: 'coworkers', label: 'Coworker Relationships', meaning: 'Trust, respect, and shared values among peers.' },
  { key: 'leadership', label: 'Leadership', meaning: 'Executive availability, reliability, and following through.' },
  { key: 'rewards_fairness', label: 'Rewards & Fairness', meaning: 'Rewards are equitable and people decisions are made fairly.' },
  { key: 'commitment', label: 'Commitment & Advocacy', meaning: 'Pride, loyalty, and willingness to recommend and stay.' },
  { key: 'dei', label: 'Diversity & Inclusion', meaning: 'Fair treatment, belonging, and equity across all backgrounds.' },
  { key: 'wellbeing', label: 'Wellbeing & Burnout', meaning: 'Energy, rest, and freedom from chronic exhaustion at work.' },
  { key: 'remote_work', label: 'Remote Work', meaning: 'A healthy, workable environment when working from home.' },
  { key: 'retention', label: 'Commitment & Retention', meaning: 'Intent to stay and confidence in the company\u2019s future.' },
];

export const DRIVER_LABEL: Record<DriverKey, string> = Object.fromEntries(
  DRIVERS.map((d) => [d.key, d.label]),
) as Record<DriverKey, string>;

export interface SurveyQuestion { id: string; text: string; driver: DriverKey; }
export interface SurveySection { key: string; title: string; intro: string; questions: SurveyQuestion[]; }

// 5-point Likert scale — value 1..5, low -> high. Values 4-5 are "favorable".
export const LIKERT: { value: number; label: string }[] = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither agree nor disagree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];
export const FAVORABLE_MIN = 4;
export const UNFAVORABLE_MAX = 2;

export const SECTIONS: SurveySection[] = [
  {
    key: 'work',
    title: 'Your Work Experience',
    intro: 'For the following statements, consider your work experience at Lightspeed Systems and answer the following questions.',
    questions: [
      { id: 'work_1', text: 'The work that I do gives me a sense of pride.', driver: 'commitment' },
      { id: 'work_2', text: 'I can make meaningful decisions about how I do my job.', driver: 'autonomy' },
      { id: 'work_3', text: 'I am confident in my ability to deal with problems that come up at work.', driver: 'capacity' },
      { id: 'work_4', text: 'The work I do on this job is very important to me.', driver: 'purpose' },
      { id: 'work_5', text: "There is a clear link between what I do and Lightspeed Systems's objectives.", driver: 'purpose' },
      { id: 'work_6', text: 'I feel a sense of happiness when I am working very hard.', driver: 'commitment' },
      { id: 'work_7', text: 'My job makes good use of my skills and abilities.', driver: 'utilization' },
      { id: 'work_8', text: 'There is someone at work who encourages my professional development.', driver: 'utilization' },
      { id: 'work_9', text: 'I feel loyal to Lightspeed Systems.', driver: 'commitment' },
      { id: 'work_10', text: 'I find it very easy to stay focused on what is most important for me to accomplish at work.', driver: 'capacity' },
      { id: 'work_11', text: 'I feel like I can take personal time off when I need it.', driver: 'capacity' },
      { id: 'work_12', text: 'I know why Lightspeed Systems exists.', driver: 'purpose' },
      { id: 'work_13', text: 'I am not micro-managed at my job.', driver: 'autonomy' },
      { id: 'work_14', text: 'I am confident in my ability to handle competing demands at work.', driver: 'capacity' },
      { id: 'work_15', text: 'I find my work to be full of meaning and purpose.', driver: 'purpose' },
      { id: 'work_16', text: 'My job activities are personally meaningful to me.', driver: 'purpose' },
      { id: 'work_17', text: 'I understand how my role fits into the purpose of Lightspeed Systems.', driver: 'purpose' },
      { id: 'work_18', text: 'My job challenges me in a positive way.', driver: 'utilization' },
      { id: 'work_19', text: 'I am encouraged to expand my skills and abilities.', driver: 'utilization' },
      { id: 'work_20', text: 'When I wake up, I feel like going to work.', driver: 'commitment' },
      { id: 'work_21', text: 'Lightspeed Systems helps to limit the number of distractions that keep me from achieving my goals.', driver: 'capacity' },
      { id: 'work_22', text: 'I am proud to tell others that I am part of Lightspeed Systems.', driver: 'commitment' },
      { id: 'work_23', text: 'I feel like I can take a vacation when I need it.', driver: 'capacity' },
      { id: 'work_24', text: 'I feel a shared sense of purpose with my team.', driver: 'purpose' },
      { id: 'work_25', text: 'I am able to get into a state of complete focus while working.', driver: 'capacity' },
      { id: 'work_26', text: 'I have freedom to do my job in the best way I see fit.', driver: 'autonomy' },
      { id: 'work_27', text: 'I am confident in my ability to think clearly at work.', driver: 'capacity' },
      { id: 'work_28', text: 'There is a great support system at Lightspeed Systems that helps me achieve my work goals.', driver: 'capacity' },
      { id: 'work_29', text: 'I feel that the work I do on my job is valuable.', driver: 'purpose' },
      { id: 'work_30', text: 'Overall, I have a good understanding of what I am supposed to be doing in my job.', driver: 'purpose' },
      { id: 'work_31', text: 'I love the feeling of working.', driver: 'commitment' },
      { id: 'work_32', text: 'My skills are being utilized to their fullest potential.', driver: 'utilization' },
      { id: 'work_33', text: 'I have opportunities to increase my influence at Lightspeed Systems.', driver: 'utilization' },
      { id: 'work_34', text: 'Lightspeed Systems provides me with what I need to help achieve my goals.', driver: 'leadership' },
      { id: 'work_35', text: 'It would take a lot to cause me to leave Lightspeed Systems.', driver: 'commitment' },
      { id: 'work_36', text: 'I have a good idea of what Lightspeed Systems is trying to accomplish.', driver: 'purpose' },
    ],
  },
  {
    key: 'leadership',
    title: 'Lightspeed Systems Leadership',
    intro: 'Consider the culture of your executive leadership team and answer the following questions.',
    questions: [
      { id: 'lead_1', text: 'The executive leadership team in Lightspeed Systems follow through with what they say they are going to do.', driver: 'leadership' },
      { id: 'lead_2', text: 'I feel the rewards I get are equitable given the work I do.', driver: 'rewards_fairness' },
      { id: 'lead_3', text: 'The executive leadership team of Lightspeed Systems are often connecting with people at work.', driver: 'leadership' },
      { id: 'lead_4', text: 'Decisions here about people are made using a fair process.', driver: 'rewards_fairness' },
      { id: 'lead_5', text: 'The executive leadership team of Lightspeed Systems make themselves available for the employees.', driver: 'leadership' },
      { id: 'lead_6', text: 'The executive leadership team in Lightspeed Systems are reliable.', driver: 'leadership' },
      { id: 'lead_7', text: 'Overall I feel Lightspeed Systems is just and fair in the way it treats and rewards employees.', driver: 'rewards_fairness' },
      { id: 'lead_8', text: 'The executive leadership team of Lightspeed Systems can be easily reached by the employees.', driver: 'leadership' },
      { id: 'lead_9', text: 'I can depend on the executive leadership team of Lightspeed Systems.', driver: 'leadership' },
    ],
  },
  {
    key: 'manager',
    title: 'Your Manager',
    intro: 'Think about the working relationship you have with your manager and answer the following questions.',
    questions: [
      { id: 'mgr_1', text: 'My manager treats me fairly in the way they interact with me.', driver: 'manager_relationship' },
      { id: 'mgr_2', text: 'I get sufficient feedback about how well I am doing.', driver: 'manager_relationship' },
      { id: 'mgr_3', text: 'I am not afraid to be myself at work.', driver: 'manager_relationship' },
      { id: 'mgr_4', text: 'I receive feedback on a regular basis.', driver: 'manager_relationship' },
      { id: 'mgr_5', text: 'My manager helps me develop confidence in my own ability to do my job well.', driver: 'manager_relationship' },
      { id: 'mgr_6', text: 'I do not sense any kind of threatening environment at work.', driver: 'manager_relationship' },
      { id: 'mgr_7', text: 'I get feedback that is constructive.', driver: 'manager_relationship' },
      { id: 'mgr_8', text: 'I am free to express my opinions at work.', driver: 'manager_relationship' },
    ],
  },
  {
    key: 'coworkers',
    title: 'Your Coworkers',
    intro: 'Consider your working relationship with your immediate coworkers and answer the following questions.',
    questions: [
      { id: 'cowork_1', text: 'My coworkers value my input.', driver: 'coworkers' },
      { id: 'cowork_2', text: 'The people who work here share common work values.', driver: 'coworkers' },
      { id: 'cowork_3', text: 'I have shared work values with my coworkers.', driver: 'coworkers' },
      { id: 'cowork_4', text: 'My coworkers and I have mutual respect for one another.', driver: 'coworkers' },
      { id: 'cowork_5', text: 'I trust my coworkers.', driver: 'coworkers' },
    ],
  },
  {
    key: 'mgr_effectiveness',
    title: 'Manager Effectiveness',
    intro: 'Think about the working relationship you have with your manager and answer the following questions.',
    questions: [
      { id: 'mgreff_1', text: 'I understand what is expected of me at work.', driver: 'manager_effectiveness' },
      { id: 'mgreff_2', text: 'My manager contributes to my productivity.', driver: 'manager_effectiveness' },
      { id: 'mgreff_3', text: 'My manager frequently provides feedback that helps me improve my performance.', driver: 'manager_effectiveness' },
      { id: 'mgreff_4', text: 'My manager effectively directs our people and resources toward our most important priorities.', driver: 'manager_effectiveness' },
      { id: 'mgreff_5', text: 'My manager positively influences others and our culture.', driver: 'manager_effectiveness' },
      { id: 'mgreff_6', text: 'My manager effectively balances doing work, delegating work, coaching, and influencing others.', driver: 'manager_effectiveness' },
      { id: 'mgreff_7', text: 'My manager actively supports my career growth and development.', driver: 'manager_effectiveness' },
      { id: 'mgreff_8', text: 'My manager values my opinions.', driver: 'manager_effectiveness' },
    ],
  },
];

// eNPS section (rendered after the Likert sections).
export const ENPS_INTRO = 'Consider your work experience at Lightspeed Systems and answer the following questions.';
export const ENPS_QUESTION = 'On a scale from 0-10, how likely are you to recommend Lightspeed Systems as a great place to work?';
export const ENPS_REASON_QUESTION = 'What was the primary reason for your answer?';

export const ALL_QUESTIONS: SurveyQuestion[] = SECTIONS.flatMap((s) => s.questions);
export const ALL_LIKERT_IDS: string[] = ALL_QUESTIONS.map((q) => q.id);
export const LIKERT_COUNT = ALL_LIKERT_IDS.length; // 66
export const QUESTION_TEXT: Record<string, string> = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q.text]));
export const QUESTION_DRIVER: Record<string, DriverKey> = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q.driver]));

// mean (1..5) -> 0..100 engagement score
export const scoreFromMean = (mean: number) => Math.round(((mean - 1) / 4) * 100);
