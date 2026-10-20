# CHISAG — Questionnaire Auto-Fill Setup (Phase 2)

This connects a **Google Form** (students submit their name, ID, photo, level)
to your CHISAG HTML system so new members appear automatically — while the
executives keep control of dues, souvenirs, DOB and email.

---

## 1. Build the Google Form

Create a form with these questions (titles matter — they become the column
headers the script reads):

| Question | Type | Notes |
|---|---|---|
| `Index ID` | Short answer | e.g. `27177` |
| `Surname` | Short answer | |
| `Other Names` | Short answer | |
| `Level` | Dropdown | `100`, `200`, `300`, `400` |
| `Upload your picture` | File upload | limit to **1 file**, allow JPG/PNG |

> Tip: keep the question titles exactly as above so the defaults in the HTML
> (`SYNC_CONFIG.fieldMap`) work without edits. If you rename them, update the
> map to match.

## 2. Link the form to a Sheet

Form → **Responses** → **Link to Sheets**. This creates the response Sheet the
script will read.

## 3. Install the Apps Script

1. Open that response Sheet → **Extensions → Apps Script**.
2. Delete the placeholder, paste the contents of **`CHISAG_SYNC_CODE.gs`**.
3. Change `SECRET` (top of the file) to a word you choose.
4. In the HTML (`CHISAG DATABASE - SYNC BUILD.html`), open `SYNC_CONFIG` and
   set `key` to the **same** word.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then **copy the Web App URL**.
6. Paste that URL into `SYNC_CONFIG.webAppUrl` in the HTML.

> First time it runs you'll be asked to grant Drive access (needed to read the
> uploaded photos). Approve it.

## 4. Match the field map (only if you renamed questions)

In `SYNC_CONFIG.fieldMap` inside the HTML:

```js
fieldMap: {
  id: "Index ID",
  surname: "Surname",
  otherNames: "Other Names",
  level: "Level"
}
```

The keys on the left are fixed (internal). The values on the right must equal
your **exact form question titles**.

## 4b. Sync options (in `SYNC_CONFIG`, HTML)

```js
photoColumn: "Upload your picture",  // exact title of the photo question
useMasterNames: true,               // use the official name from the master table
allowUnknownIds: false              // false = reject IDs not in master (recommended)
```

- **Extra form questions are fine.** The script returns every column, but the
  HTML only reads the 4 fields in `fieldMap`. Add as many extra questions as you
  like — they're ignored by the sync. Just keep the 4 core titles stable and set
  `photoColumn` to your real photo question so a different "upload/___" question
  can't be mistaken for it.

## Master name lookup (recommended)

Typos and omitted names are the biggest risk when students type their own
details. To avoid that, the system can hold an **authoritative** list of
`Index ID → correct name` and use THAT instead of what the student typed.

- The list lives in **`CHISAG_MASTER_NAMES.js`** (a companion file next to the
  HTML). It was generated from your `2025 CHISAG DATABASE.xlsx` as a starting
  point (278 entries).
- When a submission arrives, the system matches the **Index ID** against the
  master:
  - **ID found →** the official name + level from the master are used; the
    student's typed name is ignored. (Fixes typos and missing names.)
  - **ID NOT found →** behaviour depends on `allowUnknownIds`:
    - `false` (default, recommended): the submission is **rejected** ("ID not in
      master") — only registered members can populate the system. This also
      catches students who mistype their own Index ID.
    - `true`: the submission is accepted using the name the student typed, and
      the record is flagged `verified: false` for manual review.

### Keep the master current
The 2025 list is only a starter. To regenerate it from the **current official
registry** (an Excel with Index ID / Surname / Other Names / Level columns),
ask me to re-run the generator, or replace `CHISAG_MASTER_NAMES.js` yourself —
its format is `window.MASTER_NAMES = { "12345": { s:"SURNAME", o:"OTHER", l:"100" }, ... };`.

> Note: the master file must sit in the **same folder** as the HTML (it loads
> via `<script src>`). If you move the HTML, move the master file too.

## 5. Run it

1. Open `CHISAG DATABASE - SYNC BUILD.html` in Chrome/Edge.
2. Click the small **(ℹ) Test** button next to **Sync Form**. It should report:
   - **Sheet name** — the response sheet the script found
   - **Response rows** — how many submissions exist
   - **Headers** — column names like `Index ID`, `Surname`, `Other Names`, etc.
   - **Sample row** — the first row's Index ID and photo flag
   If this looks right, the script is reading the correct sheet.
3. Click **Sync Form** (or just wait — it auto-checks every 20s).
4. Submit a test response in the form. Within ~20s the student appears in the
   system with their photo. Exec-entered fields are untouched.

> If you edit `CHISAG_SYNC_CODE.gs` later, you must create a **new deployment**
> (Deploy → New deployment) and update `SYNC_CONFIG.webAppUrl` with the new URL.
> Old deployments do not pick up code changes automatically.

---

## How the data flows

```
Student fills Form
   → Google Sheet (1 row per submission)
   → Apps Script:  (a) Web App JSON   ← polling every 20s (fallback)
                   (b) onFormSubmit → Firebase RTDB  ← instant push
   → open HTML merges by Index ID, fills ONLY name/id/photo/level
   → saved to IndexedDB + rendered
```

## Safety rules built in

- **Non-destructive merge:** only `name`, `id`, `photo`, `level` come from the
  form. Dues, souvenirs, DOB, email are **never** overwritten by a sync.
- **Idempotent:** syncing the same response twice does nothing harmful.
- **Access token:** the `key`/`SECRET` stops random people from pulling your
  roster. (The endpoint is still reachable by URL + key, so don't share the
  file widely.)

## Notes & limits

- **Not 100% offline.** The file is local, but to receive live data it must be
  online. Already-synced data keeps working offline.
- **"Real-time" = ~20s (polling) or instant (Firebase).** Out of the box it polls
  every 20s. Enable `SYNC_CONFIG.firebase` (see §6) for zero-delay push; polling
  then stays only as a fallback.
- **Apps Script quota:** fine for a club's traffic; if you ever poll every
  second you could hit daily limits. 20s is safe.
- Photos are fetched **one at a time, on demand** (only for students missing a
  photo), so polling stays light even with hundreds of members.

## 6. Firebase instant-push (optional upgrade)

Want the student to show up the **instant** they hit submit (no ~20s wait)?
Add a Firebase Realtime Database. The Apps Script then pushes each submission the
moment it arrives, and the open HTML updates with zero delay. Polling stays as a
fallback.

### 6.1 Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** (free).
2. Build → **Realtime Database** → **Create Database** → choose a region.
3. In the **Rules** tab, paste (open to anyone who knows the path; the path itself
   is the secret, and every node is stamped with your `SECRET`):
   ```json
   {
     "rules": {
       "chisag-2026-submissions": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
   For tighter security, set `".write": "auth != null"` and put your legacy
   database secret in `RTDB_SECRET` in the `.gs` (used as `?auth=SECRET`).

### 6.2 Get the config
- Project settings → **Your apps → Web app** → copy the **apiKey** and the
  **Database URL** (looks like `https://xxxx.firebaseio.com`).

### 6.3 Wire the Apps Script
1. In `CHISAG_SYNC_CODE.gs`, set `RTDB_URL` to your Database URL and keep
   `RTDB_PATH` = `chisag-2026-submissions` (must equal `firebase.path` in the HTML).
2. **Edit → Triggers → + Add trigger**:
   - Choose which function to run: `onFormSubmit`
   - Event source: **From spreadsheet**
   - Event type: **On form submit**
   - Save (grant the needed permissions).
3. Re-deploy the web app (Deploy → New deployment) so the new code is live.

### 6.4 Wire the HTML
In `SYNC_CONFIG.firebase`:
```js
firebase: {
  enabled: true,
  apiKey: "....",                       // from Firebase web app
  databaseURL: "https://xxxx.firebaseio.com",
  path: "chisag-2026-submissions",      // matches RTDB_PATH
  key: "chisag-2026"                    // must equal SECRET in the .gs
}
```
Open the HTML — the status shows **"Live (push) — waiting for submissions"**.
Submit a response: it appears immediately.

### How push mode differs
- The page does **not** poll. Instead it listens (`child_added`) on the Firebase
  path; each new node is processed by the same non-destructive `processSubmission`
  (master lookup, photo, dedup by row).
- `syncedRows` (saved in IndexedDB) stops the same submission being counted twice
  if Firebase replays history on reload.
- If Firebase isn't configured or the SDK is offline, it silently falls back to
  the 20s poll — no breakage.

---

## 7. Troubleshooting

### "Sync complete: 0 new students" but the Sheet has rows
1. Click the **(ℹ) Test** button. If it shows the **wrong sheet** or **0 rows**,
   the Apps Script was reading the wrong sheet. The latest `CHISAG_SYNC_CODE.gs`
   auto-finds the sheet with an `Index ID` column; redeploy it (see §5 note).
2. If the Test shows the correct sheet and rows, check the sample row's `Index ID`.
   - If it says `none`, the `Index ID` column header is misspelled/capitalised
     differently from `SYNC_CONFIG.fieldMap.id`.
   - If it shows an ID, that ID may not be in `CHISAG_MASTER_NAMES.js`. The
     default `allowUnknownIds: false` rejects unknown IDs. Either add the ID to
     the master or set `allowUnknownIds: true` to accept typed names temporarily.

### "Sync failed: Unexpected response from server"
The script returned an error object instead of rows. Click **(ℹ) Test** to read
the exact error message (e.g. wrong key, no response sheet, Drive permission
needed).

### "Sync error — check link/connection"
- The web app URL may be the `/dev` test URL (owner-only) instead of `/exec`.
  Use the `/exec` URL from Deploy → Manage deployments.
- The browser may be offline. Already-synced data still works offline, but new
  syncs need internet.

### Photo does not appear
- The photo question title must match `PHOTO_COLUMN` in the Apps Script exactly
  (`Upload your picture` by default).
- The first time the script runs you must grant **Drive read access** so it can
  fetch uploaded files. If denied, re-deploy and re-authorise.
