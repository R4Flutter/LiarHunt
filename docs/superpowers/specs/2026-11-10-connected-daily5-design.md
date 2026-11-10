# Connected Daily 5: investigation chapters, revive, 45-day seasons, past stories with a twist

Status: design, waiting for the owner's OK. Written 2026-11-10 (Daily #16).

## Why

The owner opened HQ and saw "5 new cases": five unrelated cases with 3 suspects each. Each feels simple, and a
lucky tap wins a third of the time. The connected Daily 5 (one story in five cases, a notebook, a verdict) is
already in the code, but it only switches on when a story is published for that day, and none ever has been
(Firestore `d5/14`, `d5/15`, `d5/16` don't exist). So players have never seen it.

The owner wants:

- one crime a day, told across five chapters, with the same suspects all day;
- Career-style investigation in every chapter (search, question suspects, then accuse), so a blind guess doesn't work;
- many kinds of lie, not one;
- cases that are long and hard;
- friends to replay past Daily 5 stories with a twist;
- better art and a polished look (mockup v2, approved 2026-11-10: drawn scenes, an icon set, evidence that looks real,
  the game's own suspect faces);
- seasons of 45 days;
- one miss followed by a Revive (watch a rewarded ad), in the Daily and in Career;
- no Claude API spending. Stories are written by Claude in Claude Code, on the owner's own Claude plan.

## Goals

1. On a day with a story, the Daily is one connected investigation of about 20 minutes.
2. Chapters 1 to 4: **Search → Question → Accuse**. Chapter 5: **the Verdict**.
3. An accusation names the lying statement **and** its proof (1 or 2 pieces). With about 8 to 14 statements and 5 to 8
   pieces of evidence plus earlier findings, a guess almost never works.
4. Six kinds of lie appear across the season's stories (below). Each story uses at least four of them.
5. One miss: the player can Revive by watching a rewarded ad and carry on. A second miss ends the day.
6. Friends' rooms (Story Night) offer past Daily 5 stories retold so that someone else did it.
7. Seasons last 45 days.
8. Art in the game's ink-on-paper style, drawn in code (SVG), following light and dark mode.
9. Stock stories for Season 1 from the first day the new format is live, written in Claude Code sessions.

## Non-goals

- Changing the classic Daily. A day without a story still plays it, exactly as today (and on CrazyGames always).
- A new Career book. Career only gets the Revive.
- Calling the Claude API from any tool. `generate.mjs` stays in the repo but isn't part of this workflow.
- In-game chat or voice. Friends talk on WhatsApp calls, as always.

## Anti-goals (a failure even if it technically works)

- **Released content changes.** Dailies #1 to #14 stay hash-frozen, released Career answers stay locked
  (`tools/book1-lock.json`), and a published Daily 5 day never changes once it has started.
- **The anti-cheat gets weaker.** The server still judges every Daily 5 answer against keys players can't read. The
  Revive is the only new freedom, and it still records the miss.
- **Cases you can guess.** If testing shows a chapter can be solved without searching or questioning, the story fails review.
- **Heavy downloads.** No image files for scenes or icons; no new runtime dependencies; no build step.
- **Secrets in the public repo.** Story files with answers live only in `~/.liarhunt/daily5`, never in the repo.

## Constraints (from the project)

- Plain HTML/CSS/vanilla JS, scripts as IIFEs setting a global. Web-only code inside `WEB-ONLY:START/END`.
- Works at 375 px wide and at 800×450, by keyboard (1–5, Enter, Esc), and survives switching apps mid-case.
- Copy: short, plain English, second person, the case-file voice in `tools/daily5/WRITING.md`.
- The day turns over at midnight IST. Firestore rules deploy **before** a game push that writes new fields, and only
  with the owner's explicit OK at that moment. Deploy = push to `main`.
- `node tools/check-cases.mjs`, `node tools/check-book.mjs`, `node tools/check-social.mjs`,
  `cd tools/daily5 && node check.mjs --self-test` and the rules tests must pass.

## What the owner decided

| Topic | Decision |
|---|---|
| Who writes stories | Claude, inside Claude Code sessions on the owner's plan. No API key, no API bill. |
| Season length | 45 days for every season, starting with Season 1 (Daily #15 to #59, ending Wed 23 Dec 2026). Season 2 starts Daily #60, Thu 24 Dec. |
| A miss | One miss, then the player can Revive by watching a rewarded ad. A miss after reviving ends the day. Same Revive in Career. |
| Friends' twist | "Someone else did it": a past story retold with a different guilty person. |
| Look | Mockup v2 (`daily5-polished-v2.html` in the session scratchpad; its parts are described below). |

## The player's day

### HQ card (a day with a story)

A manila case folder ("DAILY 5 · #N", a CONFIDENTIAL stamp): the story title, a small drawn picture of the crime
scene with a one-line caption, a two-sentence setup, five chapter pins joined by a red dashed thread (chapter names
under them, the current one red), a row of the day's suspects (faces + names), a red **Open the case file** button and
"About 20 minutes · the same story for every detective". A day without a story keeps today's card.

### A chapter (1 to 4)

A header with the chapter number and title and "n / 5", and three step tabs: **Search**, **Question**, **Accuse**.
Players may move between the tabs freely; a finished step shows a green tick. The notebook button stays where it is.

**Search.** A drawn scene of the chapter's place (time in a label, e.g. "Harbor office · 11:40 PM") with 6 to 9 red
magnifier pins on things. Tapping a pin opens it: a short description, and either a piece of evidence (added to
the notebook, marked NEW) or "Nothing useful". A searched pin turns into a green tick. A meter shows "Searched 3 of 7".
Evidence appears as the real thing: a till receipt for a receipt, a lined logbook page for a log, a polaroid for a
photo, a typed sheet for a document, a phone screen for a phone record, a camera still with a timestamp for CCTV, a
statement card for a witness, a luggage tag for an object.

**Question.** A suspect card (big face, name, role, "3 statements") and a strip of all of this chapter's suspects to
switch between. Each suspect has 2 or 3 questions. Some are locked until a certain piece of evidence is found
("Find more evidence to ask more"); a newly opened one is marked. Every answer is a statement (shown as a speech
bubble with the time it covers). **Show evidence…** opens a sheet of the player's evidence and findings; showing a
suspect the right piece gets a new answer marked STORY CHANGED. Innocent people react too (they explain), so a
changed story is never proof by itself. Showing something that means nothing to them gets a stock line ("I don't
know anything about that"), not a statement.

**Accuse.** Step 1: "Which statement can't be true?" lists every statement the player has heard in this chapter,
grouped by suspect with their face. Step 2: "What proves it? 1 or 2 pieces", as chips from this chapter's evidence
and the notebook's findings. **Accuse <name>** commits it. The pick gets a LIE stamp.

- Right: the chapter closes with its `why`, the finding goes into the notebook, the next chapter opens.
- Wrong (first miss of the day): "That doesn't hold up." The truth of this chapter is shown (as today's reveal) and its
  finding still goes into the notebook. Then a choice: **Revive: watch a short ad** (carry on to the next chapter) or
  **Stop for today** (the day ends; the full story opens at midnight as today).
- Wrong after a Revive: the day ends.
- The free Hunch stays: once a day it rules out one suspect who tells no lie in that chapter (in the Verdict, one
  wrong option).

### The Verdict (chapter 5)

Four questions with picture answers: **Who planned it?** and **Who helped?** (faces, plus "Nobody"), **How?** and
**Where is it now?** (icon chips). **Close the case** submits, and a CASE CLOSED stamp lands on a right verdict. A
wrong verdict ends the day with a ❌ for chapter 5; there is no Revive and no second try on the Verdict, because
it is the last chapter and a retry would need a looser rule. *(Claude's call.)*

### After the day

Unchanged: results, share grid (✅ ☑️ ❌ 🔒), rank, the full story and chronology, the public archive after 6 AM.
A revived chapter shows ❌ in the grid; the grid has no separate Revive mark.

## Kinds of lie

Each lie in a chapter is one of these. A story uses at least four kinds across chapters 1 to 4.

| Kind | Icon | Example | How the checker sees it |
|---|---|---|---|
| Wrong time | clock | "I left at 9." The door log says 9:40. | `at:` / `state:` facts clash in time (exists) |
| Two places at once | two pins | Says the café; a photo shows the pier. | `at:` clash (exists) |
| Too fast | walker | At the café at 9:52, claims the cannery at 9:58; it's a 15-minute walk. | **new** travel rule |
| Couldn't have seen it | fog | "I watched the pier from the window." Fog inside the glass. | `state:` clash (exists) |
| Who had it | key | "The key never left me." The log shows it signed out. | `holder:` clash (exists) |
| Doesn't add up | adding machine | "I counted $8,400 in." 210 tickets × $40 = $8,400 means... | `state:` with a number; the sum is written in the evidence text (exists) |

**The new travel rule.** A story may list travel times between its places: `travel: [{ a: "l1", b: "l2", mins: 15 }]`.
Two facts `at:<person>` = A (ending at t1) and `at:<person>` = B (starting at t2) clash when
`|t2 − t1| < mins(A, B)`. Travel times are symmetric. Places with no listed time never clash this way.

Each chapter's `lie` field names its kind (one of `time`, `place`, `travel`, `seen`, `holder`, `count`), so the
desk can show the mix and the checker can warn when a story uses fewer than four kinds.

## Story format v2

A v2 story is the v1 story (`tools/daily5/WRITING.md`) with these changes. v1 stories still play (as today's
screen), so nothing already written breaks.

- Top level: `v: 2`, `travel` (optional, above).
- `people`: 5 or 6, all of them suspects somewhere in the day. Each gets a `face` (`f00`–`f15`) so the same face
  follows them all day; two people never share a face.
- Chapters 1 to 4 (`mode: "liar"`) add:
  - `scene`: a scene id (below) and `time` ("23:40").
  - `spots`: 7 to 10 `{ id, anchor, icon, label, text, finds }` (so 5 to 8 pieces of evidence). `anchor` is a named spot in that scene's drawing,
    `icon` is from the icon set, `finds` is an evidence id or `""` (nothing useful). At least 2 spots find nothing.
    Every evidence item is found by exactly one spot.
  - `suspects`: 3 to 5 people ids.
  - `questions`: per suspect 2 or 3 `{ id, by, ask, needs, says }`. `needs` is a list of evidence ids (empty =
    open from the start); `says` is a statement id.
  - `presses`: `{ by, shown, says }`: showing evidence (or a finding id) `shown` to `by` gets statement `says`
    (STORY CHANGED). 1 to 4 per chapter, at least one from a suspect who isn't lying.
  - `statements`: 8 to 14, each heard through exactly one question or press. Same `{ id, by, text, claims }` shape.
  - The lying statement must be reachable only after finding at least one piece of evidence (its question `needs`
    something, or it's a press). So the player has to search and question to even hear the lie.
  - `answer` (the lying statement), `lie` (its kind), `why`, `finding`, `timeline`, `uses`: as v1.
  - As in v1, the checker proves exactly one statement clashes with this chapter's evidence plus earlier findings,
    and lists every proof of 1 or 2 pieces. From chapter 2 on, every proof needs an earlier finding.
- Chapter 5 (`mode: "verdict"`): as v1, with exactly 4 parts: `mastermind`, `accomplice` (options include "Nobody"
  as id `none` when it fits), `route` and `item` (where it is now). Route and item options get an `icon`.

**What the public case doc carries.** Everything a player can see: scene, spots, evidence, questions, presses,
statements. Not the answer, the lie kind, the proofs or the `why` (those stay in `reveals` and `d5keys`, as now).

## The anti-cheat with a Revive

The server keeps judging each answer with the existing two writes (commit the pick, then resolve it against
`d5keys`), and keys stay unreadable. `pick.s` is a statement id; `pick.p` is a proof key (one id, or two ids joined
the way `proofKey` already joins them).

- Every v2 story is published with `strikes: 2`. The rules already end the run at `reds >= strikes`, so a second
  miss ends the day on the server too.
- The Revive is the ad. The client only opens the next chapter after the ad's reward (or for free while
  `ads.provider` is `"none"`, which is what `WLAds.rewarded` already does). Skipping the ad by calling Firestore
  directly gains a cheater one extra try, with the miss still on their grid and LP. That is accepted.
- **Stop for today** needs one new rules path: the player may set `over: true` on their own run (that key only, once,
  while the day is open). `canSee` refuses new chapters when `over` is true, `end/finale` opens at midnight for an
  over run as for one out of tries, and `d5ScoreOk` accepts an over run whose grid is padded with `-`.
- A player who closes the game at the Revive choice comes back to the same choice.
- `over` may only be set right after a miss (one red in the grid, the next chapter not yet committed).
- **No ad available** (an ad blocker, or no ad to show, which `WLAds.rewarded` reports as no reward): the player
  gets the Revive anyway. *(Owner's decision.)* A player who closes the ad themselves (`adDismissed`) does not;
  they stay at the choice and can try again or stop.

## Career Revive

Today a third mistake on a step makes "the case fall apart": the player retries the step and the mission can earn
at most 1 star. New: at that moment, **Revive: watch a short ad** lets the player carry on with that step where it
was (mistakes back to 2, star potential unchanged). One Revive per mission attempt. If the case falls apart again,
it's today's retry. Replays and players' own stories get no Revive.

## Friends: past stories, someone else did it

Story Night (room mode `night`) already plays five-case stories from `nights/{id}`, judged on each phone. New:

- A **remix** is a past Daily 5 story retold: same town, same places, same opening crime and **the same people**
  (names, roles, faces), but a different mastermind. The accomplice and the innocent liars may change too, and every
  chapter's evidence, lies and findings are rewritten, so remembering the original doesn't help. It is written in v2
  format with `remixOf: <original story id>`. The checker refuses a remix whose mastermind matches the original's.
  (The old API remix in `generate.mjs` made a new cast instead; it isn't used.) *(Claude's call, from the owner's
  pick "someone else did it".)*
- In the room lobby's story list, a remix shows as "**Past case, new twist**: <original title>", with the original's
  Daily number and a line "Someone else did it this time".
- A remix becomes playable only after its original's day has ended (the original is public by then).
- Remixes are written in Claude Code sessions like Daily stories and published with the admin desk as nights.
- Story Night plays v2 chapters with the same Search / Question / Accuse screens. No Revive in rooms (one try per
  chapter, as today's Story Night). The room's per-chapter clock grows to fit a v2 chapter (the builder picks the
  number; about 8 minutes).

## Art

All drawn as inline SVG in the game's palette (`--ink`, `--paper`, `--surface`, `--needle`, `--tag`, `--ok`), so dark
mode works through CSS variables. No image files.

- **Scenes** (new `js/scenes.js`, global `WLScenes`): one drawing per place *type*, each about 320×210 with 8 to 12
  named anchors (x, y in %) where pins can sit. Season 1 needs 12: lighthouse, ferry terminal, harbor office, cannery,
  museum hall, hotel room, café, boatyard, pub, yacht club, newsroom, fish market. Later seasons map their places to
  these types or add new ones. `seasons.js` places gain a `scene` id.
- **Icons**: one set of about 30 line icons (bin, clock, logbook, coat, window, drawer, receipt, key, phone, camera,
  photo, crate, boat, rope, lamp, safe, bag, ticket, letter, laptop, cup, cash box, door, car, map, tool, bottle, badge,
  plus the six lie kinds). Stories may only use ids from this set; the checker refuses others.
- **Evidence slips**: one CSS style per evidence `kind` (as in the HQ list above).
- **Small touches** from the mockup: folder + stamp on HQ, red thread of chapter pins, STORY CHANGED tag, LIE stamp,
  CASE CLOSED stamp, pulsing pin on the next unsearched spot, green ticks.
- Motion stays small and respects `prefers-reduced-motion`.

## Seasons of 45 days

- `SEASON_DAYS = 45` in `js/engine.js`. Season s covers Dailies `15 + 45(s−1)` to `59 + 45(s−1)`.
- Firestore rules: the ladder's `sFirst` and its `last <= sFirst + 27` bound become 45-based. (The old `seasons`
  scoreboard rules, built on 4 league weeks, are no longer used by the game; leave them.)
- Everything that says "4 weeks" or "28" about seasons is updated: HQ season card ("day x of 45"), `seasons.js`
  header, README, `tools/check-social.mjs`, the Daily 5 tools' season brief.
- Season 2's pack (town, places with scene ids, cast, premises, facts, combos; Season 1's is about 280 lines) is
  needed before Thu 24 Dec 2026, or the game quietly reuses Port Ellery. **It is not part of this build**: it's a
  separate task, after this ships, and the owner picks the town then. *(Claude's call on scope.)*

## Writing the stories without the API

- `tools/daily5/WRITING.md` becomes the v2 guide, with a full v2 example in `fixtures/` (a v2 Crown Job).
- In a Claude Code session, Claude writes a story file into `~/.liarhunt/daily5/inbox/`, runs the checker on it, fixes
  it until it passes, and then has a fresh subagent solve it blind (it sees only what a player would see). A story
  the blind solver can't solve, or solves without searching, is rewritten.
- The owner imports the inbox in the admin desk (**Import JSON**, which exists), plays each in the game from the desk,
  approves, schedules and publishes, as today. Publishing still needs the owner's Google credentials.
- Days that have no story yet play the classic Daily. Stocking all of Season 1 takes several sessions; each session
  aims for about a week of stories.

## Left to the builder

- Exact layout, spacing and animation, within the mockup's look.
- How scenes' anchors are named and placed, and the exact icon drawings.
- How v2 data is stored in Firestore docs (fields on the existing `cases/{n}` docs is fine).
- Whether the step tabs remember the last open tab per chapter.
- Test fixtures and how the checker's new errors are worded.
- Splitting the work into commits and the order of shipping, as long as rules go live before the game needs them.
