# Connected Daily 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a Daily 5 day into one 20-minute investigation (Search → Question → Accuse in chapters 1–4, then a four-question Verdict), with drawn art, a Revive after one miss (Daily and Career), 45-day seasons, and past stories retold for friends' rooms.

**Architecture:** A v2 story format extends the existing Daily 5 story (`js/storycheck.js` checks it and makes the public docs; `tools/daily5/lib.mjs` makes the answer keys). A new `js/chapter.js` (global `WLChapter`) draws a v2 chapter inside the case screen and hands `game.js` a pick `{ s, p }`; the existing commit → resolve → reveal path judges it unchanged. A new `js/art.js` (global `WLArt`) holds the scene drawings and icons as inline SVG. Firestore rules gain one `over` path; seasons change from 28 to 45 days in `engine.js` and the ladder rules.

**Tech Stack:** Vanilla JS (IIFE globals, no build), CSS custom properties, Firebase Firestore rules + emulator tests, Node tools (`node:vm` loads the browser scripts).

**Spec:** `docs/superpowers/specs/2026-11-10-connected-daily5-design.md`

## Global Constraints

- No build step, no new runtime dependencies, scripts are IIFEs that set one global. Web-only code inside `<!-- WEB-ONLY:START/END -->`.
- Works at 375 px wide and at 800×450; keyboard 1–5 / Enter / Esc; survives tab hide/show mid-chapter.
- Copy: short, plain English, second person; case-file voice from `tools/daily5/WRITING.md`.
- Released content never changes: Dailies #1–14 (hash-checked), `tools/book1-lock.json`, any published Daily 5 day. Daily #15 and #16 have been played; their classic cases must not change either.
- Anti-cheat: every Daily 5 answer is still judged by the rules against `d5keys`; the only new freedom is the Revive (strikes 2) and `over`.
- Story files with answers never enter the repo (they live in `~/.liarhunt/daily5`). The v2 fixture in `tools/daily5/fixtures/` is a test story that will never be published.
- Firestore rules deploy before the game push that needs them, and only with the owner's explicit OK at that moment. Deploy = push to `main`; never `wrangler deploy`.
- Season length: 45 days. Season s = Dailies `15 + 45(s−1)` to `59 + 45(s−1)`. Season 1 ends at the start of Daily #60 = `Date.UTC(2026, 11, 23, 18, 30)`.
- v2 numbers: 5–6 people, faces `f00`–`f15` unique; chapters 1–4: 3–5 suspects, 7–10 spots (≥ 2 find nothing, so 5–8 evidence), 2–3 questions per suspect, 1–4 presses (≥ 1 by a suspect who isn't the liar), 8–14 statements; `strikes: 2`; verdict exactly 4 parts `mastermind`, `accomplice` (may answer `none`), `route`, `item`.
- Lie kinds: `time`, `place`, `travel`, `seen`, `holder`, `count`; a story uses ≥ 4 kinds (warning, not error).
- Story Night chapter clock for v2: 480000 ms.
- Run after edits: `node tools/check-cases.mjs`, `node tools/check-book.mjs`, `node tools/check-social.mjs`, `node tools/check-stories.mjs`, `cd tools/daily5 && node check.mjs --self-test`, rules tests with `npx firebase-tools@13 emulators:exec --only firestore --project demo-liarhunt "node tools/daily5/rules.test.mjs"` (Java 17).
- Work on branch `connected-daily5` (from the current HEAD). Commit per task. Never push without the owner's OK.

## Review Focus

1. **Reload or app switch mid-chapter** (WhatsApp, then back): searched spots, asked questions, heard statements, the accuse selection and a pending Revive choice all come back exactly. → Task 5 step "reload keeps chapter state", Task 7 step "reload at the Revive choice".
2. **A phone at 375 px and a landscape 800×450 screen** with 14 statements and 8 evidence: nothing is cut off, the evidence sheet scrolls, the Accuse button stays reachable. → Task 5 step "small screens".
3. **Dark mode**: scenes, icons and evidence slips stay readable (no black ink on dark paper). → Task 2 step "dark mode", Task 5 step "small screens" also checks dark.
4. **Offline at the moment of Accuse, Revive or Stop**: the existing `d5Fail` toast shows, nothing is lost, and the same choice is offered again. → Task 7 step "offline revive".
5. **A v1 story or a classic day still plays exactly as today** (old drafts, `?d5=local` v1 fixture, CrazyGames build). → Task 5 step "v1 still plays".

---

### Task 1: Seasons of 45 days

**Files:**
- Modify: `js/engine.js:621` (`SEASON_DAYS`)
- Modify: `firebase/firestore.rules` (ladder block, about lines 244–270: comment, `sFirst`, the `+ 27` bound)
- Modify: `tools/check-social.mjs:63-71` (season clock tests)
- Modify: `js/seasons.js` header comment, `README.md` (every "4 weeks" / "28 days" about seasons), `tools/daily5/prompts.mjs` and `WRITING.md` if they say 4 weeks
- Modify: `tools/daily5/social.rules.test.mjs` if it pins day 42/43

**Interfaces:**
- Produces: `WL.SEASON_DAYS === 45`; `WL.seasonOf(59) === 1`, `WL.seasonOf(60) === 2`; `WL.seasonEndsAt(1) === Date.UTC(2026, 11, 23, 18, 30)`.

- [ ] **Step 1: Snapshot the classic Dailies 15–59 before the change**

Run (from the repo root):
```bash
node -e "global.window={location:{search:'',hostname:'x'}};global.location=window.location;require('./js/cases.js');require('./js/seasons.js');require('./js/book1.js');require('./js/engine.js');const W=window.WL;const o={};for(let d=15;d<=59;d++)o[d]=JSON.stringify(W.daySpecs?W.daySpecs(d):d);require('fs').writeFileSync(process.env.TEMP+'/days-before.json',JSON.stringify(o))"
```
If `daySpecs` doesn't build the cases, use the function `check-cases.mjs` uses to build a day. Expected: a file with 45 entries.

- [ ] **Step 2: Update the season tests in `tools/check-social.mjs`**

```js
eq("S1 ends", WL.seasonEndsAt(1), Date.UTC(2026, 11, 23, 18, 30));
eq("last week", WL.seasonClock(Date.UTC(2026, 11, 18)).urgency, 1);
eq("not last week yet", WL.seasonClock(Date.UTC(2026, 11, 10)).urgency, 0);
eq("last day", WL.seasonClock(Date.UTC(2026, 11, 23, 6)).urgency, 2);
eq("S2 begins", [WL.seasonClock(Date.UTC(2026, 11, 23, 19)).season, WL.seasonClock(Date.UTC(2026, 11, 23, 19)).phase], [2, "during"]);
eq("season of day 59/60", [WL.seasonOf(59), WL.seasonOf(60)], [1, 2]);
eq("season length", WL.SEASON_DAYS, 45);
```
Keep "before S1" and "mid S1" as they are.

- [ ] **Step 3: Run it and see it fail**

Run: `node tools/check-social.mjs` — Expected: FAIL on "S1 ends".

- [ ] **Step 4: Set `SEASON_DAYS = 45` in `js/engine.js:621` (fix the comment: "45 days each")**

- [ ] **Step 5: Run the tests**

Run: `node tools/check-social.mjs` and `node tools/check-cases.mjs` — Expected: both PASS.

- [ ] **Step 6: Prove Dailies 15–42 didn't change**

Re-run Step 1's command writing `days-after.json`, then compare days 15–42: `node -e "const a=require(process.env.TEMP+'/days-before.json'),b=require(process.env.TEMP+'/days-after.json');for(let d=15;d<=42;d++)if(a[d]!==b[d]){console.log('CHANGED',d);process.exit(1)}console.log('15-42 unchanged')"`. Expected: `15-42 unchanged` (days 43–59 may change; they're in the future).

- [ ] **Step 7: Ladder rules to 45 days**

In `firebase/firestore.rules`: `function sFirst(s) { return 15 + (s - 1) * 45; }`, the bound `d.last <= sFirst(d.season) + 44`, and the comment "Season s = Dailies 15+45(s-1) to 59+45(s-1)". Leave the unused `seasons/{id}` block (4 league weeks) as it is. If `social.rules.test.mjs` posts a ladder day between 43 and 59 expecting season 2, move it to day 60+.

- [ ] **Step 8: Copy**

Replace season "4 weeks"/"28 days" wording in `js/seasons.js` header ("A season lasts 45 days"), `README.md`, `tools/daily5/prompts.mjs`/`WRITING.md`. The HQ card already prints `WL.SEASON_DAYS`.

- [ ] **Step 9: Run the social rules tests**

Run: `npx firebase-tools@13 emulators:exec --only firestore --project demo-liarhunt "node tools/daily5/social.rules.test.mjs"` — Expected: all ✓.

- [ ] **Step 10: Commit**

```bash
git add js/engine.js firebase/firestore.rules tools/check-social.mjs js/seasons.js README.md tools/daily5
git commit -m "Seasons last 45 days: Season 1 runs to Wed 23 Dec"
```

---

### Task 2: The art kit (`js/art.js`)

**Files:**
- Create: `js/art.js`
- Modify: `css/style.css` (scene and icon colours, light + dark), `index.html` (load `js/art.js` before `js/storycheck.js`), `sw.js` (add `js/art.js` to `CORE`, bump `CACHE` to `wl-v13`)
- Test: `tools/daily5/check.mjs --self-test` (art checks added here)

**Interfaces:**
- Produces:
  - `WLArt.ICONS: string[]`: at least these ids: `bin clock logbook coat window drawer receipt key phone camera photo crate boat rope lamp safe bag ticket letter laptop cup cashbox door car map tool bottle badge radio net` plus the lie icons `pins walker fog sum`.
  - `WLArt.icon(id: string): string`: `<svg class="ic" viewBox="0 0 32 32" aria-hidden="true" focusable="false">…</svg>`, strokes in `currentColor`; unknown id → the `clock` icon.
  - `WLArt.SCENES: { [id]: { name: string, anchors: { [anchor]: [x, y] } } }` with ids `lighthouse ferry office cannery museum hotel cafe boatyard pub yachtclub newsroom market`; 8–12 anchors each, x and y in percent (4–96).
  - `WLArt.scene(id: string): string`: `<svg class="scene-art" viewBox="0 0 320 210" role="img" aria-label="<name>">…</svg>`; fills use classes `sa-wall sa-floor sa-wood sa-glass sa-ink sa-paper sa-red sa-green sa-metal sa-water sa-night`, never hard-coded colours.
  - `WLArt.LIES: { time|place|travel|seen|holder|count: { icon, name, line } }` with names "Wrong time", "Two places at once", "Too fast", "Couldn't have seen it", "Who had it", "Doesn't add up".

- [ ] **Step 1: Write the failing art checks in `tools/daily5/check.mjs` (self-test section)**

```js
import { art } from "./lib.mjs"; // lib.mjs runs js/art.js in the same vm box as storycheck (Task 3 step 3 exports it)
expect("12 scenes", Object.keys(art.SCENES).length === 12);
expect("every scene has 8-12 anchors inside the frame", Object.values(art.SCENES).every((s) => { const a = Object.values(s.anchors); return a.length >= 8 && a.length <= 12 && a.every(([x, y]) => x >= 4 && x <= 96 && y >= 4 && y <= 96); }));
expect("every scene draws", Object.keys(art.SCENES).every((id) => art.scene(id).startsWith("<svg") && art.scene(id).includes('viewBox="0 0 320 210"')));
expect("scenes use no hard-coded colours", Object.keys(art.SCENES).every((id) => !/fill="#|stroke="#/.test(art.scene(id))));
expect("at least 30 icons, all draw", art.ICONS.length >= 30 && art.ICONS.every((i) => art.icon(i).includes("<svg")));
expect("six lie kinds", Object.keys(art.LIES).join() === "time,place,travel,seen,holder,count");
```
(If Task 3 isn't done yet, add `export const art = box.window.WLArt;` to `lib.mjs` after running `js/art.js` in the box, now.)

- [ ] **Step 2: Run and see it fail** — `cd tools/daily5 && node check.mjs --self-test` — Expected: FAIL (`WLArt` undefined).

- [ ] **Step 3: Write `js/art.js`**

Draw in the mockup's style (`daily5-polished-v2.html` in the session scratchpad: ink outlines 2–3 px, flat fills, plank floors, a time label is added by the chapter screen, not the drawing). Each scene places its anchors on the drawn objects (e.g. office: `window clock board desk logbook drawer bin coat lamp door`). Icons are 32×32 line drawings with `stroke="currentColor" fill="none" stroke-width="1.8"`.

- [ ] **Step 4: CSS for art** in `css/style.css`: `.scene-art .sa-*` fills from variables (`--paper`, `--surface`, `--ink`, `--grid-strong`, `--needle`, `--ok`, `--tag`, plus two new ones `--wood: #8e6a45` and `--glass: #a9bcc4`), with dark values in both dark-theme blocks (`--wood: #5b4430; --glass: #2c4236`). `.ic { width: 1.25em; height: 1.25em; }`.

- [ ] **Step 5: Run the checks** — Expected: the six art checks PASS.

- [ ] **Step 6: Dark mode check (browser)**

Start the `game` preview, then in the page: `document.body.insertAdjacentHTML('beforeend', '<div id="artcheck" style="position:fixed;inset:0;overflow:auto;background:var(--paper);z-index:9999">' + Object.keys(WLArt.SCENES).map(WLArt.scene).join('') + WLArt.ICONS.map(i => WLArt.icon(i)).join('') + '</div>')`. Screenshot in light, `resize_window colorScheme: "dark"`, screenshot again. Expected: every scene and icon readable in both. Remove `#artcheck`.

- [ ] **Step 7: Commit** — `git add js/art.js css/style.css index.html sw.js tools/daily5/check.mjs tools/daily5/lib.mjs && git commit -m "Art kit: 12 drawn scenes and a line icon set"`

---

### Task 3: Story format v2: checker, public docs, keys, fixture, tools

**Files:**
- Modify: `js/storycheck.js` (`clash`, `check`, `docs`, export `LIE_KINDS`)
- Modify: `tools/daily5/lib.mjs` (load `js/art.js` first; v2 Hunch; `checkRemix`; `saveDraft` moved here from `admin.mjs`; `importDraft` sets `for`/`remixOf`)
- Modify: `tools/daily5/admin.mjs` (use `saveDraft` from lib)
- Modify: `tools/daily5/check.mjs` (`--import`, `--player`, v2 self-tests)
- Create: `tools/daily5/fixtures/ferry-strongbox.json` (the v2 test story; never published)
- Modify: `tools/daily5/WRITING.md` (v2 section, see Task 9 for the full rewrite; here only the field table)

**Interfaces:**
- Consumes: `WLArt.SCENES`, `WLArt.ICONS` (Task 2).
- Produces:
  - `WLStory.check(story)` → `{ ok, errors, warnings, proofs, need, kinds }`; `story.v === 2` turns on the v2 rules, anything else runs v1 exactly as today. `kinds: { 1..4: lieKind }`.
  - `WLStory.LIE_KINDS = ["time", "place", "travel", "seen", "holder", "count"]`.
  - `WLStory.docs(story, res)` for v2:
    - `edition.fmt = 2`; `edition.cast[i].face` (`f00`–`f15`); `edition.cases[i].scene`.
    - chapter doc: `{ n, fmt: 2, mode: "liar", title, intro, previously, ask, need, scene, time, suspects: [pid], spots: [{ id, anchor, icon, label, text, finds }], evidence: [{ id, kind, title, source, time, text }], carried: [finding doc as v1's `carried()`], questions: [{ id, by, ask, needs: [eid], says: sid }], presses: [{ by, shown, says }], statements: [{ id, by, text }] }` (no claims, no answer, no lie kind).
    - verdict doc: as v1 plus `fmt: 2` and each option `{ id, label, icon? , face? }` (`face` for person options, from the cast).
    - reveal adds `lie: kind` for chapters 1–4.
  - `lib.mjs`: `split(story, day)` v2 Hunch for chapters 1–4 is `{ who: pid }` (a suspect of that chapter who isn't `by` of the answer, picked with the existing `pickBy`); verdict Hunch unchanged. v2 keys exactly as v1 (`{ s: answer, proofs: [proofKey] }`).
  - `lib.mjs`: `checkRemix(story, original) -> string[]` (empty = fine): `story.remixOf === original.id`; same people ids with the same names, roles and faces; a different mastermind id.
  - `lib.mjs`: `saveDraft(draft)`, `loadDraft(id)` (moved, same file layout as today).
  - `check.mjs --import <file> [--force]`: checks, `importDraft(story, "d5-" + story.id)`, saves; refuses an existing id without `--force`; prints ✓/✗ per file.
  - `check.mjs --player <file>`: prints JSON of what a player can ever see before answering: `edition` (without strikes) and chapter docs 1–5. No reveals, keys, `why`, `finale`.

**v2 rules for `check()`** (errors unless marked warning):
- top: `strikes === 2`; 5–6 people; each `face` matches `/^f(0\d|1[0-5])$/`, unique; optional `travel: [{ a, b, mins }]` with place ids, `1 <= mins <= 180`, no pair twice.
- travel clash: two non-`not` facts with the same `at:<person>` slot, different places, **not** overlapping, and `gap < mins(a, b)` where gap is the minutes between the end of the earlier and the start of the later. `clash(a, b, tr)` takes the travel map (`"l1|l2"` sorted key → minutes); v1 passes nothing. `closure` and every `clash` call inside `check` pass `tr`.
- chapters 1–4: `scene` in `WLArt.SCENES`; `time` HH:MM; `suspects` 3–5; `spots` 7–10, unique ids `/^x\d{1,2}$/`, `anchor` in the scene's anchors and unique in the chapter, `icon` in `WLArt.ICONS`, `label` ≤ 28, `text` ≤ 160, `finds` an evidence id of this chapter or `""`; every evidence found by exactly one spot; ≥ 2 empty spots; evidence 5–8.
- `statements` 8–14, each `by` a suspect; `questions` per suspect 2–3 (`ask` ≤ 90, `needs` ⊆ this chapter's evidence ids, `says` a statement by the same person); `presses` 1–4 (`by` a suspect, `shown` an evidence id of this chapter or a finding in `uses`, `says` a statement by `by`); every statement heard through exactly one question or press; at least one press by a suspect who isn't the liar.
- the answer statement is reachable only after evidence: its question has non-empty `needs`, or it's a press.
- every v1 rule about the truth, the single caught statement, proofs and findings still holds (the v1 "one statement per suspect, in order" rule is skipped for v2).
- `lie` in `LIE_KINDS`; `lie === "travel"` iff the answer's catching clash is a travel clash; `lie === "holder"` ⇒ the clashing slot starts `holder:`. Warning if the story has fewer than 4 kinds.
- chapter 5: exactly 4 parts with `about` `mastermind`, `accomplice`, `route`, `item` (one each); accomplice options are person ids or `none` (answer `none` only when no person has `part: "accomplice"`); every `route`/`item` option has an `icon` in `WLArt.ICONS`.

- [ ] **Step 1: Write the v2 fixture `tools/daily5/fixtures/ferry-strongbox.json`**

"The Ferry Strongbox" from the mockup: Port Ellery, $8,400 of ticket money; people Dev (ticket clerk), Otto (ferry captain), Bea (yacht club secretary), Kwame (night watchman), Ruth (mayor's aide, mastermind), Otto accomplice; four chapters using kinds `seen` (fogged window), `holder` (key log), `travel` (café receipt 21:52 vs cannery 21:58, 15 minutes), `count` (ticket stubs × fare), verdict route "fish crates", item "cannery cold room". Respect every v2 number above. Check it with Step 4's code as you write.

- [ ] **Step 2: Write the failing v2 self-tests in `check.mjs`**

```js
const v2 = JSON.parse(readFileSync(join(ROOT, "tools/daily5/fixtures/ferry-strongbox.json"), "utf8"));
const r2 = check(v2);
expect("the Ferry Strongbox (v2) passes", r2.ok, r2.errors.join("\n    "));
expect("v2 lie kinds", JSON.stringify(r2.kinds) === '{"1":"seen","2":"holder","3":"travel","4":"count"}', JSON.stringify(r2.kinds));
expect("v2 docs carry no answers", !/"answer"|"claims"|"why"|"lie"/.test(JSON.stringify(split(v2, 1).cases)));
expect("v2 hunch names a person", /^p\d+$/.test(split(v2, 1).hunch[1].who));
expect("the old Crown Job still passes as v1", check(good).ok);
const b2 = [
  ["v2 travel lie without travel times", (s) => { delete s.travel; }, /nothing the player knows catches|travel/],
  ["a spot on an unknown anchor", (s) => { s.cases[0].spots[0].anchor = "moon"; }, /anchor/],
  ["evidence no spot finds", (s) => { s.cases[0].spots.forEach((x) => { if (x.finds === s.cases[0].evidence[0].id) x.finds = ""; }); }, /found by exactly one spot/],
  ["the lie heard without any evidence", (s) => { const c = s.cases[0], q = c.questions.find((x) => x.says === c.answer); if (q) q.needs = []; else s.cases[0].presses = []; }, /only after|reachable/],
  ["a statement nobody can hear", (s) => { s.cases[1].questions.pop(); }, /heard/],
  ["two people share a face", (s) => { s.people[1].face = s.people[0].face; }, /face/],
  ["a verdict with three parts", (s) => { s.cases[4].parts.pop(); }, /4 parts|exactly 4/],
  ["strikes 1 in v2", (s) => { s.strikes = 1; }, /strikes/]
];
```
Run each broken copy like the v1 `broken` list does (each must fail with its regex).

- [ ] **Step 3: Load art into the checker box (`lib.mjs`)**: run `js/art.js` in `box` before `js/storycheck.js`; `export const art = box.window.WLArt;`. In `storycheck.js` read `window.WLArt` lazily inside `check()` (v2 errors "the art kit isn't loaded" if missing).

- [ ] **Step 4: Run and see the v2 tests fail** — `cd tools/daily5 && node check.mjs --self-test`.

- [ ] **Step 5: Implement the v2 rules in `check()`, `clash(a, b, tr)`, `docs()` v2, `LIE_KINDS`** (rules listed above).

- [ ] **Step 6: Implement `lib.mjs` changes** (`split` v2 Hunch, `checkRemix`, `saveDraft`/`loadDraft` moved, `importDraft` sets `meta.for = story.remixOf ? "night" : "daily"` and `meta.remixOf = story.remixOf || ""`), and the `check.mjs` `--import` / `--player` modes.

- [ ] **Step 7: Run everything** — `cd tools/daily5 && node check.mjs --self-test` (all ✓), `node check.mjs fixtures/ferry-strongbox.json` (✓ with proofs), `node tools/check-stories.mjs` and `node tools/check-book.mjs` (still PASS: v1 and Career unchanged).

- [ ] **Step 8: Remix check test** (in `check.mjs` self-test): a copy of the fixture with `remixOf: "ferry-strongbox"` and the same mastermind → `checkRemix` returns an error mentioning "mastermind"; changing the mastermind (and the verdict answer) → no errors; renaming a person → an error mentioning the name.

- [ ] **Step 9: Commit** — `git add js/storycheck.js tools/daily5 && git commit -m "Daily 5 story format v2: spots, questions, presses, lie kinds, travel times"`

---

### Task 4: Rules for the Revive (`strikes: 2`, `over`) and the client calls

**Files:**
- Modify: `firebase/firestore.rules` (Daily 5 block)
- Modify: `tools/daily5/rules.test.mjs`
- Modify: `js/leaderboard.js` (`d5.over`, local and Firebase)
- Modify: `tools/daily5/admin.mjs` (`play()` action `over`, `canSee` honours it)

**Interfaces:**
- Produces: `WLLB.d5.over(day: number) -> Promise<run>` (Firebase: `updateDoc(runRef(day), { over: true })` then returns the run; local: `d5local("over", 0, {})`). The run object may now carry `over: true`.

- [ ] **Step 1: Write the failing rules tests** (publish `ferry-strongbox` as `TODAY2 = TODAY + 2`-style extra day with `split(v2, day)`; or reuse TODAY with a second uid set; runs start with `strikes: 2`):

```js
await t("v2: a miss at case 1 still opens case 2 (the Revive)", ...);           // commit wrong c1, resolve 'r', getDoc cases/2 succeeds, commit c2 succeeds
await t("v2: a second miss locks the rest", ...);                              // grid 'rr' → cases/3 get fails, commit c3 fails
await t("over: allowed right after a miss, then nothing opens", ...);           // grid 'r' → update {over:true} ok → cases/2 fails, commit c2 fails
await t("over: refused without a miss, refused twice, can't be unset", ...);    // grid '' → fails; after over → {over:false} fails
await t("over: the Daily score posts with the grid padded", ...);               // score grid 'r----' accepted for an over run; 'rg---' refused
await t("over: the finale opens at the next midnight, not before", ...);        // end/finale get fails on TODAY for an over run
```

- [ ] **Step 2: Run and see them fail** — the emulator command from Global Constraints. Expected: the new tests ✗, all old ✓.

- [ ] **Step 3: Rules**
  - `function isOver(r) { return r.get('over', false) == true; }`
  - `canSee(r, n)`: the "next case" branch also needs `!isOver(r)`.
  - `d5Commit()`: add `&& !isOver(r)`.
  - new `d5Stop()`: `q.diff(r).affectedKeys().hasOnly(['over']) && q.over == true && !isOver(r) && reds(r.grid) >= 1 && reds(r.grid) < r.strikes && r.grid.size() < 5 && !(('c' + string(r.grid.size() + 1)) in r.picks)`; `allow update` adds `|| d5Stop()`.
  - `end/{doc}`: the "ran out of tries" branch becomes `(reds(...) >= strikes || isOver(myRun(...))) && request.time >= istStart(day + 1)`.
  - `d5ScoreOk`: accept `get(rp).data.get('over', false) == true` alongside the two existing conditions.

- [ ] **Step 4: Run the rules tests** — Expected: all ✓.

- [ ] **Step 5: `LB.d5.over` and the desk's `over` action** (`admin.mjs` `play()`: `case "over"` with the same checks as `d5Stop`; its `canSee` refuses the next case when `r.over`).

- [ ] **Step 6: Commit** — `git commit -am "Daily 5 rules: a second life after one miss, and stopping for the day"`

---

### Task 5: The chapter screen (`js/chapter.js`) wired into the Daily 5

**Files:**
- Create: `js/chapter.js`
- Modify: `index.html` (a `<section id="chapter" hidden>` inside `#scr-case` with header tabs, a body and the evidence sheet; load `js/chapter.js` after `js/book.js`), `sw.js` (`CORE` + `CACHE` `wl-v14` or next)
- Modify: `css/style.css` (chapter screen, scene pins, evidence slips per kind, speech bubbles, STORY CHANGED tag, LIE stamp, evidence sheet)
- Modify: `js/game.js`: `d5Case`, `loadCase`/`renderCase`, `d5Submit`, `d5Judge`, `nbData`, the Hunch for Daily 5, `mount` call
- Test: browser checks below, using `?d5=local&draft=d5-ferry-strongbox` from the admin desk

**Interfaces:**
- Consumes: v2 docs (Task 3), `WLArt` (Task 2), `WL.avatar(name, face)`.
- Produces:
  - `WLChapter.mount(api)` with `api = { $, esc, Snd, FX, toast, persist, avatar(name, face), openNotebook(tab), submit(pick), hunch() }`; `submit(pick: { s: sid, p: proofKey })` goes to `game.js` `d5Submit`.
  - `WLChapter.open(c, st)`: `c` is the case object from `d5Case` (below); `st` is this chapter's saved state `{ tab: "search"|"question"|"accuse", searched: [spotId], asked: [qid], pressed: ["by>shown"], heard: [sid], who: pid, pick: sid|"", proof: [id], hunchOut: pid|"" }`, kept at `S.d5[day].ch[n]` (created by `game.js`) and saved with `api.persist()` after every change.
  - `WLChapter.reveal(rev, right)`: marks the pick and its proof right/wrong, shows `rev.why` and the finding; locks the screen.
  - `WLChapter.found(c, st) -> eid[]` and `WLChapter.heard(c, st) -> sid[]` (for the notebook).
  - `game.js` `d5Case(doc, n)` for `doc.fmt === 2` returns `{ d5: true, fmt: 2, n, title, setup: doc.intro, prev: doc.previously, ask, mode, level, need, scene, time, suspects, spots, evidence, carried, questions, presses, statements, cast }` where `cast` maps pid → `{ name, role, face }` from the edition. Verdict docs with `fmt: 2` keep today's path (Task 6 restyles them).

Behaviour (from the spec, "A chapter"):
- Tabs Search / Question / Accuse, free to switch; a step shows a green tick when done (Search: every spot searched or ≥ evidence count found; Question: every open question asked; Accuse: committed). Keys: `1`/`2`/`3` switch tabs, `Esc` closes the sheet, `Enter` accuses when ready.
- Search: `WLArt.scene(c.scene)` with a time label (`fmtClock(c.time)`), pins at the scene anchors (red magnifier; searched = green tick; the first unsearched one pulses unless `prefers-reduced-motion`). Tapping opens the spot: label, text, and the evidence slip (class `slip k-<kind>`) or "Nothing useful here." A meter "Searched 3 of 7".
- Question: suspect card (face via `api.avatar`, name, role, "N statements"), a face strip to switch; questions whose `needs` are all found are open, a newly opened one is marked; others show one line "Find more evidence to ask more". Asking adds the statement (bubble with the time it covers is not in the doc; show the statement only). **Show evidence…** opens the sheet of found evidence + carried findings; a matching press adds its statement with STORY CHANGED; anything else: "<Name> doesn't know anything about that." (no statement).
- Accuse: step 1 lists heard statements grouped by suspect (faces); step 2 chips of found evidence + carried findings, pick exactly `c.need`; button "Accuse <name>" enabled when both are set; the Hunch greys out every statement by `st.hunchOut` with "Ruled out by your Hunch".
- The commit/resolve/reveal path stays in `game.js`; for `fmt: 2`, `d5Judge` calls `WLChapter.reveal(rev, right)` instead of `reveal()`, then `verdictDaily(right, how)` as today.
- The notebook (`nbData`) for `fmt: 2`: evidence = found only; "says" = heard only; the rest as today.

- [ ] **Step 1: Make the fixture playable** — `cd tools/daily5 && node check.mjs --import fixtures/ferry-strongbox.json`; start the desk (`node admin.mjs`), open `http://127.0.0.1:8787/?d5=local&draft=d5-ferry-strongbox&test=1`. Expected: today's classic Daily card still shows (nothing reads v2 yet) or an error in the console; note which.

- [ ] **Step 2: Write `js/chapter.js` and the markup/CSS; wire `game.js`** (interfaces above).

- [ ] **Step 3: Browser check: a full right path**

In the desk preview: open the case file, search every spot in chapter 1, ask every question, press one innocent suspect (expect a changed statement), accuse the fixture's answer with its proof. Expected: "Case cracked"-style verdict, finding in the notebook, chapter 2 opens with the case 1 finding among the proof chips. `read_console_messages` onlyErrors: none.

- [ ] **Step 4: Browser check: reload keeps chapter state** (Review Focus 1)

Mid-chapter 2: search 3 spots, ask 2 questions, select a statement; `location.reload()`. Expected: same tab, same 3 green ticks, same heard statements, same selection.

- [ ] **Step 5: Browser check: small screens** (Review Focus 2 and 3)

`resize_window` 375×812 and 800×450, light and dark: every tab, the open sheet, the accuse list with all statements heard. Expected: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), Accuse button visible after scrolling, text readable in dark. Screenshot each.

- [ ] **Step 6: Browser check: v1 still plays** (Review Focus 5)

`node check.mjs --import fixtures/crown-job.json` (id `d5-crown-job`), play case 1 at `?d5=local&draft=d5-crown-job`. Expected: today's classic Daily 5 screen, unchanged. Also `?test=1` without a draft: the classic Daily plays.

- [ ] **Step 7: Run the checkers** — all commands in Global Constraints except the emulator. Expected: PASS.

- [ ] **Step 8: Commit** — `git add js/chapter.js js/game.js index.html css/style.css sw.js && git commit -m "Daily 5 chapters: search the scene, question suspects, accuse with proof"`

---

### Task 6: HQ folder card, the chapter intro and the Verdict, polished

**Files:**
- Modify: `js/game.js` (`renderToday` for a Daily 5 day, `d5Intro`, `renderVerdictParts`, `revealVerdict`), `css/style.css`, `index.html` if the today card needs new slots

**Interfaces:**
- Consumes: `edition.fmt`, `edition.cast[].face`, `edition.cases[].scene`, `edition.cases[].title`, `WLArt.scene`, `WLArt.icon`.

- [ ] **Step 1: HQ card** for a day whose loaded edition has `fmt === 2`: folder with the tab "DAILY 5 · #<day>", a CONFIDENTIAL stamp, eyebrow "One crime · five chapters", the title, the first chapter's scene in a polaroid with the edition `place` as caption, `edition.intro`, five chapter pins on a red dashed thread (pin = chapter number, current one red, done ones ticked from `S.daily.results`, the fifth shows the scales icon), the suspects row (faces + first names), the button "Open the case file", and "About 20 minutes · the same story for every detective". A v1 edition or a classic day keeps today's card.

- [ ] **Step 2: Chapter intro card** (`d5Intro`) for `fmt: 2`: chapter number and title, the scene thumbnail, the "previously" line, and the chapter's suspects' faces.

- [ ] **Step 3: Verdict** for `fmt: 2`: person options as face tiles (5 per row at 375 px), `none` as a "Nobody" tile, route/item options as icon chips; on a right verdict a CASE CLOSED stamp (CSS, `prefers-reduced-motion` = no rotation animation).

- [ ] **Step 4: Browser check** — play the fixture to the verdict in the desk preview at 375 px and 800×450, light and dark; screenshot HQ, an intro card, the verdict before and after submitting. Expected: matches the mockup's layout; no console errors.

- [ ] **Step 5: Commit** — `git commit -am "Daily 5 look: case folder on HQ, chapter cards, picture verdict"`

---

### Task 7: The Revive (Daily and Career)

**Files:**
- Modify: `js/ads.js` (`adsenseBreak` resolves `null` for a rewarded break that never started), `js/platform.js` (`rewarded` passes `null` through; CrazyGames `adError`/no fill → `null`; update the header comment)
- Modify: `js/game.js` (`d5Over`, `d5Results`, `verdictDaily`, `startD5`, `d5Api` past-day `over`, a `revive(name)` helper)
- Modify: `js/book.js` (phase `"revive"`)
- Modify: `index.html` / `css/style.css` for the two-button verdict footer if `setVerdict` can't show it

**Interfaces:**
- Produces: `Plat.rewarded(name) -> Promise<true|false|null>` (`null` = no ad could play; existing callers treat it as falsy, unchanged). `game.js` `revive(name: string) -> Promise<boolean>`: `!Plat.hasAds()` → `true`; else `Plat.rewarded(name).then(ok => ok !== false)`.

- [ ] **Step 1: Daily Revive**
  - `d5Over(r)` is also true when `r.over`; `d5Results` pads with `-` when `d5Over`.
  - `verdictDaily` for a missed chapter 1–4 when `!d5Over(run.d5.r)`: banner "You get one second chance today.", buttons **Revive: watch a short ad** (`revive("d5_revive")` → true: `st.revived = n`, `persist()`, `d5Next()`; false: toast "No reward this time. You can try again or stop.") and **Stop for today** (`run.d5.api.over(run.day)` → `run.d5.r = st.run = r`, `finishDaily()`; failure → `d5Fail`).
  - `startD5`: if the run's last letter is `r`, it isn't over, `grid.length < 5` and `st.revived !== grid.length`, show the same choice instead of opening the next chapter.
  - Past-day replays (`d5Api` for a past day) get `over` locally (`prog.d5run.over = true`).
  - Story Night (`memNight`, strikes 99) never shows the choice.

- [ ] **Step 2: Browser check (desk preview, `?ads=demo`)**: miss chapter 1 → choice shows; Revive → demo ad → Claim → chapter 2 opens; miss chapter 2 → results screen with `❌❌🔒🔒🔒`. Second run (desk "reset" action): miss chapter 1 → Stop → results `❌🔒🔒🔒🔒`. Third run: with `?ads=demo` close the ad (no reward) → toast, choice still there.

- [ ] **Step 3: Browser check: reload at the Revive choice** (Review Focus 1): miss chapter 1, reload. Expected: the choice again, not chapter 2.

- [ ] **Step 4: Browser check: offline Revive/Stop** (Review Focus 4): with the desk stopped (or `navigator.onLine` faked by blocking `/api/play` via devtools offline), tap Stop. Expected: the `d5Fail` toast, the choice stays; back online the same tap works.

- [ ] **Step 5: Career Revive** (`book.js`): when `mistake()` reaches `MAX_MISTAKES` and `!R.revived && !R.replay && !mine`, `R.phase = "revive"`: copy "The case is falling apart." / "Watch a short ad to keep going with your stars, or try the step again for 1 star." with **Revive: watch a short ad** (via `api.Plat` and the same `revive` rule: no ads → free; `false` → toast, stay) → `R.revived = true; R.mistakes = MAX_MISTAKES - 1; R.phase = "play"; saveWip(); render(true)`, and **Try again** → today's `"fail"` retry. `saveWip`/`open` keep `revived`. A second fall-apart goes straight to `"fail"`.

- [ ] **Step 6: Career check** — `?test=1&ads=demo`, `__WLtest.book.start(1)`, make 3 mistakes on step 1 → revive choice → Revive → still 2 stars possible; 1 more mistake (3rd again) → "The case fell apart." retry. `node tools/check-book.mjs` PASS.

- [ ] **Step 7: Commit** — `git commit -am "Revive: one rewarded second chance in the Daily 5 and in Career"`

---

### Task 8: Story Night: past cases, new twist

**Files:**
- Modify: `tools/daily5/admin.mjs` (publishing a night writes `remixOf`, `origDay`, `origTitle` into `nights/{id}`; `origDay`/`origTitle` come from the original draft's `meta.day` and title; import of a remix runs `checkRemix` against the original draft and shows its errors)
- Modify: `js/game.js` (lobby story list ~3640: a remix row reads "Past case, new twist: <origTitle>" with "Daily #<origDay> · Someone else did it this time"; remixes with `origDay >= TODAY` are hidden; `roomLimit` returns 480000 for a night whose edition has `fmt === 2`; Story Night `fmt: 2` chapters open in `WLChapter` like the Daily)
- Modify: `js/leaderboard.js` `nights.list()` only if it drops the new fields

**Interfaces:**
- Consumes: `checkRemix` (Task 3), `WLChapter` (Task 5).

- [ ] **Step 1: A remix fixture** for tests only: write `tools/daily5/fixtures/ferry-strongbox-remix.json` (same people and faces, mastermind Dev instead of Ruth, rewritten chapters). `node check.mjs fixtures/ferry-strongbox-remix.json` ✓ and the self-test from Task 3 step 8 also checks this file with `checkRemix` → `[]`.

- [ ] **Step 2: Lobby + clock + chapters in rooms** (code above).

- [ ] **Step 3: Browser check** with `?lb=demo` (rooms across two tabs): host a Story Night, the remix shows as "Past case, new twist" (seed a fake nights entry the way `?lb=demo` does, or publish to the emulator), both tabs play chapter 1 on the v2 screen with an 8:00 clock.

- [ ] **Step 4: Commit** — `git commit -am "Story Night: past Daily 5 cases retold with someone else guilty"`

---

### Task 9: Writer kit and the first stories

**Files:**
- Modify: `tools/daily5/WRITING.md` (v2 is the format to write; v1 stays documented as "older stories"; a "Writing in Claude Code" section: write to `~/.liarhunt/daily5/inbox/<id>.json`, `node tools/daily5/check.mjs <file>` until ✓, blind solve, `--import`)
- Create: `tools/daily5/BLIND.md` (the prompt for the blind solver subagent: it gets only `check.mjs --player` output and must name, for each chapter, the lying statement, its proof, the lie kind and which spots/questions it needed; then the verdict. Pass = all right, and every chapter needed at least one search and one question)
- Content (outside the repo): `~/.liarhunt/daily5/inbox/*.json`

- [ ] **Step 1: Docs** — write both files.

- [ ] **Step 2: Write 7 stories** for the first week the new format is live (Season 1, Port Ellery, `js/seasons.js` places mapped to scene ids; each uses ≥ 4 lie kinds; no two stories share a mastermind's role; masterminds are never the season's locals (`cast`)). For each: check ✓ → blind solve with a fresh subagent per `BLIND.md` → fix and repeat until it passes → `check.mjs --import`.

- [ ] **Step 3: Add `scene` ids to Season 1's places** in `js/seasons.js` (`places` becomes `[{ name, scene }]` or a parallel `scenes` map, whichever `prompts.mjs`/`WRITING.md` read more simply) and run `node tools/check-cases.mjs`.

- [ ] **Step 4: Commit the docs and seasons change** (never the stories) — `git add tools/daily5/WRITING.md tools/daily5/BLIND.md js/seasons.js && git commit -m "Writer kit for v2 stories written in Claude Code"`

---

### Task 10: Final verification and shipping

- [ ] **Step 1: All checks** — every command in Global Constraints, including both emulator suites. Expected: all PASS.
- [ ] **Step 2: Whole-branch review** — a fresh reviewer reads `git diff main...connected-daily5` against the spec; fix what it finds.
- [ ] **Step 3: Owner step: rules deploy** — show the owner the rules diff and ask for an explicit OK; then `npx firebase-tools@13 deploy --only firestore:rules --project whoslying-daily` (from the repo root; `firebase.json` points at `firebase/firestore.rules`).
- [ ] **Step 4: Owner step: ship** — with the owner's OK, merge to `main` and push (Cloudflare deploys). Check liarhunt.com loads, the classic Daily still plays, and the HQ season card says "day N of 45".
- [ ] **Step 5: Owner step: publish stories** — the owner opens the desk, plays each imported story from the desk, approves, schedules from the first new day, and publishes (needs `gcloud auth application-default login`).
- [ ] **Step 6: Update memory** (`liarhunt-status`, `liarhunt-game-modes`, `liarhunt-daily5-pipeline`) with what shipped.
