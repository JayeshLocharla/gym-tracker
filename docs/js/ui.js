/** Shared rendering helpers. No framework — this has to still run in six months. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape anything that came from the Sheet before it goes near innerHTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const round = (n, dp = 0) => {
  const m = Math.pow(10, dp);
  return Math.round(Number(n) * m) / m;
};

export const fmt = (n, dp = 0) => {
  if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '—';
  return round(n, dp).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};

/** 'Thursday 27 August' */
export function longDate(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortDate(iso) {
  return parseISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week containing iso. */
export function mondayOf(iso) {
  const d = parseISO(iso);
  const dow = d.getDay();
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

/** 0 Mon .. 6 Sun — the plan's week runs Monday to Sunday. */
export function weekdayIndex(iso) {
  const dow = parseISO(iso).getDay();
  return dow === 0 ? 6 : dow - 1;
}

/* ---- progress ring -------------------------------------------------------
   A meter, not a chart: one value against one target, always accompanied by
   its own label and numbers. Colour is reinforcement, never the identity.   */
export function ring({ value, target, size = 52, stroke = 5, color }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = c * (1 - pct);
  const over = target > 0 && value > target * 1.05;
  return `
    <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"
              fill="none" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
              fill="none" stroke-width="${stroke}"
              stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
              transform="rotate(-90 ${size / 2} ${size / 2})"
              ${color ? `style="stroke:${color}"` : ''}
              ${over ? 'stroke-opacity="0.55"' : ''}/>
    </svg>`;
}

export const icons = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6M20 9v6M7 6.5v11M17 6.5v11M7 12h10"/></svg>',
  food:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v8a2.5 2.5 0 0 0 5 0V3M8.5 11v10"/><path d="M17 3c-1.7 1.6-2.5 3.7-2.5 6 0 1.7.8 2.8 2.5 3v9"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l5-5 3 3 7-7"/><path d="M15 9h4v4"/></svg>',
  plan:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h11a2 2 0 0 1 2 2V20l-4.5-2.2L9 20l-4-2V6.5a2 2 0 0 1 2-2z"/><path d="M9 8.5h5M9 12h5"/></svg>',
  tick:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>',
  chevron: '<svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6.5 6.5L1.5 11.5"/></svg>',
  chevronDown: '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L6 6L10.5 1.5"/></svg>',
  plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
};

/* ---- toast --------------------------------------------------------------- */
let toastTimer;
export function toast(message, ms = 2200) {
  let node = $('#toast');
  if (!node) {
    node = el('<div id="toast" class="toast" role="status" aria-live="polite"></div>');
    document.body.appendChild(node);
  }
  node.textContent = message;
  requestAnimationFrame(() => node.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), ms);
}

/* ---- bottom sheet --------------------------------------------------------
   Presented from the bottom with a grabber, dismissed by the scrim, the close
   button, or Escape — the three ways an iOS sheet closes.                    */
export function openSheet({ title, body, action, accent = 'food', onAction }) {
  closeSheet();

  const scrim = el('<div class="scrim" aria-hidden="true"></div>');
  const sheet = el(`
    <div class="sheet" data-accent="${accent}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grabber"></div>
      <div class="sheet-head">
        <button class="btn btn-plain" data-close style="min-height:32px;padding:0;font-weight:400">Cancel</button>
        <div class="t-head">${esc(title)}</div>
        ${action
          ? `<button class="btn btn-plain" data-action style="min-height:32px;padding:0">${esc(action)}</button>`
          : '<div style="width:52px"></div>'}
      </div>
      <div class="sheet-body"></div>
    </div>`);

  sheet.querySelector('.sheet-body').append(body);
  document.body.append(scrim, sheet);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    scrim.classList.add('open');
    sheet.classList.add('open');
  });

  scrim.addEventListener('click', closeSheet);
  sheet.querySelector('[data-close]').addEventListener('click', closeSheet);
  const actionBtn = sheet.querySelector('[data-action]');
  if (actionBtn && onAction) actionBtn.addEventListener('click', () => onAction(sheet));

  document.addEventListener('keydown', escClose);
  return sheet;
}

function escClose(e) { if (e.key === 'Escape') closeSheet(); }

export function closeSheet() {
  document.removeEventListener('keydown', escClose);
  document.body.style.overflow = '';
  const sheet = $('.sheet');
  const scrim = $('.scrim');
  if (!sheet && !scrim) return;
  sheet?.classList.remove('open');
  scrim?.classList.remove('open');
  setTimeout(() => { sheet?.remove(); scrim?.remove(); }, 340);
}

/** Collapse the large title into the nav bar once the page scrolls. */
export function watchScroll(navbar) {
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 26);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

/** Left-swipe a row to reveal a delete action. */
export function swipeable(node, onDelete) {
  let startX = 0, startY = 0, dragging = false, decided = false;
  const content = node.querySelector('.swipe-content');

  node.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
    decided = false;
  }, { passive: true });

  node.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // Let a vertical drag scroll the page rather than fighting it.
    if (!decided) {
      if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
      decided = true;
    }
    if (dx < 0) content.style.transform = `translateX(${Math.max(dx, -84)}px)`;
  }, { passive: true });

  node.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    content.style.transform = '';
    const dx = e.changedTouches[0].clientX - startX;
    node.classList.toggle('open', dx < -40);
  });

  node.querySelector('.swipe-action')?.addEventListener('click', onDelete);
}
