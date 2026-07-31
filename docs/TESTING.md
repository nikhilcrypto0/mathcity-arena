# Testing

## Commands

```bash
npm test            # vitest (server workspace) — all suites
npm run typecheck   # tsc --noEmit across shared, server, client
npm run build       # typecheck + production client build
```

## Automated suites (53 tests)

### `server/tests/questions.test.ts` (20)
- Numeric parsing: whitespace, decimals, signs, fractions (`3/4`, `-1/2`), mixed
  numbers (`1 1/2`), thousands commas, percent signs, garbage rejection.
- **Division-by-zero protection** (`3/0`, `0/0` → rejected).
- Decimal tolerance; equivalent numeric forms accepted for fraction answers (`2/4` =
  `0.5` = `1/2`); weak validation never accepts a wrong answer.
- Choice / coordinate / ordering / multi-part validation.
- Bank invariants: ≥60 standard, ≥20 advanced, crisis/attack/defense/training/trial
  pools populated; **unique IDs**; deterministic for a seed; every question complete
  (prompt, explanation, reward, in-range answer index, no duplicate choices); **every
  question validates its own correct answer**; every character has a full trial set;
  dragon trials draw on the advanced curriculum.

### `server/tests/scoring.test.ts` (22)
- **Contribution percentages total exactly 100** — uneven splits, largest-remainder
  assignment, deterministic ties, all-zero equal split, solo teams; contribution not
  driven by attack damage alone.
- **Crisis**: the spec example verbatim (flood 1000 − drainage 300 − three answers 250
  − reserve 100 = 350); identical base damage regardless of preparation; never
  negative; transparent breakdown lines.
- Placements: active above knocked-out; knockout order = survival ranking; full
  deterministic tie-break chain.
- MVPs: minimum participation; balanced-contribution Team MVP; accuracy+difficulty
  outweigh raw attack for Match MVP.
- Season points: 100/75/60/50/40 podium, clamped participation, **bonus points never
  overwhelm placement**; Elo rating direction; **win ratio handles zero matches**;
  leaderboard never ranks by win ratio alone; deterministic full-tie ordering.

### `server/tests/match.test.ts` (11)
Full 6-team match simulations through the real engine (manual clock):
- Unique placements 1..6; per-team contributions = 100; same crisis base for every
  team; final damage = base − reductions with breakdown; one Team MVP per team and
  exactly one Match MVP with 1-5 candidates; season points consistent with placement;
  **deterministic replays for the same seed**.
- Rules: team size cap enforced at construction; self-attack rejected; active-raid,
  same-target-lock and recovery-shield fair-play errors; **dragons limited to one
  deployment per match**; fresh matches reset all temporary state while team identity
  persists.

## Manual end-to-end verification (performed via browser automation)

- Landing → player setup → hub (profile persisted and restored on reload).
- Quick match: queue → 6-team lobby vs rating-matched sim teams → live battle HUD →
  question answered → knockout → results (podium, MVP, contributions summing to 100,
  crisis table, season points, rating deltas) → leaderboard updated, outside-top-50
  rank card correct.
- Training Academy: Guardian trial 5/5 → permanent unlock → character usable in party.
- Multi-tab multiplayer: second tab (`/?player=2`) joined by party code; both tabs
  entered the same ranked match on the same team.
- Demo Mode: launch, Pause/Next Event/speed controls, flood beat, final podium, reset.

## Known prototype limitations

- The dev server restarts on server-file edits (tsx watch) drop in-flight matches.
- Bot answer cadence is time-based; at very high `MC_SPEED` values bots answer fewer
  questions per phase than at 1× (pure test-speed artifact).
- `data/db.json` is not safe for concurrent multi-process writes (single process only).
