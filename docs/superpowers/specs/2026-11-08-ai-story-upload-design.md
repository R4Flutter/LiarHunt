# Player stories made with an AI chat — design

Date: 2026-11-08. Status: waiting for the owner's approval.

## Why

Players want to make bigger mysteries than the one-case form in "Write a case", but almost nobody will write a full five-case story or a long investigation by hand. So the player only brings the idea. An AI chat they already use (ChatGPT, Claude, Gemini…) does the heavy writing in a fixed format we give them. The game checks the result strictly, turns it into a playable story and lets them share it with friends.

The player never writes the full story. They write their idea; the AI writes the file; the game does the rest.

## The flow (what the player sees)

1. **Write a case** stays the only entry point (the owner's rule: "Write a case and Create a case are the same"). At the top the player picks one of three:
   - **Quick case**: today's hand-written form. Nothing about it changes.
   - **Daily 5 story**: five connected cases (see Formats).
   - **Career investigation**: a short investigation in missions (see Formats).
2. For the two AI kinds the screen shows three numbered steps:
   1. **Copy the blueprint**: copies the instructions for the AI to the clipboard. Next to it, **Download the blueprint (.txt)** for people who'd rather attach a file.
   2. "Paste it into ChatGPT or any AI chat, then add your idea: the place, the crime, the people."
   3. **Paste the AI's reply** into a box, or **upload the file** (.json or .txt). Then **Check my story**.
3. **If the check fails:** a numbered list of problems in plain English, each saying where ("Case 3, Maya's statement: …"), plus a **Copy the problems for the AI** button. It copies a ready message ("Fix these problems in the LiarHunt story and send the whole JSON again: 1. … 2. …") to paste back into the same chat. The player repeats until the story passes. Nothing can be played or shared before it passes.
4. **If it passes:** a card with the title, the cast and how many cases or missions, with **Try it**, **Send to friends** and (Daily 5 only) **Play in a room**.
5. **Friends** open the link and play it: one try per case, no hints, like quick cases today.

## Goals

- A player with an idea and a free AI chat can turn it into a playable Daily 5 story or a short Career investigation, without writing the story themselves.
- A strict check: a story with no right answer, or two right answers, never reaches a player.
- The player plays it, sends it to friends by link, and (Daily 5 style) plays it with friends in a team-up room.

## Non-goals

- **No PDF blueprint.** *Builder's call:* a .txt file does the same job (every AI chat accepts it, and copying is easier on phones). A PDF can come later if players ask.
- **No AI inside the game.** The game never calls an AI: no API keys, no server, no cost.
- **Stories are not stored online** (except while a room is playing one, see Rooms). Like quick cases, the whole story travels in the link.
- **No rewards.** Friends' cases give no XP or coins today (`verdictFriend`), and these don't either, so nobody can farm coins with their own stories.
- **No Career investigations in rooms** for now. A group playing a long Career investigation together needs its own design.
- **No editing inside the game.** Fixes happen in the AI chat; the game only checks.
- **No word filter** beyond what the game has now. Nothing is published anywhere; only people with the link see it.

## Anti-goals (a failure even if it works)

- A broken story (no answer, two answers, a clue found after it's needed) gets played by a friend.
- Book 1, the Daily 5 Daily, Story Night's published stories, quick-case links or the owner's Daily 5 tools behave differently, or the Book 1 answer lock (`tools/book1-lock.json`) changes.
- A bad file (wrong JSON, huge text, HTML or script in the text) crashes the game or runs code. Every piece of player text goes through `esc()` before it's shown.
- Players have to read or understand JSON. They only paste and press buttons.

## Formats

The blueprint asks the AI for **JSON**, not free text: the game can read it exactly and say precisely what's wrong. The game tolerates the usual AI wrapping. It strips ```` ``` ```` fences and anything before the first `{` or after the last `}`.

### Daily 5 style

- **Exactly the existing Daily 5 story JSON** (`tools/daily5/WRITING.md`, example `tools/daily5/fixtures/crown-job.json`): people, places, items, acts, truth facts, 4 liar cases + 1 verdict, finale.
- Differences from the owner's stories: the season-town rule doesn't apply; `id` and `strikes` are ignored (the game sets them).
- **Play rules (builder's call):** Story Night's rules. One try per case, no Hunch. A wrong answer scores 0 for that case, the case reveals its answer and its finding still goes in the notebook, and the story carries on. The result is "X of 5 solved", which friends can send back.
- Played on the Daily 5 case screen with the notebook, the same way Story Night plays a story: an adapter like `nightApi` (game.js) that serves the case documents, reveals and finale from memory instead of Firestore.

### Career style (short)

- **The same shape as `WL_BOOK1`** (js/book1.js), cut down to one chapter: `title`, `tagline`, `people`, `evidence`, `chapters` (exactly one, with its intro), `missions` (**3 to 6**), `ending` (`text`, `hook`). `board` is optional.
- Every Book 1 step type is allowed: search, talk, timeline, compare, link, accuse, think. The last mission ends with an accusation.
- Played by the same Career player (js/book.js) with the dossier, mistakes and stars. book.js reads `window.WL_BOOK1` when it loads today, so it must learn to play another book object. Book 1 keeps its progress and works exactly as now.
- **Progress (builder's call):** a half-played investigation survives a reload. It's saved per story (keyed by a hash of the story) in the save, and only the last 5 player stories are kept.

## The strict check

- **Daily 5 style:** the checker the owner's tools already use (`check()` in `tools/daily5/lib.mjs`). It proves that each case has exactly one liar, that the clash needs an earlier finding from case 2 on, that every wrong verdict option is ruled out, and that text lengths and counts are within limits. **Errors block. Warnings** (style notes like "long sentence") are shown under the errors but don't block.
- **Career style:** every structural rule in `tools/check-book.mjs`: people and evidence exist, evidence is found before it's needed, every step has a valid answer and enough wrong choices, counts and text lengths are within limits, and the question says how many to pick. It skips the Book 1-only rules (30 missions, the season-name rule and the answer lock). **Known limit, accepted by the owner:** the code can't prove that a piece of evidence really breaks a statement. The player sees that when they try their own story.
- **One checker, two users.** The checks move into a plain browser script (one file, no build step, sets a global) that the game loads, and that the Node tools load too (with `vm`, the way check-book.mjs already loads book1.js). The owner's desk and the game then can't drift apart. After the move, `node tools/daily5/check.mjs --self-test` and `node tools/check-book.mjs` must pass unchanged.
- **Guards before checking:** input over 60 KB is refused. A JSON error gives one plain message: "This isn't a complete story file. Ask the AI to send the whole thing again as one JSON code block." Ids must be short, plain ids. At most 20 problems are listed, then "…and N more".
- **Links are checked again when opened.** The link carries the whole story, not a pre-cut version, and the friend's game runs the same check before playing. A hand-edited or damaged link shows "This story link is broken" and never a broken puzzle.

## Sharing by link

- It uses the same `?w=` link and packing as quick cases (`WL.packWritten` / `unpackWritten`, compressed), with a kind marker so the game knows a quick case from a Daily 5 story or a Career investigation. Old quick-case links keep working unchanged.
- Size measured on 2026-11-08: a full Daily 5 story makes a link of about 5,200 to 6,300 characters, and a 6-mission Career investigation about 7,800. The 9,000 limit in `unpackWritten` goes up to **12,000 for story links** (quick cases keep 9,000). A story over the limit is refused at the check with "Too long for a link. Ask the AI to shorten it (fewer suspects, shorter texts)."
- The player's own recent stories (last 5) are kept on the device, so they can send one again or pick it for a room.

## Team-up rooms (Daily 5 style only)

- In a Story Night room the host can pick **A story I made** (from their recent stories) as well as the published ones.
- The room carries the packed story code, so every player's phone unpacks it, checks it and plays it. The rest of Story Night stays the same (shared clock, host moves the room on, honor system).
- **Firestore rules change (owner step):** today the room's `story` field is an id of at most 40 characters (`okStory` in firebase/firestore.rules). Rooms need one more field for the packed code (a string of up to 12,000 characters, only in `night` mode). The owner deploys the rules **before** the game push, or rooms can't save the field.

## The blueprints

- There are two blueprints, one per style, each a static .txt file served by the site. The game fetches it when the screen opens, so **Copy** works straight away on phones.
- Each one holds: what LiarHunt is (two lines), the full format with every field and limit, the rules the checker enforces, written so an AI can follow them, one complete short example, "ask the player for their idea if they didn't give one", "check your answer against these rules before replying", and "reply with one JSON code block only".
- The Daily 5 blueprint reuses `WRITING.md` and `crown-job.json`. The Career blueprint describes each step type the way `check-book.mjs` checks it, and its example is a cut-down version of Book 1 Chapter 1.
- Voice: the game's own (short, plain English, second person). Non-violent crimes only, and no real people or brands, as in WRITING.md.
- **Acceptance test:** for each style, a story written by an AI chat from the blueprint alone passes the check within 3 fix rounds. If it can't, the blueprint gets better; the check never gets looser.

## What must not change

Book 1 (answers, progress, lock file), the Daily 5 Daily and its Firestore rules, published Story Night stories, quick cases and their links, and the CrazyGames build. The new parts follow "Write a case" wherever that is available (the share button already says when links can't be shared). Also unchanged: the owner's Daily 5 tools and their tests, and work at 375 px width and through tab switches.

## Tests that must pass

- `node tools/check-cases.mjs`, `node tools/check-book.mjs`, `node tools/check-social.mjs`, `cd tools/daily5 && node check.mjs --self-test`.
- New: the browser checker passes `crown-job.json` and the Book 1 Chapter 1 sample, and fails a few broken copies of each with the right plain message (a small Node script, in the style of the existing checkers).
- In the browser: paste and upload both styles, a failing file and its problem list, try it, a link round trip in a second tab, a Story Night room with a player story across tabs (`?lb=demo`), and 375 px width.

## Owner steps

1. Deploy the Firestore rules change for rooms before the game push.
2. Read one of the blueprints and say if the tone is right.

## Left to the builder

Screen layout and wording (in the game's voice), file names, how book.js learns to play another book, save keys, the link's kind marker, the blueprint wording and its example, and how the Copy button falls back when the clipboard is blocked.
