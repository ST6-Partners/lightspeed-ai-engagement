// ============================================================
// ENGAGEMENT SURVEY — question definition (15Five "Engage" parity).
// The full instrument: 5 Likert sections (66 statements) + an eNPS 0..10 with a
// confidential open-text reason. Rendered by src/pages/EngagementSurvey.tsx and
// keyed into the `answers` jsonb by question `id`.
// ============================================================

export interface SurveyQuestion { id: string; text: string; }
export interface SurveySection { key: string; title: string; intro: string; questions: SurveyQuestion[]; }

// 5-point Likert scale — value 1..5, low → high.
export const LIKERT: { value: number; label: string }[] = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither agree nor disagree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export const SECTIONS: SurveySection[] = [
  {
    key: 'work',
    title: 'Your Work Experience',
    intro: 'For the following statements, consider your work experience at Lightspeed Systems and answer the following questions.',
    questions: [
      { id: 'work_1', text: 'The work that I do gives me a sense of pride.' },
      { id: 'work_2', text: 'I can make meaningful decisions about how I do my job.' },
      { id: 'work_3', text: 'I am confident in my ability to deal with problems that come up at work.' },
      { id: 'work_4', text: 'The work I do on this job is very important to me.' },
      { id: 'work_5', text: "There is a clear link between what I do and Lightspeed Systems's objectives." },
      { id: 'work_6', text: 'I feel a sense of happiness when I am working very hard.' },
      { id: 'work_7', text: 'My job makes good use of my skills and abilities.' },
      { id: 'work_8', text: 'There is someone at work who encourages my professional development.' },
      { id: 'work_9', text: 'I feel loyal to Lightspeed Systems.' },
      { id: 'work_10', text: 'I find it very easy to stay focused on what is most important for me to accomplish at work.' },
      { id: 'work_11', text: 'I feel like I can take personal time off when I need it.' },
      { id: 'work_12', text: 'I know why Lightspeed Systems exists.' },
      { id: 'work_13', text: 'I am not micro-managed at my job.' },
      { id: 'work_14', text: 'I am confident in my ability to handle competing demands at work.' },
      { id: 'work_15', text: 'I find my work to be full of meaning and purpose.' },
      { id: 'work_16', text: 'My job activities are personally meaningful to me.' },
      { id: 'work_17', text: 'I understand how my role fits into the purpose of Lightspeed Systems.' },
      { id: 'work_18', text: 'My job challenges me in a positive way.' },
      { id: 'work_19', text: 'I am encouraged to expand my skills and abilities.' },
      { id: 'work_20', text: 'When I wake up, I feel like going to work.' },
      { id: 'work_21', text: 'Lightspeed Systems helps to limit the number of distractions that keep me from achieving my goals.' },
      { id: 'work_22', text: 'I am proud to tell others that I am part of Lightspeed Systems.' },
      { id: 'work_23', text: 'I feel like I can take a vacation when I need it.' },
      { id: 'work_24', text: 'I feel a shared sense of purpose with my team.' },
      { id: 'work_25', text: 'I am able to get into a state of complete focus while working.' },
      { id: 'work_26', text: 'I have freedom to do my job in the best way I see fit.' },
      { id: 'work_27', text: 'I am confident in my ability to think clearly at work.' },
      { id: 'work_28', text: 'There is a great support system at Lightspeed Systems that helps me achieve my work goals.' },
      { id: 'work_29', text: 'I feel that the work I do on my job is valuable.' },
      { id: 'work_30', text: 'Overall, I have a good understanding of what I am supposed to be doing in my job.' },
      { id: 'work_31', text: 'I love the feeling of working.' },
      { id: 'work_32', text: 'My skills are being utilized to their fullest potential.' },
      { id: 'work_33', text: 'I have opportunities to increase my influence at Lightspeed Systems.' },
      { id: 'work_34', text: 'Lightspeed Systems provides me with what I need to help achieve my goals.' },
      { id: 'work_35', text: 'It would take a lot to cause me to leave Lightspeed Systems.' },
      { id: 'work_36', text: 'I have a good idea of what Lightspeed Systems is trying to accomplish.' },
    ],
  },
  {
    key: 'leadership',
    title: 'Lightspeed Systems Leadership',
    intro: 'Consider the culture of your executive leadership team and answer the following questions.',
    questions: [
      { id: 'lead_1', text: 'The executive leadership team in Lightspeed Systems follow through with what they say they are going to do.' },
      { id: 'lead_2', text: 'I feel the rewards I get are equitable given the work I do.' },
      { id: 'lead_3', text: 'The executive leadership team of Lightspeed Systems are often connecting with people at work.' },
      { id: 'lead_4', text: 'Decisions here about people are made using a fair process.' },
      { id: 'lead_5', text: 'The executive leadership team of Lightspeed Systems make themselves available for the employees.' },
      { id: 'lead_6', text: 'The executive leadership team in Lightspeed Systems are reliable.' },
      { id: 'lead_7', text: 'Overall I feel Lightspeed Systems is just and fair in the way it treats and rewards employees.' },
      { id: 'lead_8', text: 'The executive leadership team of Lightspeed Systems can be easily reached by the employees.' },
      { id: 'lead_9', text: 'I can depend on the executive leadership team of Lightspeed Systems.' },
    ],
  },
  {
    key: 'manager',
    title: 'Your Manager',
    intro: 'Think about the working relationship you have with your manager and answer the following questions.',
    questions: [
      { id: 'mgr_1', text: 'My manager treats me fairly in the way they interact with me.' },
      { id: 'mgr_2', text: 'I get sufficient feedback about how well I am doing.' },
      { id: 'mgr_3', text: 'I am not afraid to be myself at work.' },
      { id: 'mgr_4', text: 'I receive feedback on a regular basis.' },
      { id: 'mgr_5', text: 'My manager helps me develop confidence in my own ability to do my job well.' },
      { id: 'mgr_6', text: 'I do not sense any kind of threatening environment at work.' },
      { id: 'mgr_7', text: 'I get feedback that is constructive.' },
      { id: 'mgr_8', text: 'I am free to express my opinions at work.' },
    ],
  },
  {
    key: 'coworkers',
    title: 'Your Coworkers',
    intro: 'Consider your working relationship with your immediate coworkers and answer the following questions.',
    questions: [
      { id: 'cowork_1', text: 'My coworkers value my input.' },
      { id: 'cowork_2', text: 'The people who work here share common work values.' },
      { id: 'cowork_3', text: 'I have shared work values with my coworkers.' },
      { id: 'cowork_4', text: 'My coworkers and I have mutual respect for one another.' },
      { id: 'cowork_5', text: 'I trust my coworkers.' },
    ],
  },
  {
    key: 'mgr_effectiveness',
    title: 'Manager Effectiveness',
    intro: 'Think about the working relationship you have with your manager and answer the following questions.',
    questions: [
      { id: 'mgreff_1', text: 'I understand what is expected of me at work.' },
      { id: 'mgreff_2', text: 'My manager contributes to my productivity.' },
      { id: 'mgreff_3', text: 'My manager frequently provides feedback that helps me improve my performance.' },
      { id: 'mgreff_4', text: 'My manager effectively directs our people and resources toward our most important priorities.' },
      { id: 'mgreff_5', text: 'My manager positively influences others and our culture.' },
      { id: 'mgreff_6', text: 'My manager effectively balances doing work, delegating work, coaching, and influencing others.' },
      { id: 'mgreff_7', text: 'My manager actively supports my career growth and development.' },
      { id: 'mgreff_8', text: 'My manager values my opinions.' },
    ],
  },
];

// eNPS section (rendered after the Likert sections).
export const ENPS_INTRO = 'Consider your work experience at Lightspeed Systems and answer the following questions.';
export const ENPS_QUESTION = 'On a scale from 0-10, how likely are you to recommend Lightspeed Systems as a great place to work?';
export const ENPS_REASON_QUESTION = 'What was the primary reason for your answer?';

export const ALL_LIKERT_IDS: string[] = SECTIONS.flatMap((s) => s.questions.map((q) => q.id));
export const LIKERT_COUNT = ALL_LIKERT_IDS.length; // 66
