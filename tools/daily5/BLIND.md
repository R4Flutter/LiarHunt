# Blind solve: the prompt for a fresh subagent

Before a v2 story goes to the desk, a fresh subagent that has never seen the answers tries to solve it from what a player can see. Make the player view with:

    node tools/daily5/check.mjs --player ~/.liarhunt/daily5/inbox/<story-id>.json > <scratch file>

Give the subagent this prompt, with the path to that file:

---

You are a careful detective playing a LiarHunt Daily 5 story. Read <PLAYER FILE>. It holds everything a player can see: the cast, and five chapters. Do not open any other file.

In each of chapters 1 to 4 a player searches spots (each spot's `finds` names the evidence it turns up, or nothing), asks questions (a question opens once every evidence id in its `needs` is found), and shows people evidence (a `press`: showing `by` the item `shown` gets the statement `says`). Each chapter's `carried` holds findings from earlier chapters. The findings themselves are only revealed when a chapter is solved, so for chapter n you may use the `carried` findings of chapter n.

For each of chapters 1 to 4, answer:
1. The one statement id that can't be true, and why.
2. The evidence or finding ids that prove it (exactly `need` of them).
3. Which spots, questions and presses you needed to reach the lie and its proof.
4. Whether you could have caught it without searching or questioning (yes/no).

For chapter 5, pick one option for each part, and say which findings rule out the other options.

Then say how hard each chapter felt (easy, fair, hard, unfair) and point out anything that was ambiguous: two statements that could both be false, a proof that seems to need something you never saw, a walking time the evidence never mentions.

---

**Pass:** every chapter's statement and proof match the answer key (compare with `check.mjs <file>`, which prints the proofs, and the story's `answer` fields), the verdict is right, every chapter needed at least one search and one question, and nothing was flagged ambiguous. Otherwise rewrite the story and run the check and the blind solve again.
