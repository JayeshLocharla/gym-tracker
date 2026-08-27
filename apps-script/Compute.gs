/**
 * Every derived number in the app is computed here and nowhere else.
 *
 * The Sheet holds inputs and logs; it deliberately holds no formulas, so there is
 * no second implementation of these rules to drift out of sync with this one.
 *
 * Verified against the source workbook: see tools/test-compute.mjs, which runs
 * these same functions and asserts the workbook's own published numbers.
 */

/** Round to the nearest 2.5kg — how plates actually work. */
function roundPlate_(kg) {
  return Math.round(kg / 2.5) * 2.5;
}

function round1_(n) { return Math.round(n * 10) / 10; }

/**
 * Bodyweight-derived nutrition targets. Mifflin-St Jeor.
 * cfg: heightCm, weightKg, ageYears, targetWeightKg, activityMultiplier,
 *      dailyDeficit, proteinPerKg, fatPerKg, weekdayCalorieTarget
 */
function computeTargets(cfg) {
  var w = Number(cfg.weightKg);
  var bmr = 10 * w + 6.25 * Number(cfg.heightCm) - 5 * Number(cfg.ageYears) + 5;
  var tdee = bmr * Number(cfg.activityMultiplier);
  var kcal = tdee - Number(cfg.dailyDeficit);
  var protein = Number(cfg.proteinPerKg) * w;
  var fat = Number(cfg.fatPerKg) * w;
  var carbs = (kcal - protein * 4 - fat * 9) / 4;
  var fibre = 14 * kcal / 1000;

  // The weekend bank: eat under target Mon-Fri, spend the shortfall Sat-Sun.
  var weeklyBudget = kcal * 7;
  var weekdayIntake = Number(cfg.weekdayCalorieTarget) * 5;
  var weekendTotal = weeklyBudget - weekdayIntake;
  var perWeekendDay = weekendTotal / 2;

  // 7,700 kcal per kg of fat.
  var weeklyLossKg = Number(cfg.dailyDeficit) * 7 / 7700;
  var kgToLose = w - Number(cfg.targetWeightKg);

  return {
    bmr: bmr,
    tdee: tdee,
    kcal: kcal,
    protein: protein,
    fat: fat,
    carbs: carbs,
    fibre: fibre,
    waterL: Math.round(0.035 * w * 10) / 10,
    weekdayTarget: Number(cfg.weekdayCalorieTarget),
    weeklyBudget: weeklyBudget,
    weekdayIntake: weekdayIntake,
    weekendTotal: weekendTotal,
    perWeekendDay: perWeekendDay,
    weekendSpare: perWeekendDay - kcal,
    weeklyLossKg: weeklyLossKg,
    kgToLose: kgToLose,
    weeksPerfect: kgToLose / weeklyLossKg,
    weeksRealistic: kgToLose / weeklyLossKg / 0.8,
    proteinPctCals: protein * 4 / kcal,
    fatPctCals: fat * 9 / kcal,
    carbPctCals: carbs * 4 / kcal
  };
}

/** Target bodyweight at the end of week n, straight-line off the deficit. */
function targetWeightForWeek(cfg, week) {
  var t = computeTargets(cfg);
  return Number(cfg.weightKg) - t.weeklyLossKg * week;
}

/**
 * Where you are in the plan. Blocks are 12 weeks; week 9 of each is the deload.
 * A 26-week plan is block 1 (wk 1-12), block 2 (wk 13-24), then a 2-week tail.
 */
function weekState(startDate, totalWeeks, today) {
  var days = daysBetween_(startDate, today);
  var week = Math.floor(days / 7) + 1;
  if (week < 1) week = 1;
  var capped = Math.min(week, Number(totalWeeks) || 26);
  var block = Math.floor((capped - 1) / 12) + 1;
  var weekInBlock = ((capped - 1) % 12) + 1;
  return {
    week: capped,
    rawWeek: week,
    block: block,
    weekInBlock: weekInBlock,
    isDeload: weekInBlock === 9,
    // True once you have finished a full block and the next one needs new baselines.
    needsRollover: week > 12 && ((week - 1) % 12) === 0,
    pct: RAMP_PCT[weekInBlock - 1],
    complete: week > (Number(totalWeeks) || 26)
  };
}

/** The load to put on the bar this week, or '' when the lift has no ramp entry. */
function loadForWeek(baseline, weekInBlock) {
  if (baseline === '' || baseline === null || isNaN(Number(baseline))) return '';
  var b = Number(baseline);
  if (b <= 0) return 'BW';
  return roundPlate_(b * RAMP_PCT[weekInBlock - 1]);
}

/** Which milestone phase a given week falls in. */
function phaseForWeek(milestones, week) {
  for (var i = 0; i < milestones.length; i++) {
    if (week >= Number(milestones[i].weekFrom) && week <= Number(milestones[i].weekTo)) {
      return milestones[i];
    }
  }
  return milestones[milestones.length - 1] || null;
}

/**
 * The weekly check-in verdict. Mirrors what the workbook's Tracker columns said,
 * in the same order of priority: protein first, then sessions, then the trend.
 */
function checkinVerdict(row, cfg) {
  var t = computeTargets(cfg);
  var target = targetWeightForWeek(cfg, Number(row.week));
  var variance = row.weight === '' ? '' : Number(row.weight) - target;

  var flags = [];
  var status = 'on-track';

  if (row.avgProtein !== '' && Number(row.avgProtein) < t.protein * 0.85) {
    status = 'warning';
    flags.push('Protein averaged ' + Math.round(Number(row.avgProtein)) + 'g against a ' +
      Math.round(t.protein) + 'g target. Below 85% and the weight you lose starts coming off as muscle. Fix this before anything else on this list.');
  }
  if (row.gymDays !== '' && Number(row.gymDays) < 4) {
    if (status !== 'warning') status = 'attention';
    flags.push('Only ' + row.gymDays + ' sessions. Four is the floor — below it a muscle drops to once-weekly frequency and the whole rationale for the split goes.');
  }
  if (row.sleep !== '' && Number(row.sleep) < 6.5) {
    if (status !== 'warning') status = 'attention';
    flags.push('Sleep averaged ' + row.sleep + 'h. Under 6.5 shifts the weight you lose toward muscle and makes every other number here harder to hit.');
  }
  if (row.avgKcal !== '' && Number(row.avgKcal) > t.kcal * 1.1) {
    if (status !== 'warning') status = 'attention';
    flags.push('Calories averaged ' + Math.round(Number(row.avgKcal)) + ' against ' + Math.round(t.kcal) +
      '. The weekend bank has slack built in, but not this much.');
  }
  if (row.cardio !== '' && Number(row.cardio) < 2) {
    flags.push('Cardio or sport ' + row.cardio + 'x. Two a week is what moves stamina; pickleball and football count fully.');
  }

  if (variance !== '' && variance > 0.7 && flags.length === 0) {
    status = 'attention';
    flags.push('Weight is ' + round1_(variance) + 'kg above the pace line, but every input above looks right. One week off-pace means nothing — water moves more than this. Hold the course and look again next week.');
  }

  if (flags.length === 0) {
    flags.push(row.weight === '' ? 'Log this week to get feedback.' : 'Everything in range. Do the same thing again.');
  }

  return {
    targetWeight: target,
    variance: variance,
    status: status,
    advice: flags
  };
}

/** Totals for a set of nutrition rows. */
function sumNutrition(rows) {
  var out = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (var i = 0; i < rows.length; i++) {
    out.kcal += Number(rows[i].kcal) || 0;
    out.protein += Number(rows[i].protein) || 0;
    out.carbs += Number(rows[i].carbs) || 0;
    out.fat += Number(rows[i].fat) || 0;
    out.fibre += Number(rows[i].fibre) || 0;
  }
  return out;
}

/**
 * Where the weekend bank stands right now — Mon-Fri underspend banks up for Sat/Sun.
 * weekRows: nutrition rows for the current Mon-Sun, keyed by date.
 */
function weekendBank(cfg, totalsByDate, monday, today) {
  var t = computeTargets(cfg);
  var banked = 0;
  var weekdaysLogged = 0;
  var todayKey = today ? fmtDate_(today) : null;
  for (var i = 0; i < 5; i++) {
    var d = addDays_(monday, i);
    var key = fmtDate_(d);
    // Only completed weekdays bank. A day still in progress has not underspent
    // anything yet — counting it would show a bank that shrinks as you eat.
    if (todayKey && daysBetween_(key, todayKey) <= 0) continue;
    if (totalsByDate[key] !== undefined) {
      banked += t.weekdayTarget - totalsByDate[key].kcal;
      weekdaysLogged++;
    }
  }
  var weekendSpent = 0;
  for (var j = 5; j < 7; j++) {
    var wk = fmtDate_(addDays_(monday, j));
    if (totalsByDate[wk] !== undefined) weekendSpent += totalsByDate[wk].kcal;
  }
  // Days not yet logged are assumed to land on target.
  var projected = t.weeklyBudget - t.weekdayTarget * 5;
  return {
    projected: projected,
    banked: banked,
    weekdaysLogged: weekdaysLogged,
    weekendSpent: weekendSpent,
    available: projected + banked - weekendSpent,
    perDay: t.perWeekendDay
  };
}
