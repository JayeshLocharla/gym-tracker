import { state, sessionForDate, exercisesFor, dayMeta, doneMap, loadDay } from '../state.js';
import { esc, fmt, ring, icons, longDate, round, weekdayIndex } from '../ui.js';

/**
 * The screen you open standing in the kitchen or the gym doorway. It answers
 * three questions and nothing else: what am I training, how much have I eaten,
 * and where am I in the six months.
 */
export function renderToday() {
  const { plan, day } = state;
  const t = plan.targets;
  const totals = day?.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  const dayCode = sessionForDate();
  const meta = dayMeta(dayCode);
  const exs = exercisesFor(dayCode).filter((e) => e.id.slice(-1) !== 'F');
  const done = doneMap();
  const doneCount = exs.filter((e) => done[e.id]?.done).length;
  const isWeekend = weekdayIndex(state.date) >= 5;

  return `
    <div class="page" data-accent="today">
      ${sessionCard(dayCode, meta, exs, doneCount)}
      ${macroCard(totals, t)}
      ${bankCard(day?.bank, t, isWeekend)}
      ${phaseCard(plan)}
    </div>`;
}

function sessionCard(dayCode, meta, exs, doneCount) {
  if (!dayCode) {
    return `
      <div class="card card-pad">
        <div class="between">
          <div>
            <div class="t-head">Rest day</div>
            <div class="t-foot" style="margin-top:2px">
              Walk 8,000+ steps and ten minutes of hips and thoracic spine.
              Recovery is when the adaptation happens.
            </div>
          </div>
        </div>
        <button class="btn btn-tinted btn-full" data-nav="train" style="margin-top:14px">
          Train anyway
        </button>
      </div>`;
  }

  const total = exs.length;
  const pct = total ? doneCount / total : 0;
  const complete = total > 0 && doneCount === total;

  return `
    <div class="card card-pad">
      <div class="between gap-16">
        <div class="grow">
          <div class="t-cap" style="text-transform:uppercase;letter-spacing:0.5px;font-weight:600">
            Day ${esc(dayCode)}
          </div>
          <div class="t-title" style="margin-top:2px">${esc(meta?.name || '')}</div>
          <div class="t-foot" style="margin-top:3px">${esc(meta?.focus || '')} · ${esc(meta?.duration || '')}</div>
        </div>
        <div style="position:relative;flex-shrink:0">
          ${ring({ value: doneCount, target: total || 1, size: 56, stroke: 5 })}
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                      font-size:13px;font-weight:700;font-variant-numeric:tabular-nums">
            ${doneCount}<span style="color:var(--ink-3);font-weight:500">/${total}</span>
          </div>
        </div>
      </div>
      <button class="btn ${complete ? 'btn-tinted' : 'btn-primary'} btn-full" data-nav="train" style="margin-top:14px">
        ${complete ? 'Session complete' : doneCount > 0 ? 'Continue session' : 'Start session'}
      </button>
    </div>`;
}

/**
 * Four meters, not a four-series chart. Each one carries its own name and its
 * own numbers, so it reads correctly with no colour at all.
 */
function macroCard(totals, t) {
  const macros = [
    { key: 'kcal',    label: 'CALS',    value: totals.kcal,    target: t.kcal,    dp: 0, colour: 'var(--clay)' },
    { key: 'protein', label: 'PROTEIN', value: totals.protein, target: t.protein, dp: 0, colour: 'var(--sage)', unit: 'g' },
    { key: 'carbs',   label: 'CARBS',   value: totals.carbs,   target: t.carbs,   dp: 0, colour: 'var(--amber)', unit: 'g' },
    { key: 'fibre',   label: 'FIBRE',   value: totals.fibre,   target: t.fibre,   dp: 0, colour: 'var(--blue)', unit: 'g' }
  ];

  return `
    <div>
      <div class="section-head">Today's intake</div>
      <div class="card card-pad" data-accent="food">
        <div class="macro-grid">
          ${macros.map((m) => {
            const remaining = m.target - m.value;
            return `
            <div class="macro">
              <div style="position:relative">
                ${ring({ value: m.value, target: m.target, size: 54, stroke: 5, color: m.colour })}
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                  <span class="macro-value" style="color:${m.colour}">${fmt(m.value, m.dp)}</span>
                </div>
              </div>
              <div class="stack center gap-4">
                <div class="macro-label">${m.label}</div>
                <div class="macro-sub">
                  ${remaining > 0 ? `${fmt(remaining, m.dp)}${m.unit || ''} left` : `+${fmt(-remaining, m.dp)}${m.unit || ''}`}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-tinted btn-full" data-nav="food" style="margin-top:14px">
          ${icons.plus.replace('<svg', '<svg width="17" height="17"')} Log food
        </button>
      </div>
      ${proteinNote(totals.protein, t.protein)}
    </div>`;
}

/** Protein is the one number the workbook calls least negotiable. Say so, once, when it matters. */
function proteinNote(actual, target) {
  const hour = new Date().getHours();
  if (hour < 17 || actual >= target * 0.85) return '';
  const short = Math.round(target - actual);
  return `
    <div class="card card-pad" style="margin-top:8px;background:var(--sage-soft);box-shadow:none">
      <div class="t-foot" style="color:var(--sage)">
        <strong>${short}g of protein still to go.</strong> This is the number that decides whether
        the weight you lose is fat or muscle. A scoop of whey and 150g of Greek yoghurt covers it.
      </div>
    </div>`;
}

/**
 * The weekend bank. The workbook built the whole diet around this, so it gets a
 * card rather than a footnote — it is the mechanism that stops one bad Saturday
 * turning into a quit.
 */
function bankCard(bank, t, isWeekend) {
  if (!bank) return '';
  const available = round(bank.available, 0);
  const healthy = available > 0;

  return `
    <div>
      <div class="section-head">Weekend bank</div>
      <div class="card card-pad" data-accent="food">
        <div class="between">
          <div class="grow">
            <div class="t-num" style="font-size:28px;color:${healthy ? 'var(--clay)' : 'var(--red)'}">
              ${fmt(available, 0)}<span style="font-size:15px;font-weight:500;color:var(--ink-3)"> kcal</span>
            </div>
            <div class="t-foot" style="margin-top:2px">
              ${isWeekend ? 'left to spend this weekend' : 'banked for Saturday and Sunday'}
            </div>
          </div>
          <div class="badge ${healthy ? '' : 'badge-red'}">
            ${bank.weekdaysLogged}/5 weekdays logged
          </div>
        </div>
        <div class="t-foot" style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--separator)">
          ${healthy
            ? `Eating at ${fmt(t.weekdayTarget, 0)} Monday to Friday banks roughly
               ${fmt(t.weekendSpare, 0)} spare calories for each weekend day. That is a real dessert
               or a real takeaway, planned in — not a failure.`
            : `Over budget for the week. Do not punish Monday with a crash day — that is the
               spiral. Drop the weekday target by 100 and let the bank grow bigger instead.`}
          <br><br>
          Protein does not get a day off, though. Hit ${fmt(t.protein, 0)}g on Saturday and Sunday too —
          that is what stops the weekend costing you muscle rather than just calories.
        </div>
      </div>
    </div>`;
}

function phaseCard(plan) {
  const p = plan.phase;
  const w = plan.week;
  if (!p) return '';

  return `
    <div>
      <div class="section-head">Where you are</div>
      <div class="card card-pad" data-accent="progress">
        <div class="between">
          <div>
            <div class="t-head">${esc(p.phase)}</div>
            <div class="t-foot">${esc(p.weeks)}</div>
          </div>
          <div class="hstack gap-8">
            ${w.isDeload ? '<span class="badge badge-amber">Deload week</span>' : ''}
            <span class="badge">Week ${w.week} of ${esc(plan.config.totalWeeks)}</span>
          </div>
        </div>
        <div class="t-foot" style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--separator)">
          <strong style="color:var(--ink)">Target by the end of it.</strong> ${esc(p.target)}
        </div>
        <div class="t-foot" style="margin-top:10px">
          <strong style="color:var(--amber)">The trap in this phase.</strong> ${esc(p.trap)}
        </div>
        <button class="btn btn-plain btn-full" data-nav="plan" style="margin-top:6px;justify-content:flex-start;padding-left:0">
          Read the full plan ${icons.chevron}
        </button>
      </div>
    </div>`;
}
