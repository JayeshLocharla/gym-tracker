/**
 * Runs the real Apps Script compute functions under Node and asserts them against
 * the numbers published in gym_and_nutrition_plan.xlsx.
 *
 * If this fails, the app and the workbook disagree — and the workbook is right.
 *
 *   node tools/test-compute.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = ['Seed.gs', 'Compute.gs']
  .map((f) => readFileSync(join(root, 'apps-script', f), 'utf8'))
  .join('\n');

// Date helpers live in Sheets.gs, which needs the Apps Script runtime. Shim them.
const shims = `
function fmtDate_(d){ if(typeof d==='string') return d.slice(0,10);
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function parseDate_(s){ if(s instanceof Date) return s;
  const p=String(s).slice(0,10).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function addDays_(d,n){ const o=parseDate_(fmtDate_(d)); o.setDate(o.getDate()+n); return o; }
function daysBetween_(a,b){ return Math.round((parseDate_(fmtDate_(b))-parseDate_(fmtDate_(a)))/86400000); }
`;

const ctx = {};
new Function(shims + src + '\nObject.assign(this, {computeTargets, targetWeightForWeek, weekState, loadForWeek, roundPlate_, checkinVerdict, weekendBank, sumNutrition, RAMP_PCT, SEED_RAMP, phaseForWeek, SEED_MILESTONES});').call(ctx);

let pass = 0, fail = 0;
const near = (a, b, tol = 0.001) => Math.abs(a - b) <= tol;

function check(label, actual, expected, tol) {
  const ok = typeof expected === 'number' ? near(actual, expected, tol ?? 0.001) : actual === expected;
  if (ok) { pass++; }
  else { fail++; console.log(`  FAIL  ${label}\n        expected ${expected}, got ${actual}`); }
}

const CFG = {
  heightCm: 175, weightKg: 79, ageYears: 28, targetWeightKg: 76,
  activityMultiplier: 1.5, dailyDeficit: 450, proteinPerKg: 2, fatPerKg: 0.8,
  weekdayCalorieTarget: 2000, startDate: '2026-08-31', totalWeeks: 26
};

console.log('\nNutrition — against the workbook\'s Nutrition tab');
const t = ctx.computeTargets(CFG);
check('BMR (Mifflin-St Jeor)', t.bmr, 1748.75);
check('TDEE maintenance', t.tdee, 2623.125);
check('Daily calorie target', t.kcal, 2173.125);
check('Protein g', t.protein, 158);
check('Fat g', t.fat, 63.2);
check('Carbohydrate g', t.carbs, 243.08125);
check('Fibre g', t.fibre, 30.42375);
check('Water L', t.waterL, 2.8);
check('Weekly calorie budget', t.weeklyBudget, 15211.875);
check('Mon-Fri intake', t.weekdayIntake, 10000);
check('Left for Sat + Sun', t.weekendTotal, 5211.875);
check('Per weekend day', t.perWeekendDay, 2605.9375);
check('Spare vs average day', t.weekendSpare, 432.8125);
check('Weekly fat loss kg', t.weeklyLossKg, 0.409090909, 1e-6);
check('Weeks at perfect adherence', t.weeksPerfect, 7.33333333, 1e-6);
check('Weeks at 80% adherence', t.weeksRealistic, 9.16666667, 1e-6);
check('Protein % of calories', t.proteinPctCals, 0.290825424, 1e-6);
check('Fat % of calories', t.fatPctCals, 0.261742882, 1e-6);
check('Carb % of calories', t.carbPctCals, 0.447431694, 1e-6);

console.log('\nTracker target-weight curve');
const curveExpected = [78.5909090909091, 78.1818181818182, 77.7727272727273, 77.3636363636364,
  76.9545454545455, 76.5454545454546, 76.1363636363636, 75.7272727272727, 75.3181818181818,
  74.9090909090909, 74.5, 74.0909090909091];
curveExpected.forEach((exp, i) => check(`Week ${i + 1} target weight`, ctx.targetWeightForWeek(CFG, i + 1), exp, 1e-9));

console.log('\nWeightRamp — every lift, every one of the 12 weeks');
// Straight from the workbook's WeightRamp tab.
const RAMP_EXPECTED = {
  'Back Squat':                 [30, 35, 37.5, 40, 42.5, 45, 47.5, 50, 42.5, 52.5, 52.5, 55],
  'Conventional Deadlift':      [47.5, 55, 60, 65, 67.5, 72.5, 75, 80, 67.5, 82.5, 85, 87.5],
  'Romanian Deadlift':          [42.5, 47.5, 52.5, 55, 60, 62.5, 67.5, 70, 60, 72.5, 75, 77.5],
  'Barbell Bench Press':        [40, 45, 50, 52.5, 55, 57.5, 62.5, 65, 55, 67.5, 70, 72.5],
  'Standing Overhead Press':    [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Front Squat':                [25, 27.5, 30, 32.5, 35, 35, 37.5, 40, 35, 40, 42.5, 45],
  'Barbell Row':                [30, 35, 37.5, 40, 42.5, 45, 47.5, 50, 42.5, 52.5, 52.5, 55],
  'Barbell Hip Thrust':         [42.5, 47.5, 52.5, 55, 60, 62.5, 67.5, 70, 60, 72.5, 75, 77.5],
  'Lat Pulldown':               [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Seated Cable Row':           [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Rope Face Pull':             [30, 35, 37.5, 40, 42.5, 45, 47.5, 50, 42.5, 52.5, 52.5, 55],
  'Leg Extension':              [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Seated Leg Curl':            [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Lying Leg Curl':             [27.5, 30, 35, 35, 37.5, 40, 42.5, 45, 37.5, 47.5, 47.5, 50],
  'Standing Calf Raise':        [30, 35, 37.5, 40, 42.5, 45, 47.5, 50, 42.5, 52.5, 52.5, 55],
  'Seated Calf Raise':          [25, 27.5, 30, 32.5, 35, 35, 37.5, 40, 35, 40, 42.5, 45],
  'Machine Shoulder Press':     [25, 30, 32.5, 35, 37.5, 37.5, 40, 42.5, 37.5, 45, 45, 47.5],
  'Incline Dumbbell Press':     [12.5, 15, 17.5, 17.5, 20, 20, 22.5, 22.5, 20, 22.5, 25, 25],
  'Dumbbell Lateral Raise':     [7.5, 7.5, 10, 10, 10, 12.5, 12.5, 12.5, 10, 12.5, 12.5, 15],
  'Overhead Cable Tricep Ext.': [20, 22.5, 22.5, 25, 27.5, 27.5, 30, 32.5, 27.5, 32.5, 32.5, 35],
  'Cable Crunch':               [15, 17.5, 20, 20, 22.5, 22.5, 25, 25, 22.5, 25, 27.5, 27.5],
  'Incline Dumbbell Curl':      [7.5, 7.5, 10, 10, 10, 12.5, 12.5, 12.5, 10, 12.5, 12.5, 15],
  'Hammer Curl':                [10, 10, 12.5, 12.5, 12.5, 12.5, 15, 15, 12.5, 15, 15, 17.5]
};
const baselines = Object.fromEntries(ctx.SEED_RAMP.slice(1).map((r) => [r[0], r[1]]));
let rampCells = 0;
for (const [lift, weeks] of Object.entries(RAMP_EXPECTED)) {
  if (baselines[lift] === undefined) { fail++; console.log(`  FAIL  ${lift} missing from SEED_RAMP`); continue; }
  weeks.forEach((exp, i) => { check(`${lift} wk${i + 1}`, ctx.loadForWeek(baselines[lift], i + 1), exp); rampCells++; });
}
console.log(`  (${rampCells} ramp cells checked against the workbook)`);
check('Pull-Up stays bodyweight', ctx.loadForWeek(0, 5), 'BW');
check('Un-ramped lift returns blank', ctx.loadForWeek('', 5), '');

console.log('\nBlock structure over the full 26 weeks');
const start = '2026-08-31';                      // a Monday
const ws = (d) => ctx.weekState(start, 26, d);
check('Day 1 is week 1', ws('2026-08-31').week, 1);
check('Day 7 is still week 1', ws('2026-09-06').week, 1);
check('Day 8 is week 2', ws('2026-09-07').week, 2);
check('Week 9 is a deload', ws('2026-10-26').isDeload, true);
check('Week 9 loads at 85%', ws('2026-10-26').pct, 0.85);
check('Week 8 is not a deload', ws('2026-10-19').isDeload, false);
check('Week 12 is block 1', ws('2026-11-16').block, 1);
check('Week 13 is block 2', ws('2026-11-23').block, 2);
check('Week 13 restarts the ramp', ws('2026-11-23').weekInBlock, 1);
check('Week 13 triggers rollover', ws('2026-11-23').needsRollover, true);
check('Week 14 does not re-trigger', ws('2026-11-30').needsRollover, false);
check('Week 21 is the second deload', ws('2027-01-18').isDeload, true);
check('Week 25 is block 3 tail', ws('2027-02-15').block, 3);
check('Week 26 is the last week', ws('2027-02-22').week, 26);

console.log('\nMilestone phases');
const ms = ctx.SEED_MILESTONES.slice(1).map((r) => ({
  phase: r[0], weeks: r[1], weekFrom: r[2], weekTo: r[3]
}));
check('Week 1 → RE-ENTRY', ctx.phaseForWeek(ms, 1).phase, 'RE-ENTRY');
check('Week 4 → GROOVE', ctx.phaseForWeek(ms, 4).phase, 'GROOVE');
check('Week 7 → BUILD', ctx.phaseForWeek(ms, 7).phase, 'BUILD');
check('Week 9 → DELOAD', ctx.phaseForWeek(ms, 9).phase, 'DELOAD');
check('Week 11 → PUSH', ctx.phaseForWeek(ms, 11).phase, 'PUSH');
check('Week 20 → THE ABS PART', ctx.phaseForWeek(ms, 20).phase, 'THE ABS PART');

console.log('\nCheck-in verdicts');
const v1 = ctx.checkinVerdict({ week: 4, weight: 77.3, waist: 87, gymDays: 4, cardio: 2, avgKcal: 2150, avgProtein: 158, avgSteps: 8200, sleep: 7.2 }, CFG);
check('A good week is on-track', v1.status, 'on-track');
const v2 = ctx.checkinVerdict({ week: 4, weight: 77.3, waist: 87, gymDays: 4, cardio: 2, avgKcal: 2150, avgProtein: 120, avgSteps: 8200, sleep: 7.2 }, CFG);
check('Low protein is the loudest warning', v2.status, 'warning');
check('Low protein names the number', v2.advice[0].includes('120g'), true);
const v3 = ctx.checkinVerdict({ week: 4, weight: 77.3, waist: 87, gymDays: 2, cardio: 2, avgKcal: 2150, avgProtein: 158, avgSteps: 8200, sleep: 7.2 }, CFG);
check('Two sessions flags attention', v3.status, 'attention');
const v4 = ctx.checkinVerdict({ week: 4, weight: 77.3, waist: 87, gymDays: 4, cardio: 2, avgKcal: 2150, avgProtein: 158, avgSteps: 8200, sleep: 5.5 }, CFG);
check('Short sleep flags attention', v4.status, 'attention');
check('Variance computes', Math.round(v1.variance * 100) / 100, -0.06, 0.01);

console.log('\nWeekend bank');
const monday = '2026-08-31';                     // Mon .. Sun 2026-09-06
const totals = {};
['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].forEach((d) => { totals[d] = { kcal: 1900 }; });

// Looking back on a finished week: all five weekdays count.
const bank = ctx.weekendBank(CFG, totals, monday, '2026-09-05');
check('Five weekdays 100 under target bank 500', bank.banked, 500);
check('Bank available includes the projection', bank.available, t.weeklyBudget - 10000 + 500);
check('Nothing spent yet', bank.weekendSpent, 0);

const totals2 = Object.assign({}, totals, { '2026-09-05': { kcal: 3000 } });
check('Saturday spend comes off',
  ctx.weekendBank(CFG, totals2, monday, '2026-09-05').available,
  t.weeklyBudget - 10000 + 500 - 3000);

// Mid-week, today is still in progress and must not bank its partial intake —
// otherwise the bank appears large in the morning and shrinks as you eat.
const midweek = ctx.weekendBank(CFG, totals, monday, '2026-09-02');   // Wednesday
check('Today is not banked while in progress', midweek.banked, 200);
check('Only completed weekdays are counted', midweek.weekdaysLogged, 2);
check('A partially eaten today does not inflate the bank',
  midweek.available, t.weeklyBudget - 10000 + 200);

// A day eaten over target still banks negatively once it is finished.
const over = { '2026-08-31': { kcal: 2600 }, '2026-09-01': { kcal: 2000 } };
check('An over-target day banks negative', ctx.weekendBank(CFG, over, monday, '2026-09-03').banked, -600);

console.log('\nNutrition summing');
const s = ctx.sumNutrition([
  { kcal: 165, protein: 31, carbs: 0, fat: 3.6, fibre: 0 },
  { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fibre: 0.4 }
]);
check('kcal sums', s.kcal, 295);
check('protein sums', s.protein, 33.7, 0.001);
check('fibre sums', s.fibre, 0.4, 0.001);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
