# Polish pass: season ladder, leaderboard, friends, setup, audio, Daily 5 workflow, fixes

Date: 2026-11-07. Status: waiting for approval.

## Why

The owner played the game and wrote down ten problems and wishes (sign-in broken, unlimited renames, a pointless Case files button, leaderboards that don't say who is good, music that isn't tense enough, no say over your name or face, no sense of a season ending, too few stories). The goal is a polished, fixed game, not more features for their own sake.

## Goals

1. Google Sign-In works on liarhunt.com, and fails clearly where Google itself refuses it.
2. A name can be changed only once after it is first chosen.
3. Case files and Case Keys are gone.
4. Season 1 has a live countdown that visibly ticks down.
5. New players choose a name and an avatar during setup.
6. A **season ladder**: league points (LP) that rise on solves and fall on fails, five leagues, demotion, and a reset each season.
7. One leaderboard view built on the ladder: League (top 40), Today, Friends. No Rush board.
8. A Friends list of up to 8 friends replaces Friend groups.
9. Royalty-free detective music and sounds: separate moods for HQ, cases and Rush, plus rain ambience.
10. Daily 5 stories follow the season's town, and there is a write → export JSON → upload → publish workflow, enough to stock 30 days.

## Non-goals and anti-goals

- No server and no Cloud Functions. The site stays static; the Firestore rules remain the anti-cheat.
- No new runtime dependencies in the game.
- Released content stays frozen (Dailies #1–14, Book 1 answers, any started Daily 5 day).
- Level XP never goes down. LP is a separate number.
- Anti-goal: a ladder that a player can push up by editing requests. Every LP change must be checkable by the rules against the player's own posted Daily result.
- Anti-goal: strangers filling someone's friends list. Friends need the other player's OK.
- Writing Season 2's town (`js/seasons.js`) is out of scope. If it isn't written by Daily #43, Season 2 reuses Season 1's town, as it does today.

## Starting point

The working tree holds uncommitted work from an earlier session: Google Analytics in place of Plausible, room funnel events, and the Partners and Story Night room modes (spec `2026-11-03-friends-modes-design.md`). Run the checkers, then commit it on its own before this work begins, so the two changes stay separable. This plan builds on top of it.

## Owner decisions (from the conversation)

- LP is separate from level XP.
- Leagues are a **season ladder** with points marks, not the weekly top/bottom 20%.
- Remove **all** of Case files: the button, the screen and Case Keys.
- The Friends list **replaces** Friend groups.
- Inside a league, **LP ranks first**, then solve rate, then fail ratio.
- Daily 5 stories happen in the **season's town** (Port Ellery for Season 1).
- Music and sound effects come from **royalty-free sources found on the web**, not ElevenLabs.

---

## 1. Google Sign-In

**Cause (confirmed 2026-11-07):** the Firebase project's authorized domains are only `whoslying-daily.firebaseapp.com` and `whoslying-daily.web.app`. `liarhunt.com` is missing, so `linkWithPopup` fails with `auth/unauthorized-domain` for every player. The Google provider itself is on.

- **Owner step:** Firebase console → Authentication → Settings → Authorized domains → add `liarhunt.com`, `www.liarhunt.com` and `localhost`.
- **In-app browsers:** Google refuses OAuth inside embedded browsers (WhatsApp, Instagram, Facebook, Messenger, Snapchat, Line, TikTok), and many LiarHunt links are opened there. Detect them from the user agent. Instead of opening a popup that is bound to fail, show: "Google doesn't allow sign-in inside this app's browser. Open LiarHunt in Chrome or Safari to sign in." Offer a Copy link button. On Android, also offer an `intent://` link that opens the page in Chrome.
- Fix the README line that says `localhost` is already authorized.

## 2. Name: choose once, change once

- The first name is chosen in setup (part 4) or wherever the game asks for one today.
- After that, **one change**. The profile shows "You can change your name once." After the change, the field locks and says "Name locked."
- Stored in the save (`S.settings.nameChanges`). Existing players get their one change from now on, however many times they renamed before.
- CrazyGames is unchanged: the name comes from the CrazyGames account.
- `ponytail:` enforced in the game, not the rules (names live on many docs). A modified client could rename more. Add a rules check only if renaming abuse ever shows up.

## 3. Remove Case files and Case Keys

- Remove the HQ "Case files" button, the Case files screen, its results-screen links ("Back to case files") and every path that opens it.
- Remove Case Keys from the shop, the login calendar (day 7), the 7-day streak reward and the comeback gift. Each of those gives coins instead: login day 7 +100 coins on top of its coins; streak and comeback rewards +100 coins in place of the key.
- Keys a player already holds turn into **120 coins each**, once, on load, with a toast ("Case Keys are retired: you got N coins").
- Keep "How yesterday's story ended" (the finale link on the Daily card) and `archive.html`.

## 4. Player setup: name and avatar

- **When:** right after the training case on the web, as a "Create your detective" screen: pick a face, type a name, then "Start". The player plays first and names themselves second. (Builder's call; the owner can move it before the training case.) On CrazyGames, show only the face picker; the name comes from the SDK.
- **Faces:** a grid of 16 hand-picked sketches built with the existing portrait drawer (`WL.avatar`). Give it an explicit parameter set (hair, eyes, mouth, brows, glasses, beard, mustache, earrings) instead of a seed from the name. Store the choice as a short code (`S.settings.avatar`, for example `"f07"`).
- Players who never pick keep today's face drawn from their name, so nothing changes for existing players until they choose.
- The face is also changeable from the profile, any number of times (only the name is limited).
- Faces appear wherever a player's sketch appears today (profile, HQ, podium, board rows, rooms), and on other players' rows. That needs an `av` field on the ladder, scores and friends docs, allowed by the rules (a string of at most 4 characters matching the code pattern).

## 5. Season countdown

- The season card shows a live countdown that ticks every second: "Season 1 ends in 28d 04:12:09". It counts to midnight IST at the end of the season's last day (Season 1: Daily #42, Sun 6 Dec 2026, so Mon 7 Dec 00:00 IST).
- Before Season 1 starts (7–8 Nov), it counts down to the start instead ("Season 1 starts in 1d 10:22:41").
- Urgency: the last 7 days turn the countdown red. The last 24 hours show only hh:mm:ss with a slow pulse (none with reduced motion). The final day adds a one-line nudge on the Daily card: "Last day of Season 1: finish today to lock in your league."
- Reuse the existing `data-countdown` ticker used for "new cases in…".
- The HQ league card and season card merge into **one Season card**: season name and countdown, your league emblem, LP, and a bar to the next league's mark.

## 6. Season ladder (LP)

**Points per day**, from the posted Daily grid (`g` solved clean, `y` solved with a Hunch or hint, `r` wrong, `-` locked):

| Result | LP |
|---|---|
| Case solved perfectly (`g`) | +30 |
| Case solved with help (`y`) | +20 |
| Wrong answer at case 1 / 2 / 3 / 4 / 5 | −50 / −40 / −30 / −20 / −10 |
| Any wrong answer while in Bronze | 0 |
| Day not played | no change |

- A perfect Daily 5 day is +150. Classic Dailies (days without a story) score each case by the same table, so several wrong answers can each cost LP.
- LP never drops below 0.
- **Leagues and marks:** Bronze 0 · Silver 400 · Gold 1,000 · Platinum 1,800 · Diamond 2,800. Your league is always the highest mark at or below your current LP: reaching 400 makes you Silver, and falling back to 399 makes you Bronze again. Keep the numbers in one table so they're easy to tune later.
- Only named players have a ladder entry. A player without a name is asked for one (the setup screen) before their first entry.
- **Season start:** a player's LP starts at the mark of one league below where they finished last season (Gold 1,234 → Silver 400). New players start at Bronze 0.
- **Season end reward**, granted once when the player first opens the game in the new season, based on the league they finished in: Bronze 100, Silver 250, Gold 500, Platinum 1,000, Diamond 2,000 coins. Their best league becomes a badge next to their name. This replaces the season badges (Bronze 25 caught, etc.), the season scoreboard and the weekly league, which are all retired.
- **Stored** in a new `ladder/{season}_{uid}` doc: `uid, name, av, badge, season, lp, tier, days, solved, cases, fails, rate, failRate, last, updatedAt`.
  - `rate` = solved ÷ cases, where cases = 5 × days played, so locked cases count as unsolved (stored ×1000 as an int).
  - `failRate` = days with a wrong answer ÷ days played (×1000).
- **Rules check every write incrementally:**
  - `last` moves forward and is inside the season.
  - The player's `scores/{last}_{uid}` doc exists.
  - The new `lp` equals `max(0, old lp + points(grid of that day, old tier))`.
  - `tier` matches `lp` against the marks, and the counters move by exactly that day's numbers.
  - The first doc of a season starts from the mark derived from last season's doc (or 0).
  - These are one or two `get()` calls per write.
- `ponytail:` a day whose ladder write never happens (tab closed, offline) is simply skipped; there is no catch-up of several days in one write. A modified client could skip posting a bad day. The Daily 5 run docs already record every committed answer if this ever needs closing.
- Retire the old `league` and `seasons` writes and the weekly promotion notices. Their data stays untouched in Firestore.

## 7. Leaderboard

- Three tabs: **League** (default), **Today**, **Friends**. The Rush and Season tabs are removed, along with posting Rush bests (`endless`). The Rush personal best stays on the Rush tile.
- **League tab:** the top 40 of the season. Order by LP (which also orders by league, since leagues are LP marks), then `rate` (higher first), then `failRate` (lower first). That's one Firestore query with a composite index.
  - Each row: rank, face, name, badge, league emblem, LP, solve rate (for example 84%), fail ratio (for example 1 in 5 days).
  - League dividers between groups ("Gold League").
  - Your own row is pinned at the bottom when you're outside the top 40, with your rank from a count query.
  - The existing "fewer than 25 players" rule still hides "#N of M" wording, not the list.
- **Today tab:** today's Daily top 10, as now, with faces.
- **Friends tab:** part 8.

## 8. Friends (up to 8)

- Every web player gets a **friend code** (6 letters, from the room-code alphabet) and a friend link `?f=CODE`. Both appear in the Friends screen with Share and Copy buttons.
- **Adding:** enter a code or open a link → "Send friend request". The other player sees it the next time they open the game: "Raj wants to be friends · Accept / Decline". Accepting adds each to the other's list. Requests to a full list say "Their friends list is full." Your own list caps at 8.
- **Removing** takes them off both lists. Each side's game clears its own list the next time it sees the other side gone.
- **Friends screen** (the HQ "Friends" button and the Friends tab): each friend's face, name, league, LP, today's Daily result (or "not played yet"), solve rate, plus Challenge (the existing challenge link) and Remove.
- **Storage:**
  - `fcodes/{code}` → `{uid}`, created once, only if free
  - `friends/{uid}` → `{list: [uid…≤8]}`, owner-only writes
  - `friends/{uid}/inbox/{fromUid}` → a request. Only the sender creates it, only the receiver deletes it, at most one per sender, and readable by the receiver.
  - Friends' ladder and score docs are already public to read.
- **Friend groups are retired:** hide the group UI. A `?g=` link shows "Friend groups are now Friends. Ask your friend for their friend code." Group docs stay untouched.

## 9. Audio: royalty-free detective sound

All candidates below are **CC0** (free for commercial use, no credit required), checked on their pages on 2026-11-07. They're credited on the How to play page anyway, as thanks. Each download needs the owner's OK first (file, source, size).

| Use | Track | Author | Source | File |
|---|---|---|---|---|
| Case screens (suspense loop) | Unsolved Investigation, a seamless loop | isaiah658 | opengameart.org/content/unsolved-investigation | .ogg 2.2 MB |
| HQ and results (calm noir jazz) | Stay Around | Pro Sensory (Alex McCulloch) | opengameart.org/node/80256 | .mp3 1.7 MB |
| Rush (tense, faster) | Suspicious Loop (`sus_corner_loop.mp3`) | Hazmat Harry | opengameart.org/content/suspicious-loop | .mp3 1 MB |
| Alternatives | Moil (dark jazz, sax) · Drunken Saloon (noir blues loop) | Ruskerdax · iamoneabe | opengameart.org/node/158878 · /node/139016 | 7.4 MB · 6.8 MB |
| Rain ambience under cases | Rain on Window Loop (11 s) | alxl | opengameart.org/content/rain-on-window-loop | .wav 1.9 MB |
| UI clicks, taps, whooshes | Interface Sounds (100 files) | Kenney | kenney.nl/assets/interface-sounds | pack |

- **Moods:** HQ/results = jazz, a case = suspense loop + rain, Rush = tense loop, Daily 5 verdict (case 5) = suspense with the rain louder. Crossfade about 1.5 s between moods. Music still streams through one `<audio>` element at a time (no big decoded buffers) and still defaults off on phones. Rain follows the music switch.
- **Processing** (ffmpeg, on the owner's computer or in the session): trim to clean loop points, normalize loudness (music about −18 LUFS, SFX matched to each other), encode stereo MP3 at 96 kbps for music and mono for SFX. Keep the total new audio under about 2.5 MB.
- **SFX:** replace `tap`, `click` and `whoosh` with the best-fitting Kenney sounds. Keep the other SFX unless a CC0 replacement is clearly better. Bump the service worker cache name.
- `ponytail:` Claude can check licences, loop seams, loudness and size, but can't listen. The owner listens to the shortlist and can swap any track by dropping in a file with the same name.

## 10. Daily 5: season town and the publishing workflow

- **Season town:** `generate.mjs --season N` reads season N's pack from `js/seasons.js` (town name, tagline, places from its premises, its cast of locals) and puts it in the brief. Every story happens in that town. One or two locals appear as side characters; each story still invents its own suspects. Names from the Book 1 cast stay forbidden. The Indian city settings stay as the fallback when no `--season` is given.
- **Style:** tighten the writer prompt for a "cool, professional" crime-procedural voice: short declarative sentences, case-file headings, exact times and places, no jokes in evidence. Add `tools/daily5/WRITING.md`: the JSON shape with a filled example and the style rules, so a story can also be written by hand or with Claude in a chat.
- **Admin desk:**
  - **Import JSON:** upload a story file. It runs the checker and becomes a draft, with an optional "Run AI review" (solvers + critic).
  - **Export JSON:** download a draft, with a warning that the file holds the answers and must never be committed.
  - **Schedule a run:** fill consecutive empty days from day N with approved drafts in one click.
  - The existing approve → publish flow is unchanged.
- **Stocking 30 days** is an owner step: `node generate.mjs --count 30 --season 1` (about $90–150 in Claude API use, needs `ANTHROPIC_API_KEY`), review in the desk, schedule Daily #15 onward, publish (needs Google credentials). Season 1 starts Mon 9 Nov. Days with no published story keep playing the classic Daily, so a late start only means fewer story days.

---

## Firestore rules changes (owner deploys: `firebase deploy --only firestore`)

- New `ladder/{id}` with the incremental check (part 6), plus a composite index on `season` asc, `lp` desc, `rate` desc, `failRate` asc.
- New `fcodes/{code}`, `friends/{uid}` and `friends/{uid}/inbox/{from}` (part 8).
- `av` allowed on `scores` (create, and the name/badge update) and on `ladder`.
- Stop writing `league`, `seasons`, `endless` and `groups`. Leave their rules as they are, so old data stays readable and nothing breaks for older cached clients.
- Extend `tools/daily5/rules.test.mjs` with ladder and friends cases (a valid day, a faked LP, a wrong tier, a replayed day, a ninth friend, a request deleted by the sender).

## Order of work (each ships on its own)

1. Commit the existing uncommitted work.
2. Fixes: sign-in (code part), name once, remove Case files.
3. Season countdown and the merged Season card.
4. Setup: name and avatar.
5. Season ladder and leaderboard (rules + index).
6. Friends.
7. Daily 5 workflow and season town.
8. Audio.

## Constraints

- Vanilla JS, no build step. Web-only code goes inside `WEB-ONLY:START/END`. The CrazyGames build gets parts 2–5 and 9; leagues, friends and sign-in are web-only.
- Copy: short, plain English, second person.
- Works at 375 px, down to 800×450, in light and dark mode, and with reduced motion.
- After each part, `node tools/check-cases.mjs`, `node tools/check-book.mjs` and `cd tools/daily5 && node check.mjs --self-test` must pass. Rules tests must pass before handing the rules over.
- Never deploy rules from a session. Never commit drafts, keys or API keys.

## Calls made by Claude (check these)

- LP numbers, league marks and season-end coin rewards (all in one tunable table).
- Season start = one league below last season's finish.
- Setup comes after the training case.
- 16 preset faces; the face can change freely, only the name is limited.
- Existing Case Keys → 120 coins each.
- The league card and season card merge into one card.
- Friend requests need the other player's OK (no auto-add).
- The Today tab stays alongside League and Friends.
- Music picks: Unsolved Investigation (cases), Stay Around (HQ), Suspicious Loop (Rush), plus rain and Kenney clicks.

## Owner steps

1. Add `liarhunt.com`, `www.liarhunt.com` and `localhost` to Firebase Auth's authorized domains. This alone fixes Google Sign-In on desktop browsers.
2. OK each audio download, then listen to the result.
3. Run the 30-story generation with your API key, review, schedule, publish.
4. Deploy the Firestore rules and index after parts 5 and 6.
