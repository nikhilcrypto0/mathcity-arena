# Devpost Submission

## Project name

**MathCity Arena**

## Elevator pitch (<200 characters)

A free multiplayer math strategy game where students learn concepts, unlock fantasy
characters, form teams, survive crises, battle rivals, earn MVPs, and climb seasonal
rankings.

## Inspiration

Students grind battle passes for hours but abandon math quizzes in minutes. The
difference isn't effort — it's stakes, teammates and identity. We asked: what if the
*only* way to get stronger in a competitive strategy game was to actually learn
mathematics? And what if that game looked like our own city — Lake Tana, the Blue Nile,
modern bridges and solar fields — ambitious and bright, not a classroom worksheet?

## What it does

MathCity Arena is a six-team multiplayer strategy game. Every resource comes from
answering real curriculum questions (Grade 6 through optional introductory calculus).
Teams build districts, survive a shared city crisis that hits everyone with the same
base damage — only preparation changes the outcome — then raid each other, deploy
characters unlocked purely through mathematics mastery (including three dragons gated
behind advanced answers), and earn battle-royale placements, MVP awards, season points
and leaderboard ranks. A Training Academy teaches every topic with lessons, worked
examples, practice and free-retry trials. Everything is free; there is no pay-to-win
anything.

## How we built it

- **TypeScript monorepo**: shared types package + Node/Express/Socket.IO server +
  React/Vite/Tailwind client, one `npm run dev`.
- **Server-authoritative engine**: a virtual-clock state machine drives all six match
  phases; the browser never computes rewards, damage or results.
- **Deterministic question bank**: 252 questions generated from parameterized templates
  with computed answers — correctness by construction — plus a validator that accepts
  fractions, decimals, negatives and equivalent forms while rejecting weak input.
- **Simulated opponents** that call the same public engine APIs as humans, so every
  fair-play rule binds them too.
- **JSON persistence** (zero infrastructure), seeded synthetic league (64 teams / 208
  players) for living leaderboards.
- **Original SVG art only**: characters, avatars, emblems and the skyline are geometric
  vector compositions — no copyrighted assets anywhere.

## Challenges we ran into

- Making contribution percentages total *exactly* 100 with integer rounding — solved
  with largest-remainder normalization and tests for the tie cases.
- Designing a crisis system that is dramatic but provably fair: identical base damage,
  reductions only from visible preparation, and a transparent per-team breakdown.
- Keeping both raid sides active: attackers answer to power units while defenders
  answer to raise shields, in real time over Socket.IO.
- Balancing dragons to be thrilling but never mandatory — advanced-answer gates,
  once-per-match limits and counterplay.

## Accomplishments we're proud of

- A complete playable loop — learn → unlock → team up → battle → rank up — in one
  hackathon prototype, with real multiplayer across browser tabs and machines.
- 53 automated tests covering the fairness rules the design promises (identical crisis
  base damage, 100% contributions, deterministic tie-breaks, dragon limits, shields).
- A one-click Demo Mode that runs the real engine, not a mock video.

## What we learned

Motivation design is a systems problem: placements, MVPs and unlocks must all point at
the same behaviour — learning more mathematics. And server authority isn't just
anti-cheat; it made the whole game testable as pure simulation.

## What's next

Production authentication, a real database, global matchmaking, mobile apps, a full
Amharic question bank, parent dashboards and school-wide private leagues — see
FUTURE_ROADMAP.md.

## Technologies used

TypeScript · Node.js · Express · Socket.IO · React · Vite · Tailwind CSS · Zustand ·
Vitest · lucide-react

## Educational impact

Correctness-first rewards, mistakes that teach (explanations everywhere, free retries),
advanced topics open to every age, cooperation through preset team signals, and a
motivation loop that makes a student *want* the next topic — because the Elite Dragon
is waiting behind it.

## Why it's different from a normal math quiz

A quiz asks questions and stops. Here, every answer immediately matters to four other
people: it becomes a wall before the flood, a shield during a raid, a dragon in the
final surge, an MVP trophy, a season rank. Students return for the team, and the
mathematics comes with them.

## Free-to-play philosophy & safety

100% of the educational and competitive experience is free — no loot boxes, gambling,
paid hints or ads. No real names, contact details, schools or locations are collected;
matches use preset signals instead of open chat; losing teams keep everything they
learned.

## Suggested tags

`education` `game` `multiplayer` `mathematics` `socket-io` `react` `typescript`
`ethiopia` `free-to-play` `edtech`

## Suggested screenshots

See SCREENSHOT_CHECKLIST.md (landing, academy trial pass, battle HUD at crisis, raid,
results podium, leaderboard).

## Suggested thumbnail text

**MathCity Arena — knowledge is the most powerful character.**
