import {
  state, foodsRanked, addFood, deleteFood, saveFood, noteFoodUse
} from '../state.js';
import { esc, fmt, el, icons, openSheet, closeSheet, toast, swipeable, round } from '../ui.js';

/**
 * Two to ten entries a day for six months is roughly a thousand entries. The
 * only design that survives that is: tap the food, tap add. Everything else here
 * is in service of keeping it to two taps.
 */
export function renderFood() {
  const { plan, day } = state;
  const t = plan.targets;
  const entries = day?.nutrition || [];
  const totals = day?.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

  return `
    <div class="page" data-accent="food">
      ${totalsCard(totals, t)}
      <button class="btn btn-primary btn-full" data-add-food>
        ${icons.plus.replace('<svg', '<svg width="18" height="18"')} Add food
      </button>
      ${entriesList(entries)}
    </div>`;
}

function totalsCard(totals, t) {
  const rows = [
    { label: 'Calories', value: totals.kcal, target: t.kcal, unit: '' },
    { label: 'Protein', value: totals.protein, target: t.protein, unit: 'g', hero: true },
    { label: 'Carbs', value: totals.carbs, target: t.carbs, unit: 'g' },
    { label: 'Fat', value: totals.fat, target: t.fat, unit: 'g' },
    { label: 'Fibre', value: totals.fibre, target: t.fibre, unit: 'g' }
  ];

  return `
    <div class="list">
      ${rows.map((r) => {
        const pct = Math.min(r.value / r.target, 1);
        const over = r.value > r.target * 1.02;
        return `
        <div class="row" style="flex-direction:column;align-items:stretch;gap:7px;padding-top:13px;padding-bottom:13px">
          <div class="between">
            <span class="${r.hero ? 't-head' : 't-body'}">${r.label}</span>
            <span class="t-num" style="font-size:15px;color:${over ? 'var(--amber)' : 'var(--ink)'}">
              ${fmt(r.value, 0)}${r.unit}
              <span style="color:var(--ink-3);font-weight:500"> / ${fmt(r.target, 0)}${r.unit}</span>
            </span>
          </div>
          <div style="height:5px;background:var(--card-sunken);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${(pct * 100).toFixed(1)}%;border-radius:3px;
                        background:${over ? 'var(--amber)' : r.hero ? 'var(--sage)' : 'var(--clay)'};
                        transition:width 0.4s var(--ease)"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function entriesList(entries) {
  if (!entries.length) {
    return `
      <div>
        <div class="section-head">Today</div>
        <div class="card"><div class="empty">Nothing logged yet today.</div></div>
      </div>`;
  }

  return `
    <div>
      <div class="section-head">Today · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</div>
      <div class="list">
        ${entries.map((e) => `
          <div class="swipe" data-entry="${esc(e.id)}">
            <div class="swipe-action" role="button" tabindex="0" aria-label="Delete ${esc(e.name)}">Delete</div>
            <div class="swipe-content row">
              <div class="row-main">
                <div class="truncate">${esc(e.name)}</div>
                <div class="t-cap">
                  ${fmt(e.qty, 2).replace(/\.?0+$/, '')} × ${esc(e.unit)} ·
                  ${fmt(e.protein, 0)}g protein · ${fmt(e.carbs, 0)}g carbs · ${fmt(e.fat, 0)}g fat
                </div>
              </div>
              <div class="row-value t-num">${fmt(e.kcal, 0)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="t-cap" style="margin-top:8px;padding:0 4px">Swipe an entry left to delete it.</div>
    </div>`;
}

/* ---- the picker ---------------------------------------------------------- */

function openPicker(rerender) {
  const body = el(`
    <div>
      <div class="card" style="display:flex;align-items:center;gap:9px;padding:0 12px">
        <span style="color:var(--ink-3);display:flex">${icons.search}</span>
        <input id="food-search" class="input-block" placeholder="Search foods"
               style="background:none;padding-left:0" autocomplete="off" enterkeyhint="search">
      </div>
      <div id="food-results" class="list"></div>
      <button class="btn btn-tinted btn-full" id="new-food">Add a food that isn't listed</button>
    </div>`);

  const results = body.querySelector('#food-results');
  const search = body.querySelector('#food-search');

  const paint = () => {
    const q = search.value.trim().toLowerCase();
    const foods = foodsRanked().filter((f) => !q || String(f.name).toLowerCase().includes(q));

    if (!foods.length) {
      results.innerHTML = '<div class="empty">No match. Add it as a new food below.</div>';
      return;
    }
    results.innerHTML = foods.slice(0, 40).map((f) => `
      <button class="row tappable" data-food="${esc(f.name)}">
        <div class="row-main">
          <div>${esc(f.name)}</div>
          <div class="t-cap">
            per ${esc(f.unit)} · ${fmt(f.protein, 0)}g protein · ${fmt(f.fibre, 0)}g fibre
          </div>
        </div>
        <div class="row-value t-num">${fmt(f.kcal, 0)}</div>
      </button>`).join('');

    results.querySelectorAll('[data-food]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const food = foodsRanked().find((f) => f.name === btn.dataset.food);
        openQuantity(food, rerender);
      });
    });
  };

  search.addEventListener('input', paint);
  body.querySelector('#new-food').addEventListener('click', () => openNewFood(rerender));
  paint();

  openSheet({ title: 'Add food', body, accent: 'food' });
  // Deliberately not autofocusing: on iOS that throws the keyboard up over the
  // list, and most of the time the food you want is already in the top few.
}

function openQuantity(food, rerender) {
  const body = el(`
    <div>
      <div class="card card-pad">
        <div class="t-head">${esc(food.name)}</div>
        <div class="t-foot" style="margin-top:2px">
          ${fmt(food.kcal, 0)} kcal · ${fmt(food.protein, 1)}g protein ·
          ${fmt(food.carbs, 1)}g carbs · ${fmt(food.fat, 1)}g fat · ${fmt(food.fibre, 1)}g fibre
          <span class="dim">per ${esc(food.unit)}</span>
        </div>
      </div>

      <div class="card card-pad">
        <div class="between">
          <div>
            <div class="t-head">How much</div>
            <div class="t-cap">in units of ${esc(food.unit)}</div>
          </div>
          <div class="stepper">
            <button data-step="-1" aria-label="Less">−</button>
            <input id="qty" type="number" inputmode="decimal" step="0.25" min="0.25" value="1">
            <button data-step="1" aria-label="More">+</button>
          </div>
        </div>
        <div class="segmented" style="margin-top:12px">
          ${[0.5, 1, 1.5, 2, 3].map((q) => `<button data-qty="${q}" aria-pressed="${q === 1}">${q}×</button>`).join('')}
        </div>
      </div>

      <div class="card card-pad" style="background:var(--clay-soft);box-shadow:none">
        <div class="between">
          <span class="t-foot" style="color:var(--clay);font-weight:600">This adds</span>
          <span class="t-num" id="preview" style="color:var(--clay)"></span>
        </div>
      </div>
    </div>`);

  const qty = body.querySelector('#qty');
  const preview = body.querySelector('#preview');

  const paint = () => {
    const q = Math.max(Number(qty.value) || 0, 0);
    preview.textContent =
      `${fmt(food.kcal * q, 0)} kcal · ${fmt(food.protein * q, 0)}g protein`;
    body.querySelectorAll('[data-qty]').forEach((b) =>
      b.setAttribute('aria-pressed', String(Number(b.dataset.qty) === q)));
  };
  qty.addEventListener('input', paint);
  body.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    qty.value = Math.max(round(Number(qty.value) + Number(b.dataset.step) * 0.25, 2), 0.25);
    paint();
  }));
  body.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => {
    qty.value = b.dataset.qty;
    paint();
  }));
  paint();

  openSheet({
    title: 'Quantity',
    body,
    action: 'Add',
    accent: 'food',
    onAction: async (sheet) => {
      const btn = sheet.querySelector('[data-action]');
      btn.disabled = true;
      try {
        await addFood(food, Number(qty.value));
        noteFoodUse(food.name);
        closeSheet();
        rerender();
        toast(`${food.name} added`);
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }
  });
}

function openNewFood(rerender) {
  const fields = [
    ['name', 'Name', 'text', 'Chicken thigh'],
    ['unit', 'Unit', 'text', '100g'],
    ['kcal', 'Calories', 'decimal', '0'],
    ['protein', 'Protein (g)', 'decimal', '0'],
    ['carbs', 'Carbs (g)', 'decimal', '0'],
    ['fat', 'Fat (g)', 'decimal', '0'],
    ['fibre', 'Fibre (g)', 'decimal', '0']
  ];

  const body = el(`
    <div>
      <div class="list">
        ${fields.map(([k, label, type, ph]) => `
          <div class="field">
            <label for="nf-${k}">${label}</label>
            <input id="nf-${k}" name="${k}" placeholder="${ph}"
                   ${type === 'decimal' ? 'type="number" inputmode="decimal" step="any"' : 'type="text"'}>
          </div>`).join('')}
      </div>
      <div class="t-cap" style="padding:0 4px">
        Enter the numbers for one unit — whatever you typed above as the unit.
        It is saved to your library, so you only ever do this once per food.
      </div>
    </div>`);

  openSheet({
    title: 'New food',
    body,
    action: 'Save',
    accent: 'food',
    onAction: async (sheet) => {
      const get = (k) => body.querySelector(`#nf-${k}`).value.trim();
      if (!get('name')) return toast('Give it a name');
      if (!get('kcal')) return toast('Calories are needed');

      const food = {
        name: get('name'),
        unit: get('unit') || '1 serving',
        kcal: Number(get('kcal')) || 0,
        protein: Number(get('protein')) || 0,
        carbs: Number(get('carbs')) || 0,
        fat: Number(get('fat')) || 0,
        fibre: Number(get('fibre')) || 0
      };

      const btn = sheet.querySelector('[data-action]');
      btn.disabled = true;
      try {
        const res = await saveFood(food);
        if (!res.ok) { btn.disabled = false; return toast(res.error); }
        closeSheet();
        setTimeout(() => openQuantity(food, rerender), 360);
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }
  });
}

export function bindFood(root, rerender) {
  root.querySelector('[data-add-food]')?.addEventListener('click', () => openPicker(rerender));

  root.querySelectorAll('[data-entry]').forEach((node) => {
    swipeable(node, async () => {
      try {
        await deleteFood(node.dataset.entry);
        rerender();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

export { openPicker };
