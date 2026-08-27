import { state, init, loadDay, loadProgress, creds, sessionForDate, dayMeta } from './state.js';
import { $, el, esc, icons, longDate, toast, watchScroll, toISO } from './ui.js';
import { call } from './api.js';
import { renderToday } from './views/today.js';
import { renderTrain, bindTrain } from './views/train.js';
import { renderFood, bindFood } from './views/food.js';
import { renderProgress, bindProgress } from './views/progress.js';
import { renderPlan, bindPlan } from './views/plan.js';

const TABS = [
  { id: 'today',    label: 'Today',    icon: icons.today },
  { id: 'train',    label: 'Train',    icon: icons.train },
  { id: 'food',     label: 'Food',     icon: icons.food },
  { id: 'progress', label: 'Progress', icon: icons.progress },
  { id: 'plan',     label: 'Plan',     icon: icons.plan }
];

let current = 'today';

const app = $('#app');
const navbar = $('#navbar');
const tabbar = $('#tabbar');

/* ---- boot ---------------------------------------------------------------- */

async function boot() {
  if (!creds.configured) return renderSetup();

  paintLoading();
  try {
    await init();
    await loadDay(toISO(new Date()));
  } catch (err) {
    return renderError(err);
  }

  buildTabs();
  go(location.hash.slice(1) || 'today');
}

function paintLoading() {
  app.innerHTML = `
    <div class="page">
      <div class="card"><div class="empty">
        <div class="spinner" style="margin:0 auto 12px"></div>
        Loading your plan…
      </div></div>
    </div>`;
}

function renderError(err) {
  navbar.innerHTML = '';
  tabbar.innerHTML = '';
  app.innerHTML = `
    <div class="page" style="padding-top:60px">
      <div class="card card-pad">
        <div class="t-title">Could not load</div>
        <div class="t-foot" style="margin-top:8px">${esc(err.message)}</div>
        <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="location.reload()">Try again</button>
        <button class="btn btn-plain btn-full" style="margin-top:6px" id="reset">Change connection settings</button>
      </div>
    </div>`;
  $('#reset').addEventListener('click', () => { creds.clear(); location.reload(); });
}

/* ---- setup --------------------------------------------------------------- */

function renderSetup() {
  navbar.innerHTML = '';
  tabbar.innerHTML = '';
  document.body.style.paddingBottom = '0';

  app.innerHTML = `
    <div class="page" data-accent="today" style="padding-top:56px;max-width:460px">
      <div>
        <div class="t-large">Set up</div>
        <div class="navbar-sub" style="margin-top:4px">
          Paste the two things the Apps Script editor printed when you ran setupWorkbook().
        </div>
      </div>

      <div class="list">
        <div style="padding:12px var(--pad)">
          <label class="t-foot" for="s-url" style="font-weight:600">Web app URL</label>
          <input id="s-url" class="input-block" style="margin-top:6px"
                 placeholder="https://script.google.com/macros/s/…/exec"
                 autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
        </div>
        <div style="padding:12px var(--pad)">
          <label class="t-foot" for="s-token" style="font-weight:600">Token</label>
          <input id="s-token" class="input-block" style="margin-top:6px"
                 placeholder="40 characters"
                 autocapitalize="off" autocorrect="off" spellcheck="false">
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="s-go">Connect</button>
      <div id="s-msg" class="t-foot center"></div>

      <div class="card card-pad">
        <div class="t-foot">
          The URL must end in <strong>/exec</strong>, not /dev, and the deployment must be set to
          <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>. Both values are
          stored only on this phone.
        </div>
      </div>
    </div>`;

  const go = $('#s-go');
  const msg = $('#s-msg');

  go.addEventListener('click', async () => {
    const url = $('#s-url').value.trim();
    const token = $('#s-token').value.trim();
    if (!url || !token) return toast('Both fields are needed');

    go.disabled = true;
    msg.textContent = 'Checking…';
    creds.save(url, token);
    try {
      await call('ping');
      msg.textContent = 'Connected.';
      document.body.style.paddingBottom = '';
      location.reload();
    } catch (err) {
      creds.clear();
      go.disabled = false;
      msg.innerHTML = `<span style="color:var(--red)">${esc(err.message)}</span>`;
    }
  });
}

/* ---- chrome -------------------------------------------------------------- */

function buildTabs() {
  tabbar.innerHTML = TABS.map((t) => `
    <button class="tab" data-tab="${t.id}" role="tab" aria-selected="false"
            data-accent="${t.id}" aria-label="${t.label}">
      ${t.icon}<span>${t.label}</span>
    </button>`).join('');

  tabbar.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.tab)));
}

const TITLES = {
  today:    () => ({ title: 'Today', sub: longDate(state.date) }),
  train:    () => {
    const code = sessionForDate();
    return { title: code ? `Day ${code}` : 'Rest', sub: code ? dayMeta(code)?.name || '' : 'No session scheduled' };
  },
  food:     () => ({ title: 'Food', sub: `${state.day?.nutrition?.length || 0} entries today` }),
  progress: () => ({ title: 'Progress', sub: `Week ${state.plan.week.week} of ${state.plan.config.totalWeeks}` }),
  plan:     () => ({ title: 'The Plan', sub: 'Why it is built this way' })
};

async function go(tab) {
  if (!TABS.some((t) => t.id === tab)) tab = 'today';
  current = tab;
  history.replaceState(null, '', `#${tab}`);

  tabbar.querySelectorAll('[data-tab]').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.tab === tab)));

  if (tab === 'progress' && !state.progress) {
    app.innerHTML = '<div class="page"><div class="card"><div class="empty"><div class="spinner" style="margin:0 auto"></div></div></div></div>';
    try { await loadProgress(); } catch (err) { return toast(err.message); }
  }

  render();
  window.scrollTo(0, 0);
}

function render() {
  const meta = TITLES[current]();
  navbar.dataset.accent = current;
  navbar.innerHTML = `
    <div class="navbar-inline">${esc(meta.title)}</div>
    <div class="navbar-large">
      <div class="t-large">${esc(meta.title)}</div>
      <div class="navbar-sub">${esc(meta.sub)}</div>
    </div>`;

  const views = {
    today: renderToday, train: renderTrain, food: renderFood,
    progress: renderProgress, plan: renderPlan
  };
  app.innerHTML = views[current]();

  // Any card can send you to another tab.
  app.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.nav)));

  const binders = { train: bindTrain, food: bindFood, progress: bindProgress, plan: bindPlan };
  binders[current]?.(app, render);
}

watchScroll(navbar);
boot();
