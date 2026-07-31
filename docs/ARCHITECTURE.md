# Architecture

## Monorepo layout

```
mathcity-arena/
├── shared/          @mathcity/shared — types + game data (characters, structures,
│                    crises, scoring weights, signals) consumed by both sides
├── server/          @mathcity/server — Node + Express + Socket.IO + game engine
│   ├── src/
│   │   ├── questions/   deterministic template generators, bank, validation
│   │   ├── game/        match engine, scoring, crisis math, bots
│   │   ├── seed/        synthetic demo-data generator
│   │   ├── academy.ts   lessons, worked examples, trial grading
│   │   ├── matchmaking.ts  parties, queue, match lifecycle, result persistence
│   │   ├── sockets.ts   Socket.IO event surface
│   │   ├── api.ts       REST reads (leaderboards, team profiles, academy, history)
│   │   ├── store.ts     JSON-backed persistence (server/data/db.json)
│   │   └── demo.ts      Demo Mode session driving the real engine
│   └── tests/           vitest suites (questions, scoring, full-match simulation)
└── client/          @mathcity/client — React + Vite + TypeScript + Tailwind
    └── src/
        ├── lib/         socket singleton, zustand store, REST client, i18n
        ├── components/  design system, original SVG art, question card, city map,
        │                team panel, event feed, results view
        └── screens/     landing, setup, hub, party, battle, academy, characters,
                         leaderboard, team profile, settings, demo
```

## Layered system diagram

```
CLIENT LAYER (React SPA)
├── Screens (route-level views)
│     Queue: user intents (answer, build, deploy, attack, signal)
│     Tool: socket.io-client events + REST fetches
├── Zustand store — single app state fed exclusively by server events
└── No game rules live here: the browser never computes rewards or results

TRANSPORT LAYER
├── Socket.IO — realtime: profiles, parties, queue, match actions, snapshots, demo
└── REST (/api) — reads: leaderboards, team profiles, academy content, history

SERVER LAYER (single Node process — authoritative)
├── MatchmakingService
│     Queue: waiting parties per mode (4s window)
│     Workers: launches Match instances; fills lobbies with rating-matched
│              synthetic teams from the store
├── Match engine (one instance per match)
│     Virtual clock (speedFactor-scaled), 6-phase state machine,
│     question assignment/validation, resources, structures, units,
│     raids with fair-play rules, shared crisis, placements, MVPs
├── Academy — trial grading + permanent unlocks
└── Store — JSON file persistence (players, teams, seasons, results, history)
```

## Server authority (anti-cheat by design)

The browser is never trusted to award points or calculate results:

- Questions are sent **without answers**; the server validates every submission and
  applies rewards.
- Duplicate submissions cannot double-award — an assignment is consumed on submit.
- Build/deploy/attack requests are validated against phase, resources, cooldowns,
  unlock state, per-match limits and fair-play rules server-side.
- Final placements, contributions, MVPs, season points and ratings are computed
  server-side from engine state only.

## Match engine

The engine runs on a virtual clock: real dt × speedFactor. Ranked runs at 1×
(~12 minutes), quick/casual at 2×, Demo Mode at 8× (~90 seconds). Tests drive the same
engine with a manual clock, which is also what "Next Event" uses in the demo.

Phase schedule (virtual seconds): preparation 0-60 → knowledge rush 60-240 → build
240-390 → crisis warning 390 / strike 480 → raids 490-670 → final surge 670-730.

Bots are not scripted movie props: they call the same public engine APIs (request
question, answer, build, deploy, attack) with skill-derived accuracy, so every rule
that binds humans binds them too.

## Persistence

`server/data/db.json` (gitignored) holds players, teams, the season, previous seasons,
match results (bounded), and per-player/team histories. Writes are debounced. This is a
deliberate hackathon choice — the file is human-inspectable and installs with zero
infrastructure. The store module is the single seam to swap in Postgres later.

## Determinism

The question bank and demo data are generated from seeded RNGs — restarting the server
reproduces identical question IDs and synthetic-league data. `Match` accepts a seed, and
the full-match vitest suite replays identical matches to assert determinism of
placements and tie-breaks.
