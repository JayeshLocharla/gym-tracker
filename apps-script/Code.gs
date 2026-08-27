/**
 * Web app entry point.
 *
 * CORS, and why the client posts text/plain:
 *   Apps Script cannot answer a CORS preflight — there is no way to set headers on
 *   an OPTIONS response. A POST with Content-Type: text/plain is a "simple request"
 *   under the Fetch spec, so the browser never sends a preflight and the call goes
 *   straight through. The client therefore posts a JSON *string* as text/plain and
 *   we parse e.postData.contents by hand. Sending application/json here is the
 *   single most common way this integration breaks.
 *
 * Deploy: Deploy > New deployment > Web app,
 *   Execute as:  Me
 *   Who has access:  Anyone
 * "Anyone" is what makes the cross-origin call work at all; the token below is what
 * actually guards the data.
 */

function doGet(e) {
  return handle_(e, (e && e.parameter) || {});
}

function doPost(e) {
  var body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return json_({ ok: false, error: 'Body was not valid JSON' });
    }
  }
  return handle_(e, body);
}

function handle_(e, req) {
  try {
    if (!checkToken_(req.token)) {
      return json_({ ok: false, error: 'unauthorised', code: 'AUTH' });
    }
    var action = String(req.action || 'bootstrap');
    var fn = ACTIONS[action];
    if (!fn) return json_({ ok: false, error: 'Unknown action: ' + action });

    // Writes are serialised. One user, but a double-tap on a flaky connection can
    // still land two requests inside each other.
    if (WRITE_ACTIONS.indexOf(action) >= 0) {
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        return json_(fn(req));
      } finally {
        lock.releaseLock();
      }
    }
    return json_(fn(req));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Constant-time-ish compare so a wrong token cannot be found a character at a time. */
function checkToken_(supplied) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
  if (!expected) throw new Error('APP_TOKEN is not set. Run generateToken() once.');
  var a = String(supplied || '');
  var b = String(expected);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Run once from the editor. Prints the token to paste into the app. */
function generateToken() {
  var t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('APP_TOKEN', t);
  Logger.log('APP_TOKEN: ' + t);
  return t;
}

var WRITE_ACTIONS = ['toggleExercise', 'addFood', 'deleteFood', 'saveFood', 'checkin',
                     'setConfig', 'rollover', 'setStartDate'];

var ACTIONS = {

  /** Everything the app needs to render offline-ish, in one round trip. */
  bootstrap: function (req) {
    var cfg = readConfig_();
    if (!cfg.startDate) {
      // First launch: anchor the plan to the Monday of the current week.
      var monday = fmtDate_(mondayOf_(new Date()));
      writeConfig_('startDate', monday);
      cfg.startDate = monday;
    }
    var today = req.date || todayStr_();
    var ws = weekState(cfg.startDate, cfg.totalWeeks, today);
    var ramp = readTab_(TAB.ramp);
    var rampByLift = {};
    for (var i = 0; i < ramp.length; i++) rampByLift[String(ramp[i].lift)] = ramp[i];

    var exercises = readTab_(TAB.exercises).map(function (ex) {
      var r = rampByLift[String(ex.rampKey)];
      ex.weight = r ? loadForWeek(r.baseline, ws.weekInBlock) : '';
      ex.baseline = r ? r.baseline : '';
      return ex;
    });

    var milestones = readTab_(TAB.milestones);

    return {
      ok: true,
      planVersion: cfg.planVersion,
      today: today,
      timezone: tz_(),
      config: cfg,
      targets: computeTargets(cfg),
      week: ws,
      phase: phaseForWeek(milestones, ws.week),
      days: readTab_(TAB.days),
      exercises: exercises,
      ramp: ramp,
      foods: readTab_(TAB.foods),
      split: readTab_(TAB.split),
      volume: readTab_(TAB.volume),
      nutrients: readTab_(TAB.nutrients),
      milestones: milestones,
      warnings: readTab_(TAB.warnings),
      guide: readTab_(TAB.guide)
    };
  },

  /** State for one calendar day: what's ticked, what's eaten, where the bank stands. */
  day: function (req) {
    var cfg = readConfig_();
    var date = req.date || todayStr_();
    var monday = mondayOf_(date);

    var sessions = readTab_(TAB.sessionLog).filter(function (r) {
      return fmtDate_(r.date) === date;
    });

    var nutrition = readTab_(TAB.nutritionLog).filter(function (r) {
      return fmtDate_(r.date) === date;
    });

    // Totals for the whole Mon-Sun week, for the bank.
    var totalsByDate = {};
    var all = readTab_(TAB.nutritionLog);
    for (var i = 0; i < all.length; i++) {
      var d = fmtDate_(all[i].date);
      if (daysBetween_(monday, d) < 0 || daysBetween_(monday, d) > 6) continue;
      if (!totalsByDate[d]) totalsByDate[d] = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
      totalsByDate[d].kcal += Number(all[i].kcal) || 0;
      totalsByDate[d].protein += Number(all[i].protein) || 0;
      totalsByDate[d].carbs += Number(all[i].carbs) || 0;
      totalsByDate[d].fat += Number(all[i].fat) || 0;
      totalsByDate[d].fibre += Number(all[i].fibre) || 0;
    }

    return {
      ok: true,
      date: date,
      week: weekState(cfg.startDate, cfg.totalWeeks, date),
      sessions: sessions,
      nutrition: nutrition,
      totals: sumNutrition(nutrition),
      bank: weekendBank(cfg, totalsByDate, monday, todayStr_())
    };
  },

  toggleExercise: function (req) {
    var row = {
      id: uuid_(),
      date: String(req.date),
      dayCode: String(req.dayCode || ''),
      exerciseId: String(req.exerciseId),
      variant: Number(req.variant || 1),
      done: req.done ? true : false,
      weight: req.weight === undefined ? '' : req.weight,
      ts: new Date()
    };
    upsertRow_(TAB.sessionLog, ['date', 'exerciseId'], row);
    return { ok: true, row: row };
  },

  addFood: function (req) {
    var row = {
      id: uuid_(),
      date: String(req.date),
      name: String(req.name),
      qty: Number(req.qty),
      unit: String(req.unit || ''),
      kcal: round1_(Number(req.kcal)),
      protein: round1_(Number(req.protein)),
      carbs: round1_(Number(req.carbs)),
      fat: round1_(Number(req.fat)),
      fibre: round1_(Number(req.fibre)),
      ts: new Date()
    };
    appendRow_(TAB.nutritionLog, row);
    return { ok: true, row: row };
  },

  deleteFood: function (req) {
    return { ok: deleteById_(TAB.nutritionLog, req.id) };
  },

  /** Add a new food to the reusable library. */
  saveFood: function (req) {
    var existing = readTab_(TAB.foods);
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i].name).toLowerCase() === String(req.name).toLowerCase()) {
        return { ok: false, error: 'A food called "' + req.name + '" is already saved.' };
      }
    }
    var row = {
      name: String(req.name),
      unit: String(req.unit || '1 serving'),
      kcal: Number(req.kcal),
      protein: Number(req.protein),
      carbs: Number(req.carbs) || 0,
      fat: Number(req.fat) || 0,
      fibre: Number(req.fibre) || 0,
      tag: String(req.tag || 'custom')
    };
    appendRow_(TAB.foods, row);
    return { ok: true, row: row, foods: readTab_(TAB.foods) };
  },

  /** Weekly check-in. Averages are prefilled from the logs by `checkinDraft`. */
  checkin: function (req) {
    var cfg = readConfig_();
    var row = {
      week: Number(req.week),
      weekStart: String(req.weekStart),
      weight: req.weight === '' ? '' : Number(req.weight),
      waist: req.waist === '' ? '' : Number(req.waist),
      gymDays: req.gymDays === '' ? '' : Number(req.gymDays),
      cardio: req.cardio === '' ? '' : Number(req.cardio),
      avgKcal: req.avgKcal === '' ? '' : Number(req.avgKcal),
      avgProtein: req.avgProtein === '' ? '' : Number(req.avgProtein),
      avgSteps: req.avgSteps === '' ? '' : Number(req.avgSteps),
      sleep: req.sleep === '' ? '' : Number(req.sleep),
      note: String(req.note || ''),
      ts: new Date()
    };
    upsertRow_(TAB.weeklyLog, ['week'], row);

    // Update current bodyweight so every target re-paces off it.
    if (row.weight !== '') writeConfig_('weightKg', row.weight);

    return { ok: true, row: row, verdict: checkinVerdict(row, readConfig_()) };
  },

  /** Pre-fills the check-in form from what you already logged this week. */
  checkinDraft: function (req) {
    var cfg = readConfig_();
    var week = Number(req.week);
    var weekStart = fmtDate_(addDays_(parseDate_(cfg.startDate), (week - 1) * 7));
    var end = addDays_(parseDate_(weekStart), 6);

    var inWeek = function (d) {
      var n = daysBetween_(weekStart, fmtDate_(d));
      return n >= 0 && n <= 6;
    };

    var sess = readTab_(TAB.sessionLog).filter(function (r) { return inWeek(r.date) && r.done === true; });
    var gymDays = {};
    for (var i = 0; i < sess.length; i++) gymDays[fmtDate_(sess[i].date)] = true;

    var nut = readTab_(TAB.nutritionLog).filter(function (r) { return inWeek(r.date); });
    var byDate = {};
    for (var j = 0; j < nut.length; j++) {
      var d = fmtDate_(nut[j].date);
      if (!byDate[d]) byDate[d] = { kcal: 0, protein: 0 };
      byDate[d].kcal += Number(nut[j].kcal) || 0;
      byDate[d].protein += Number(nut[j].protein) || 0;
    }
    var days = Object.keys(byDate);
    var sumK = 0, sumP = 0;
    for (var k = 0; k < days.length; k++) { sumK += byDate[days[k]].kcal; sumP += byDate[days[k]].protein; }

    var existing = readTab_(TAB.weeklyLog).filter(function (r) { return Number(r.week) === week; })[0] || null;

    return {
      ok: true,
      week: week,
      weekStart: weekStart,
      weekEnd: fmtDate_(end),
      existing: existing,
      draft: {
        gymDays: Object.keys(gymDays).length,
        avgKcal: days.length ? Math.round(sumK / days.length) : '',
        avgProtein: days.length ? Math.round(sumP / days.length) : '',
        daysLogged: days.length
      },
      targetWeight: targetWeightForWeek(cfg, week)
    };
  },

  progress: function (req) {
    var cfg = readConfig_();
    var rows = readTab_(TAB.weeklyLog).sort(function (a, b) { return Number(a.week) - Number(b.week); });
    var total = Number(cfg.totalWeeks) || 26;
    var curve = [];
    for (var w = 0; w <= total; w++) curve.push({ week: w, target: targetWeightForWeek(cfg, w) });
    var withVerdict = rows.map(function (r) {
      var v = checkinVerdict(r, cfg);
      r.verdict = v;
      return r;
    });
    return { ok: true, rows: withVerdict, curve: curve, targets: computeTargets(cfg) };
  },

  /**
   * End of a 12-week block: the week-12 loads become the new baselines.
   * `preview` returns the proposed numbers; the app shows them for confirmation
   * before anything is written. Auto-progressing without that step means one good
   * block inflates every weight for the rest of the six months.
   */
  rollover: function (req) {
    var cfg = readConfig_();
    var ramp = readTab_(TAB.ramp);
    var proposed = ramp.map(function (r) {
      var b = Number(r.baseline);
      var next = (isNaN(b) || b <= 0) ? b : roundPlate_(b * RAMP_PCT[11]);
      return { lift: r.lift, from: b, to: next, block: Number(r.block) + 1, _row: r._row };
    });

    if (req.preview) return { ok: true, proposed: proposed, block: Number(ramp[0].block) + 1 };

    var overrides = req.overrides || {};
    var sh = sheet_(TAB.ramp);
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var bCol = head.indexOf('baseline') + 1;
    var blkCol = head.indexOf('block') + 1;
    for (var i = 0; i < proposed.length; i++) {
      var p = proposed[i];
      var val = overrides[p.lift] !== undefined ? Number(overrides[p.lift]) : p.to;
      sh.getRange(p._row, bCol).setValue(val);
      sh.getRange(p._row, blkCol).setValue(p.block);
    }
    writeConfig_('planVersion', Number(cfg.planVersion || 1) + 1);
    return { ok: true, applied: proposed.length };
  },

  setConfig: function (req) {
    var updates = req.updates || {};
    var keys = Object.keys(updates);
    for (var i = 0; i < keys.length; i++) writeConfig_(keys[i], updates[keys[i]]);
    var cfg = readConfig_();
    writeConfig_('planVersion', Number(cfg.planVersion || 1) + 1);
    return { ok: true, config: readConfig_(), targets: computeTargets(readConfig_()) };
  },

  setStartDate: function (req) {
    writeConfig_('startDate', String(req.startDate));
    return { ok: true, startDate: String(req.startDate) };
  },

  ping: function () {
    return { ok: true, pong: true, timezone: tz_(), today: todayStr_() };
  }
};
