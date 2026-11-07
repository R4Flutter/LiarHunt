# Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sign-in, renames and Case files, and add the season countdown, player setup (name + face), the season ladder with its leaderboard, an 8-friend list, the Daily 5 season-town workflow and royalty-free audio.

**Architecture:**
- Pure rules (LP maths, league marks, season clock, faces, browser detection, rename rule) go into `js/engine.js` on `WL`, so the game, the checker and the Firestore rules tests share one source.
- Firestore access goes into `js/leaderboard.js` as `LB.ladder` and `LB.friends`, each with a `?lb=demo` branch.
- Screens go into `js/game.js`.
- The rules enforce every LP change incrementally from the player's own posted `scores` doc.

**Tech Stack:** vanilla JS (no build step), Firebase compat SDK 10.12.2, Firestore rules v2, Node 18+ checkers run in `node:vm`, `@firebase/rules-unit-testing` on the emulator (Java 17), ffmpeg for audio.

**Spec:** `docs/superpowers/specs/2026-11-07-polish-pass-design.md`

## Global Constraints

- No server, no Cloud Functions, no new runtime dependencies in the game. Web-only markup goes between `<!-- WEB-ONLY:START -->` / `<!-- WEB-ONLY:END -->`.
- Released content stays frozen: Dailies #1–14, Book 1 answers (`tools/book1-lock.json`), any started Daily 5 day.
- Level XP never goes down. LP is separate.
- LP table: perfect `g` +30, helped `y` +20, wrong `r` at case 1/2/3/4/5 = −50/−40/−30/−20/−10, nothing lost in Bronze (tier 0), LP ≥ 0.
- League marks: Bronze 0 · Silver 400 · Gold 1000 · Platinum 1800 · Diamond 2800. Season-end coins: 100 / 250 / 500 / 1000 / 2000.
- Season N runs Daily `15 + 28(N−1)` to `42 + 28(N−1)`. The day turns over at midnight IST.
- Copy: short, plain English, second person. Works at 375 px, at 800×450, in light and dark mode, and with reduced motion.
- After every task, `node tools/check-cases.mjs`, `node tools/check-book.mjs`, `node tools/check-social.mjs` (from Task 2 on) and `cd tools/daily5 && node check.mjs --self-test` all pass.
- Never deploy Firestore rules, never push (a push to `main` deploys), never commit drafts, keys or API keys. Commit on the current branch `season-1-and-audit-fixes`.
- UI checks use the preview server `game` from `.claude/launch.json` (port 8123): `http://localhost:8123/index.html?test=1&lb=demo`, plus `&today=N` to pretend it's Daily #N. `window.__WLtest` exposes `state()`, `persist()`, `hq()`, `train()`, `daily()`, `rush()`.

## Review Focus

1. **Old saves:** a save from before this work (with `S.inv.key`, `S.league`, `S.lb.season`, a name changed many times, no face) must load without errors. Keys convert once, the face stays as it was, and the player gets one rename. Tests in Tasks 3, 4 and 6.
2. **Midnight IST and the season boundary:** a Daily finished after midnight posts to the day it was played and to that day's season (`WL.seasonOf(run.day)`), never the current `SEASON`. Days 42→43 cross from Season 1 to 2. Tests in Tasks 5 and 7.
3. **Ladder write fails** (offline, rules refuse, the Daily was played before the ladder shipped): the Daily results screen still shows, the rank card offers "Try again", and nothing is lost. Check in Task 8.
4. **Friend code input:** lowercase, spaces, your own code, an unknown code, someone already a friend, a full list. Each gets a plain message and nothing breaks. Check in Task 10.
5. **CrazyGames build:** no Firebase. The season card shows the countdown with no league, the setup screen shows only the face picker, and nothing calls `LB`. Check in Task 6.

---

### Task 1: Commit the earlier session's work

**Files:** everything already modified or untracked except `.audit-tmp/`.

- [ ] **Step 1: Run every checker on the current tree**

Run: `node tools/check-cases.mjs && node tools/check-book.mjs && cd tools/daily5 && node check.mjs --self-test`
Expected: each ends without `✗` lines and exits 0. If one fails, stop and report it; don't fix it inside this commit.

- [ ] **Step 2: Commit it as its own change**

```bash
git add css/style.css firebase/firestore.rules index.html js/config.js js/engine.js js/game.js js/leaderboard.js privacy.html tools/daily5 docs
git commit -m "Add Partners and Story Night rooms, Google Analytics, and the polish-pass design"
```

---

### Task 2: Google Sign-In: in-app browsers and the README

**Files:**
- Modify: `js/engine.js` (add `inAppBrowser`, export on `WL`)
- Modify: `js/game.js` `signInGoogle()` (~line 3737) and the profile account box `renderAccount()`
- Modify: `README.md` section 4, step 2
- Create: `tools/check-social.mjs`

**Interfaces:**
- Produces: `WL.inAppBrowser(ua: string) -> "" | "whatsapp" | "instagram" | "facebook" | "snapchat" | "line" | "tiktok" | "webview"`
- Produces: `tools/check-social.mjs`. It loads `js/config.js`, `js/cases.js`, `js/seasons.js`, `js/book1.js`, `js/engine.js` and `js/progress.js` into a `node:vm` context (copy the context set-up from `tools/check-cases.mjs`), and exposes:
  - `ctx`, `WL`
  - `eq(name, got, want)`: deep-equal through `JSON.stringify`, prints ✓/✗, counts failures
  - `sha(s)`: the first 16 hex characters of sha256

  It exits 1 on any failure. Later tasks append to it.

- [ ] **Step 1: Write the failing test** in `tools/check-social.mjs`

```js
const UA = {
  wa: "Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 WhatsApp/2.23.20",
  ig: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0",
  fb: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]",
  wv: "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desk: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
};
eq("whatsapp", WL.inAppBrowser(UA.wa), "whatsapp");
eq("instagram", WL.inAppBrowser(UA.ig), "instagram");
eq("facebook", WL.inAppBrowser(UA.fb), "facebook");
eq("android webview", WL.inAppBrowser(UA.wv), "webview");
eq("chrome", WL.inAppBrowser(UA.chrome), "");
eq("safari", WL.inAppBrowser(UA.safari), "");
eq("desktop", WL.inAppBrowser(UA.desk), "");
```

- [ ] **Step 2: Run it**

Run: `node tools/check-social.mjs`
Expected: FAIL (`WL.inAppBrowser is not a function`).

- [ ] **Step 3: Implement `inAppBrowser(ua)` in `js/engine.js`**

Check named apps first (`WhatsApp`, `Instagram`, `FBAN|FBAV|FB_IAB`, `Snapchat`, `Line/`, `musical_ly|TikTok|BytedanceWebview`), then `; wv)` → `"webview"`. Export it on `WL`.

- [ ] **Step 4: Use it in `signInGoogle()`**

Before any popup, if `WL.inAppBrowser(navigator.userAgent)` is non-empty, show `showNotice` instead of signing in:
- icon "🔒", title "Open in your browser to sign in"
- text "Google doesn't allow sign-in inside this app's browser. Open LiarHunt in Chrome or Safari, then sign in there. Your progress comes with you."
- yes "Copy link": copies `CFG.siteUrl`, toast "Link copied. Paste it into Chrome or Safari."
- On Android only, a second button "Open in Chrome" that goes to `intent://` + host + path + `#Intent;scheme=https;package=com.android.chrome;end`
- no "Not now"

- [ ] **Step 5: Fix README §4 step 2.** Replace "(`localhost` is there already)" with: add `liarhunt.com`, `www.liarhunt.com` and `localhost`, because the project only lists the firebaseapp.com and web.app domains.

- [ ] **Step 6: Verify**

Run: `node tools/check-social.mjs`. Expected: all ✓, exit 0.
Then preview `?test=1&lb=demo`, open Profile → Sign in with Google. Expected: demo sign-in still works (toast "Signed in…").

- [ ] **Step 7: Commit**

```bash
git add js/engine.js js/game.js README.md tools/check-social.mjs
git commit -m "Tell players in WhatsApp and Instagram browsers to open Chrome or Safari to sign in"
```

---

### Task 3: A name can change only once

**Files:**
- Modify: `js/engine.js` (add `nameRule`)
- Modify: `js/game.js` `saveName()` (~2258), `renderProfile()` (~2237), `askName()` (~2398)
- Test: `tools/check-social.mjs`

**Interfaces:**
- Produces: `WL.nameRule(settings: {playerName?, nameChanges?}) -> { canChange: boolean, changesLeft: 0 | 1 }`
- Produces: save field `S.settings.nameChanges: number` (missing = 0)

- [ ] **Step 1: Failing tests**

```js
eq("no name yet", WL.nameRule({}), { canChange: true, changesLeft: 1 });
eq("named, unused", WL.nameRule({ playerName: "Raj" }), { canChange: true, changesLeft: 1 });
eq("named, used", WL.nameRule({ playerName: "Raj", nameChanges: 1 }), { canChange: false, changesLeft: 0 });
eq("old save renamed often", WL.nameRule({ playerName: "Raj", nameChanges: undefined }), { canChange: true, changesLeft: 1 });
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**
- `nameRule`, exported on `WL`.
- In `saveName`: when the player already has a name and `!WL.nameRule(S.settings).canChange`, show the error "You've used your one name change." and return false. On a real change (not the first name), `S.settings.nameChanges = (S.settings.nameChanges || 0) + 1`.
- In `renderProfile` (web): note "You can change your name once." when `changesLeft === 1` and a name exists. When it's 0, disable `#pf-input`, hide `#pf-save` and show the note "Name locked."
- In `askName`: drop the "Change your name" title (now only reached without a name).

- [ ] **Step 4: Verify**

Run `node tools/check-social.mjs`: all ✓.
Then preview `?test=1&lb=demo`: set name "Alpha" in Profile, change it to "Bravo" (accepted), then try "Charlie". Expected: the field is disabled and the profile shows "Name locked."

- [ ] **Step 5: Commit**

```bash
git add js/engine.js js/game.js tools/check-social.mjs
git commit -m "Let players change their name only once"
```

---

### Task 4: Remove Case files and Case Keys

**Files:**
- Modify: `js/progress.js`: `ITEMS` (drop `key1`, `key3`), `LOGIN[6]`, `streakDay`, `COMEBACK`, `bookSolved` (`items` drops `key`), `ensure()` default `S.inv`
- Modify: `js/game.js`:
  - delete the case files section (`openFiles`, `renderFiles`, `filesStories`, unlock, the `#files-list` / `#files-more` listeners, ~2893–2963)
  - `catchup` paths in `progressFor`/`startDaily`/`finishDaily`/`showDailyResults`
  - the "Back to case files" button (~2003)
  - key lines in the login and rewards UI (~562, 572, 591, 605, 2652)
  - `btn-files` wiring (~3944) and `files:` in `__WLtest`
- Modify: `index.html`: remove `#btn-files` and `#scr-files`
- Modify: `css/style.css`: drop `.files*` / `.key-ico` rules
- Test: `tools/check-social.mjs`

**Interfaces:**
- Produces: `ensure()` converts held keys once. It adds `120 × S.inv.key` coins, deletes `S.inv.key` and sets `S.keysRetired = <coins added>` (0 if none). The game shows the toast "Case Keys are retired: you got N coins." once, then sets it to 0.
- Keeps: `startDaily(day, "practice")` for replaying a past day from a challenge link (no rewards).

- [ ] **Step 1: Failing tests**

```js
const P = ctx.WLP;
const old = P.init({ coins: 10, inv: { key: 3, magnifier: 1 } }, {});
eq("keys become coins", [old.coins, old.inv.key, old.keysRetired], [370, undefined, 360]);
eq("only once", P.init(old, {}).coins, 370); // ensure() sets keysRetired only when it converts; the game zeroes it after the toast
eq("new player has no keys", P.init({}, {}).inv.key, undefined);
eq("shop sells no keys", Object.keys(P.ITEMS).filter((k) => /^key/.test(k)), []);
eq("login day 7", [P.LOGIN[6].key, P.LOGIN[6].coins], [undefined, 250]);
eq("comeback", [P.COMEBACK.key, P.COMEBACK.coins], [undefined, 250]);
P.init({}, {});
eq("7-day streak", P.streakDay(7), { shield: 1, coins: 100 });
eq("old-shape save loads", typeof P.init({ inv: { key: 1 }, league: { week: 2, tier: 1 }, lb: { season: { s: 1 } } }, {}).coins, "number");
```

`streakDay` must grant coins through `grant()`, so `grant` needs to handle `reward.coins` (check it does).

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement the progress.js changes, then the game.js/index.html/css removals.**

`grep -nE "files|catchup|Case Key|inv\.key|🔑" js/*.js index.html css/style.css` must return nothing except the line in `ensure()` that does the conversion and the `S.catchups` default, which can stay so old saves load.

- [ ] **Step 4: Verify**

Run all checkers: green.
Then preview, and in the console run `__WLtest.state().inv.key = 2; __WLtest.persist(); location.reload()`. Expected: toast "Case Keys are retired: you got 240 coins.", the coins go up by 240, and there's no Case files link on HQ.

- [ ] **Step 5: Commit**

```bash
git add js/progress.js js/game.js index.html css/style.css tools/check-social.mjs
git commit -m "Remove Case files and Case Keys; held keys become coins"
```

---

### Task 5: Live season countdown and one Season card

**Files:**
- Modify: `js/engine.js` (add `now`, `seasonEndsAt`, `seasonClock`, `fmtLong`, export `seasonOf` if it isn't already)
- Modify: `js/game.js` `renderSeason()` (~380), the 1-second ticker (~3995), `renderToday()` (last-day nudge)
- Modify: `index.html` `#season-card`: one countdown element `<strong id="season-clock" data-season-clock="1">`, plus a ladder row (`#season-league`, `#season-lp`, `#season-bar`) left `hidden` until Task 8. Delete `#league-card` and `#btn-season`.
- Modify: `css/style.css`: `.season-clock.u1` red, `.season-clock.u2` red with a slow pulse inside `@media (prefers-reduced-motion: no-preference)`
- Test: `tools/check-social.mjs`

**Interfaces:**
- Produces: `WL.now() -> number`. This is `Date.now()`, except with `?test=1&today=N` it is shifted by whole days so `dayNumber()` agrees.
- Produces: `WL.seasonEndsAt(season: number) -> number`: UTC ms of the midnight IST that ends the season's last day.
- Produces: `WL.seasonClock(now: number) -> { season: number, phase: "before" | "during", target: number, left: number, urgency: 0 | 1 | 2 }`. Urgency is 1 when `left ≤ 7 days`, 2 when `left ≤ 24 h`, and always 0 before Season 1.
- Produces: `WL.fmtLong(ms: number) -> string`: `"28d 04:12:09"`, or `"04:12:09"` under one day.

- [ ] **Step 1: Failing tests**

```js
const H = 3600000, D = 24 * H;
eq("S1 ends", WL.seasonEndsAt(1), Date.UTC(2026, 11, 6, 18, 30));
eq("before S1", WL.seasonClock(Date.UTC(2026, 10, 7, 12)), { season: 1, phase: "before", target: Date.UTC(2026, 10, 8, 18, 30), left: Date.UTC(2026, 10, 8, 18, 30) - Date.UTC(2026, 10, 7, 12), urgency: 0 });
eq("mid S1", [WL.seasonClock(Date.UTC(2026, 10, 20)).phase, WL.seasonClock(Date.UTC(2026, 10, 20)).urgency], ["during", 0]);
eq("last week", WL.seasonClock(Date.UTC(2026, 10, 30)).urgency, 1);
eq("last day", WL.seasonClock(Date.UTC(2026, 11, 6, 6)).urgency, 2);
eq("S2 begins", [WL.seasonClock(Date.UTC(2026, 11, 6, 19)).season, WL.seasonClock(Date.UTC(2026, 11, 6, 19)).phase], [2, "during"]);
eq("season of day 42/43", [WL.seasonOf(42), WL.seasonOf(43)], [1, 2]);
eq("long", WL.fmtLong(28 * D + 4 * H + 12 * 60000 + 9000), "28d 04:12:09");
eq("short", WL.fmtLong(5 * H + 1000), "05:00:01");
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement the engine functions**

Day n starts at `launchUTC() + (n − 1)·DAY − IST_MS`.

- [ ] **Step 4: Render it**
- `renderSeason()` writes the eyebrow ("Season 1 · day 6 of 28", or "Season 1 starts Mon 9 Nov"), the title and the clock label ("ends in" / "starts in" + `WL.fmtLong(left)`), and sets class `u1`/`u2` from `urgency`.
- The ticker refreshes every `[data-season-clock]` from `WL.seasonClock(WL.now())` each second and calls `renderSeason()` when `left` hits 0.
- On the season's last day (`urgency === 2`, phase `during`), `renderToday` appends to `#today-meta`: "Last day of Season N: finish today to lock in your league."
- Remove the season-badge track, `BADGES`, `seasonScore`, `seasonLine`, `syncSeason`, `loadSeason` and the season scoreboard section (~2500–2578). The board's "season" tab goes in Task 8.

- [ ] **Step 5: Verify**

Preview `?test=1&lb=demo` (today is Daily #13): the card reads "Season 1 starts in 1d …" and the seconds tick.
`&today=36`: the countdown is red.
`&today=42`: hh:mm:ss only, pulsing, and the Daily card shows the last-day line.
At 375 px: no overflow.

- [ ] **Step 6: Commit**

```bash
git add js/engine.js js/game.js index.html css/style.css tools/check-social.mjs
git commit -m "Season card with a live countdown that turns urgent near the end"
```

---

### Task 6: Faces and the "Create your detective" setup

**Files:**
- Modify: `js/engine.js` `avatar()` (~869): add `FACES` (16 presets), `okFace`, optional `code` argument
- Modify: `js/game.js`:
  - `verdictTrain()` (~1712): its "Start Career: Book 1" button opens setup first
  - `renderProfile()`: a face grid under the mug
  - `renderHQ()`: the player face
  - board rows and podium (`boardRows` ~2486): pass `r.av`
  - `postDaily`: `entry.av`
  - room join and player entry: `av`
- Modify: `index.html`: new `<dialog id="dlg-setup">` with `#setup-faces` (a grid of 16 radio buttons), `#setup-name` (web only), `#setup-go` "Start"
- Modify: `js/leaderboard.js`: `submitDaily` and `nameDaily` carry `av`, and room player writes carry `av`
- Modify: `firebase/firestore.rules`: `scores` keys allow `av` (create, and add it to the name/badge update), `rooms/{code}/players/{uid}` keys allow `av`, and `function okAv(a) { return a is string && a.matches('^f(0[0-9]|1[0-5])$'); }` is required when present
- Modify: `css/style.css` (face grid: 4 columns at 375 px)
- Test: `tools/check-social.mjs`

**Interfaces:**
- Produces: `WL.FACES: Array<{hair: 0..6, eyes: 0..2, mouth: 0..3, tL: number, tR: number, glasses: bool, mustache: bool, beard: bool, earrings: bool}>` (length 16).
- Produces: `WL.okFace(code) -> boolean` for `/^f(0[0-9]|1[0-5])$/`.
- Produces: `WL.avatar(name: string, code?: string) -> svg string`. A valid `code` draws `FACES[n]`; otherwise the face is drawn from the name exactly as today.
- Produces: save field `S.settings.avatar: string` (missing = drawn from the name). `myFace()` in game.js returns it or `""`.

- [ ] **Step 1: Record today's name faces before changing anything**

Run: `node -e` with the same vm set-up, printing `sha256(WL.avatar("Raj"))`, `sha256(WL.avatar("Detective"))` and `sha256(WL.avatar("Priya"))`, and paste the three hashes into the test below.

- [ ] **Step 2: Failing tests**

```js
eq("16 faces", WL.FACES.length, 16);
eq("every hair style", [...new Set(WL.FACES.map((f) => f.hair))].sort(), [0, 1, 2, 3, 4, 5, 6]);
eq("codes", ["f00", "f15", "f16", "x1", undefined].map(WL.okFace), [true, true, false, false, false]);
eq("code wins", WL.avatar("Raj", "f03"), WL.avatar("Zoe", "f03"));
eq("bad code falls back", WL.avatar("Raj", "nope"), WL.avatar("Raj"));
eq("name faces unchanged", ["Raj", "Detective", "Priya"].map((n) => sha(WL.avatar(n))), [/* the three hashes from Step 1 */]);
```

- [ ] **Step 3: Run.** Expected: FAIL.

- [ ] **Step 4: Implement**
- Refactor `avatar` into `drawFace(params)`. Name faces derive their params from the seeded rng in the same order as today, so the hashes hold. Pick 16 varied presets.
- Setup dialog: opens after the training case (and on HQ boot for any web player with no `playerName`). It can't be dismissed without a name on web. Name validation is `saveName` (the first name doesn't count as a change). It saves `S.settings.avatar` and then continues to Career.
- On CrazyGames (`Plat.name === "crazygames"`) the dialog shows faces only and "Start".
- Every `WL.avatar(x)` call for the player passes `myFace()`; rows pass `r.av`.

- [ ] **Step 5: Verify**

Run `node tools/check-social.mjs`: all ✓.
Then preview `?test=1&lb=demo` in a fresh profile (clear site data), play the training case, and tap "Start Career". Expected: setup opens, picking face f05 + name "Tester" shows that face on HQ, Profile and the Today board podium.
At 375 px: the grid fits with no horizontal scroll.
Run `node tools/build-crazygames.mjs`, open `http://localhost:8123/dist/crazygames/index.html`, and play the training case. Expected: setup shows faces and no name field, and the console shows no `LB` errors.

- [ ] **Step 6: Commit**

```bash
git add js/engine.js js/game.js js/leaderboard.js index.html css/style.css firebase/firestore.rules tools/check-social.mjs
git commit -m "Let players pick a face and a name when they start"
```

---

### Task 7: Season ladder: maths, rules and the LB API

**Files:**
- Modify: `js/engine.js`: `LADDER`, `tierOf`, `ladderDay`, `seasonStartLp`, `ladderApply`
- Modify: `firebase/firestore.rules`: new `match /ladder/{id}`
- Modify: `firebase/firestore.indexes.json`: a composite index on `ladder`: `season` ASC, `lp` DESC, `rate` DESC, `failRate` ASC. Also `season` ASC, `lp` DESC for the count.
- Modify: `js/leaderboard.js`: add `ladder` to the `WLLB` object, and move `LEAGUES` to read from `WL.LADDER`
- Create: `tools/daily5/social.rules.test.mjs`. Modify `tools/daily5/package.json`: script `"test:social": "cd ../.. && firebase emulators:exec --only firestore --project demo-liarhunt \"node tools/daily5/social.rules.test.mjs\""`
- Test: `tools/check-social.mjs`, `tools/daily5/social.rules.test.mjs`

**Interfaces:**
- Produces: `WL.LADDER = { marks: [0, 400, 1000, 1800, 2800], names: ["Bronze", "Silver", "Gold", "Platinum", "Diamond"], icons: ["🥉", "🥈", "🥇", "💠", "💎"], perfect: 30, helped: 20, penalty: [50, 40, 30, 20, 10], rewards: [100, 250, 500, 1000, 2000] }`
- Produces: `WL.tierOf(lp) -> 0..4`
- Produces: `WL.ladderDay(grid: /^[gyr-]{5}$/, tier) -> int` (the LP change)
- Produces: `WL.seasonStartLp(prevTier: number | null) -> int`, which is `marks[max(0, prevTier − 1)]`, or 0 when null
- Produces: `WL.ladderApply(doc | null, day, grid, startLp) -> fields | null`:
  - returns `{ lp, tier, days, solved, cases, fails, rate, failRate, last }`, or `null` when `doc && day <= doc.last`
  - `cases += 5` per day; `fails` counts days with any `r`
  - `rate = floor(solved × 1000 / cases)`, `failRate = floor(fails × 1000 / days)`
  - `lp = max(0, (doc ? doc.lp : startLp) + ladderDay(grid, doc ? doc.tier : tierOf(startLp)))`
- Produces: `LB.ladder`:
  - `mine(season) -> Promise<doc | null>`
  - `post({ name, av, badge, day, grid }) -> Promise<doc | null>`: season = `WL.seasonOf(day)`; reads `ladder/{season-1}_{uid}` for the start; writes `ladder/{season}_{uid}` with `updatedAt` = server time; returns `null` when already applied
  - `profile(season, { name, av, badge }) -> Promise<void>`
  - `top(season) -> Promise<rows (≤ 40)>`
  - `standing(season, lp) -> Promise<{ rank, total }>`: rank = count with lp greater + 1
  - Demo mode keeps `ladder` inside `demoStore()` and adds 30 bots: `bots("ladder", season)`, with `lp`, `rate`, `failRate`, `days`, `av`

- [ ] **Step 1: Failing maths tests** (in `tools/check-social.mjs`)

```js
const L = WL.ladderDay;
eq("perfect day", L("ggggg", 1), 150);
eq("helped", L("ggyyg", 1), 130);
eq("fail at 1", L("r----", 1), -50);
eq("bronze is safe", L("r----", 0), 0);
eq("fail at 3", L("ggr--", 2), 30);
eq("classic day", [L("gyrgr", 1), L("gyrgr", 0)], [40, 80]);
eq("tiers", [0, 399, 400, 999, 1000, 1800, 2799, 2800, 99999].map(WL.tierOf), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
eq("season start", [null, 0, 1, 2, 4].map(WL.seasonStartLp), [0, 0, 0, 400, 1800]);
eq("first day", WL.ladderApply(null, 15, "ggggg", 0), { lp: 150, tier: 0, days: 1, solved: 5, cases: 5, fails: 0, rate: 1000, failRate: 0, last: 15 });
eq("drop to bronze", WL.ladderApply({ lp: 410, tier: 1, days: 3, solved: 12, cases: 15, fails: 1, last: 17 }, 18, "r----", 0),
  { lp: 360, tier: 0, days: 4, solved: 12, cases: 20, fails: 2, rate: 600, failRate: 500, last: 18 });
eq("same day twice", WL.ladderApply({ lp: 10, tier: 0, days: 1, solved: 1, cases: 5, fails: 1, last: 18 }, 18, "ggggg", 0), null);
```

- [ ] **Step 2: Run.** Expected: FAIL. Then implement the five engine functions, and the tests pass.

- [ ] **Step 3: Failing rules tests** in `tools/daily5/social.rules.test.mjs`

Use the same harness as `rules.test.mjs` (`t()`, `as()`, rules loaded from `firebase/firestore.rules`). Load `js/engine.js` via vm so the expected LP comes from `WL.ladderApply`. Seed `scores/{day}_{uid}` docs with rules disabled. Days 15–18 are Season 1; day 43 is Season 2.

| Test | Expect |
|---|---|
| ana creates `ladder/1_ana` for day 15 grid `ggggg` with `ladderApply` fields | succeeds |
| same but `lp + 10` | fails |
| `last: 16` with no `scores/16_ana` | fails |
| ana applies day 16 grid `gyr--` from her doc | succeeds |
| ana applies day 16 again | fails |
| any write with a `tier` that doesn't match `lp` | fails |
| Bronze doc + `r----`: same lp succeeds, lp − 50 fails | as stated |
| `ladder/2_ana` on day 43 when `ladder/1_ana` has tier 2: start 400 succeeds, start 0 fails | as stated |
| ana updates only `name`/`av`/`badge` | succeeds; also changing `lp` in that write fails |
| ben writes `ladder/1_ana` | fails |
| `av: "zz"` | fails |

- [ ] **Step 4: Run them**

Run: `npx firebase-tools@13 emulators:exec --only firestore --project demo-liarhunt "node tools/daily5/social.rules.test.mjs"` (from the repo root).
Expected: FAIL (no `ladder` rules).

- [ ] **Step 5: Write `match /ladder/{id}`**
- Keys `hasOnly([uid, name, av, badge, season, lp, tier, days, solved, cases, fails, rate, failRate, last, updatedAt])`, with `id == string(season) + '_' + auth.uid`, `okName`, `okBadge`, optional `okAv`, and `updatedAt == request.time`.
- Season range `15 + 28·(s−1) ≤ last ≤ 42 + 28·(s−1)`.
- Points from the grid at `scores/{last}_{uid}`: `g` count × 30 + `y` count × 20 − Σ penalty where `grid.matches('^.{i}r.*')`, the penalty applying only when the tier the day is scored at is > 0.
- Use the ternary `c ? a : b`. If the emulator rejects it, use a map lookup: `{'true': 50, 'false': 0}[string(cond)]`.
- `tierOf` written as a chain of comparisons. `rate`/`failRate` via `math.floor`.
- Create: start from `ladder/{season−1}_{uid}` when it exists. Update: either a new day as above, or a profile-only write (`affectedKeys().hasOnly(['name', 'av', 'badge', 'updatedAt'])`).
- `allow delete: if false`. Run until every row in the table passes.

- [ ] **Step 6: Implement `LB.ladder`**

Use the demo branch, `withBots`, an `ORDER.ladder` (lp desc, rate desc, failRate asc), and `standing` through `restCount("ladder", [["season", "EQUAL", s], ["lp", "GREATER_THAN", lp]])`.

- [ ] **Step 7: Verify**

Run `node tools/check-social.mjs` and the rules tests: all ✓.
Then preview `?test=1&lb=demo&today=15` and run in the console `await WLLB.ladder.post({ name: "Tester", av: "f01", badge: "", day: 15, grid: "ggggg" })`. Expected: `{ lp: 150, tier: 0, … }`.

- [ ] **Step 8: Commit**

```bash
git add js/engine.js js/leaderboard.js firebase/firestore.rules firebase/firestore.indexes.json tools/check-social.mjs tools/daily5/social.rules.test.mjs tools/daily5/package.json
git commit -m "Season ladder: league points checked by the rules from each posted Daily"
```

---

### Task 8: Ladder in the game, and the new leaderboard

**Files:**
- Modify: `js/game.js`:
  - `postDaily()` (~2412): after the score posts, `postLadder(day, p)`
  - `renderSeason()`: the league row
  - boot: the season-end reward
  - delete the weekly league section (~2665–2760: `resolveLeague`, `leagueNotice`, `syncLeague`, `refreshLeague`, `renderLeagueCard`, `loadLeague`) and `postEndless`
  - `openBoard`/`loadBoard` (~2459–2484): tabs `league | today | friends`
  - `unlocked("league")` uses
- Modify: `index.html` `#dlg-board` tabs: League (default), Today, Friends. Remove Season and Rush.
- Modify: `js/progress.js`: achievement `promoted` desc "Get promoted to a higher league"
- Modify: `css/style.css`: ladder rows, league dividers, pinned "you" row

**Interfaces:**
- Consumes: `LB.ladder.*`, `WL.LADDER`, `WL.tierOf`, `WL.seasonClock`, `myFace()`, `bestBadge()`
- Produces: save field `S.ladder = { season, lp, tier, rank, total, at, paid: { [season]: true } }`
- Produces: `postLadder(day, prog)` in game.js:
  - only for `run.kind === "daily"` on the current day, web, named players
  - updates `S.ladder` and the Season card
  - when the tier goes up, `P.count("promotions")` and a toast "Promoted to Gold League!"; when it goes down, a toast "Down to Silver League. Win it back tomorrow."
  - on failure, the rank card gets "Couldn't update your league." plus a Try again button that calls it again

- [ ] **Step 1: Implement `postLadder`** and call it from `postDaily` after the score post resolves. It's also called from `afterJoin()` for today when a player names themselves after playing.

- [ ] **Step 2: Season card league row** (`#season-league`, `#season-lp`, `#season-bar`, unhidden when `lbOn()`)
- emblem + "Gold League"
- `1,234 LP`
- a bar from the current mark to the next, with "566 LP to Platinum" (Diamond: "Top league")
- Tapping the card opens the board on League.

- [ ] **Step 3: Season-end reward at boot**

When `SEASON ≥ 2`, `!S.ladder.paid[SEASON − 1]` and `LB.ladder.mine(SEASON − 1)` returns a doc:
- grant `WL.LADDER.rewards[doc.tier]` coins
- set `badge` to that league's icon when it beats the current best
- notice "Season N is over": "You finished in the Gold League. +500 coins. You start Season N+1 in the Silver League."
- mark it paid

- [ ] **Step 4: League tab**
- `LB.ladder.top(SEASON)`: rank, face (`r.av`), name, badge, LP, `rate` as "84%", `failRate` shown as "fails 1 in 5 days" (`Math.round(1000 / failRate)` days; "no fails" at 0)
- a divider row whenever the tier changes
- if "me" isn't in the 40, a pinned row with `LB.ladder.standing`
- the note: "Season N · top 40. Solve to earn LP, wrong answers cost LP (not in Bronze). Leagues: Silver 400 · Gold 1,000 · Platinum 1,800 · Diamond 2,800."
- Keep the 25-player rule for "#N of M" wording.

- [ ] **Step 5: Today tab** = the old `today` board with faces. The Friends tab shows "Coming in the next step" until Task 10 replaces it. Delete the Rush tab, `topEndless` calls and `S.lb.endlessPosted` use.

- [ ] **Step 6: Verify**

Preview `?test=1&lb=demo&today=15`, play the Daily to the end (`__WLtest.daily()`). Expected: the Season card shows LP; the board opens on League with 30 bots plus you, ordered by LP, with dividers.
At 375 px: rows don't overflow with a 16-letter name.
Then in the console run `WLLB.ladder.post = () => Promise.reject(Object.assign(new Error("x"), { code: "unavailable" }))`, reload, and finish a Daily for `&today=16`. Expected: results show, the rank card says "Couldn't update your league." with Try again.
`&today=43` with a Season 1 doc in demo storage: the season-end notice appears once.
A save with an old `S.league = { week: 2, tier: 1, entered: true }` and `S.lb.season` set (put them in via `__WLtest.state()` + `persist()`, then reload) gives HQ with no console errors.

- [ ] **Step 7: Commit**

```bash
git add js/game.js js/progress.js index.html css/style.css
git commit -m "Show the season ladder: league card, top-40 board, season-end rewards; drop the Rush board and weekly league"
```

---

### Task 9: Friends: rules and the LB API

**Files:**
- Modify: `firebase/firestore.rules`: `fcodes/{code}`, `friends/{uid}`, `friends/{uid}/inbox/{from}`
- Modify: `js/leaderboard.js`: `friends` on `WLLB`
- Test: `tools/daily5/social.rules.test.mjs`

**Interfaces:**
- Produces: docs
  - `fcodes/{code}` `{ uid }`, where code matches `^[A-Z2-9]{6}$`
  - `friends/{uid}` `{ code, name, av, list: [uid] (≤ 8), updatedAt }`
  - `friends/{to}/inbox/{from}` `{ from, name, av, kind: "ask" | "accept" | "remove", at }`
- Produces: `LB.friends`:
  - `me() -> Promise<{ code, list }>`: on first call, makes a free code (retry on clash) and the `friends/{uid}` doc
  - `lookup(code) -> Promise<{ uid, name, av } | null>`: normalizes with `trim().toUpperCase()`
  - `ask(uid)`, `accept(uid)`, `decline(uid)`, `remove(uid) -> Promise<void>`:
    - `accept` adds them to my list, writes `kind: "accept"` into their inbox and deletes my ask
    - `remove` takes them off my list and writes `kind: "remove"`
  - `inbox() -> Promise<[{ from, name, av, kind }]>`
  - `settle(entries) -> Promise<void>`: for `accept`, adds the sender to my list if there's room; for `remove`, takes them off; then deletes the entry
  - `cards(uids, season, day) -> Promise<[{ uid, name, av, lp, tier, rate, today: { score, grid } | null }]>`
  - Errors use codes `self`, `not-found`, `already`, `full`, `their-full`, which `friendlyError` maps to "That's your own code.", "No detective has that code. Check it and try again.", "You're already friends.", "Your friends list is full (8). Remove someone first.", "Their friends list is full."
  - Demo: two bot friends plus one pending ask from a bot.

- [ ] **Step 1: Failing rules tests** (append to `social.rules.test.mjs`)

| Test | Expect |
|---|---|
| ana creates `fcodes/ANA234 {uid: "ana"}` | succeeds |
| ben creates `fcodes/ANA234` | fails |
| ben creates `fcodes/BEN234 {uid: "ana"}` | fails |
| ana writes `friends/ana` with 8 uids | succeeds |
| ana writes `friends/ana` with 9 uids | fails |
| ana writes `friends/ben` | fails |
| ana creates `friends/ben/inbox/ana` kind `ask` | succeeds |
| ana creates `friends/ben/inbox/cy` | fails |
| ben reads `friends/ben/inbox/ana` | succeeds |
| ana reads it | fails |
| ana deletes it | fails |
| ben deletes it | succeeds |
| ana updates an inbox entry | fails |

- [ ] **Step 2: Run.** Expected: FAIL. Then write the three `match` blocks:
  - `fcodes`: read for signed-in players; create only for your own uid; no update or delete
  - `friends/{uid}`: read for signed-in players; write only for the owner, `list.size() <= 8`
  - `friends/{uid}/inbox/{from}`: create only when `from == auth.uid`, with kind in the three values; read and delete only for `uid == auth.uid`; no update

  Run until every row passes.

- [ ] **Step 3: Implement `LB.friends`** with the demo branch.

- [ ] **Step 4: Verify.** Rules tests all ✓. Then in the demo console, `await WLLB.friends.me()` returns a 6-letter code, and `await WLLB.friends.lookup(" ana234 ")` doesn't throw.

- [ ] **Step 5: Commit**

```bash
git add firebase/firestore.rules js/leaderboard.js tools/daily5/social.rules.test.mjs
git commit -m "Friends: friend codes, requests and an 8-friend list in Firestore"
```

---

### Task 10: Friends screen; retire Friend groups

**Files:**
- Modify: `js/game.js`:
  - delete the friend groups section (~2764–2890) and the `?g=` join flow in boot
  - add the friends screen
  - `?f=CODE` in boot
  - the board's Friends tab
  - `btn-friends` → `openFriends()`
- Modify: `index.html`: replace `<dialog id="dlg-group">` with `<dialog id="dlg-friends">`:
  - `#fr-code` and `#fr-share` / `#fr-copy`
  - `#fr-add` (an input + "Send request")
  - `#fr-inbox`, `#fr-list`
- Modify: `css/style.css` (drop `.grp*`, add `.fr*`)

**Interfaces:**
- Consumes: `LB.friends.*`, `LB.ladder` season, `WL.avatar(name, av)`, the challenge share link builder already in game.js (`dailyShareText` / challenge link)
- Produces: `openFriends()`, and `friendsBoot()` (runs `inbox()` → `settle()` for accept/remove, and shows asks as a badge on the HQ Friends link)

- [ ] **Step 1: Build the screen**
- Your code with Share ("Add me on LiarHunt: <siteUrl>/?f=CODE") and Copy.
- The add box (`maxlength 6`, uppercase as you type).
- Requests, each with Accept / Decline.
- Friend cards: face, name, league emblem, LP, today's "4/5" or "Not played yet", solve rate, and buttons Challenge and Remove (Remove asks to confirm first: "Remove Raj? You'll both drop off each other's list.").
- "N of 8 friends".
- Empty state: "No friends yet. Send your code to someone you play with."

- [ ] **Step 2: Wire it up**
- `?f=CODE`: after boot and setup, open the friends screen with the code filled in and the request ready to send (one tap, never automatic).
- `?g=` shows the notice "Friend groups are now Friends. Ask your friend for their friend code."
- The board's Friends tab = the same cards, sorted by LP.

- [ ] **Step 3: Verify**

Preview `?test=1&lb=demo`:
- the screen shows a code, 2 bot friends and 1 request
- Accept → 3 friends
- entering your own code → "That's your own code."
- `zzz` → "No detective has that code…"
- with 8 friends, adding → "Your friends list is full (8)…"
- a bot friend's code → "You're already friends."

Also check `?g=ABC234` (the notice shows), `?f=<your code>` (the "own code" message), and 375 px.

- [ ] **Step 4: Commit**

```bash
git add js/game.js index.html css/style.css
git commit -m "Friends list of up to 8 with requests; Friend groups are retired"
```

---

### Task 11: Daily 5 stories in the season's town

**Files:**
- Modify: `tools/daily5/prompts.mjs`: `seasonBrief(n)`, the writer style rules, and use of `brief.town`
- Modify: `tools/daily5/generate.mjs`: the `--season N` flag, and `pickBrief` taking the town's places as settings
- Modify: `tools/daily5/admin.mjs`: the count cap `Math.min(10, …)` → `Math.min(30, …)`, plus a `season` field passed through
- Create: `tools/daily5/WRITING.md`

**Interfaces:**
- Produces: `seasonBrief(n: number) -> { season, town, tagline, places: string[], locals: [name, role][] }`
  - reads `js/seasons.js` via `node:vm` (`WL_SEASONS[min(n, length) − 1]`)
  - `places` is taken from the premise titles/setups (lighthouse, ferry, cannery, Maritime Museum…), deduplicated
- Produces: a brief with `town` set. `blueprintPrompt` adds: "Every scene happens in {town}: {tagline}. Use these places: …. One or two of these locals may appear as side characters, never as the culprit: …."
- Style rules added to the writer prompt: case-file voice, short declarative sentences, exact clock times and named places, evidence written as records (logs, receipts, camera stills), no jokes in evidence, nothing gives a later answer away.

- [ ] **Step 1: Failing check**

Run: `cd tools/daily5 && node generate.mjs --count 1 --season 1 --dry-run`, then read the new job's `brief.json` under `~/.liarhunt/daily5`.
Expected now: `--season` is ignored and the brief has no `town`.

- [ ] **Step 2: Implement** `seasonBrief`, the flag and the prompt text. A dry run must still pass the checker with the Crown Job answers.

- [ ] **Step 3: Write `WRITING.md`**
- the story JSON shape, from `fixtures/crown-job.json`, with each field explained in one line
- the style rules above
- "How to write one with Claude in a chat": the prompt to paste and how to import the file (Task 12)

- [ ] **Step 4: Verify**

Run the dry run again. Expected: `brief.json` has `"town": "Port Ellery"` (or the season pack's town name), and the job finishes "ready".
Also run `node check.mjs --self-test`: passes.

- [ ] **Step 5: Commit**

```bash
git add tools/daily5/prompts.mjs tools/daily5/generate.mjs tools/daily5/admin.mjs tools/daily5/WRITING.md
git commit -m "Daily 5 stories follow the season's town, in a case-file voice"
```

---

### Task 12: Admin desk: import, export and schedule a run

**Files:**
- Modify: `tools/daily5/lib.mjs` (add `importDraft`)
- Modify: `tools/daily5/check.mjs` (self-test the import)
- Modify: `tools/daily5/admin.mjs`: routes `POST /api/import`, `GET /api/draft/:id/export`, `POST /api/schedule-run`
- Modify: `tools/daily5/admin.html`: an Import button (file input), Export per draft, and "Schedule approved drafts from day N"

**Interfaces:**
- Produces: `importDraft(story: object, id: string) -> { meta: { id, status: "ready" | "failed", source: "import", for: "daily", createdAt, updatedAt, hash, day: 0, notes: [], report: { gate, errors } }, story }`. The gate is `check(story).ok`.
- Produces: `POST /api/import` (body = story JSON) → `{ id, ok, errors }`.
- Produces: `GET /api/draft/:id/export` → the story JSON with `Content-Disposition: attachment; filename="<id>.json"`. The desk confirms first: "This file holds the answers. Never put it in the game folder or on GitHub."
- Produces: `POST /api/schedule-run` with `{ from: day }` → assigns approved, unscheduled, `for !== "night"` drafts (oldest first) to the empty days `from, from+1, …`. Returns `{ scheduled: [{ id, day }] }` and refuses days ≤ today (IST).

- [ ] **Step 1: Failing self-test** in `check.mjs --self-test`

```js
const ok = importDraft(EXAMPLE, "imp-1");
assert.equal(ok.meta.status, "ready"); assert.equal(ok.meta.source, "import");
const bad = importDraft({ ...EXAMPLE, cases: EXAMPLE.cases.slice(0, 4) }, "imp-2"); // the fixture has 5 cases
assert.equal(bad.meta.status, "failed"); assert.ok(bad.meta.report.errors.length > 0);
```

Run `node check.mjs --self-test`. Expected: FAIL.

- [ ] **Step 2: Implement `importDraft`, the three routes and the UI.** Imported drafts can use the existing approve → schedule → publish flow.

- [ ] **Step 3: Verify**

Run: `node check.mjs --self-test` passes.
Then preview `daily5-admin`:
- import `fixtures/crown-job.json` → a "ready" draft appears
- approve it → "Schedule from day 15" puts it on Daily #15 (or the first empty day after today)
- Export downloads the JSON after the warning

- [ ] **Step 4: Commit**

```bash
git add tools/daily5/lib.mjs tools/daily5/check.mjs tools/daily5/admin.mjs tools/daily5/admin.html
git commit -m "Admin desk: import and export story JSON, schedule many days at once"
```

---

### Task 13: Royalty-free music, rain and clicks

**Files:**
- Create: `tools/audio-sources.md` (each file: title, author, URL, licence, date checked)
- Modify: `assets/audio/`:
  - new `music-hq.mp3`, `music-case.mp3`, `music-rush.mp3`, `rain.mp3`
  - replace `tap.mp3`, `click.mp3`, `whoosh.mp3`
  - delete `music.mp3`
- Modify: `js/audio.js`: moods, the rain layer, a crossfade
- Modify: `js/game.js`: call `Snd.mood()` in `show()` (~253) and when a case or Rush starts; the case 5 verdict uses `"verdict"`
- Modify: `sw.js`: `CACHE = "wl-v9"`
- Modify: `how-to-play.html`: a "Music and sounds" credits paragraph
- Modify: `README.md` §5: the new files and sources

**Interfaces:**
- Produces: `WLAudio.mood(name: "hq" | "case" | "rush" | "verdict" | "off") -> void`
  - hq → `music-hq`
  - case → `music-case` + rain at 0.35
  - rush → `music-rush`
  - verdict → `music-case` + rain at 0.6
  - two `<audio>` elements crossfade over 1.5 s
  - follows `setMusic`, ads, `visibilitychange` and mute exactly like today's single element
  - `startMusic()` keeps working and plays the current mood (default `hq`)

- [ ] **Step 1: Ask the owner before each download**, naming the file, source and size:
  - `Unsolved-Investigation-isaiah658.ogg` (opengameart.org/content/unsolved-investigation, 2.2 MB)
  - `StayAround.mp3` (opengameart.org/node/80256, 1.7 MB)
  - `sus_corner_loop.mp3` (opengameart.org/content/suspicious-loop, 1 MB)
  - `rain_on_window_loop.wav` (opengameart.org/content/rain-on-window-loop, 1.9 MB)
  - Kenney Interface Sounds (kenney.nl/assets/interface-sounds)

  Re-check each page says CC0 on the day. Download each into its own new folder in the scratchpad.

- [ ] **Step 2: Process with ffmpeg**

Check `ffmpeg -version` first. If it's missing, ask the owner to install it (`winget install Gyan.FFmpeg`).
- loudness `-af loudnorm=I=-18:TP=-1.5` for music and `I=-16` for SFX
- music: stereo `-b:a 96k` MP3
- rain and SFX: mono `-b:a 64k`
- trim `music-hq` to a clean loop if it isn't one
- write to `assets/audio/` with the names above

Total of the new files ≤ 2.5 MB (check with `du -ch assets/audio/music-*.mp3 assets/audio/rain.mp3`).

- [ ] **Step 3: Implement `mood()`** in `js/audio.js` and the calls in game.js, then bump `sw.js` and write the credits and `tools/audio-sources.md`.

- [ ] **Step 4: Verify**

Preview: turn Music on in Settings, then go from HQ to a Daily case to Rush and back. In the console:
- `document.querySelectorAll("audio")` shows ≤ 2 elements
- the playing element's `src` matches the mood at each screen
- the rain element plays only on case screens

Hiding the tab pauses both. The owner then listens and either approves or names tracks to swap.

- [ ] **Step 5: Commit**

```bash
git add assets/audio js/audio.js js/game.js sw.js how-to-play.html README.md tools/audio-sources.md
git commit -m "Royalty-free detective music with HQ, case and Rush moods, rain ambience and new clicks"
```

---

### Task 14: Docs, memory and the final check

**Files:**
- Modify: `README.md` (leagues/ladder, friends, Case files gone, setup, new checker and rules test commands)
- Modify: `privacy.html` (friends list and friend codes, ladder entries)
- Modify: the memory files `liarhunt-game-modes.md`, `liarhunt-backend.md`, `liarhunt-status.md`

- [ ] **Step 1: Update the docs and memory** so they match what shipped.

- [ ] **Step 2: Run everything**

Run: `node tools/check-cases.mjs && node tools/check-book.mjs && node tools/check-social.mjs && (cd tools/daily5 && node check.mjs --self-test)`, then both rules suites (`rules.test.mjs` and `social.rules.test.mjs`) on the emulator, then `node tools/build-crazygames.mjs`.
Expected: all green, and the zip is built.

- [ ] **Step 3: Commit**

```bash
git add README.md privacy.html
git commit -m "Document the season ladder, friends and the new setup"
```

- [ ] **Step 4: Hand over the owner steps:**
  1. add the authorized domains in Firebase Auth
  2. `firebase deploy --only firestore`
  3. generate, review and publish the 30 stories (`node generate.mjs --count 30 --season 1`)
  4. listen to the music
  5. push to `main` when happy
