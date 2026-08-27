import {
  state, sessionForDate, setSessionForDate, exercisesFor, dayMeta,
  doneMap, toggleExercise, weightForLift
} from '../state.js';
import { esc, fmt, icons, toast } from '../ui.js';

/**
 * The session, as you work through it. Every exercise shows the load for *this*
 * week off the ramp, the two substitutes for when the machine is taken, and a
 * single tick. No set-by-set logging — you said you will hit the reps, and a
 * form to fill between sets is the thing that stops getting filled in week three.
 */
export function renderTrain() {
  const dayCode = sessionForDate();
  const meta = dayMeta(dayCode);
  const week = state.plan.week;

  return `
    <div class="page" data-accent="train">
      ${dayPicker(dayCode)}
      ${dayCode ? sessionBody(dayCode, meta, week) : restBody()}
    </div>`;
}

function dayPicker(current) {
  const days = state.plan.days || [];
  return `
    <div class="segmented" role="group" aria-label="Choose session">
      ${days.map((d) => `
        <button data-pick-day="${esc(d.code)}" aria-pressed="${d.code === current}">
          ${esc(d.code)}
        </button>`).join('')}
      <button data-pick-day="" aria-pressed="${!current}">Rest</button>
    </div>`;
}

function restBody() {
  return `
    <div class="card card-pad">
      <div class="t-head">Rest day</div>
      <div class="t-foot" style="margin-top:6px">
        Not a gym day. Walk 8,000+ steps, ten minutes of hips and thoracic spine.
        Sitting at a desk five days a week is the thing this is countering.
      </div>
      <div class="t-foot" style="margin-top:10px">
        Pick a session above if you are training today anyway — Friday and Saturday
        are deliberately flexible.
      </div>
    </div>`;
}

function sessionBody(dayCode, meta, week) {
  const all = exercisesFor(dayCode);
  const lifts = all.filter((e) => !e.id.endsWith('F'));
  const finisher = all.find((e) => e.id.endsWith('F'));
  const done = doneMap();
  const doneCount = lifts.filter((e) => done[e.id]?.done).length;

  return `
    <div class="card card-pad">
      <div class="between">
        <div class="grow">
          <div class="t-head">${esc(meta?.name || '')}</div>
          <div class="t-foot" style="margin-top:2px">${esc(meta?.focus || '')}</div>
        </div>
        <div class="hstack gap-8" style="flex-shrink:0">
          ${week.isDeload ? '<span class="badge badge-amber">Deload · 85%</span>' : ''}
          <span class="badge">Wk ${week.week}</span>
        </div>
      </div>
      ${week.isDeload ? `
        <div class="t-foot" style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--separator);color:var(--amber)">
          Loads are at 85% on purpose this week. You will feel like you are wasting it.
          You are not — this is why the next three weeks feel strong. Do not skip it because you feel fine;
          you feel fine because the fatigue has not surfaced yet.
        </div>` : ''}
      <div class="t-foot" style="margin-top:12px">
        ${doneCount} of ${lifts.length} done
      </div>
    </div>

    <div>
      <div class="section-head">The session</div>
      <div class="stack gap-8">
        ${lifts.map((ex) => exerciseCard(ex, done[ex.id])).join('')}
      </div>
    </div>

    ${finisher ? finisherCard(finisher, done[finisher.id]) : ''}
  `;
}

function exerciseCard(ex, st) {
  const isDone = st?.done === true;
  const variant = st?.variant || 1;
  const options = [ex.exercise, ex.alt1, ex.alt2].filter((v) => v && v !== '—');
  const chosen = options[variant - 1] || ex.exercise;
  // Resolve the load against whichever variant is actually being done.
  const weight = variant === 1 ? ex.weight : (weightForLift(chosen) || '');
  const hasWeight = weight !== '' && weight !== null && weight !== undefined;

  return `
    <div class="card" data-ex="${esc(ex.id)}" style="${isDone ? 'opacity:0.62' : ''}">
      <div class="card-pad" style="padding-bottom:12px">
        <div class="hstack gap-12" style="align-items:flex-start">
          <button class="tick tappable" role="checkbox" aria-checked="${isDone}"
                  aria-label="Mark ${esc(chosen)} complete" data-toggle="${esc(ex.id)}"
                  style="margin-top:2px">
            ${icons.tick}
          </button>
          <div class="grow">
            <div class="t-head" style="${isDone ? 'text-decoration:line-through;text-decoration-color:var(--ink-3)' : ''}">
              ${esc(chosen)}
            </div>
            <div class="hstack gap-8" style="margin-top:5px;flex-wrap:wrap">
              <span class="badge badge-grey">${esc(ex.setsReps)}</span>
              ${hasWeight ? `<span class="badge">${typeof weight === 'number' ? fmt(weight, 1).replace(/\.0$/, '') + ' kg' : esc(weight)}</span>` : ''}
              <span class="t-cap">${esc(ex.intensity)} · rest ${esc(ex.rest)}</span>
            </div>
          </div>
        </div>
      </div>

      ${options.length > 1 ? `
        <div style="padding:0 var(--pad) 12px">
          <div class="segmented" role="group" aria-label="Equipment variant for ${esc(ex.exercise)}">
            ${options.map((label, i) => `
              <button data-variant="${esc(ex.id)}:${i + 1}" aria-pressed="${variant === i + 1}"
                      title="${esc(label)}">
                ${['First choice', 'Machine', 'Dumbbell'][i] || 'Alt'}
              </button>`).join('')}
          </div>
          ${variant > 1 ? `<div class="t-cap" style="margin-top:6px">Swapped from ${esc(ex.exercise)} — same muscle, same job.</div>` : ''}
        </div>` : ''}

      <details style="border-top:0.5px solid var(--separator)">
        <summary style="list-style:none;padding:11px var(--pad);cursor:pointer;
                        display:flex;align-items:center;justify-content:space-between;min-height:var(--tap)">
          <span class="t-foot" style="font-weight:600;color:var(--sage)">How to do it</span>
          <span style="color:var(--ink-3)">${icons.chevronDown}</span>
        </summary>
        <div style="padding:0 var(--pad) 14px">
          <div class="t-foot">${esc(ex.note)}</div>
          <div class="t-cap" style="margin-top:8px">Target: ${esc(ex.target)}</div>
        </div>
      </details>
    </div>`;
}

function finisherCard(ex, st) {
  const isDone = st?.done === true;
  return `
    <div>
      <div class="section-head">Finisher</div>
      <div class="card card-pad" style="${isDone ? 'opacity:0.62' : ''}">
        <div class="hstack gap-12" style="align-items:flex-start">
          <button class="tick tappable" role="checkbox" aria-checked="${isDone}"
                  aria-label="Mark finisher complete" data-toggle="${esc(ex.id)}" style="margin-top:2px">
            ${icons.tick}
          </button>
          <div class="grow">
            <div class="t-head">${esc(ex.exercise)}</div>
            <div class="t-foot" style="margin-top:4px">${esc(ex.note)}</div>
          </div>
        </div>
      </div>
    </div>`;
}

/** Wire up the interactive bits after the HTML lands in the DOM. */
export function bindTrain(root, rerender) {
  root.querySelectorAll('[data-pick-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setSessionForDate(state.date, btn.dataset.pickDay || null);
      rerender();
    });
  });

  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.toggle;
      const ex = state.plan.exercises.find((e) => e.id === id);
      const current = doneMap()[id];
      const next = !(current?.done === true);

      // Paint immediately — a tick that waits on a round trip feels broken.
      btn.setAttribute('aria-checked', String(next));
      try {
        await toggleExercise(ex, next, current?.variant || 1);
        rerender();
      } catch (err) {
        btn.setAttribute('aria-checked', String(!next));
        toast(err.message);
      }
    });
  });

  root.querySelectorAll('[data-variant]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [id, v] = btn.dataset.variant.split(':');
      const ex = state.plan.exercises.find((e) => e.id === id);
      const current = doneMap()[id];
      try {
        await toggleExercise(ex, current?.done === true, Number(v));
        rerender();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}
