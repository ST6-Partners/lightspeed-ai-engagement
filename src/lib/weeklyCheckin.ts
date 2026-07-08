// ============================================================
// WEEKLY CHECK-IN — the standalone weekly pulse instrument + 12-week rotation.
// Fixed anchors every week (Best-Self / Sentiment / Workload, 1..5) plus two
// rotating slots (one driver item, one value item) and one optional open-text.
// eNPS (0..10) replaces the driver slot on rotation week 12 (quarterly).
// Rotation index is derived from the ISO week number: (isoWeek - 1) % 12.
// ============================================================

export interface AnchorDef { key: 'bestSelf' | 'sentiment' | 'workload'; text: string; driver: string; }
export interface RotatingDef { key: string; text: string; driver: string; }
export interface ValueDef { key: string; valueName: string; pillar: string; direction: 'self' | 'walk'; text: string; }

export const ANCHORS: AnchorDef[] = [
  { key: 'bestSelf', text: 'How well were you able to show up as your Best-Self this week?', driver: 'capacity' },
  { key: 'sentiment', text: 'How are you feeling about Lightspeed right now?', driver: 'commitment' },
  { key: 'workload', text: 'My workload this week was sustainable.', driver: 'capacity' },
];

// 12-week driver rotation. Week 12 (index 11) is the quarterly eNPS (0..10).
export const DRIVER_ROTATION: (RotatingDef | { key: 'enps'; text: string; driver: string })[] = [
  { key: 'execution_confidence', text: "I'm confident in our ability to execute as a company.", driver: 'leadership' },
  { key: 'satisfaction', text: 'I am satisfied in my role overall.', driver: 'commitment' },
  { key: 'growth', text: 'I have real opportunities to grow at Lightspeed.', driver: 'utilization' },
  { key: 'feedback', text: "I'm getting the feedback and coaching I need to succeed.", driver: 'manager_effectiveness' },
  { key: 'purpose', text: 'The work I did this week felt meaningful.', driver: 'purpose' },
  { key: 'autonomy', text: 'I had the freedom to do my work the way I saw fit.', driver: 'autonomy' },
  { key: 'recognition', text: 'I felt my work was valued this week.', driver: 'rewards_fairness' },
  { key: 'connection', text: 'I felt connected to my team this week.', driver: 'coworkers' },
  { key: 'execution_confidence', text: "I'm confident in our ability to execute as a company.", driver: 'leadership' },
  { key: 'satisfaction', text: 'I am satisfied in my role overall.', driver: 'commitment' },
  { key: 'growth', text: 'I have real opportunities to grow at Lightspeed.', driver: 'utilization' },
  { key: 'enps', text: 'On a scale of 0–10, how likely are you to recommend Lightspeed as a great place to work?', driver: 'commitment' },
];

// 12-week value rotation — all 6 behaviors in both self + walk-the-walk directions.
export const VALUE_ROTATION: ValueDef[] = [
  { key: 'owns_outcome_self', valueName: 'Owns the Outcome', pillar: 'Mission-Driven', direction: 'self', text: 'This week I took end-to-end ownership of my work.' },
  { key: 'earns_trust_walk', valueName: 'Earns Trust', pillar: 'Customer-Obsessed', direction: 'walk', text: 'My manager communicates honestly and follows through on commitments.' },
  { key: 'bias_action_self', valueName: 'Bias for Action', pillar: 'Results-Focused', direction: 'self', text: 'This week I moved quickly and made progress rather than over-analyzing.' },
  { key: 'purpose_ego_walk', valueName: 'Purpose Over Ego', pillar: 'Mission-Driven', direction: 'walk', text: 'Leaders here put the mission and team ahead of personal recognition.' },
  { key: 'raises_bar_self', valueName: 'Raises the Bar', pillar: 'Results-Focused', direction: 'self', text: 'This week I set a high standard and held myself to it.' },
  { key: 'starts_customer_self', valueName: 'Starts With the Customer', pillar: 'Customer-Obsessed', direction: 'self', text: 'My decisions this week were grounded in real customer needs.' },
  { key: 'owns_outcome_walk', valueName: 'Owns the Outcome', pillar: 'Mission-Driven', direction: 'walk', text: "Leaders take end-to-end ownership; no \"not my job\"." },
  { key: 'earns_trust_self', valueName: 'Earns Trust', pillar: 'Customer-Obsessed', direction: 'self', text: 'This week I communicated honestly and followed through on my commitments.' },
  { key: 'bias_action_walk', valueName: 'Bias for Action', pillar: 'Results-Focused', direction: 'walk', text: 'Leaders here move quickly and make decisions rather than stalling.' },
  { key: 'purpose_ego_self', valueName: 'Purpose Over Ego', pillar: 'Mission-Driven', direction: 'self', text: 'This week I put the mission and team ahead of my own recognition.' },
  { key: 'raises_bar_walk', valueName: 'Raises the Bar', pillar: 'Results-Focused', direction: 'walk', text: 'Leaders hold a high standard and live up to it themselves.' },
  { key: 'starts_customer_walk', valueName: 'Starts With the Customer', pillar: 'Customer-Obsessed', direction: 'walk', text: 'Leadership grounds decisions in real customer needs and outcomes.' },
];

export const OPEN_ROTATION: string[] = [
  "What's something that takes a lot of your time but doesn't seem to add much value?",
  'What part of your job makes you feel most fulfilled and engaged?',
  "Is there anything you're feeling awkward or unsure about raising?",
  'What can we do to make you more successful?',
  'As you think about our path to success for 2026, what are you worried about?',
  'Finish the sentence: I wish I knew more about ___ at Lightspeed.',
  'Any ideas you have to improve your role or the company?',
  "What's something we could do better as a team?",
  'Finish the sentence: My favorite thing about working at Lightspeed is ___.',
  "What's something you want to be able to do in 6 months that you can't do now?",
  'What do you appreciate about our culture, and what could we do better?',
  "What's the primary reason for your recommendation score?",
];

// ISO-8601 week number (1..53).
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Monday (start) of the ISO week containing d, as YYYY-MM-DD.
export function weekStartISO(d: Date): string {
  const t = new Date(d);
  const day = t.getDay() || 7;
  if (day !== 1) t.setDate(t.getDate() - (day - 1));
  return t.toISOString().slice(0, 10);
}

export function rotationIndexFor(d: Date): number {
  return (isoWeek(d) - 1) % 12;
}

export interface WeekPlan {
  rotationIndex: number;
  weekLabel: string;       // "Week 4 of the 12-week cycle"
  isEnpsWeek: boolean;
  driver: RotatingDef | { key: 'enps'; text: string; driver: string };
  value: ValueDef;
  openPrompt: string;
}

export function planForDate(d: Date): WeekPlan {
  const idx = rotationIndexFor(d);
  const driver = DRIVER_ROTATION[idx];
  return {
    rotationIndex: idx,
    weekLabel: `Week ${idx + 1} of the 12-week cycle`,
    isEnpsWeek: driver.key === 'enps',
    driver,
    value: VALUE_ROTATION[idx],
    openPrompt: OPEN_ROTATION[idx],
  };
}
