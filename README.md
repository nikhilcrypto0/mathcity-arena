# MathCity Arena

**Study mathematics. Build your team. Rule the arena.**

A free multiplayer mathematics strategy game where students learn new concepts, unlock
fantasy characters, form teams, survive city crises, battle opponents, earn MVP awards
and climb seasonal rankings.

Built for the Bahir Dar hackathon. The visual world is inspired by Lake Tana, the Blue
Nile, modern bridges, renewable energy and a colourful, technologically ambitious city.

---

## The problem

Many mathematics applications are repetitive quizzes. Students need a more engaging
reason to practice mathematics, cooperate with others, apply strategy, and voluntarily
learn advanced concepts.

## The solution

MathCity Arena wraps real mathematics inside a competitive team strategy game:

> Learn mathematics → unlock characters → form a team → enter a match → answer
> questions → earn resources → build and defend → attack opponents → receive a
> placement → earn MVP recognition → gain season points → improve ranking → return to
> training → learn harder mathematics → unlock stronger strategic options.

The game makes students think: *"I need to learn this topic because I want to unlock
that character and help my team win."*

## Why students would voluntarily play

- Characters (including three dragons) unlock **only** through mathematics mastery — permanently and for free.
- Every match resource comes from answering real curriculum questions; correctness beats speed.
- Team placements, MVP awards, seasonal leaderboards and win streaks give competitive stakes.
- The shared City Crisis makes preparation and knowledge visibly matter: every district
  takes the same base damage — only preparation changes the outcome.
- No school, teacher, classroom, or payment is ever required.

---

## Quick start

Requirements: Node.js 20+ and npm. No paid APIs, no external AI services, no cloud
credentials, no proprietary databases.

```bash
npm install
npm run dev
```

- Client (Vite): **http://localhost:5173**
- Server (Express + Socket.IO): **http://localhost:3001**

A single root command starts both. On first boot the server seeds 64 synthetic teams and
208 synthetic players so leaderboards and matchmaking feel alive (regenerate with
`npm run seed`).

Other commands:

```bash
npm run build       # typecheck everything + production client build
npm run start       # run the server (serves client/dist if built — single-port deploy)
npm test            # run the automated test suite (server workspace)
npm run typecheck   # tsc --noEmit across shared, server, client
```

### Testing multiplayer with browser tabs

1. Open **http://localhost:5173** — create a player, then *Friends Party → Create a party*.
2. Open a second tab at **http://localhost:5173/?player=2** (the `?player=2` query gives
   the tab its own local profile; otherwise tabs share one player). Create a second
   player and join with the party code.
3. The leader starts matchmaking — both tabs enter the same match on the same team.
   Empty lobby slots fill with rating-matched simulated teams so a match always starts.

On a local network, other computers can join via your machine's IP
(e.g. `http://192.168.x.x:5173`) — Vite proxies Socket.IO to the server. Internet
multiplayer works when the server is deployed (`npm run build && npm run start` serves
everything on one port).

### Demo Mode

Click **Demo Mode** (or *Launch Full Demo Match* on the landing page). One click runs a
complete simulated match — 6 teams, 18 synthetic players — through the **real game
engine**: matchmaking, Knowledge Rush, district construction, a global flood with the
same 1,000 base damage for every team, different final damage based on preparation,
raids, dragons, shields, knockouts, live placements, Team MVPs, Match MVP, podium and
updated leaderboards. Controls: Auto Play, Pause, Next Event, Reset, 1×/2×/4×. The demo
is understandable in about 90 seconds; all names are synthetic.

Optional: set `MC_SPEED=6 npm run dev -w server` to accelerate real matches for testing.

---

## Feature status (honest classification)

**Fully functional**
- Local player profiles (no email/phone/real name), avatars, language + accessibility settings
- Persistent teams with invite codes; parties of 1-4; Socket.IO lobby updates
- Matchmaking queue (rating-aware) launching real 6-team matches
- The complete match loop: Preparation → Knowledge Rush → Build & Fortify → City Crisis
  → Open Raids → Final Surge → battle-royale placements
- Server-authoritative question engine: 252 generated questions (60+ standard, 20+
  advanced, crisis/attack/defense/training/trial), robust validation (fractions,
  decimals, negatives, equivalent forms, whitespace, division-by-zero guards)
- Resources, 12 structures, 10 characters with deployment costs/cooldowns/limits,
  dragons gated by advanced answers, necromancer revive, healer restore
- Identical base crisis damage with transparent per-team breakdowns
- Contribution percentages summing to exactly 100% per team; Team MVP + Match MVP
- Season points, Elo-style team rating, leaderboards (top 50 + outside-top-50 rank card),
  team profiles, match history, permanent stat preservation across matches
- Training Academy: lessons, worked examples, guided/independent practice, server-graded
  character trials with free retries and explanations, permanent unlocks
- Demo Mode driven by the real engine
- Amharic navigation labels via an expandable translation dictionary
- Accessibility: keyboard navigation, visible focus, reduced motion, high contrast,
  larger text, screen-reader labels

**Functionally simulated (clearly labelled "sim" in-game)**
- Opponent teams beyond connected humans are synthetic bot teams that answer real bank
  questions with skill-based accuracy through the same engine APIs and fair-play rules.
  There is **no** production-scale global matchmaking network — the prototype
  demonstrates realistic queueing and matching behaviour locally.
- Seeded leaderboard history (64 teams / 208 players / 2 past seasons) is generated data.

**Future work** — see [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md).

---

## Documentation

| File | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Monorepo layout, server authority, engine, realtime protocol |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | Phases, characters, structures, crisis math, scoring formulas |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | 90-second demonstration script |
| [docs/DEVPOST_SUBMISSION.md](docs/DEVPOST_SUBMISSION.md) | Devpost content |
| [docs/JUDGING_NOTES.md](docs/JUDGING_NOTES.md) | Why this submission stands out |
| [docs/TESTING.md](docs/TESTING.md) | Test suite + verification results |
| [docs/SCREENSHOT_CHECKLIST.md](docs/SCREENSHOT_CHECKLIST.md) | Screens to capture for submission |
| [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md) | Production-scale plans |

## Child safety & privacy

- No real legal names, emails, phone numbers, school names, exact ages or locations are
  collected — a local ID plus a chosen display name is everything.
- No open chat: matches use ten preset team signals only.
- Losing teams are never publicly humiliated; knocked-out teams keep all progress.
- Local data reset / profile deletion is one click in Settings.

## Free to play — completely

Lessons, practice, matches, ranked play, advanced topics, characters, dragons, teams,
seasons, matchmaking and the Training Academy are all free. There are no loot boxes, no
gambling mechanics, no paid hints, no pay-to-win anything, and no ads. If cosmetics ever
arrive (skins, banners, emotes, frames), they will never affect power, difficulty,
matchmaking, ranking, learning access or progression speed.

## License

MIT — see [LICENSE](LICENSE).
