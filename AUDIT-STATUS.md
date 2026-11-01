# Who's Lying? — audit remediation status

**Audit:** "Who's Lying? product audit" (1 Nov 2026, live site at commit `bb4c529`)
**Checked against:** working tree on `season-1-and-audit-fixes` (HEAD `53fd10c` + 446 uncommitted lines) and the live site `https://liarhunt.com`
**Checked on:** 1 Nov 2026

Status key: **DONE** = shipped and live · **PARTIAL** = shipped but narrower than the audit asked · **NOT DONE** = not implemented

---

## Headline

The big design problems are fixed. The proof step exists, two-fact lies exist, the content cliff moved, repeats are tracked, the Back button is handled, the privacy policy matches the game, empty leaderboards are hidden, and Season 1 gives the Daily a cast and a story.

**One P0 item is still open: analytics is wired but switched off.** `js/config.js` has `plausibleDomain: ""`, so every `WL.track()` call in the game throws its events into a queue that nobody reads. Nothing you do next can be measured until that's on.

| Phase | Audit items | DONE | PARTIAL | NOT DONE |
|---|---|---|---|---|
| P0 (critical this week) | 6 | 4 | 1 | 1 |
| P1 (next 2–4 weeks) | 7 | 6 | 1 | 0 |
| P2 (replayability) | 9 | 6 | 3 | 0 |
| P3 (future) | 5 | 2 | 0 | 3 |

---

## P0 · Critical this week

| # | Audit item | Status | Evidence |
|---|---|---|---|
| 1 | Remember recently seen facts and lines in every mode | **PARTIAL** | Rush: persisted seen-map in the save (60 facts, 120 lines, 16 premises, 30 names) — `js/game.js:758-770`, used at `js/game.js:744`, saved at `js/game.js:754`. Career: LRU avoid chain, but session-only (`js/engine.js:853`, `careerAvoid` is a module variable, lost on reload). Daily/Night: per-day chain only, never persisted per player. |
| 2 | Write hand-written cases past Daily #25 | **PARTIAL** | 32 medium / 32 hard / 32 twist, up from 25 each (`js/cases.js`). Cliff moved from Daily #25 (19 Nov) to Daily #32 (26 Nov). Daily #15+ now runs on Season 1 written packs (`js/engine.js:737-751`, `js/seasons.js`). **Missing:** the audit asked for 30 more days each and a `check-cases.mjs` guard that fails when fewer than 28 future days are hand-written — `tools/check-cases.mjs` only *prints* the number, it never fails. |
| 3 | Handle browser Back | **DONE** | `history.pushState` on first gesture, `popstate` closes the sheet or returns to HQ — `js/game.js:3139-3152`. Confirmed live. |
| 4 | Rewrite the privacy policy to match the backup | **DONE** | Short version, device section, anonymous sign-in, backup, deletion and leaderboard sections now agree — `privacy.html`. **Minor gap:** the audit asked for a real contact address; the page uses Instagram + GitHub issues instead. |
| 5 | Load analytics so `track()` works | **NOT DONE** | Loader and ~40 event names are in place (`index.html:604-613`, `js/engine.js:1241-1246`; `first_case_done`, `case_5_done`, `case_25_done`, `return_visit`, `daily_complete`, `share`, `challenge_open`…). But `plausibleDomain: ""` in `js/config.js:32` means no script is ever appended. **Live site confirms: analytics is off.** |
| 6 | Hide ranks and boards until 25+ entries | **DONE** | `RANK_MIN = 25` (`js/game.js:1596`); rank card switches to percentile wording only past 25 (`js/game.js:1924`, `js/game.js:1530`); board shows a "warming" message below 25 (`js/game.js:1971`, `js/game.js:1986`). |

---

## P1 · High impact

| # | Audit item | Status | Evidence |
|---|---|---|---|
| 1 | Point to the proof + botched cases | **DONE** | Every accusation now needs the fact that proves it (`run.phase = "proof"`, `startProof`, `toggleProof` — `js/game.js:855-887`, `js/game.js:996`); two mistakes botch the case, 0 stars, fresh retry (`js/game.js:1227-1235`, `js/progress.js:194-195`). Two-fact proofs supported (`js/engine.js:552`, `js/engine.js:711-713`). |
| 2 | Save the in-progress case so a reload can't reset it | **DONE** | `memo()` / `saveMemo()` store case number, wrong guesses, hint used, elapsed time and the action log; restored on load (`js/game.js:773-784`, `js/game.js:891-911`), per mode (`S.career.wip`, `S.night.cur`). |
| 3 | Phone layout with facts and suspects on one screen | **DONE** | Facts pane capped at 52%, suspects pane takes the rest, each scrolls on its own (`css/style.css:1071-1074`); header buttons now 44 px (`css/style.css:1077`). The audit's exact "numbered chips in a collapsible bar" was not built — the split-scroll approach was used instead. |
| 4 | Two-fact lies, 3–5 lies per fact, precise wording, better explanations | **DONE** | Season packs ship two-fact combos (`js/seasons.js`), two-claim statements ("one part true, one lie") and suspicious-but-true lines (`js/engine.js:809-811`, `js/engine.js:691-692`); motives added per premise (`js/seasons.js`, `motives`). |
| 5 | Calm the first session | **PARTIAL** | Daily-reward modal no longer fires on day one (`js/game.js:592-594`); toasts fold into the result card (`js/game.js:1348-1359`). **Still open:** a title level-up still opens a modal (`js/game.js:1361-1371`), and coins still have no sink players want (shop sells Magnifier / Freeze / themes only). |
| 6 | Fix the desktop result card | **DONE** | `.verdict { align-self: stretch; }` in the wide layout (`css/style.css:1016`). |
| 7 | Fix the copy bugs | **DONE** | Catch-up/practice no longer shows a bogus time (`js/game.js:1509`); leaderboard empty state now depends on whether you finished (`js/game.js:2023`); chapter map renamed "Career map" (`js/game.js:1679`); catch-ups counted separately and don't add to "days played" (`js/game.js:1408-1413`). |

---

## P2 · Replayability and engagement

| # | Audit item | Status | Evidence |
|---|---|---|---|
| 1 | Weekly difficulty curve for the Daily | **DONE** | `HEAT = [0,1,1,2,2,3,1]` — easy Monday, hard Saturday, Sunday mastermind (`js/engine.js:724-735`). |
| 2 | Rush rework | **PARTIAL** | Rules card on first run (`js/game.js:735-739`), one global 60-second clock with time bonuses per proof (`js/game.js:733`, `js/game.js:757`), combo, three lives. **Missing:** auto-advance after a correct answer (still a "Next case" tap — `js/game.js:1270`, `js/game.js:1312`) and the "one new rule every few cases" idea. |
| 3 | Anonymous percentiles and an honest player count | **DONE** | Everyone's Daily is posted unnamed; joining adds the name (`js/leaderboard.js:393`, `js/game.js:1644-1647`, `js/game.js:1529-1533`). Percentiles shown (`pctText`, `js/game.js:1597`). |
| 4 | Name prompt at share | **DONE** | First share asks for a name so challenges aren't signed "A friend" (`js/game.js:1631-1635`). |
| 5 | Newcomer clues for the Case of the Week | **DONE** | Days before your first visit come free — "what the squad found so far" (`js/game.js:66-67`). |
| 6 | Desktop scaling | **DONE** | `html.game { font-size: clamp(14px, …, 21px) }` (`css/style.css:108`) plus the two-column layout. |
| 7 | Audio diet | **PARTIAL** | Music now defaults **off on phones** (`js/game.js:3232-3233`); Firebase loads on demand, not at boot (`js/leaderboard.js:65-82`). **Missing:** all 17 sound effects still decode on the first tap (`js/audio.js:44` `loadAll()`), and the 662 KB music file is still fully decoded to ~16 MB in memory (`js/audio.js:133-135`) instead of streaming through an `<audio>` element. |
| 8 | Achievement progress bars | **DONE** | Every achievement shows `value / goal` plus a meter bar (`js/game.js:1767-1771`). |
| 9 | Detective notebook | **PARTIAL** | Facts can be ticked off as notes while you check each story (`js/game.js:857-859`). **Missing:** tagging suspects, and a persistent notebook across cases. |

---

## P3 · Future

| # | Audit item | Status | Evidence |
|---|---|---|---|
| 1 | Chapter stories with a recurring cast | **DONE** | Season 1 "The Port Ellery Files": named cast, per-premise motives, weekly mastermind cases built from the same cast (`js/seasons.js`, `js/engine.js:1071-1095`). |
| 2 | Write a case for your friends | **DONE** | Full case editor, packed into a shareable link, no server storage (`js/game.js:2564-2714`, `js/engine.js` pack/unpack, tested in `tools/check-cases.mjs`). |
| 3 | Rewarded ads, then one interstitial after the Daily | **NOT DONE** | Ads still `provider: "none"` (`js/config.js:55`). Rewarded-ad hooks exist but no ad decision has been made. |
| 4 | Paid case packs / supporter pass | **NOT DONE** | Nothing in the shop. |
| 5 | Hosting with long-lived caching | **NOT DONE** | Still GitHub Pages (`Cache-Control: max-age=600`); `_headers` is ignored there. |

---

## Design-hypothesis items (Section B, #15–#20)

| # | Hypothesis | Status | Evidence |
|---|---|---|---|
| 15 | Cases solved by reading, not reasoning | **DONE** | Proof step + two-fact proofs + two-claim statements + suspicious-but-true lines (`js/engine.js:552`, `js/engine.js:691`, `js/engine.js:809-811`). |
| 16 | Guessing costs almost nothing | **DONE** | Accusation must be backed by the proof fact; second wrong guess botches the case (`js/game.js:996`, `js/game.js:1227`). The Magnifier now rules out a *non-proving fact* during the proof step (`js/game.js:1005-1012`) — adapted from the audit's wording rather than "highlight the right fact". |
| 17 | Crime story doesn't connect to the puzzle | **DONE** | Premise → facts → motives → cast per season (`js/seasons.js`). |
| 18 | Difficulty doesn't grow | **DONE** | Weekly curve (`js/engine.js:725`) plus one new mechanic per chapter (`js/engine.js:809-811`). |
| 19 | More retention systems than puzzle | **NOT DONE** | The meta layer grew instead of freezing: seasons, season scoreboard, live rooms (446 uncommitted lines, not yet live). The audit asked for the opposite. |
| 20 | ~1 MB of sound for a text puzzle | **PARTIAL** | See P2 #7 above. |

---

## Section C — retention killers

1. **Solved by reading** → fixed (proof step, two-fact lies).
2. **Repetition then content cliff** → repetition fixed for Rush and in-session elsewhere; cliff pushed to Daily #32 but no guard added.
3. **Free guessing in Career** → fixed (botched cases, reload-proof progress).
4. **Empty social layer** → fixed (anonymous posting, percentile, boards hidden under 25).
5. **Mobile friction** → Back fixed, layout fixed, 44 px targets fixed; audio diet still partial.

---

## What to do next, in order

1. **Turn analytics on.** Create the Plausible site for `liarhunt.com`, paste the domain into `js/config.js:32`, deploy. Everything else you want to prioritise needs this first.
2. **Add the content guard to `tools/check-cases.mjs`** — fail the build when fewer than 28 future days are hand-written, and write the next batch of days so Daily #33+ is covered.
3. **Persist the seen-content map for Career and Daily**, not just Rush — reuse `rememberSeen()` from `js/game.js:765` so the 60-fact / 120-line map is fed by every mode.
4. **Auto-advance Rush** after a correct answer (skip the result sheet, stamp and go) and add the first "new rule every few cases" beat.
5. **Stream the music** through an `<audio>` element and load each sound effect on first use, so the first tap stops pulling ~1 MB.
6. **Finish the Sunday mastermind** so it needs reasoning — clues that interact, or a witness who is wrong, instead of a four-trait filter (`js/engine.js:1071-1095`).
7. Decide the ads question, then submit the CrazyGames build.

---

## Deployment state

- `origin/main` = `53fd10c` "Add Season 1, the proof step, a season scoreboard and written cases" — **pushed**.
- Live `liarhunt.com` confirmed serving the season code, the proof step, `pushState`, `RANK_MIN` and `seenAvoid`. The fixes are live.
- The working tree has **446 uncommitted lines** (11 files) adding **live multiplayer rooms** (`?room=CODE`, Firestore `rooms/{code}`) plus `firebase/firestore.rules` room rules. Not deployed, and the Firestore rules must be deployed before it works. This is also new meta, which is the one direction the audit warned against.

---

## Update: partly-done items finished (1 Nov 2026, later the same day)

| Item | Now | Where |
|---|---|---|
| Hand-written cases | **DONE** — 46 days (until Thu 10 Dec), 39 days ahead of today. `check-cases.mjs` now **fails** when fewer than 28 future days are hand-written. | `js/cases.js`, `tools/check-cases.mjs` |
| Notebook | **DONE** — tap the pencil on a suspect to mark "checks out" or "suspicious" (notes only, never an answer). | `js/game.js` `noteSuspect`, `renderNotes` |
| Rush | **DONE** — every 5 cases a new stage with one rule: fast clock, fog (tap a fact to read it), no magnifier, thin time bonus. | `js/game.js` `RUSH_RULES`, `stageCard` |
| Story arcs | **DONE** — Career has a ten-chapter story (Sergeant Okafor, Captain Reyes, the Collector): intro when a chapter starts and on the career card, outro when it's solved, both on the Career map. | `js/engine.js` `CHAPTER_STORY` |
| First session | **DONE** — below level 5 cases pay 60% XP: about one level-up in the first session instead of four. Existing levels are untouched. | `js/progress.js` `rookie()` |
| Desktop case board | **DONE** — wide screens show the case as a framed cork board: pinned case sheet, evidence tags and suspect files, label-tape headings, and a red string from the accused to the proof. | `css/style.css`, `js/game.js` `paintStrings` |
| Music on desktop | **DONE** — streamed through one `<audio>` element instead of a ~16 MB decoded buffer. The service worker leaves byte-range requests alone. | `js/audio.js`, `sw.js` |
| Crime time window | **DONE** — Season cases say when the crime happened ("It happened between 7 PM and midnight.") and only use facts from that time of day. Checked for 1,500 cases. | `js/engine.js` `FACT_AT`, `js/seasons.js` `at` |
| Analytics | **Still waiting on you** — Umami is wired on branch `feature/analytics-umami`; it needs your Website ID. | `.worktrees/feature-analytics-umami` |

Side effect to know about: generated Season cases (Daily #15+, Career, Rush, Night Shift from #15) changed with the time-window filter. Days 1–14 are unchanged (hash check passes). A Career case left half-way before this update restarts clean instead of replaying old taps onto a new case.
