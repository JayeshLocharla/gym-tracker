import { state, saveConfig, creds } from '../state.js';
import { esc, fmt, el, icons, openSheet, closeSheet, toast } from '../ui.js';

/**
 * The reference half of the workbook — why the split is what it is, what each
 * phase is meant to feel like, what breaks if you skip an input.
 *
 * This is not filler. The workbook's own conclusion is that adherence beats
 * program design by an order of magnitude, and this is the content that produces
 * adherence. It belongs one tap away, not in a spreadsheet tab nobody opens.
 */
export function renderPlan() {
  const { plan } = state;
  const t = plan.targets;

  return `
    <div class="page" data-accent="plan">
      ${section('The week', splitTable(plan.split))}
      ${section('Milestones', milestones(plan.milestones, plan.week.week))}
      ${section('Skip an input, lose a goal', warnings(plan.warnings))}
      ${section('Your numbers', numbers(plan, t))}
      ${section('Weekly volume', volume(plan.volume))}
      ${section('Micronutrients', nutrients(plan.nutrients))}
      ${guideSections(plan.guide)}
      ${section('Settings', settings(plan))}
    </div>`;
}

const section = (title, inner) => `
  <div>
    <div class="section-head">${esc(title)}</div>
    ${inner}
  </div>`;

const disclosure = (summary, sub, inner) => `
  <details class="card" style="overflow:hidden">
    <summary style="list-style:none;cursor:pointer;padding:13px var(--pad);min-height:var(--tap);
                    display:flex;align-items:center;justify-content:space-between;gap:12px">
      <span class="grow">
        <span class="t-head" style="display:block">${summary}</span>
        ${sub ? `<span class="t-cap">${sub}</span>` : ''}
      </span>
      <span style="color:var(--ink-3);flex-shrink:0">${icons.chevronDown}</span>
    </summary>
    <div style="padding:0 var(--pad) 16px">${inner}</div>
  </details>`;

function splitTable(split) {
  return `
    <div class="list">
      ${split.map((d) => {
        const rest = String(d.session).toLowerCase() === 'rest';
        return `
        <div class="row" style="align-items:flex-start;padding-top:12px;padding-bottom:12px">
          <div style="width:38px;flex-shrink:0" class="t-foot">${esc(String(d.day).slice(0, 3))}</div>
          <div class="row-main">
            <div class="between">
              <span class="${rest ? 't-body muted' : 't-head'}">${esc(d.session)}</span>
              <span class="badge ${rest ? 'badge-grey' : d.priority === 'Flexible' ? 'badge-amber' : ''}"
                    style="flex-shrink:0">${esc(d.priority)}</span>
            </div>
            <div class="t-cap" style="margin-top:2px">${esc(d.focus)} · ${esc(d.time)}</div>
            <div class="t-foot" style="margin-top:6px">${esc(d.notes)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function milestones(list, currentWeek) {
  return `
    <div class="stack gap-8">
      ${list.map((m) => {
        const active = currentWeek >= Number(m.weekFrom) && currentWeek <= Number(m.weekTo);
        const past = currentWeek > Number(m.weekTo);
        return disclosure(
          `${esc(m.phase)} ${active ? '<span class="badge" style="margin-left:6px">You are here</span>' : past ? '<span class="badge badge-grey" style="margin-left:6px">Done</span>' : ''}`,
          esc(m.weeks),
          `<div class="t-foot"><strong style="color:var(--ink)">Target.</strong> ${esc(m.target)}</div>
           <div class="t-foot" style="margin-top:10px"><strong style="color:var(--ink)">What you should see.</strong> ${esc(m.whatYouSee)}</div>
           <div class="t-foot" style="margin-top:10px;color:var(--amber)"><strong>The trap.</strong> ${esc(m.trap)}</div>`
        );
      }).join('')}
    </div>`;
}

function warnings(list) {
  return `
    <div class="stack gap-8">
      ${list.map((w) => disclosure(
        esc(w.ifYouSkip),
        `Kills: ${esc(w.whichGoalItKills)}`,
        `<div class="t-foot">${esc(w.whatHappens)}</div>
         <div class="t-foot" style="margin-top:10px"><strong style="color:var(--ink)">Slack you have.</strong> ${esc(w.slack)}</div>`
      )).join('')}
    </div>`;
}

function numbers(plan, t) {
  const rows = [
    ['Maintenance (TDEE)', `${fmt(t.tdee, 0)} kcal`],
    ['Daily target', `${fmt(t.kcal, 0)} kcal`],
    ['Monday to Friday', `${fmt(t.weekdayTarget, 0)} kcal`],
    ['Each weekend day', `${fmt(t.perWeekendDay, 0)} kcal`],
    ['Protein', `${fmt(t.protein, 0)} g`],
    ['Carbs', `${fmt(t.carbs, 0)} g`],
    ['Fat', `${fmt(t.fat, 0)} g`],
    ['Fibre', `${fmt(t.fibre, 0)} g`],
    ['Water', `${fmt(t.waterL, 1)} L`]
  ];
  return `
    <div class="list">
      ${rows.map(([k, v]) => `
        <div class="row"><div class="row-main">${k}</div><div class="row-value t-num">${v}</div></div>`).join('')}
    </div>
    <div class="t-cap" style="margin-top:8px;padding:0 4px">
      Every number above is a formula off your bodyweight. Log a check-in and they all re-pace.
      Realistic timeline to ${fmt(plan.config.targetWeightKg, 0)}kg at 80% adherence:
      ${fmt(t.weeksRealistic, 0)} weeks.
    </div>`;
}

function volume(list) {
  return `
    <div class="list">
      ${list.map((v) => `
        <div class="row">
          <div class="row-main">
            <div>${esc(v.muscle)}</div>
            <div class="t-cap">research range ${esc(v.researchRange)} · ${esc(v.verdict)}</div>
          </div>
          <div class="row-value t-num">${esc(v.setsPerWeek)}</div>
        </div>`).join('')}
    </div>
    <div class="t-cap" style="margin-top:8px;padding:0 4px">
      Hard sets per muscle per week on the four-day version. Everything sits inside the
      research range deliberately — in a deficit, recovery is the constraint, and sets you
      cannot recover from cost you rather than buy you anything.
    </div>`;
}

function nutrients(list) {
  return `
    <div class="stack gap-8">
      ${list.map((n) => disclosure(
        esc(n.nutrient),
        esc(n.target),
        `<div class="t-foot"><strong style="color:var(--ink)">Where to get it.</strong> ${esc(n.sources)}</div>
         <div class="t-foot" style="margin-top:10px">${esc(n.why)}</div>`
      )).join('')}
    </div>`;
}

function guideSections(guide) {
  const groups = {};
  for (const g of guide) (groups[g.section] ||= []).push(g);

  const TITLES = {
    principles: 'Four things to read before you start',
    split: 'Why this split',
    nutrition: 'How the eating works',
    progress: 'Progressing, and what matters most',
    stress: 'One more thing'
  };

  return Object.entries(groups).map(([key, items]) => section(
    TITLES[key] || key,
    `<div class="stack gap-8">
      ${items.map((i) => disclosure(esc(i.title), '', `
        <div class="prose t-foot">${String(i.body).split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>`)).join('')}
    </div>`
  )).join('');
}

function settings(plan) {
  return `
    <div class="list">
      <button class="row tappable" data-edit-config>
        <div class="row-main">Body and targets</div>
        <div class="row-value">${fmt(plan.config.weightKg, 1)}kg → ${fmt(plan.config.targetWeightKg, 0)}kg</div>
        <span class="chevron">${icons.chevron}</span>
      </button>
      <div class="row">
        <div class="row-main">Plan started</div>
        <div class="row-value">${esc(plan.config.startDate)}</div>
      </div>
      <div class="row">
        <div class="row-main">Timezone</div>
        <div class="row-value">${esc(plan.timezone)}</div>
      </div>
      <button class="row tappable" data-signout>
        <div class="row-main" style="color:var(--red)">Disconnect this device</div>
      </button>
    </div>
    <div class="t-cap" style="margin-top:8px;padding:0 4px">
      Everything lives in your Google Sheet. Disconnecting only clears the saved URL and token
      from this phone — it deletes nothing.
    </div>`;
}

function openConfig(rerender) {
  const c = state.plan.config;
  const fields = [
    ['weightKg', 'Current weight (kg)', 0.1],
    ['targetWeightKg', 'Target weight (kg)', 0.1],
    ['heightCm', 'Height (cm)', 1],
    ['ageYears', 'Age', 1],
    ['activityMultiplier', 'Activity multiplier', 0.05],
    ['dailyDeficit', 'Daily deficit (kcal)', 25],
    ['proteinPerKg', 'Protein (g per kg)', 0.1],
    ['fatPerKg', 'Fat (g per kg)', 0.1],
    ['weekdayCalorieTarget', 'Mon-Fri calorie target', 50]
  ];

  const body = el(`
    <div>
      <div class="list">
        ${fields.map(([k, label, step]) => `
          <div class="field">
            <label for="cf-${k}">${label}</label>
            <input id="cf-${k}" type="number" inputmode="decimal" step="${step}" value="${esc(c[k])}">
          </div>`).join('')}
      </div>
      <div class="t-cap" style="padding:0 4px">
        Changing your weight here re-paces every calorie and macro number in the app.
        Activity multiplier: 1.4 in a light week, 1.5 normally, 1.55 if you are also hitting 12k steps.
      </div>
    </div>`);

  openSheet({
    title: 'Body and targets',
    body,
    action: 'Save',
    accent: 'plan',
    onAction: async (sheet) => {
      const updates = {};
      fields.forEach(([k]) => { updates[k] = Number(body.querySelector(`#cf-${k}`).value); });
      const btn = sheet.querySelector('[data-action]');
      btn.disabled = true;
      try {
        await saveConfig(updates);
        closeSheet();
        rerender();
        toast('Targets updated');
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }
  });
}

export function bindPlan(root, rerender) {
  root.querySelector('[data-edit-config]')?.addEventListener('click', () => openConfig(rerender));
  root.querySelector('[data-signout]')?.addEventListener('click', () => {
    if (!confirm('Disconnect this device? Your data stays in the Sheet.')) return;
    creds.clear();
    location.reload();
  });
}
