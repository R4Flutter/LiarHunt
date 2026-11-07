# Playing with friends: Google Analytics, Partners, Story Night

Date: 2026-11-03. Status: waiting for approval.

## Why

LiarHunt is mostly played alone. Live rooms already exist (one link, up to 10 players racing through the same 5 cases), but there is only one way to play together. This adds two new ways to play with friends and turns analytics on, so we can see whether friends actually join, start and finish games.

- **Partners** creates cooperation: two players, each holding half of the case.
- **Story Night** creates a shared evening: a group plays one five-case mystery together.
- **Google Analytics** shows whether any of it works. Today the game already sends events, but nothing receives them (`plausibleDomain` is empty).

## How friends play (owner's words)

Friends talk on a phone call or WhatsApp. LiarHunt has **no chat or voice of its own**. The game only has to keep working while people flip between WhatsApp and the browser, and room links shared in WhatsApp must open straight into the room (including inside WhatsApp's own browser).

## Goals

1. Google Analytics replaces Plausible.
2. Room analytics cover the full funnel: create, invite, join, start, finish, rematch.
3. Partners mode in live rooms.
4. Story Night mode in live rooms, using its own pool of stories.
5. The story pipeline can remix a past Daily 5 story into a Story Night story.
6. A one-page Liar's Table rules sheet for a paper test. **No Liar's Table code.**

## Non-goals and anti-goals

- No in-app chat, voice or messaging.
- No server or Cloud Functions. The site stays static, with Firestore rules and anonymous sign-in.
- No new runtime dependencies in the game.
- Existing race rooms must keep working exactly as now (a room with no `mode` is a race room).
- The Daily 5 rules and its locked answer keys are not loosened in any way. Story Night never reads `d5` or `d5keys`.
- Story Night stories never appear as a Daily, and Daily stories never appear in Story Night.
- Anti-goal: a mode where one player can finish without talking to the other. That would make Partners pointless.

## Constraints

- Vanilla JS, no build step. The game lives in `js/game.js` (screens, rooms), `js/engine.js` (cases, `WL.track`), `js/leaderboard.js` (Firebase and the `LB.rooms` API), `js/config.js`.
- Anything web-only goes between the `WEB-ONLY:START/END` markers in `index.html` (the CrazyGames build strips them).
- Friend rooms run on the honor system: each player's own phone checks their answers and writes their own score, just like race rooms today. That's acceptable because rooms never feed public leaderboards. Don't add security theatre here.
- Firestore rules change, so the owner must deploy them (`firebase deploy --only firestore`). Never deploy them from the build session.
- Copy follows the game's existing voice: short, plain English, second person.
- Must work at phone width (375px), and must survive the tab being hidden and shown again (switching to WhatsApp).
- Multi-tab local testing already exists: `?lb=demo` keeps rooms in localStorage, so several tabs on one computer can share a room.

## Part 1: Google Analytics

- `js/config.js`: replace `analytics.plausibleDomain` with `analytics.gaId` (a GA4 measurement ID like `G-XXXXXXX`). Empty means analytics stay off.
- `index.html` (inside WEB-ONLY): when `gaId` is set, load `https://www.googletagmanager.com/gtag/js?id=<gaId>`, set up `dataLayer`/`gtag`, and call `gtag('config', gaId)`. Events sent before the script loads must queue, not drop.
- `js/engine.js` `track()`: keep the gtag line, remove the Plausible line.
- `privacy.html`: replace the Plausible paragraph. Say we use Google Analytics to count visits and see which parts of the game people use; it uses cookies; in the EEA and UK it only runs with consent, through the same Google consent message used for ads.
- Owner's job, outside the code: create the GA4 property, paste the ID, and turn on the AdSense "Privacy & messaging" consent message for the EEA/UK.

## Part 2: Room events

All room events carry `mode` (`race`, `partners`, `night`).

| Event | When | Extra data |
|---|---|---|
| `room_create` | host opens a room | `mode` |
| `room_invite` | someone taps Invite | `mode` |
| `room_join` | a player joins | `host: true/false` (the host's own join is currently counted as a normal join, which inflates conversion) |
| `room_start` | host starts the game | `players` |
| `room_end` | a player sees the final scores, once per player per game | `players`, `host` |
| `room_rematch` | host taps Play again | `players` |

## Part 3: Partners

**Entry.** The Live room button opens a small choice: **Race** (today's room), **Partners**, **Story Night**. The room doc gets `mode`.

**Players.** Exactly 2. The host's Start button turns on when the second player is in. A third person opening the link sees "This Partners room is full."

**Cases.** The same cases race rooms use (`WL.roomCase`), 5 per game.

**Sides.** Every case has two sides:
- **Suspects side:** sees the setup and every suspect's statement. The facts list is replaced by a card: "Your partner has the facts. Ask them."
- **Facts side:** sees the setup, the suspects' names and roles (no statements: "Your partner has their stories"), and the full facts list.

Case 1: the host is on the Suspects side. Players swap every case.

**Answering.** Cases already have two steps: pick, then prove. The player who can see the pick (`pickKind()`) makes the first tap; the other player makes the proof (`proofKind()`). For liar and honest cases, that means the Suspects side accuses and the Facts side proves. Planted cases flip it, which is fine.
1. The picker locks their pick. It's saved to their room entry, and it can't be changed (one try, like race rooms).
2. The prover's screen updates to "Your partner accused Maya. Tap the fact that breaks her story." The prover can't tap a proof before the pick arrives.
3. The prover locks the proof. Both phones show the same verdict, worked out with the existing verdict logic from both halves.

**Clock and points.** 3 minutes per case, because talking takes time. Team points: 100 for a proven catch, plus up to 50 for speed, spread across the 3 minutes. Both players' entries hold the same team total.

**Partner leaves.** The room shows "Your partner left the room." The game stops there; the host can invite someone new and start again.

**End screen.** Team score, cases solved out of 5, Share, and "Play again with new cases".

## Part 4: Story Night (in the game)

**Stories.** Read from a new public collection, `nights/{id}`:
- `nights/{id}`: the edition (same shape as a `d5/{day}` edition doc: title, place, intro, cast...)
- `nights/{id}/cases/{n}`, `nights/{id}/reveals/{n}`, `nights/{id}/end/finale`: same shapes as the Daily 5 docs

Everything is public to read and no player can write. No answer keys are uploaded: each reveal already holds the answer, and friend rooms run on the honor system.

**Lobby.** The host picks a story from a list (newest first: title, place, and a "you've played this" mark from local progress). If no stories are published yet, the Story Night choice shows "Coming soon" and is disabled. The room doc gets `mode: "night"` and `story: <id>`, with 5 rounds. Up to 10 players, start at 2 or more. Each player's room entry gets `seen: true` if their own phone has played this story before, and the lobby tags them "played it".

**Playing a case.** Everyone plays case n on their own phone, using the Daily 5 case screen (notebook, findings carried from earlier cases, evidence, and the case 5 verdict questions). Differences from the Daily: no hunch, no hints, no strikes. A wrong answer scores 0 and you keep playing with the group. Answers are checked on the player's phone against the public reveal, the same comparison `game.js` already makes for Daily 5 (`pick.s === reveal.answer.s` and the proof is in `reveal.answer.p`).

**Clock and points.** 5 minutes per case. 100 for a right case, plus up to 50 for speed, spread across the 5 minutes. The room moves on when everyone has answered or time runs out.

**Between cases.** The room screen shows "What case n revealed" (the reveal's finding text) to everyone. The host taps Next case. If the host doesn't, any player can move it on after 90 seconds, matching the existing stuck-round rule.

**After case 5.** Everyone sees the full ending (the finale) and the scoreboard, plus "Play another story" for the host.

## Part 5: Story Night remixes (pipeline and admin desk)

**Generator.** `node tools/daily5/generate.mjs --remix <draft-id>` writes a new draft from a past Daily story:
- Its brief keeps the original's `setting`, `crime` and `cast` size, and picks a **different** `mastermind` and `herring` (from the same lists, excluding the original's).
- The avoid list holds the original's title and every character name.
- It runs the normal pipeline: blueprint, checker, wording, AI solvers, critic.
- The draft's meta gets `for: "night"` and `remixOf: <original id>`.
- One extra hard check: if any character name from the original appears in the remix, the draft fails, the same way a checker failure does.
- `--dry-run` must work for remixes, so the whole flow can be tested for free.

**Admin desk.**
- Every published Daily draft gets a **Remix for Story Night** button, which runs the generator in the background as the desk already does for batches.
- A night draft is reviewed and approved like any draft. Then it gets **Publish to Story Night** and **Take down** buttons, instead of a Daily schedule. Publishing writes the `nights/{id}` docs with the same split the Daily uses, minus the keys.
- A night draft can't be scheduled as a Daily.

## Part 6: Liar's Table rules sheet

Write `docs/liars-table-rules.md`, one page, no code:
- **Version A:** the liar knows. They get the case with one key fact missing and must bluff.
- **Version B:** the liar doesn't know. They get one fact quietly changed.
- How to run each on a WhatsApp call using a normal case from the game: the host deals the cards by private message, then a discussion timer, then a vote.
- Rules for: tie votes, the liar caught at once, someone not talking, someone dropping off the call.
- A short checklist of what to watch for, so the owner can tell which version is fun.

## Firestore rules changes

- `rooms/{code}` create: also allow `mode` (one of `race`, `partners`, `night`) and `story` (a string of at most 40 characters, only when `mode` is `night`). A missing `mode` stays valid.
- `rooms/{code}/players/{uid}`: also allow `seen` (a bool).
- New: `nights/{id}` and everything under it: read for anyone, write for no one (the admin desk writes with the Admin SDK, which skips the rules).

## My calls (check these)

- Partners: 3 minutes per case, and players swap sides every case.
- Story Night: 5 minutes per case, no strikes (a wrong answer just scores 0), and the host moves the room between cases.
- The room choice is one small menu with three options, not three separate HQ tiles.
- Remixes keep the setting and kind of crime, and change the mastermind, the innocent liar's secret and every character.
- Google Analytics replaces Plausible completely; Plausible support is removed.

## Left to the builder

- Exact layouts and wording, within the game's existing style.
- How the Story Night case screen reuses the Daily 5 code (for example, a second source object with the same shape as `LB.d5`'s `edition`/`caseDoc`/`reveal`/`finale`).
- Rules tests for the new paths, if the emulator setup allows it.
- A built-in demo story for Story Night under `?lb=demo` (for example the Crown Job fixture), so it can be tested without Firebase.

## Open (owner)

- The GA4 measurement ID. Until it's pasted into `js/config.js`, analytics stay off and everything else works.
