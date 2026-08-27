import {
  state, loadProgress, checkinDraft, submitCheckin, rolloverPreview, applyRollover
} from '../state.js';
import { esc, fmt, el, icons, openSheet, closeSheet, toast, round } from '../ui.js';
import { lineChart, adherenceStrip } from '../charts.js';

/**
 * Sunday's screen. The check-in is eight numbers, three of which the app already
 * knows from what you logged during the week — so what you actually type is
 * weight, waist, steps and sleep.
 */
export function renderProgress() {
  const { plan, progress } = state;
  if (!progress) return '<div class="page"><div class="card"><div class="empty">Loading…</div></div></div>';

  const rows = progress.rows || [];
  const total = Number(plan.config.totalWeeks) || 26;
  const latest = rows[rows.length - 1];
  const week = plan.week;

  const weightSeries = rows.map((r) => ({ week: Number(r.week), value: r.weight }));
  const waistSeries = rows.map((r) => ({ week: Number(r.week), value: r.waist }));
  // Window the x-axis around where you actually are. Plotting the full 26-week
  // pace line from week one squashes the real data into the left margin and
  // makes the trend — the only thing this chart is for — unreadable.
  const lastLogged = rows.length ? Number(rows[rows.length - 1].week) : week.week;
  const horizon = Math.min(total, Math.max(lastLogged + 4, week.week + 4, 8));
  const targetCurve = (progress.curve || [])
    .filter((c) => c.week >= 1 && c.week <= horizon)
    .map((c) => ({ week: c.week, value: c.target }));

  return `
    <div class="page" data-accent="progress">
      ${week.needsRollover ? rolloverBanner(week) : ''}
      ${headline(latest, plan, progress)}

      <button class="btn btn-primary btn-full" data-checkin>
        ${latest && Number(latest.week) === week.week ? 'Update this week’s check-in' : `Check in for week ${week.week}`}
      </button>

      ${latest ? verdictCard(latest) : ''}

      <div>
        <div class="section-head">Weight</div>
        <div class="card card-pad">
          ${lineChart({
            series: weightSeries,
            target: targetCurve,
            label: 'Your weight',
            targetLabel: 'Pace to ' + fmt(plan.config.targetWeightKg, 0) + 'kg',
            unit: 'kg',
            colour: 'var(--blue)'
          })}
        </div>
      </div>

      <div>
        <div class="section-head">Waist</div>
        <div class="card card-pad">
          ${lineChart({ series: waistSeries, label: 'Your waist', unit: 'cm', colour: 'var(--clay)' })}
          <div class="t-foot" style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--separator)">
            The better number of the two. If the scale stalls but the waist keeps shrinking you are
            recomposing — losing fat while holding muscle. That is the best possible outcome and the
            scale cannot see it. Where the two disagree, the waist is telling the truth.
          </div>
        </div>
      </div>

      <div>
        <div class="section-head">Adherence · ${rows.length} of ${total} weeks logged</div>
        <div class="card card-pad">
          ${adherenceStrip(rows, total)}
        </div>
      </div>

      ${weeklyTable(rows)}
    </div>`;
}

function headline(latest, plan, progress) {
  const t = progress.targets;
  const start = Number(plan.config.weightKg);
  const goal = Number(plan.config.targetWeightKg);

  if (!latest || latest.weight === '') {
    return `
      <div class="card card-pad">
        <div class="t-head">No check-ins yet</div>
        <div class="t-foot" style="margin-top:6px">
          Sunday morning, after the toilet, before eating. Same time, same conditions, once a week.
          Weigh daily if you like — but only ever log the 7-day average, because a single day swings
          1-2kg on water and means nothing.
        </div>
      </div>`;
  }

  const now = Number(latest.weight);
  const lost = start - now;
  const toGo = now - goal;
  const v = latest.verdict;

  return `
    <div class="card card-pad">
      <div class="between" style="align-items:flex-end">
        <div>
          <div class="t-num" style="font-size:38px;line-height:1;color:var(--blue)">
            ${fmt(now, 1)}<span style="font-size:17px;font-weight:500;color:var(--ink-3)">kg</span>
          </div>
          <div class="t-foot" style="margin-top:5px">
            ${lost >= 0 ? `${fmt(lost, 1)}kg down` : `${fmt(-lost, 1)}kg up`} ·
            ${toGo > 0 ? `${fmt(toGo, 1)}kg to go` : 'target reached'}
          </div>
        </div>
        <div class="stack gap-4" style="align-items:flex-end">
          <span class="badge ${v.status === 'warning' ? 'badge-red' : v.status === 'attention' ? 'badge-amber' : ''}">
            ${v.status === 'on-track' ? 'On track' : v.status === 'attention' ? 'Needs attention' : 'Warning'}
          </span>
          <span class="t-cap">
            ${v.variance === '' ? '' : v.variance <= 0 ? `${fmt(-v.variance, 1)}kg ahead of pace` : `${fmt(v.variance, 1)}kg behind pace`}
          </span>
        </div>
      </div>
      ${latest.waist !== '' ? `
        <div class="t-foot" style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--separator)">
          Waist ${fmt(latest.waist, 1)}cm · ${latest.gymDays} gym days · ${fmt(latest.avgProtein, 0)}g protein/day ·
          ${fmt(latest.sleep, 1)}h sleep
        </div>` : ''}
    </div>`;
}

function verdictCard(latest) {
  const v = latest.verdict;
  const tone = v.status === 'warning' ? 'var(--red)' : v.status === 'attention' ? 'var(--amber)' : 'var(--sage)';
  const bg = v.status === 'warning' ? 'var(--red-soft)' : v.status === 'attention' ? 'var(--amber-soft)' : 'var(--sage-soft)';

  return `
    <div class="card card-pad" style="background:${bg};box-shadow:none">
      <div class="t-foot" style="font-weight:700;color:${tone};text-transform:uppercase;letter-spacing:0.4px;font-size:11px">
        Week ${latest.week} · what to do about it
      </div>
      <div class="stack gap-8" style="margin-top:8px">
        ${v.advice.map((a) => `<div class="t-foot" style="color:${tone}">${esc(a)}</div>`).join('')}
      </div>
      ${latest.note ? `
        <div class="t-foot" style="margin-top:10px;padding-top:10px;border-top:0.5px solid rgba(0,0,0,0.07);color:${tone};font-style:italic">
          “${esc(latest.note)}”
        </div>` : ''}
    </div>`;
}

/** The table view the charts are read against. */
function weeklyTable(rows) {
  if (!rows.length) return '';
  return `
    <div>
      <div class="section-head">Every week</div>
      <div class="list">
        ${[...rows].reverse().map((r) => `
          <div class="row">
            <div class="row-main">
              <div class="between">
                <span class="t-head">Week ${r.week}</span>
                <span class="t-num" style="font-size:15px">${fmt(r.weight, 1)}kg</span>
              </div>
              <div class="t-cap" style="margin-top:2px">
                waist ${fmt(r.waist, 1)}cm · ${r.gymDays} gym · ${r.cardio} cardio ·
                ${fmt(r.avgKcal, 0)} kcal · ${fmt(r.avgProtein, 0)}g protein ·
                ${fmt(r.avgSteps, 0)} steps · ${fmt(r.sleep, 1)}h
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function rolloverBanner(week) {
  return `
    <div class="card card-pad" style="background:var(--amber-soft);box-shadow:none">
      <div class="t-head" style="color:var(--amber)">Block ${week.block - 1} is done</div>
      <div class="t-foot" style="margin-top:6px;color:var(--amber)">
        Twelve weeks finished. Your week-12 loads become the new baselines and the ramp
        starts again — that is exactly what the plan says to do at this point.
        Check the numbers before they are written.
      </div>
      <button class="btn btn-primary btn-full" data-rollover style="margin-top:12px;background:var(--amber)">
        Review new baselines
      </button>
    </div>`;
}

/* ---- check-in ------------------------------------------------------------ */

async function openCheckin(rerender) {
  const week = state.plan.week.week;
  let draft;
  try {
    draft = await checkinDraft(week);
  } catch (err) {
    return toast(err.message);
  }

  const ex = draft.existing || {};
  const d = draft.draft;
  const val = (k, fallback = '') => (ex[k] !== undefined && ex[k] !== '' ? ex[k] : fallback);

  const body = el(`
    <div>
      <div class="card card-pad">
        <div class="t-head">Week ${week}</div>
        <div class="t-foot" style="margin-top:2px">
          ${esc(draft.weekStart)} to ${esc(draft.weekEnd)} ·
          pace target ${fmt(draft.targetWeight, 1)}kg
        </div>
      </div>

      <div>
        <div class="section-head">You type these</div>
        <div class="list">
          <div class="field">
            <label for="ci-weight">Weight (kg)</label>
            <input id="ci-weight" type="number" inputmode="decimal" step="0.1"
                   placeholder="${fmt(draft.targetWeight, 1)}" value="${val('weight')}">
          </div>
          <div class="field">
            <label for="ci-waist">Waist (cm)</label>
            <input id="ci-waist" type="number" inputmode="decimal" step="0.1"
                   placeholder="at the navel" value="${val('waist')}">
          </div>
          <div class="field">
            <label for="ci-steps">Avg steps / day</label>
            <input id="ci-steps" type="number" inputmode="numeric" placeholder="8000" value="${val('avgSteps')}">
          </div>
          <div class="field">
            <label for="ci-sleep">Avg sleep (h)</label>
            <input id="ci-sleep" type="number" inputmode="decimal" step="0.1" placeholder="7.0" value="${val('sleep')}">
          </div>
          <div class="field">
            <label for="ci-cardio">Cardio / sport sessions</label>
            <input id="ci-cardio" type="number" inputmode="numeric" placeholder="2" value="${val('cardio')}">
          </div>
        </div>
        <div class="t-cap" style="margin-top:8px;padding:0 4px">
          Weigh Sunday morning, after the toilet, before eating. Waist at the navel, relaxed, not sucked in.
        </div>
      </div>

      <div>
        <div class="section-head">Filled in from your logs</div>
        <div class="list">
          <div class="field">
            <label>Gym days <span class="dim">from your ticks</span></label>
            <input id="ci-gym" type="number" inputmode="numeric" value="${val('gymDays', d.gymDays)}">
          </div>
          <div class="field">
            <label>Avg calories <span class="dim">${d.daysLogged} days logged</span></label>
            <input id="ci-kcal" type="number" inputmode="numeric" value="${val('avgKcal', d.avgKcal)}">
          </div>
          <div class="field">
            <label>Avg protein (g)</label>
            <input id="ci-protein" type="number" inputmode="numeric" value="${val('avgProtein', d.avgProtein)}">
          </div>
        </div>
        <div class="t-cap" style="margin-top:8px;padding:0 4px">
          Correct any of these if you ate something you did not log. Honest numbers beat flattering ones —
          most people underestimate intake by 20-30%.
        </div>
      </div>

      <div>
        <div class="section-head">How was the week</div>
        <textarea id="ci-note" class="input-block" rows="3"
                  placeholder="Optional. Especially worth writing on a week that went badly.">${esc(val('note'))}</textarea>
        <div class="t-cap" style="margin-top:8px;padding:0 4px">
          A bad week logged is recoverable. A bad week hidden is where this stops.
        </div>
      </div>
    </div>`);

  openSheet({
    title: `Check in`,
    body,
    action: 'Save',
    accent: 'progress',
    onAction: async (sheet) => {
      const g = (id) => body.querySelector(`#ci-${id}`).value.trim();
      const btn = sheet.querySelector('[data-action]');
      btn.disabled = true;
      try {
        const res = await submitCheckin({
          week,
          weekStart: draft.weekStart,
          weight: g('weight'), waist: g('waist'), gymDays: g('gym'),
          cardio: g('cardio'), avgKcal: g('kcal'), avgProtein: g('protein'),
          avgSteps: g('steps'), sleep: g('sleep'), note: g('note')
        });
        closeSheet();
        rerender();
        const s = res.verdict.status;
        toast(s === 'on-track' ? 'Logged. On track.' : 'Logged — read the advice card.');
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }
  });
}

/* ---- block rollover ------------------------------------------------------ */

async function openRollover(rerender) {
  let preview;
  try {
    preview = await rolloverPreview();
  } catch (err) {
    return toast(err.message);
  }

  const body = el(`
    <div>
      <div class="card card-pad">
        <div class="t-foot">
          Each baseline goes up by 10% — the load you were due to lift in week 12. Every number is
          editable: if a lift stalled this block, drop it back rather than carrying a weight you
          never actually hit into the next twelve weeks.
        </div>
      </div>
      <div class="list">
        ${preview.proposed.map((p) => `
          <div class="field">
            <label>
              ${esc(p.lift)}
              <span class="dim"> ${fmt(p.from, 1).replace(/\.0$/, '')} →</span>
            </label>
            <input data-lift="${esc(p.lift)}" type="number" inputmode="decimal" step="2.5"
                   value="${p.to}">
          </div>`).join('')}
      </div>
    </div>`);

  openSheet({
    title: `Block ${preview.block} baselines`,
    body,
    action: 'Apply',
    accent: 'progress',
    onAction: async (sheet) => {
      const overrides = {};
      body.querySelectorAll('[data-lift]').forEach((i) => { overrides[i.dataset.lift] = Number(i.value); });
      const btn = sheet.querySelector('[data-action]');
      btn.disabled = true;
      try {
        await applyRollover(overrides);
        closeSheet();
        rerender();
        toast('New block started');
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }
  });
}

export function bindProgress(root, rerender) {
  root.querySelector('[data-checkin]')?.addEventListener('click', () => openCheckin(rerender));
  root.querySelector('[data-rollover]')?.addEventListener('click', () => openRollover(rerender));
}

export { loadProgress };
