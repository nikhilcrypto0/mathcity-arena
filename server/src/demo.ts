import type { MatchResults } from '@mathcity/shared';
import { Match, MATCH_TOTAL_VSECONDS, type MatchTeamSetup } from './game/match.ts';
import { makeBotTeam } from './game/bots.ts';
import { makeRng } from './questions/rng.ts';
import { newId } from './ids.ts';
import { applyMatchResults } from './matchmaking.ts';

const DEMO_BASE_SPEED = 8; // 730 virtual seconds → ~91 real seconds at 1× demo speed

/** Virtual timestamps of the demo's headline beats, used by "Next Event". */
const DEMO_BEATS = [60, 120, 240, 300, 390, 420, 480, 490, 520, 560, 600, 670, 700, 730];

export interface DemoControlResult {
  paused: boolean;
  speedMultiplier: number;
}

/**
 * Demo Mode: one fully simulated match — six synthetic teams, eighteen
 * synthetic players — driven by the real match engine. Nothing here is a
 * mock-up: questions, resources, the shared flood, raids, dragons, placements
 * and MVPs all run through the same code paths as a live match.
 */
export class DemoSession {
  match: Match;
  speedMultiplier = 1;
  private readonly emit: (event: string, payload: unknown) => void;
  private seedCounter = 0;

  constructor(emit: (event: string, payload: unknown) => void) {
    this.emit = emit;
    this.match = this.buildMatch();
  }

  private buildMatch(): Match {
    const seed = 7300 + this.seedCounter++;
    const rng = makeRng(seed);
    const setups: MatchTeamSetup[] = [];
    // Tuned accuracy spread guarantees the demo shows preparation paying off,
    // dragons flying, and at least one knockout — all through real simulation.
    const accuracies = [0.93, 0.85, 0.74, 0.66, 0.55, 0.34];
    const sizes = [3, 3, 3, 3, 3, 3]; // 18 synthetic players
    for (let i = 0; i < 6; i++) {
      const bot = makeBotTeam(rng, i, { accuracy: accuracies[i], teamSize: sizes[i] });
      if (i === 0) {
        // The featured team can field the full roster, including dragons.
        bot.bot.characters = [
          'scout', 'archer', 'guardian', 'giant', 'engineer', 'healer',
          'necromancer', 'dragon_standard', 'dragon_elite',
        ];
        bot.bot.aggression = 0.9;
        for (const p of bot.profiles) p.unlockedCharacters = [...bot.bot.characters];
      }
      setups.push({
        team: bot.team,
        players: bot.profiles.map((profile) => ({ profile, isBot: true, character: null, role: null })),
        bot: bot.bot,
      });
    }

    const match = new Match(newId('demo'), setups, {
      mode: 'demo',
      speedFactor: DEMO_BASE_SPEED * this.speedMultiplier,
      seed,
      crisisId: 'flood', // the demo always shows the flood: same 1,000 base for every team
    }, {
      toPlayer: () => {},
      toAll: (event, payload) => this.emit(event, payload),
      onFinished: (results: MatchResults, m: Match) => {
        applyMatchResults(results, m);
      },
    });
    return match;
  }

  start(): void {
    this.match.start();
    this.emit('demo:state', this.state());
    this.emit('match:snapshot', this.match.snapshotFor(null));
  }

  control(action: 'play' | 'pause' | 'next' | 'reset' | 'speed', value?: number): DemoControlResult {
    switch (action) {
      case 'pause':
        this.match.paused = true;
        break;
      case 'play':
        this.match.paused = false;
        break;
      case 'speed': {
        this.speedMultiplier = value === 2 ? 2 : value === 4 ? 4 : 1;
        this.match.speedFactor = DEMO_BASE_SPEED * this.speedMultiplier;
        break;
      }
      case 'next': {
        const nextBeat = DEMO_BEATS.find((b) => b > this.match.virtualNow) ?? MATCH_TOTAL_VSECONDS;
        this.match.advance(nextBeat - this.match.virtualNow + 0.5);
        break;
      }
      case 'reset': {
        this.match.stop();
        this.match = this.buildMatch();
        this.start();
        break;
      }
    }
    const state = this.state();
    this.emit('demo:state', state);
    return state;
  }

  state(): DemoControlResult {
    return { paused: this.match.paused, speedMultiplier: this.speedMultiplier };
  }

  dispose(): void {
    this.match.stop();
  }
}
