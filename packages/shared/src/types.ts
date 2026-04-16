export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DieColor = 'RED'|'ORANGE'|'YELLOW'|'GREEN'|'BLUE'|'PURPLE';
export type BlockerType = 'STONE'|'ICE'|'LOCK';
export type CellState = 'NORMAL'|'EMPTY'|'SPAWNING'|'FROZEN'|'LOCKED';
export type BombType = 'STANDARD'|'RAINBOW';
export type GamePhase = 'IDLE'|'CHAINING'|'RESOLVING'|'REFILLING'|'BOMB_FUSE'|'FARKLE_ANIM'|'REACTION'|'GAME_OVER';
export type GameMode = 'SOLO_CASINO'|'SOLO_FREE'|'VS_CASINO'|'VS_FREE'|'RALLY_FREE'|'RALLY_CASINO';
export type RallyRole = 'RAINMAKER'|'HEADHUNTER'|'ARCHIVIST'|'CONDUCTOR';

export type XPSection = 'HEADHUNTER' | 'CONDUCTOR' | 'RAINMAKER' | 'ARCHIVIST';

export type PlayerTitle =
  | 'Recruit' | 'Apprentice' | 'Storm Chaser' | 'Scribe'
  | 'Hunter' | 'Conductor' | 'Rainmaker' | 'Archivist'
  | 'Bounty Hunter' | 'Lead' | 'Tempest' | 'Chronicler'
  | 'Elite' | 'Grand' | 'Cyclone' | 'Grand Archivist'
  | 'Master Headhunter' | 'Master Conductor'
  | 'Master Rainmaker' | 'Master Archivist';

export type ReactionVote = 'UP'|'DOWN'|null;

export const FACE_TO_COLOR: Record<DieFace,DieColor> = {
  1:'RED', 2:'ORANGE', 3:'YELLOW', 4:'GREEN', 5:'BLUE', 6:'PURPLE'
};

export const COLOR_TO_TAILWIND: Record<DieColor,string> = {
  RED:    'bg-rose-500',
  ORANGE: 'bg-orange-500',
  YELLOW: 'bg-amber-400',
  GREEN:  'bg-emerald-500',
  BLUE:   'bg-sky-500',
  PURPLE: 'bg-violet-600',
};

export interface Cell {
  id: string;
  face: DieFace | null;
  type: DieColor | BlockerType | 'BOMB_STANDARD' | 'BOMB_RAINBOW' | 'NONE';
  state: CellState;
  health?: number;
  fuseMs?: number;
  fuseColor?: DieColor;
}

export interface GridPos { row: number; col: number; }

export const MULTIPLIER_LADDER: readonly number[] = [1.0,1.25,1.5,2.0,3.0,4.0] as const;

export function getMultiplier(step: number): number {
  return MULTIPLIER_LADDER[Math.min(step, MULTIPLIER_LADDER.length - 1)];
}

export interface ActiveBomb {
  id: string; type: BombType;
  row: number; col: number;
  fuseMs: number;
  targetColor?: DieColor;
}

export interface ChainResult {
  score: number;
  scaledScore: number;
  isFarkle: boolean;
  combo: string;
  triggersBomb: BombType | null;
}

export interface ScorePopup {
  id: string; row: number; col: number;
  score: number; label: string;
  color: 'green'|'red'|'gold';
}

export interface GameState {
  phase: GamePhase;
  grid: Cell[][];
  banked: number;
  unbanked: number;
  multiplierStep: number;
  consecutiveChains: number;
  activeBombs: ActiveBomb[];
  popups: ScorePopup[];
  farklePool: number;
  lastChainResult: ChainResult | null;
}

export interface Player {
  id: string; name: string; banked: number;
  role?: RallyRole; isActive: boolean;
  vote: ReactionVote; isConnected: boolean;
}

export interface LobbySettings {
  mode: GameMode;
  playerCount: 1|2|3|4;
  turnTimerSeconds: 10|15|20;
  blockerDensity: 'LOW'|'MEDIUM'|'HIGH';
  threeOnesScore: 1000|300;
  singleOneScore: number;
  rainbowRedReward: number;
  rainbowBlueReward: number;
  betAmount?: number;
  // Sweepstakes additions
  currencyMode: CurrencyMode;    // which wallet is active this session
  stakeAmount: number;           // FD or PDX units wagered per session
}

export interface RTPConfig {
  mode: GameMode;
  targetRTP: number;
  platformFee: number;
  poolSize: number;
}

export const DEFAULT_SETTINGS: LobbySettings = {
  mode:'SOLO_FREE', playerCount:1, turnTimerSeconds:10,
  blockerDensity:'MEDIUM', threeOnesScore:1000,
  singleOneScore:100, rainbowRedReward:100, rainbowBlueReward:50,
  currencyMode: 'FD' as CurrencyMode,
  stakeAmount: 100,
};

export function multiplayerGridSize(players: number): number {
  return ({1:7,2:8,3:9,4:10} as Record<number,number>)[players] ?? 8;
}

export const GAME_CONSTANTS = {
  MAX_CHAIN: 6,
  FUSE_MS: 3000,
  BOMB_RADIUS: 1,
  STONE_HP: 2,
  BOMB_DIE_PTS: 100,
  BOMB_STONE_PTS: 50,
  ARCHIVIST_PCT: 0.15,
  REACTION_MS: 3000,
  CASCADE_MS: 80,
} as const;

export const RALLY_MILESTONES = [
  { tier:1 as const, threshold:10_000,  mult:0.5 },
  { tier:2 as const, threshold:25_000,  mult:1.0 },
  { tier:3 as const, threshold:50_000,  mult:2.0 },
  { tier:4 as const, threshold:100_000, mult:5.0 },
];

export type ClientMsg =
  | { type:'JOIN_ROOM';    roomId:string; clientSeed:string; playerName:string; role?:RallyRole }
  | { type:'SUBMIT_CHAIN'; chain:GridPos[] }
  | { type:'BANK' }
  | { type:'PASS' }
  | { type:'VOTE_REACT';   vote:'UP'|'DOWN'; hold:boolean }
  | { type:'LEAVE_ROOM' };

export type ServerMsg =
  | { type:'ROOM_STATE';      grid:Cell[][]; players:Player[]; activePlayerId:string; phase:GamePhase }
  | { type:'BOARD_UPDATE';    grid:Cell[][] }
  | { type:'CHAIN_RESULT';    playerId:string; result:ChainResult }
  | { type:'TURN_CHANGE';     activePlayerId:string; timerMs:number }
  | { type:'BOMB_SPAWNED';    bomb:ActiveBomb }
  | { type:'BOMB_DETONATED';  bombId:string; affectedCells:GridPos[]; totalScore:number }
  | { type:'REACTION_WINDOW'; timeMs:number; unbanked:number; multiplierStep:number }
  | { type:'VOTE_UPDATE';     votes:{playerId:string; vote:ReactionVote}[] }
  | { type:'MILESTONE_HIT';   tier:1|2|3|4; payout:number }
  | { type:'SEED_REVEAL';     serverSeed:string; combinedSeed:string }
  | { type:'GAME_OVER';       winner?:string; finalScores:Record<string,number>; replayHash:string }
  | { type:'ERROR';           message:string };

// ── SWEEPSTAKES CURRENCY SYSTEM ─────────────────────────────

export type CurrencyMode = 'FD' | 'PDX';
// FD = Farkle Dust (chaotic fun, disposable / for fun, cannot be redeemed)
// PDX = Prime Dice (premium / prize-eligible, earned free, redeemable 1:1 for USD)

export interface PlayerWallet {
  fd: number;                   // Farkle Dust balance
  pdx: number;                   // Prime Dice balance
  pdxPlaythroughTotal: number;   // Lifetime PDX wagered (for redemption eligibility)
  pdxPlaythroughRequired: number; // Target before redemption unlocks (pdx × playthrough rate)
  lastDailyBonus: string | null; // ISO date string of last PDX daily claim
}

export const DEFAULT_WALLET: PlayerWallet = {
  fd: 10000,                    // New players start with 10,000 FD
  pdx: 100,                      // New players start with 100 PDX (welcome bonus)
  pdxPlaythroughTotal: 0,
  pdxPlaythroughRequired: 0,
  lastDailyBonus: null,
};

export const DAILY_PDX_BONUS = 50;       // PDX awarded on daily login
export const PDX_PLAYTHROUGH_RATE = 1;   // 1× PDX playthrough required before redemption
export const FD_TO_PDX_GIFT_RATE = 0.1;  // Every 100 FD disposable / for fun gifts 10 PDX

/** Prime Dice are pegged 1:1 to USD for prize redemption purposes. */
export const PDX_USD_RATE = 1;

/** Farkle Dust has no monetary value — entertainment only. */
export const FD_HAS_MONETARY_VALUE = false;

// ── SWEEPSTAKES COMPLIANCE STUBS ────────────────────────────

export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type GeoStatus = 'ALLOWED' | 'RESTRICTED' | 'UNKNOWN';

export interface ComplianceState {
  kycStatus: KYCStatus;
  geoStatus: GeoStatus;
  restrictedStates: string[]; // e.g. ['WA', 'MI', 'CT']
}

// ── TRANSACTION AUDIT LOG ENTRY ──────────────────────────────

export type TransactionType =
  | 'FD_PURCHASE'        // User bought FD
  | 'PDX_GIFT'            // PDX gifted alongside FD disposable / for fun
  | 'PDX_DAILY_BONUS'     // Daily login PDX credit
  | 'PDX_AMOE'            // Alternative Method of Entry credit
  | 'FD_WAGER'           // FD spent starting a game
  | 'PDX_WAGER'           // PDX spent starting a game
  | 'FD_AWARD'           // FD winnings credited
  | 'PDX_AWARD'           // PDX winnings credited
  | 'PDX_REDEMPTION';     // PDX converted to prize payout

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  currency: 'FD' | 'PDX';
  amount: number;
  balanceAfter: number;
  timestamp: string;       // ISO datetime
  sessionId?: string;      // linked game session if applicable
  notes?: string;
}

// ── ASCII ART ICONS ─────────────────────────────────────────

/**
 * @asset FD_ASCII_ICON
 * @colors deep-purple #7C3AED | baby-blue #93C5FD | silver #D1D5DB
 *
 *   ✦  · ˖  ✦
 *  ·  ░▒▓█▓▒░  ·
 * ˖  ▓  ◈ ◈  ▓  ˖
 *  · ▒ ◈  ✦  ◈ ▒ ·
 *   ░  ▓ ◈ ▓  ░
 *  · ˖  ░▒▓▒░  ˖ ·
 *     ✦  · ˖  ✦
 *
 *  ─── FARKLE DUST ───
 *      F  ·D·
 */
export const FD_ASCII_ICON = `
  ✦  · ˖  ✦
 ·  ░▒▓█▓▒░  ·
˖  ▓  ◈ ◈  ▓  ˖
 · ▒ ◈  ✦  ◈ ▒ ·
  ░  ▓ ◈ ▓  ░
 · ˖  ░▒▓▒░  ˖ ·
    ✦  · ˖  ✦
─── FARKLE DUST ───
     F  ·D·
` as const;

/**
 * @asset PDX_ASCII_ICON
 * @colors emerald #10B981 | sapphire #1D4ED8 | gold #F59E0B
 *
 *     ╔═══════╗
 *     ║ ◆   ◆ ║
 *     ║       ║
 *  ◈  ║   ◆   ║  ◈
 *     ║       ║
 *     ║ ◆   ◆ ║
 *     ╚═══════╝
 *   ══ PRIME DICE ══
 *      P·D·X  ◆
 */
export const PDX_ASCII_ICON = `
    ╔═══════╗
    ║ ◆   ◆ ║
    ║       ║
 ◈  ║   ◆   ║  ◈
    ║       ║
    ║ ◆   ◆ ║
    ╚═══════╝
  ══ PRIME DICE ══
     P·D·X  ◆
` as const;

// ── COLOR TOKEN CONSTANTS ───────────────────────────────────

/** Tailwind class refs for FD (Farkle Dust) UI theming */
export const FD_COLORS = {
  primary:   'violet-700',    // deep purple
  secondary: 'sky-300',       // baby blue
  accent:    'slate-300',     // silver
  glow:      'rgba(124,58,237,0.4)',
  badge:     'bg-violet-900 border-violet-500 text-sky-300',
} as const;

/** Tailwind class refs for PDX (Prime Dice) UI theming */
export const PDX_COLORS = {
  primary:   'emerald-500',   // emerald green
  secondary: 'blue-700',      // sapphire blue
  accent:    'amber-400',     // gold
  glow:      'rgba(16,185,129,0.4)',
  badge:     'bg-emerald-950 border-emerald-500 text-amber-400',
} as const;
