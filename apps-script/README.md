# Deploying the backend

Fifteen minutes, once. After this you never open the Apps Script editor again.

---

## 1. Create the spreadsheet

1. Go to [sheets.new](https://sheets.new).
2. Name it something you will recognise — `Transform` is fine.

Keep this tab open; the script lives inside this spreadsheet.

## 2. Add the script

1. **Extensions → Apps Script**. An editor opens with an empty `Code.gs`.
2. Delete everything in that file.
3. Create the five files below and paste the matching contents from this folder.
   Use the **+** next to *Files* → *Script* for each one. Apps Script adds the
   `.gs` extension itself, so type the name without it.

   | File to create | Paste from |
   |---|---|
   | `Code` | `apps-script/Code.gs` |
   | `Compute` | `apps-script/Compute.gs` |
   | `Seed` | `apps-script/Seed.gs` |
   | `Setup` | `apps-script/Setup.gs` |
   | `Sheets` | `apps-script/Sheets.gs` |

4. Save (⌘S / Ctrl+S).

## 3. Build the tabs

1. In the function dropdown at the top, choose **`setupWorkbook`**.
2. Click **Run**.
3. Google asks for authorisation the first time. Choose your account →
   *Advanced* → *Go to … (unsafe)* → *Allow*. It says "unsafe" because the script
   is unpublished and yours; it is the standard flow for a personal Apps Script.
4. When it finishes, open **View → Logs** (or the Execution log panel).
   It prints your **APP_TOKEN**. Copy it somewhere for a minute.

Go back to the spreadsheet tab. Every tab should now exist and be populated:
`Config`, `WeightRamp`, `Days`, `Exercises`, `Foods`, `Split`, `Volume`,
`Nutrients`, `Milestones`, `Warnings`, `Guide`, plus three empty log tabs.

`setupWorkbook` never overwrites a tab that already has content, so re-running
it later is safe.

## 4. Deploy the web app

1. **Deploy → New deployment**.
2. Click the gear next to *Select type* → **Web app**.
3. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. **Deploy**, then copy the **Web app URL**. It ends in `/exec`.

> **"Anyone" sounds alarming, and it is the correct setting.** It is what allows
> a browser on a different domain (your GitHub Pages site) to call the endpoint at
> all. Any stricter setting makes Google answer with an HTML login page that the
> app cannot use. What actually protects your data is the token: without it every
> request is rejected. Anyone who finds the URL alone gets nothing.

## 5. Connect the app

Open your GitHub Pages URL on your phone, paste the **web app URL** and the
**token**, and tap Connect. Both are stored only on that phone.

Then **Share → Add to Home Screen** to get an icon that opens fullscreen.

---

## When something goes wrong

| What you see | What it is |
|---|---|
| "Got a Google sign-in page instead of data" | The deployment is not set to *Who has access: Anyone*. Re-deploy with that setting. |
| "That token was rejected" | Wrong token. Run `generateToken()` from the editor to print it again — note this **replaces** the old one, so re-enter it in the app. |
| "Could not reach the server" | No connection, or the URL is wrong. It must end in `/exec`, not `/dev`. |
| `Missing tab "…"` | `setupWorkbook()` has not been run, or a tab was renamed. |
| Ticks and meals save, but nothing appears | You are looking at a different spreadsheet than the script is bound to. The script lives *inside* one specific sheet. |

**After editing the script**, changes do not go live until you
**Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**.
This keeps the same URL. Creating a *new deployment* instead gives you a new URL
and you would have to reconnect the app.

---

## Changing the plan later

Everything is in the Sheet — edit it there, no code changes:

- **Swap an exercise** — edit the `Exercises` tab. `alt1` is the machine/cable
  version, `alt2` the dumbbell/bodyweight one.
- **Correct a starting weight** — change `baseline` in `WeightRamp`. The whole
  12-week ramp for that lift re-paces off it.
- **Change your bodyweight or targets** — the app's Plan → Settings screen, or
  the `Config` tab directly. Every calorie and macro number is a formula off it.
- **Add a food permanently** — the `Foods` tab, or "add a food that isn't listed"
  in the app.

After editing the Sheet by hand, bump `planVersion` in `Config` so the phone
drops its cached copy. (Edits made through the app do this automatically.)

## Quota

Consumer Google accounts get roughly 90 minutes of Apps Script runtime per day.
A heavy day in this app — a full session, ten meals, a check-in — is a few
seconds. There is no realistic way for one person to hit the limit.
