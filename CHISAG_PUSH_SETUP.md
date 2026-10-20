# CHISAG — True Push Notifications (FCM) Setup Guide

This makes your phone buzz **even when the dashboard tab is closed or the phone is
locked** — not just while the page is open. It uses Firebase Cloud Messaging (FCM)
plus a tiny Cloud Function.

> The code is already written. You only fill in 3 values and run 2 commands.
> Works on Android and iPhone (iOS 16.4+ for home-screen web-push).

---

## What was added
- `firebase-messaging-sw.js` — background push handler (put in the dashboard's folder).
- `functions/index.js` + `functions/package.json` + `firebase.json` — the Cloud Function.
- The 3 dashboards now register this device's push token when you tap the 🔔 bell.

---

## Step 1 — Get 3 values from the Firebase console
Open https://console.firebase.google.com → your project **chisag-database**.

1. **Messaging Sender ID** — *Project settings* (gear icon) → **Cloud Messaging** tab →
   "Sender ID" (digits, e.g. `123456789012`).
2. **App ID** — *Project settings* → **Your apps** (under the web app) →
   "Firebase SDK snippet" → **Config** → `appId` (looks like `1:123456789012:web:abcDEF...`).
3. **VAPID key** — *Project settings* → **Cloud Messaging** → **Web Push certificates** →
   click **Generate key pair**, then copy the key string.

---

## Step 2 — Paste them into the files

### A. The 3 dashboards (SYNC BUILD, Blended, Microsoft Only)
Find this block in each file and replace the three `PASTE_...` placeholders:

```js
messagingSenderId: "PASTE_YOUR_FCM_SENDER_ID",   // -> your Sender ID
appId:            "PASTE_YOUR_APP_ID",            // -> your App ID
vapidKey:         "PASTE_YOUR_VAPID_KEY",         // -> your VAPID key
```

### B. The service worker `firebase-messaging-sw.js`
Replace the same two placeholders near the top:

```js
messagingSenderId: "PASTE_YOUR_FCM_SENDER_ID",
appId:            "PASTE_YOUR_APP_ID"
```

### C. The Cloud Function `functions/index.js`
Edit `DASHBOARD_URL` (line near the top) to the **live** GitHub Pages URL of the
dashboard you open on your phone, e.g.

```
https://YOUR-USER.github.io/YOUR-REPO/CHISAG%20REGISTRATION/CHISAG%20DATABASE%20-%20SYNC%20BUILD.html
```

---

## Step 3 — Allow the notification link (authorized domains)
In the Firebase console → **Authentication** → **Settings** → **Authorized domains**,
add your GitHub Pages domain (e.g. `YOUR-USER.github.io`). This lets the notification
tap open the dashboard.

---

## Step 4 — Make sure the database accepts device tokens
The dashboard writes each phone's token to `/chisag-fcm-tokens/{token}`.
Your Realtime Database rules must allow writes there. If your rules are already
open (read/write `true`), you're done. Otherwise add:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

(Set this in *Realtime Database* → *Rules* → *Publish*.)
The Cloud Function reads those tokens using the Admin SDK, so it works regardless of rules.

---

## Step 5 — Install the Firebase CLI and deploy the function
On your computer (needs Node.js):

```bash
npm install -g firebase-tools
firebase login
cd "CHISAG REGISTRATION"        # the folder with firebase.json
firebase use --add               # pick project chisag-database, give it an alias
cd functions
npm install
cd ..
firebase deploy --only functions
```

Wait for "✔ Deploy complete!". That's it — the function is live.

> **Plan note:** Cloud Functions (1st gen, as used here) work on the free **Spark**
> plan for internal Google calls (FCM + Realtime DB). If you ever see a quota error,
> switch the project to the **Blaze** plan — the free tier still covers normal use.

---

## Step 6 — Publish & turn it on
1. Re-publish **all** files to GitHub Pages: the 3 dashboards, `favicon.svg`,
   **and `firebase-messaging-sw.js`** (the service worker must sit in the same folder
   as the dashboard HTML so the browser can find it).
2. Open the dashboard on your phone, tap the **🔔 bell**, allow notifications.
3. Submit a test form from the questionnaire — your phone should buzz, even with the
   tab closed.

---

## How it fits together
```
Student submits (questionnaire / Google Form / Microsoft)
        │  (written to /chisag-2026-submissions)
        ▼
Cloud Function  notifyOnSubmission()
        │  reads /chisag-fcm-tokens  (your phone's token)
        ▼
FCM push  ──►  your phone  (shows "New CHISAG submission: NAME (ID)")
                    │ tap
                    ▼
              opens DASHBOARD_URL
```

## Troubleshooting
- **No buzz when closed, but buzzes when open** → service worker not found. Confirm
  `firebase-messaging-sw.js` is published in the **same folder** as the dashboard HTML
  and that `messagingSenderId`/`appId`/`vapidKey` are filled in both the dashboard and the SW.
- **"permission denied" on the bell** → re-enable Notifications in the browser's
  site settings for the GitHub Pages URL.
- **Function deploy fails** → run `firebase login` again and `firebase use --add`;
  ensure `functions/` has `package.json` and you ran `npm install` inside it.
- **Tokens never appear** → check RTDB rules allow writes to `/chisag-fcm-tokens`
  (Step 4).
