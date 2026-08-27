/**
 * Local dev server: serves docs/ and stands in for the Apps Script web app.
 *
 * It loads the REAL Seed.gs and Compute.gs and runs the same action dispatch as
 * Code.gs, with in-memory arrays instead of Sheet tabs. So what you see locally
 * exercises the actual plan data and the actual maths — only the storage differs.
 *
 *   node tools/mock-api.mjs [--port 8080] [--week N] [--seed-logs]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(root, 'docs');

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const PORT = Number(arg('port', 8080));
const WEEK = Number(arg('week', 1));
const SEED_LOGS = args.includes('--seed-logs');
const TOKEN = 'mock-token-0000000000000000000000000000';

/* ---- load the real Apps Script logic ------------------------------------- */
const gs = ['Seed.gs', 'Compute.gs'].map((f) => readFileSync(join(root, 'apps-script', f), 'utf8')).join('\n');
const shims = `
function fmtDate_(d){ if(typeof d==='string') return d.slice(0,10);
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function parseDate_(s){ if(s instanceof Date) return s;
  const p=String(s).slice(0,10).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function addDays_(d,n){ const o=parseDate_(fmtDate_(d)); o.setDate(o.getDate()+n); return o; }
function daysBetween_(a,b){ return Math.round((parseDate_(fmtDate_(b))-parseDate_(fmtDate_(a)))/86400000); }
`;
const G = {};
new Function(shims + gs + `
Object.assign(this, {computeTargets, targetWeightForWeek, weekState, loadForWeek, roundPlate_,
  checkinVerdict, weekendBank, sumNutrition, phaseForWeek, RAMP_PCT,
  SEED_CONFIG, SEED_RAMP, SEED_DAYS, SEED_EXERCISES, SEED_FOODS, SEED_SPLIT,
  SEED_VOLUME, SEED_NUTRIENTS, SEED_MILESTONES, SEED_WARNINGS, SEED_GUIDE,
  fmtDate_, parseDate_, addDays_, daysBetween_});`).call(G);

/** Turn a seed array-of-arrays into objects, as readTab_ does. */
const toObjects = (rows) => rows.slice(1).map((r) =>
  Object.fromEntries(rows[0].map((h, i) => [h, r[i]])));

/* ---- in-memory "sheet" --------------------------------------------------- */
const iso = (d) => G.fmtDate_(d);
const today = new Date();
// Anchor the plan so that "today" lands in the week we want to preview.
const startDate = iso(G.addDays_(today, -((WEEK - 1) * 7 + today.getDay() === 0 ? 6 : today.getDay() - 1) - (WEEK - 1) * 0));
const monday = (() => {
  const d = new Date(today);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
})();

const db = {
  config: Object.fromEntries(toObjects(G.SEED_CONFIG).map((r) => [r.key, r.value])),
  ramp: toObjects(G.SEED_RAMP),
  days: toObjects(G.SEED_DAYS),
  exercises: toObjects(G.SEED_EXERCISES),
  foods: toObjects(G.SEED_FOODS),
  split: toObjects(G.SEED_SPLIT),
  volume: toObjects(G.SEED_VOLUME),
  nutrients: toObjects(G.SEED_NUTRIENTS),
  milestones: toObjects(G.SEED_MILESTONES),
  warnings: toObjects(G.SEED_WARNINGS),
  guide: toObjects(G.SEED_GUIDE),
  sessionLog: [],
  nutritionLog: [],
  weeklyLog: []
};
db.config.startDate = iso(G.addDays_(monday, -(WEEK - 1) * 7));

if (SEED_LOGS) {
  // A few weeks of plausible history, so charts and verdicts have something to show.
  const startW = Math.max(1, WEEK - 5);
  const t = G.computeTargets(db.config);
  for (let w = startW; w < WEEK; w++) {
    const drift = (w % 3 === 0) ? 0.35 : -0.1;
    db.weeklyLog.push({
      week: w,
      weekStart: iso(G.addDays_(G.parseDate_(db.config.startDate), (w - 1) * 7)),
      weight: Math.round((79 - t.weeklyLossKg * w + drift) * 10) / 10,
      waist: Math.round((89 - w * 0.55) * 10) / 10,
      gymDays: w % 4 === 0 ? 3 : 4,
      cardio: 2,
      avgKcal: 2100 + (w % 3) * 90,
      avgProtein: w % 4 === 0 ? 128 : 156,
      avgSteps: 8000 + (w % 5) * 400,
      sleep: w % 4 === 0 ? 6.1 : 7.1,
      note: w % 4 === 0 ? 'Work was heavy. Two takeaways and a bad Saturday.' : ''
    });
  }
  // Part-done session and a few meals today.
  const code = ['A', 'B', null, 'C', 'D', 'E', null][today.getDay() === 0 ? 6 : today.getDay() - 1] || 'A';
  db.exercises.filter((e) => e.day === code).slice(0, 3).forEach((e) => {
    db.sessionLog.push({ id: randomUUID(), date: iso(today), dayCode: code, exerciseId: e.id, variant: 1, done: true, weight: '', ts: new Date() });
  });
  [['Whole egg', 4], ['Wholegrain bread', 2], ['Greek yoghurt (0%)', 2], ['Chicken breast', 1.8], ['White rice (cooked)', 1.5]]
    .forEach(([name, qty]) => {
      const f = db.foods.find((x) => x.name === name);
      db.nutritionLog.push({
        id: randomUUID(), date: iso(today), name: f.name, qty, unit: f.unit,
        kcal: f.kcal * qty, protein: f.protein * qty, carbs: f.carbs * qty,
        fat: f.fat * qty, fibre: f.fibre * qty, ts: new Date()
      });
    });
  // Monday-to-Friday underspend so the weekend bank has something in it.
  for (let i = 0; i < 4; i++) {
    const d = iso(G.addDays_(monday, i));
    if (d === iso(today)) continue;
    db.nutritionLog.push({
      id: randomUUID(), date: d, name: 'Logged day', qty: 1, unit: 'day',
      kcal: 1890, protein: 160, carbs: 200, fat: 60, fibre: 31, ts: new Date()
    });
  }
}

/* ---- actions (mirrors Code.gs) ------------------------------------------- */
const rampByLift = () => Object.fromEntries(db.ramp.map((r) => [r.lift, r]));

const ACTIONS = {
  ping: () => ({ ok: true, pong: true, timezone: 'Europe/London', today: iso(today) }),

  bootstrap: (req) => {
    const date = req.date || iso(today);
    const ws = G.weekState(db.config.startDate, db.config.totalWeeks, date);
    const rl = rampByLift();
    return {
      ok: true,
      planVersion: db.config.planVersion,
      today: date,
      timezone: 'Europe/London',
      config: db.config,
      targets: G.computeTargets(db.config),
      week: ws,
      phase: G.phaseForWeek(db.milestones, ws.week),
      days: db.days,
      exercises: db.exercises.map((ex) => ({
        ...ex,
        weight: rl[ex.rampKey] ? G.loadForWeek(rl[ex.rampKey].baseline, ws.weekInBlock) : '',
        baseline: rl[ex.rampKey] ? rl[ex.rampKey].baseline : ''
      })),
      ramp: db.ramp, foods: db.foods, split: db.split, volume: db.volume,
      nutrients: db.nutrients, milestones: db.milestones,
      warnings: db.warnings, guide: db.guide
    };
  },

  day: (req) => {
    const date = req.date || iso(today);
    const mon = (() => { const d = G.parseDate_(date); const dow = d.getDay(); return G.addDays_(d, dow === 0 ? -6 : 1 - dow); })();
    const nutrition = db.nutritionLog.filter((r) => r.date === date);
    const totalsByDate = {};
    for (const r of db.nutritionLog) {
      const n = G.daysBetween_(iso(mon), r.date);
      if (n < 0 || n > 6) continue;
      (totalsByDate[r.date] ||= { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
      for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fibre']) totalsByDate[r.date][k] += Number(r[k]) || 0;
    }
    return {
      ok: true, date,
      week: G.weekState(db.config.startDate, db.config.totalWeeks, date),
      sessions: db.sessionLog.filter((r) => r.date === date),
      nutrition,
      totals: G.sumNutrition(nutrition),
      bank: G.weekendBank(db.config, totalsByDate, iso(mon), iso(today))
    };
  },

  toggleExercise: (req) => {
    const i = db.sessionLog.findIndex((r) => r.date === req.date && r.exerciseId === req.exerciseId);
    const row = { id: randomUUID(), date: req.date, dayCode: req.dayCode, exerciseId: req.exerciseId,
                  variant: Number(req.variant) || 1, done: !!req.done, weight: req.weight ?? '', ts: new Date() };
    if (i >= 0) db.sessionLog[i] = row; else db.sessionLog.push(row);
    return { ok: true, row };
  },

  addFood: (req) => {
    const row = { id: randomUUID(), date: req.date, name: req.name, qty: req.qty, unit: req.unit,
      kcal: +req.kcal.toFixed(1), protein: +req.protein.toFixed(1), carbs: +req.carbs.toFixed(1),
      fat: +req.fat.toFixed(1), fibre: +req.fibre.toFixed(1), ts: new Date() };
    db.nutritionLog.push(row);
    return { ok: true, row };
  },

  deleteFood: (req) => {
    const i = db.nutritionLog.findIndex((r) => r.id === req.id);
    if (i >= 0) db.nutritionLog.splice(i, 1);
    return { ok: i >= 0 };
  },

  saveFood: (req) => {
    if (db.foods.some((f) => String(f.name).toLowerCase() === String(req.name).toLowerCase()))
      return { ok: false, error: `A food called "${req.name}" is already saved.` };
    db.foods.push({ ...req, tag: 'custom' });
    return { ok: true, foods: db.foods };
  },

  checkinDraft: (req) => {
    const week = Number(req.week);
    const weekStart = iso(G.addDays_(G.parseDate_(db.config.startDate), (week - 1) * 7));
    const inWeek = (d) => { const n = G.daysBetween_(weekStart, d); return n >= 0 && n <= 6; };
    const gym = new Set(db.sessionLog.filter((r) => inWeek(r.date) && r.done).map((r) => r.date));
    const byDate = {};
    db.nutritionLog.filter((r) => inWeek(r.date)).forEach((r) => {
      (byDate[r.date] ||= { kcal: 0, protein: 0 });
      byDate[r.date].kcal += Number(r.kcal) || 0;
      byDate[r.date].protein += Number(r.protein) || 0;
    });
    const days = Object.keys(byDate);
    const sum = (k) => days.reduce((a, d) => a + byDate[d][k], 0);
    return {
      ok: true, week, weekStart, weekEnd: iso(G.addDays_(G.parseDate_(weekStart), 6)),
      existing: db.weeklyLog.find((r) => Number(r.week) === week) || null,
      draft: {
        gymDays: gym.size,
        avgKcal: days.length ? Math.round(sum('kcal') / days.length) : '',
        avgProtein: days.length ? Math.round(sum('protein') / days.length) : '',
        daysLogged: days.length
      },
      targetWeight: G.targetWeightForWeek(db.config, week)
    };
  },

  checkin: (req) => {
    const row = { ...req, week: Number(req.week), ts: new Date() };
    for (const k of ['weight', 'waist', 'gymDays', 'cardio', 'avgKcal', 'avgProtein', 'avgSteps', 'sleep'])
      row[k] = req[k] === '' ? '' : Number(req[k]);
    const i = db.weeklyLog.findIndex((r) => Number(r.week) === row.week);
    if (i >= 0) db.weeklyLog[i] = row; else db.weeklyLog.push(row);
    if (row.weight !== '') db.config.weightKg = row.weight;
    return { ok: true, row, verdict: G.checkinVerdict(row, db.config) };
  },

  progress: () => {
    const rows = [...db.weeklyLog].sort((a, b) => a.week - b.week)
      .map((r) => ({ ...r, verdict: G.checkinVerdict(r, db.config) }));
    const total = Number(db.config.totalWeeks);
    const curve = Array.from({ length: total + 1 }, (_, w) => ({ week: w, target: G.targetWeightForWeek(db.config, w) }));
    return { ok: true, rows, curve, targets: G.computeTargets(db.config) };
  },

  rollover: (req) => {
    const proposed = db.ramp.map((r) => ({
      lift: r.lift, from: Number(r.baseline),
      to: Number(r.baseline) > 0 ? G.roundPlate_(Number(r.baseline) * G.RAMP_PCT[11]) : Number(r.baseline),
      block: Number(r.block) + 1
    }));
    if (req.preview) return { ok: true, proposed, block: Number(db.ramp[0].block) + 1 };
    proposed.forEach((p, i) => {
      db.ramp[i].baseline = req.overrides?.[p.lift] ?? p.to;
      db.ramp[i].block = p.block;
    });
    db.config.planVersion = Number(db.config.planVersion) + 1;
    return { ok: true, applied: proposed.length };
  },

  setConfig: (req) => {
    Object.assign(db.config, req.updates);
    db.config.planVersion = Number(db.config.planVersion) + 1;
    return { ok: true, config: db.config, targets: G.computeTargets(db.config) };
  },

  setStartDate: (req) => { db.config.startDate = req.startDate; return { ok: true, startDate: req.startDate }; }
};

/* ---- server -------------------------------------------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let out;
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed.token !== TOKEN) out = { ok: false, error: 'unauthorised', code: 'AUTH' };
        else {
          const fn = ACTIONS[parsed.action];
          out = fn ? fn(parsed) : { ok: false, error: 'Unknown action: ' + parsed.action };
        }
      } catch (e) {
        out = { ok: false, error: String(e.message) };
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(out));
    });
    return;
  }

  let p = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' || p === '\\') p = '/index.html';
  const file = join(DOCS, p);
  if (!file.startsWith(DOCS) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}   week ${WEEK}${SEED_LOGS ? ' (with history)' : ''}`);
  console.log(`token: ${TOKEN}`);
});

export { TOKEN };
