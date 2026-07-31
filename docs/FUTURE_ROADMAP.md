# Future Roadmap

Documented as future work per the hackathon scope — none of this is required for the
playable prototype, and none of it was sacrificed for unnecessary infrastructure.

## Production platform
- **Authentication**: guardian-friendly accounts (no email required for children),
  device linking, recovery codes.
- **Database**: swap the JSON store seam for Postgres; the `store.ts` module is the
  single integration point.
- **Global distributed matchmaking**: regional queues, skill+latency aware, party
  merging; the current rating-window logic becomes the ranking input.
- **Production anti-cheat**: rate limiting, anomaly detection on answer timing,
  signed sessions.
- **Cloud deployment automation**: containerized single-node first (the server already
  serves the built client), then horizontal Socket.IO scaling with a Redis adapter.

## Product
- **Mobile applications** (the UI is already touch-first and responsive).
- **Full Amharic question bank** — the i18n dictionary and question schema already
  support translated content; recruit teacher reviewers.
- **Voice chat alternative**: expanded preset signals with audio cues (no open voice
  for child safety).
- **Parent dashboard**: opt-in learning summaries — never required for play.
- **School-wide administration**: private leagues on top of the existing private
  tournament configuration (duration, rounds, team count, allowed levels) — advanced
  mathematics always remains freely accessible outside tournament settings.
- **Cosmetic-only monetization (maybe, later)**: skins, banners, district themes,
  emotes, victory animations, profile frames — never affecting power, question
  difficulty, damage, matchmaking, ranking, learning access or progression speed.

## Content
- Grow the generated bank per topic and difficulty band; seasonal question rotations.
- More crises (wildfire, locusts, cyber outage) with new counter-structures.
- New characters proposed by the community, each tied to a genuine curriculum path.
- Seasonal events: school-term seasons, city-wide co-op crisis weekends.

## Learning science
- Spaced-repetition weighting inside question selection (retry mistakes sooner).
- Adaptive difficulty per player *within* the chosen level, never secretly easier
  mathematics in competitive modes.
- Teacher-facing item statistics for the question bank.
