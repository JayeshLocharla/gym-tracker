# Transform

A six-month training and nutrition app for one person, built from
`gym_and_nutrition_plan.xlsx`. Static site on GitHub Pages, data in Google
Sheets through an Apps Script web app.

The workbook it came from is complete and well-argued — and it is a spreadsheet,
which nobody opens on a phone between sets. This turns it into something you can
answer in one tap at the moments it actually gets abandoned: standing at the
rack, at 9pm deciding what to eat, on the Sunday after a bad weekend.

---

## What it does

- **Today** — the session, macro rings showing what is *left*, the weekend
  calorie bank, and the phase you are in.
- **Train** — every exercise with this week's load off the ramp, two equipment
  substitutes, the coaching note, and one tick. No set-by-set logging.
- **Food** — a saved library; adding a meal is two taps. Pre-loaded with the
  workbook's ranked high-protein foods and the staples from its example day.
- **Progress** — the weekly check-in with gym days, calories and protein
  pre-filled from what you already logged. Weight and waist trends, adherence
  strip, and the workbook's own advice keyed to what you actually missed.
- **Plan** — the reasoning: the split, the milestones, what breaks if you skip
  an input, the micronutrients. The content that gets you to week fourteen.

Twelve-week blocks with a deload in week 9. At week 13 it proposes new baselines
(your week-12 loads) for you to confirm, and the ramp starts again — which is
what the workbook's Milestones tab says to do by hand.

## Setup

1. **Backend** — follow [`apps-script/README.md`](apps-script/README.md).
   Fifteen minutes, once.
2. **Site** — in this repo, *Settings → Pages → Source: Deploy from a branch*,
   branch `main`, folder **`/docs`**.
3. Open the Pages URL on your phone, paste the web app URL and token, connect.
4. **Share → Add to Home Screen** for a fullscreen icon. This is free and needs
   no Apple developer account — that is only for App Store apps. This stays a
   website.

## Layout

```
docs/                    the site — no build step, plain ES modules
  index.html
  css/app.css            design tokens and iOS-style components
  js/api.js              Apps Script client
  js/state.js            the store
  js/ui.js               shared helpers, sheets, rings
  js/charts.js           inline SVG charts
  js/views/              today · train · food · progress · plan
apps-script/             the backend, one file per concern
  Setup.gs               setupWorkbook() — builds and seeds every tab
  Seed.gs                the workbook, transcribed
  Compute.gs             every derived number, and nowhere else
  Code.gs                web app entry point and API
  Sheets.gs              tab access and date handling
tools/
  test-compute.mjs       asserts the maths against the workbook's own numbers
  mock-api.mjs           local server — real logic, in-memory storage
  screenshot.mjs         drives every screen at iPhone size
```

## Working on it

```bash
node tools/test-compute.mjs                          # 346 assertions
node tools/mock-api.mjs --week 6 --seed-logs         # http://localhost:8080
node tools/screenshot.mjs                            # screenshots/
```

The mock server loads the real `Seed.gs` and `Compute.gs`, so local development
runs the actual plan data and the actual maths — only the storage differs.
`--week N` previews any week of the six months, including the week-9 deload and
the week-13 block rollover.

## Two things that will bite

**Apps Script and CORS.** Apps Script cannot answer a CORS preflight. Every POST
goes out as `text/plain` with a JSON string body, which keeps it a "simple
request" so no preflight is sent. Change it to `application/json` and every write
fails. Both halves are commented — `docs/js/api.js` and `apps-script/Code.gs`.

**Derived numbers live in one place.** BMR, macros, ramp loads, the weekend bank
and the check-in verdicts are computed in `Compute.gs` and returned as JSON. The
Sheet holds inputs and logs and deliberately has no formulas, so there is no
second implementation to drift. `tools/test-compute.mjs` pins those functions to
the workbook's published values — all 276 cells of the weight ramp included.

## Security

The web app is deployed "Anyone with the link" because that is what makes a
cross-origin call work at all. A 40-character token guards it, compared in
constant time, entered once and stored only on your phone. Neither the URL nor
the token is in this repo.

This stops someone who stumbles on the endpoint. It is not defence against
someone holding your unlocked phone.
