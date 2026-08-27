/** One shared store. Views read from it; only these functions write to it. */

import { call, loadPlan, creds } from './api.js';
import { toISO, mondayOf, weekdayIndex } from './ui.js';

export const state = {
  plan: null,        // bootstrap response — config, exercises, ramp, prose
  day: null,         // today's sessions + nutrition + bank
  date: toISO(new Date()),
  progress: null,
  ready: false
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(state)); }

export async function init() {
  const { plan, stale, fetching } = await loadPlan({
    onFresh: (fresh) => { state.plan = fresh; emit(); }
  });
  state.plan = plan;
  state.ready = true;
  emit();
  if (stale) fetching.catch(() => {});
  return plan;
}

export async function loadDay(date = state.date) {
  state.date = date;
  const res = await call('day', { date });
  state.day = res;
  emit();
  return res;
}

export async function refresh() {
  const plan = await call('bootstrap', { date: state.date });
  state.plan = plan;
  await loadDay(state.date);
  return plan;
}

/* ---- training ------------------------------------------------------------ */

/**
 * Which session belongs to a date.
 *
 * The workbook's week is Mon A, Tue B, Wed rest, Thu C, Fri D-or-sport,
 * Sat D-or-E, Sun rest. Friday and Saturday are deliberately flexible, so the
 * app offers the day it expects and lets you switch — a fixed calendar would be
 * wrong more often than right for a plan built around a Friday football game.
 */
const DEFAULT_BY_WEEKDAY = ['A', 'B', null, 'C', 'D', 'E', null];

export function sessionForDate(date = state.date) {
  const idx = weekdayIndex(date);
  const override = getOverride(date);
  return override !== null ? override : DEFAULT_BY_WEEKDAY[idx];
}

/** A picked session sticks locally — it is a scheduling preference, not data. */
function overrides() {
  try { return JSON.parse(localStorage.getItem('gt.dayOverrides') || '{}'); }
  catch { return {}; }
}
function getOverride(date) {
  const o = overrides();
  return Object.prototype.hasOwnProperty.call(o, date) ? o[date] : null;
}
export function setSessionForDate(date, dayCode) {
  const o = overrides();
  o[date] = dayCode;
  try { localStorage.setItem('gt.dayOverrides', JSON.stringify(o)); } catch { /* ignore */ }
  emit();
}

export function exercisesFor(dayCode) {
  if (!state.plan || !dayCode) return [];
  return state.plan.exercises
    .filter((e) => e.day === dayCode)
    .sort((a, b) => Number(a.order) - Number(b.order));
}

/**
 * The load for a named lift this week. Alternatives carry their own ramp entries
 * (Pull-Up has none, but Lat Pulldown does), so swapping equipment has to
 * re-resolve the weight rather than keep the first choice's.
 */
export function weightForLift(name) {
  const ramp = (state.plan?.ramp || []).find((r) => String(r.lift) === String(name));
  if (!ramp) return '';
  const baseline = Number(ramp.baseline);
  if (isNaN(baseline)) return '';
  if (baseline <= 0) return 'BW';
  return Math.round((baseline * state.plan.week.pct) / 2.5) * 2.5;
}

export function dayMeta(dayCode) {
  return (state.plan?.days || []).find((d) => d.code === dayCode) || null;
}

/** Completion state for the current date, keyed by exercise id. */
export function doneMap() {
  const map = {};
  for (const row of state.day?.sessions || []) {
    map[String(row.exerciseId)] = { done: row.done === true, variant: Number(row.variant) || 1 };
  }
  return map;
}

export async function toggleExercise(ex, done, variant) {
  await call('toggleExercise', {
    date: state.date,
    dayCode: ex.day,
    exerciseId: ex.id,
    variant: variant || 1,
    done,
    weight: ex.weight
  });
  await loadDay(state.date);
}

/* ---- nutrition ----------------------------------------------------------- */

export async function addFood(food, qty) {
  const mult = Number(qty);
  await call('addFood', {
    date: state.date,
    name: food.name,
    qty: mult,
    unit: food.unit,
    kcal: Number(food.kcal) * mult,
    protein: Number(food.protein) * mult,
    carbs: Number(food.carbs) * mult,
    fat: Number(food.fat) * mult,
    fibre: Number(food.fibre) * mult
  });
  await loadDay(state.date);
}

export async function deleteFood(id) {
  await call('deleteFood', { id });
  await loadDay(state.date);
}

export async function saveFood(food) {
  const res = await call('saveFood', food);
  if (res.foods) {
    state.plan.foods = res.foods;
    emit();
  }
  return res;
}

/** Most-eaten foods first — after a fortnight this is the list you actually use. */
export function foodsRanked() {
  const foods = state.plan?.foods || [];
  const counts = recentCounts();
  return [...foods].sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0));
}

function recentCounts() {
  try { return JSON.parse(localStorage.getItem('gt.foodCounts') || '{}'); }
  catch { return {}; }
}
export function noteFoodUse(name) {
  const c = recentCounts();
  c[name] = (c[name] || 0) + 1;
  try { localStorage.setItem('gt.foodCounts', JSON.stringify(c)); } catch { /* ignore */ }
}

/* ---- progress ------------------------------------------------------------ */

export async function loadProgress() {
  const res = await call('progress');
  state.progress = res;
  emit();
  return res;
}

export function checkinDraft(week) {
  return call('checkinDraft', { week });
}

export async function submitCheckin(row) {
  const res = await call('checkin', row);
  await Promise.all([loadProgress(), refresh()]);
  return res;
}

export function rolloverPreview() {
  return call('rollover', { preview: true });
}

export async function applyRollover(overridesMap) {
  const res = await call('rollover', { overrides: overridesMap || {} });
  await refresh();
  return res;
}

export async function saveConfig(updates) {
  const res = await call('setConfig', { updates });
  await refresh();
  return res;
}

export { creds };
