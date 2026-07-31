# Game Design

## Game modes

| Mode | Season points | Rating | Notes |
| --- | --- | --- | --- |
| Ranked | ✅ full | ✅ | The seasonal ladder |
| Quick | ✅ full | — | Never *reduces* anything; rating untouched |
| Casual | — | — | Test strategies and characters risk-free |
| Friends Party | per chosen mode | | 1-4 players, invite code |
| Solo queue | per chosen mode | | Solo team of one, transparent balancing |
| Private tournament | configurable | | Invite code; never gates advanced mathematics |
| Demo | synthetic | synthetic | Runs the real engine with synthetic players |

Season points from placements are always additive — no mode ever subtracts them.

## Match structure (every match independent)

Reset each match: buildings, district health, deployments, damage, shields, temporary
resources, coins, cooldowns, crisis prep, match upgrades, score.
Preserved: team identity, profiles, unlocks, mastery, history, wins, placements, MVPs,
trophies, achievements, lifetime stats, season points, leaderboard rank.

1. **Team Preparation (60s)** — confirm team, characters, roles, strategy. Equal base
   conditions for every team: 2,000 core HP, identical starting resources.
2. **Knowledge Rush (180s)** — answering earns coins, materials, energy, mana (+1 build
   token per 3 correct). Correctness first; a small speed bonus applies only after a
   correct answer. Streaks of 3 add bonus coins.
3. **Build & Fortify (150s)** — 12 structures with strategic purposes (drainage −300
   flood, solar station −400 power shortage, walls vs giants, academy +25% advanced
   rewards, shelter −100 vs every disaster…).
4. **Global City Crisis** — warning (30s) then preparation (60s) then impact. One of ten
   crises. **Every team receives the same crisis and the same base damage** — never
   secretly adjusted for strength, level, rank or popularity. Final damage differs only
   through structures, up to three correct crisis answers (their reward values are the
   reduction), and a saved emergency reserve (≥100 coins → −100). Every team sees a
   transparent line-by-line breakdown. Example (matches the engine test):
   flood 1000 − drainage 300 − three answers 250 − reserve 100 = **350**.
5. **Open Raid Period (180s)** — attackers answer questions for energy and attack
   buffs; defenders answer to activate shields. Fair play: no repeat-attacking the same
   opponent (45s lock), recently attacked teams get a recovery shield (25s), one raid
   at a time per team, matchmaking prefers similar strength, no graphic violence, no
   humiliation of losers. Archer towers shoot back; fallen units enter a graveyard the
   Necromancer can revive from (limited, costly).
6. **Final Surge (60s)** — 1.5× rewards, visible countdown, no new attacks in the final
   8 seconds, battles resolve, placements + contributions + MVPs computed.

Knockout: a district at 0 HP leaves active combat, keeps every stat and all learning
progress, can watch the rest, and is placed by knockout order. Last team standing is #1.
If multiple teams remain at time-up: core health → victory score → accuracy → crisis
performance → battle differential → earliest final score, with deterministic id
tie-break.

## Match Victory Score (0-100)

battle 30% (damage dealt + blocked, normalized to the match's best) · mathematics 25%
(accuracy + advanced solved) · survival 15% · crisis 10% (damage prevented) ·
development 10% (structures) · resource efficiency 5% (spent/earned) · teamwork 5%
(assists + roles). Shown with a full per-category breakdown after every match.
Attacking is deliberately **not** the only path to victory.

## Characters (all free, unlocked by learning)

| Character | Mathematics | Battle identity |
| --- | --- | --- |
| Kidus the Scout | integers, arithmetic | cheap, fast, reveals defenses |
| Saba the Archer | fractions, ratios, percentages | long-range vs exposed structures |
| Bekele the Guardian | equations, inequalities | shields, damage reduction |
| Tana the Giant | geometry, area, perimeter, measurement | wall-breaker, slow, tanky |
| Meron the Engineer | coordinates, scale | repairs, disables traps, routes |
| Hana the Healer | statistics, probability | restores units/structures, no burst |
| Zena the Necromancer | patterns, sequences, multi-step | revives one fallen unit, 2/match |
| Abay Dragon (standard) | difficult Grade 8 mix | area attack, 1/match, needs 1 advanced answer |
| Tisisat Dragon (elite) | Grade 9-10: simultaneous eqs, functions, quadratics, trig | 1/match, needs 3 advanced answers |
| Lalibela Dragon (mythic) | mixed advanced mastery incl. optional differentiation | 1/match, needs 5 advanced answers |

Owning a character never guarantees deployment: energy/mana costs, cooldowns,
per-match limits, dragon advanced-answer gates and team coordination still apply.
Dragons are strong but counterable — defender answers weaken raids, and lower
characters stay useful (scouts/archers cost a fraction and fight all match).

Unlock flow: discover → see required topics → Academy lesson → worked example → guided
practice → independent practice → trial (server-graded, pass mark ~80%) → explanations
for every mistake → free retries → **permanent unlock**. No teacher approval, ever.
Advanced mathematics is freely available to younger students who want to reach up;
trying advanced material is never punished (hints, worked solutions, retries,
encouragement).

## Contribution (per team, totals exactly 100%)

Raw score weights: mathematics 35% · battle impact 20% · defense 15% · resource
management 10% · district/crisis 10% · teamwork/assists 10% — each component is a share
of the team's total for that component, so pure attack damage can never dominate.
Normalization uses the largest-remainder method: integer percentages always total
exactly 100; rounding difference goes to the largest unrounded remainder; all-zero
teams split equally.

## MVPs

- **Team MVP** (one per team): strongest balanced contribution share.
- **Match MVP** (one per lobby, any team): accuracy 30% · question difficulty 20% ·
  team contribution 15% · battle 15% · defense 10% · teamwork 10%, minimum 3 questions
  attempted. Top-5 candidates shown with scores.

## Seasons, points, rating

Placement points: 100/75/60/50/40, others clamp(20 + score/10, 10..35). Bonuses (never
overwhelming placement): Team MVP +5, Match MVP +10 (player-level), perfect crisis
defense +5, elite dragon deployed +5, mythic +8 (team-level). Ratings start at 1,000 and
move Elo-style vs the lobby average (K=32). Season reset preserves lifetime stats,
unlocks, mastery, achievements, history and lifetime rank records; badges are awarded
(Season Champion, Top 10, Top 50, MVP, Mathematics Master, Best Defensive Team, Best
Comeback).

Leaderboard order (deterministic): season points → wins → average placement → maths
accuracy → rating → recency → id. A team is never ranked by win ratio alone — one win
from one match cannot outrank a strong many-match team. Teams outside the top 50 always
see their exact rank, neighbours, and points needed for the next meaningful rank.

## Solo/size balancing (transparent)

Smaller teams earn a resource multiplier (+15% per missing member vs the largest team
in the match), shown in the rules. Mathematics difficulty is never made easier for
solo players.
