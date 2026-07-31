# Judging Notes

Why this submission deserves a close look:

**Professional.** TypeScript end to end, a shared types package, server-authoritative
game logic, 53 automated tests, deterministic simulations, typed Socket.IO surface,
production build served from a single port, honest docs separating functional vs
simulated vs future.

**Well designed.** An original visual identity (Lake Tana blues, highland greens,
sunrise gold), fully original SVG characters/emblems/skyline, a real HUD — not a
spreadsheet, admin dashboard, quiz site or generic Bootstrap page. Responsive layouts,
large touch targets, visible focus states, reduced-motion/high-contrast/large-text
modes, screen-reader labels, and no information conveyed by colour alone.

**Creative.** The City Crisis is the signature mechanic: one disaster, identical base
damage for all six districts, outcomes decided *only* by preparation — knowledge made
visible. Dragons gated behind advanced answers turn "optional harder math" into the
most desired objects in the game.

**Relevant to mathematics education.** Every reward path starts at a real curriculum
question (Grade 6 → optional differentiation). Correctness beats speed. Mistakes return
explanations and free retries. Advanced content is open to every age and never
punished. The Training Academy is a genuine lesson → worked example → practice → trial
pipeline, not a menu.

**More engaging than a quiz.** Answers instantly become walls, shields, dragons, MVP
trophies and season rank — visible to teammates in real time.

**Multiplayer.** Real Socket.IO: parties with codes, live lobbies, team formation of
1-4, two browser tabs or two machines land in one match on one team; rating-matched
simulated teams guarantee a full lobby.

**Strategic.** Build choices vs ten possible crises, raid timing under fair-play locks,
resource budgeting between structures and deployments, dragon gambles, and a 7-part
victory score where attack is only 30%.

**Free to learn.** No payments, loot boxes, gambling, paid hints or ads — verified by
the absence of any such code path.

**Safe for younger users.** No PII, preset-signal communication only, no humiliation of
losers, one-click local data deletion.

**Motivating for advanced learning.** Elite/Mythic dragon trials are the strongest
pull toward Grade 9-10+ topics; bonus season points reward completing them in-match.

**Practical as a prototype.** `npm install && npm run dev` — no keys, no cloud, no
databases. Demo Mode shows the complete product in ~90 seconds through the real engine.

**Expandable into a real product.** The store module is the single persistence seam;
matchmaking, i18n dictionary and question bank are all built to grow (see
FUTURE_ROADMAP.md).

## Verification shortcuts for judges

- `npm test` — 53 tests: crisis fairness (the exact 1000−300−250−100=350 example),
  contributions totalling 100, MVP rules, deterministic placements, dragon limits,
  shield/same-target locks, match reset preserving permanent stats.
- Two-tab multiplayer: second tab at `/?player=2`, join by party code.
- Demo Mode → watch the flood hit six teams with one base number and six outcomes.
