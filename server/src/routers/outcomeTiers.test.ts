import { performanceTierOf, engagementTierOf, ENGAGEMENT_TIERS } from './engagementAnalytics.js';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};

// 9-box numpad layout:  7 8 9 / 4 5 6 / 1 2 3
// Performance = horizontal axis, so the right column is the top band.
eq('perf: right column high', [3, 6, 9].map(performanceTierOf), ['high', 'high', 'high']);
eq('perf: middle column mid', [2, 5, 8].map(performanceTierOf), ['mid', 'mid', 'mid']);
eq('perf: left column bottom', [1, 4, 7].map(performanceTierOf), ['bottom', 'bottom', 'bottom']);
eq('perf: out of range', [0, 10, null, undefined].map(performanceTierOf), [null, null, null, null]);

// Engagement = mean answer as a percentage of the available scale.
const ans = (v: number) => ({ q1: v, q2: v, q3: v });
eq('eng: top of 5-point', engagementTierOf(ans(5), 5), 'extremely');          // 100%
eq('eng: 4.6/5 -> extremely', engagementTierOf(ans(4.6), 5), 'extremely');    // 90%
eq('eng: 4.2/5 -> highly', engagementTierOf(ans(4.2), 5), 'highly');          // 80%
eq('eng: 3.6/5 -> moderately', engagementTierOf(ans(3.6), 5), 'moderately');  // 65%
eq('eng: 3.0/5 -> somewhat', engagementTierOf(ans(3), 5), 'somewhat');        // 50%
eq('eng: 2.0/5 -> disengaged', engagementTierOf(ans(2), 5), 'disengaged');    // 25%
eq('eng: bottom of scale', engagementTierOf(ans(1), 5), 'disengaged');        // 0%

// The point of percent-of-scale: the SAME standing on a 4-point scale must land
// in the same tier as on a 5-point one. A raw threshold would not.
eq('eng: 4/4 == 5/5', engagementTierOf(ans(4), 4), engagementTierOf(ans(5), 5));
eq('eng: midpoint 2.5/4 == 3/5', engagementTierOf(ans(2.5), 4), engagementTierOf(ans(3), 5));
eq('eng: 3.4/4 -> highly (80%)', engagementTierOf(ans(3.4), 4), 'highly');

eq('eng: no answers -> null', engagementTierOf({}, 5), null);
eq('eng: zero/blank answers ignored', engagementTierOf({ q1: 0, q2: 5 } as Record<string, number>, 5), 'extremely');
eq('tiers: five bands, descending', ENGAGEMENT_TIERS.map((t) => t.min), [90, 80, 65, 50, 0]);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
