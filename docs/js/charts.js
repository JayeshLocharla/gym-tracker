/**
 * Inline SVG charts. Deliberately single-series: the weight chart plots your
 * actual weight against a neutral dashed *reference* line (the pace target),
 * which is a rule, not a competing series. That keeps identity carried by the
 * legend and direct labels rather than by hue — which matters here because the
 * palette is intentionally muted and low-chroma.
 *
 * One y-axis, always. Weight and waist are different scales, so they are two
 * charts, never one with two axes.
 */

import { esc, fmt, shortDate } from './ui.js';

const PAD = { top: 16, right: 14, bottom: 22, left: 32 };

/**
 * @param series  [{week, value}] — the measured line
 * @param target  [{week, value}] — the reference rule, or null
 */
export function lineChart({
  series, target = null, height = 168, unit = '', label, targetLabel = 'Target pace',
  colour = 'var(--accent, var(--blue))', width = 320
}) {
  const points = series.filter((p) => p.value !== '' && p.value != null && !isNaN(Number(p.value)));

  if (points.length === 0) {
    return `<div class="empty" style="padding:28px 20px">
      No check-ins logged yet. The first one gives you a dot; the third gives you a trend.
    </div>`;
  }

  const all = [...points.map((p) => Number(p.value)), ...(target || []).map((p) => Number(p.value))];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || 1;
  lo -= span * 0.18;
  hi += span * 0.18;

  const weeks = [...points, ...(target || [])].map((p) => Number(p.week));
  const wLo = Math.min(...weeks);
  const wHi = Math.max(...weeks, wLo + 1);

  const iw = width - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const x = (w) => PAD.left + ((w - wLo) / (wHi - wLo)) * iw;
  const y = (v) => PAD.top + (1 - (Number(v) - lo) / (hi - lo)) * ih;

  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.week).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');

  // Four gridlines is enough on a phone; more is noise.
  const ticks = [0, 0.33, 0.66, 1].map((f) => lo + (hi - lo) * f);
  const last = points[points.length - 1];

  return `
    <figure style="margin:0">
      <svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"
           role="img" aria-label="${esc(label)} over time">
        ${ticks.map((t) => `
          <line class="chart-grid" x1="${PAD.left}" x2="${width - PAD.right}"
                y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
          <text class="chart-axis" x="${PAD.left - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end"
                >${fmt(t, 0)}</text>`).join('')}

        ${target ? `<path class="chart-target" d="${path(target)}"/>` : ''}

        <path class="chart-line" d="${path(points)}" style="stroke:${colour}"/>

        ${points.map((p) => `
          <circle class="chart-dot" cx="${x(p.week).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4"
                  style="fill:${colour}"/>`).join('')}

        <text class="chart-label" x="${Math.min(x(last.week) + 8, width - PAD.right - 2).toFixed(1)}"
              y="${(y(last.value) - 9).toFixed(1)}"
              text-anchor="${x(last.week) > width * 0.75 ? 'end' : 'start'}"
              style="fill:${colour}">${fmt(last.value, 1)}${unit}</text>

        <text class="chart-axis" x="${PAD.left}" y="${height - 6}">wk ${wLo}</text>
        <text class="chart-axis" x="${width - PAD.right}" y="${height - 6}" text-anchor="end">wk ${wHi}</text>
      </svg>
      <figcaption class="hstack gap-12" style="margin-top:4px;flex-wrap:wrap">
        <span class="hstack gap-4 t-cap">
          <svg width="14" height="8" aria-hidden="true"><line x1="1" y1="4" x2="13" y2="4"
            stroke="${colour}" stroke-width="2" stroke-linecap="round"/></svg>
          ${esc(label)}
        </span>
        ${target ? `<span class="hstack gap-4 t-cap">
          <svg width="14" height="8" aria-hidden="true"><line x1="1" y1="4" x2="13" y2="4"
            stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>
          ${esc(targetLabel)}
        </span>` : ''}
      </figcaption>
    </figure>`;
}

/**
 * Adherence at a glance — one cell per week. Status is carried by a letter as
 * well as a tint, so it survives colourblindness, greyscale and a bright gym.
 */
export function adherenceStrip(rows, totalWeeks) {
  const byWeek = {};
  for (const r of rows) byWeek[Number(r.week)] = r;

  const LETTER = { 'on-track': '✓', attention: '!', warning: '!!' };

  const cells = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const r = byWeek[w];
    const s = r?.verdict?.status;
    cells.push(`
      <div class="strip-cell" ${s ? `data-s="${s}"` : ''}
           title="Week ${w}${s ? ' — ' + s.replace('-', ' ') : ' — not logged'}">
        ${s ? LETTER[s] : w}
      </div>`);
  }

  return `
    <div class="strip">${cells.join('')}</div>
    <div class="hstack gap-12" style="margin-top:10px;flex-wrap:wrap">
      <span class="hstack gap-4 t-cap"><span class="strip-cell" data-s="on-track"
        style="width:16px;height:16px;font-size:9px">✓</span> On track</span>
      <span class="hstack gap-4 t-cap"><span class="strip-cell" data-s="attention"
        style="width:16px;height:16px;font-size:9px">!</span> Attention</span>
      <span class="hstack gap-4 t-cap"><span class="strip-cell" data-s="warning"
        style="width:16px;height:16px;font-size:9px">!!</span> Warning</span>
      <span class="hstack gap-4 t-cap"><span class="strip-cell"
        style="width:16px;height:16px;font-size:9px"></span> Not logged</span>
    </div>`;
}
