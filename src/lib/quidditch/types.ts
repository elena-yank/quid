export const TEAMS = [
  { key: "gryffindor", label: "Гриффиндор", rgb: "211,58,58" },
  { key: "hufflepuff", label: "Пуффендуй", rgb: "241,196,15" },
  { key: "ravenclaw", label: "Когтевран", rgb: "52,156,255" },
  { key: "slytherin", label: "Слизерин", rgb: "46,204,113" },
] as const;

export type TeamKey = (typeof TEAMS)[number]["key"];

export const ROLES = [
  { key: "keeper", label: "Вратарь", letter: "В" },
  { key: "seeker", label: "Ловец", letter: "Л" },
  { key: "chaser1", label: "Охотник 1", letter: "О1" },
  { key: "chaser2", label: "Охотник 2", letter: "О2" },
  { key: "beater", label: "Загонщик", letter: "З" },
] as const;

export type RoleKey = (typeof ROLES)[number]["key"];

export const BOT_DIFFICULTIES = [
  { level: 1, key: "easy", label: "Лёгкий", actionRate: 0.55, mistakeRate: 0.38, chaseHiddenSnitchRate: 0.05 },
  { level: 2, key: "medium", label: "Средний", actionRate: 0.8, mistakeRate: 0.18, chaseHiddenSnitchRate: 0.4 },
  { level: 3, key: "hard", label: "Сложный", actionRate: 0.95, mistakeRate: 0.06, chaseHiddenSnitchRate: 0.95 },
] as const;

export type BotLevel = 1 | 2 | 3;
export type Side = "A" | "B";
export type ActionType = "pickup" | "keeper_pickup" | "pass" | "throw" | "steal" | "hit_bludger";
export type DuelKind = "pickup" | "steal" | "throw_steal" | "hit_bludger" | "snitch";
export type Phase =
  | "pre_collect"
  | "pre_actions"
  | "move"
  | "goal"
  | "post_collect"
  | "snitch"
  | "auto_keeper"
  | "post_actions"
  | "bludgers"
  | "finalize";

export type Rng = () => number;

export interface Stats {
  quafflePickups: number;
  quaffleSteals: number;
  quafflePasses: number;
  goalsScored: number;
  goalsSaved: number;
  snitchCatches: number;
  bludgerHits: number;
  bludgerHitsToPlayers: number;
}

export interface Participant {
  id: string;
  nickname: string;
  team: TeamKey;
  side: Side | null;
  role: RoleKey | null;
  sessionToken: string;
  isJudge: boolean;
  isObserver: boolean;
  isBot: boolean;
  botDifficulty: BotLevel | null;
  pos: string | null;
  snitchProgress: number;
  stats: Stats;
  createdAt: number;
}

export interface TurnState {
  stepNo: number;
  ended: boolean;
  stunned: boolean;
  plannedTo: string | null;
  plannedActionFirst: boolean | null;
  plannedActionType: ActionType | null;
  plannedActionTo: string | null;
  plannedActionBludger: 1 | 2 | null;
  actionSpent: boolean;
  originPos: string | null;
}

export interface DuelState {
  id: string;
  kind: DuelKind;
  participantIds: string[];
  attackerId: string;
  defenderId: string;
  targetPos: string | null;
  createdStepNo: number;
  startedAt: number;
  scores: Record<string, number | null>;
  resolvedAt: number | null;
  winnerId: string | null;
  quafflePos: string | null;
  holderId: string | null;
}

export type EventValue = string | number | boolean | null | Array<string | number | boolean | null>;

export interface GameEvent {
  id: string;
  stepNo: number;
  kind: string;
  actorId: string | null;
  bludgerIdx: number | null;
  targetPos: string | null;
  meta: Record<string, EventValue>;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromNick: string;
  fromTeam: TeamKey | null;
  fromObserver?: boolean;
  scope: "all" | "team";
  toTeam: TeamKey | null;
  text: string;
  createdAt: number;
}

export interface Snapshot {
  stepNo: number;
  scoreA: number;
  scoreB: number;
  quafflePos: string | null;
  quaffleHolderId: string | null;
  bludgers: [string, string];
  snitchPos: string | null;
  snitchRevealed: boolean;
  players: { id: string; nickname: string; team: TeamKey; role: RoleKey | null; pos: string | null; stunned: boolean; snitchProgress: number }[];
}

export interface PendingGoal {
  shooterId: string;
  target: string;
  fromPos: string | null;
}

export interface Counters {
  freeQuafflePickup: number;
  quafflePass: number;
  quaffleSteal: number;
  bludgerHit: number;
  bludgerStun: number;
  goalScored: number;
  snitchReveal: number;
  snitchHide: number;
}

export interface GameState {
  id: string;
  code: string;
  teamA: TeamKey;
  teamB: TeamKey;
  started: boolean;
  startedAt: number | null;
  finished: boolean;
  finishedAt: number | null;
  winnerTeam: TeamKey | null;
  scoreA: number;
  scoreB: number;
  paused: boolean;
  pausedAt: number | null;
  snitchPos: string | null;
  snitchRevealed: boolean;
  snitchCaughtById: string | null;
  snitchCaughtStepNo: number | null;
  snitchRevealCount: number;
  snitchHideCount: number;
  quafflePos: string | null;
  quaffleHolderId: string | null;
  quaffleLockHolderId: string | null;
  quaffleLockStepNo: number | null;
  quaffleStealCooldownStepNo: number | null;
  bludger1Pos: string;
  bludger2Pos: string;
  bludger1Prev: string | null;
  bludger2Prev: string | null;
  stepNo: number;
  stepStartedAt: number;
  createdAt: number;
  participants: Participant[];
  turns: Record<string, TurnState>;
  duel: DuelState | null;
  duels: DuelState[];
  events: GameEvent[];
  chat: ChatMessage[];
  snapshots: Snapshot[];
  counters: Counters;
  pendingGoal: PendingGoal | null;
  phase: Phase;
  stepPrepared: boolean;
  stunnedNow: string[];
  stunnedForNext: string[];
  bludgerStreak: Record<string, number>;
  bludgerGhost: Record<string, number>;
  bludgerHit: [boolean, boolean];
  snitchDone: boolean;
  version: number;
}

export interface PlanInput {
  to: string | null;
  actionFirst: boolean | null;
  actionType: ActionType | null;
  actionTo: string | null;
  actionBludger: 1 | 2 | null;
}

export function emptyStats(): Stats {
  return {
    quafflePickups: 0,
    quaffleSteals: 0,
    quafflePasses: 0,
    goalsScored: 0,
    goalsSaved: 0,
    snitchCatches: 0,
    bludgerHits: 0,
    bludgerHitsToPlayers: 0,
  };
}

export function teamLabel(key: TeamKey): string {
  return TEAMS.find((t) => t.key === key)?.label ?? key;
}

export function teamRgb(key: TeamKey): string {
  return TEAMS.find((t) => t.key === key)?.rgb ?? "180,180,180";
}

export function roleLabel(role: RoleKey | null): string {
  return ROLES.find((r) => r.key === role)?.label ?? "Наблюдатель";
}

export function roleLetter(role: RoleKey | null): string {
  return ROLES.find((r) => r.key === role)?.letter ?? "•";
}

export function isTeamKey(v: string): v is TeamKey {
  return TEAMS.some((t) => t.key === v);
}

export function isRoleKey(v: string): v is RoleKey {
  return ROLES.some((r) => r.key === v);
}

export function botProfile(level: BotLevel) {
  return BOT_DIFFICULTIES.find((d) => d.level === level) ?? BOT_DIFFICULTIES[1];
}
