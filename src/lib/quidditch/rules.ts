import type { ActionType, GameState, Participant, RoleKey, Side, TurnState } from "./types.ts";

export const BOARD_ROWS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export const BOARD_COLS = 13;
export const GOALS_LEFT = ["C1", "D1", "E1"];
export const GOALS_RIGHT = ["C13", "D13", "E13"];
export const SNITCH_SPAWNS = ["A1", "G1", "A7", "G7", "A13", "G13"];
export const TURN_TIMEOUT_MS = 15000;
export const WIN_SCORE = 100;
export const GOAL_POINTS = 10;
export const SNITCH_POINTS = 30;

const GOAL_SET = new Set([...GOALS_LEFT, ...GOALS_RIGHT]);

export function nid(len = 12): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function roomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function normalizeCoord(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[A-G](?:[1-9]|1[0-3])$/.test(v) ? v : null;
}

export function coordToRC(coord: string): { r: number; c: number } {
  return { r: BOARD_ROWS.indexOf(coord[0] as (typeof BOARD_ROWS)[number]), c: Number(coord.slice(1)) - 1 };
}

export function rcToCoord(r: number, c: number): string | null {
  if (r < 0 || r >= BOARD_ROWS.length || c < 0 || c >= BOARD_COLS) return null;
  return `${BOARD_ROWS[r]}${c + 1}`;
}

export function chebyshev(a: string, b: string): number {
  const pa = coordToRC(a);
  const pb = coordToRC(b);
  return Math.max(Math.abs(pa.r - pb.r), Math.abs(pa.c - pb.c));
}

export function isGoal(coord: string): boolean {
  return GOAL_SET.has(coord);
}

export function goalsForSide(side: Side): string[] {
  return side === "A" ? GOALS_LEFT : GOALS_RIGHT;
}

export function attackGoals(side: Side): string[] {
  return side === "A" ? GOALS_RIGHT : GOALS_LEFT;
}

export function keeperZone(side: Side): Set<string> {
  const set = new Set<string>();
  for (const g of goalsForSide(side)) {
    const { r, c } = coordToRC(g);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const coord = rcToCoord(r + dr, c + dc);
        if (coord) set.add(coord);
      }
    }
  }
  return set;
}

export function defaultSpawn(role: RoleKey, side: Side): string {
  const table: Record<RoleKey, [string, string]> = {
    keeper: ["D1", "D13"],
    seeker: ["D5", "D9"],
    chaser1: ["C5", "C9"],
    chaser2: ["E5", "E9"],
    beater: ["D4", "D10"],
  };
  return table[role][side === "A" ? 0 : 1];
}

export function isChaser(role: RoleKey | null): boolean {
  return role === "chaser1" || role === "chaser2";
}
export function isKeeper(role: RoleKey | null): boolean {
  return role === "keeper";
}
export function isBeater(role: RoleKey | null): boolean {
  return role === "beater";
}
export function isSeeker(role: RoleKey | null): boolean {
  return role === "seeker";
}
export function isActiveRole(role: RoleKey | null): boolean {
  return role === "keeper" || role === "seeker" || role === "chaser1" || role === "chaser2" || role === "beater";
}

export function isAllowedChaserMove(from: string, to: string): boolean {
  if (from === to || isGoal(to)) return false;
  const a = coordToRC(from);
  const b = coordToRC(to);
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  const ortho = (dr === 0 && (dc === 1 || dc === 2)) || (dc === 0 && (dr === 1 || dr === 2));
  const diag = dr === dc && (dr === 1 || dr === 2);
  return ortho || diag;
}

export function isAllowedSeekerMove(from: string, to: string): boolean {
  if (from === to || isGoal(to)) return false;
  const d = chebyshev(from, to);
  return d === 1 || d === 2;
}

export function isAllowedKeeperMove(from: string, to: string, side: Side): boolean {
  if (from === to) return false;
  const zone = keeperZone(side);
  if (!zone.has(from) || !zone.has(to)) return false;
  return chebyshev(from, to) === 1;
}

export function isAllowedMove(role: RoleKey, side: Side, from: string, to: string): boolean {
  if (isKeeper(role)) return isAllowedKeeperMove(from, to, side);
  if (isSeeker(role)) return isAllowedSeekerMove(from, to);
  if (isChaser(role) || isBeater(role)) return isAllowedChaserMove(from, to);
  return false;
}

export function allCoords(): string[] {
  const list: string[] = [];
  for (let r = 0; r < BOARD_ROWS.length; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const coord = rcToCoord(r, c);
      if (coord) list.push(coord);
    }
  }
  return list;
}

export function neighbors(coord: string): string[] {
  const { r, c } = coordToRC(coord);
  const list: string[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const next = rcToCoord(r + dr, c + dc);
      if (next) list.push(next);
    }
  }
  return list;
}

/** Straight or diagonal line, 1–3 steps, inclusive of the target. */
export function lineCells(from: string, to: string, maxSteps = 3): string[] | null {
  const a = coordToRC(from);
  const b = coordToRC(to);
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps < 1 || steps > maxSteps) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const cells: string[] = [];
  for (let i = 1; i <= steps; i++) {
    const coord = rcToCoord(a.r + sr * i, a.c + sc * i);
    if (!coord) return null;
    cells.push(coord);
  }
  return cells[cells.length - 1] === to ? cells : null;
}

export function sideOf(state: GameState, team: string): Side | null {
  if (team === state.teamA) return "A";
  if (team === state.teamB) return "B";
  return null;
}

export function activePlayers(state: GameState): Participant[] {
  return state.participants.filter((p) => !p.isObserver && isActiveRole(p.role));
}

export function ballCells(
  state: Pick<GameState, "quafflePos" | "bludger1Pos" | "bludger2Pos" | "snitchPos" | "snitchRevealed">,
): Set<string> {
  const set = new Set<string>();
  if (state.quafflePos) set.add(state.quafflePos);
  if (state.bludger1Pos) set.add(state.bludger1Pos);
  if (state.bludger2Pos) set.add(state.bludger2Pos);
  // A hidden snitch is invisible. Blocking the square makes an empty cell look occupied.
  if (state.snitchPos && state.snitchRevealed) set.add(state.snitchPos);
  return set;
}

export function occupant(state: GameState, coord: string, exceptId?: string): Participant | null {
  return (
    state.participants.find((p) => !p.isObserver && p.pos === coord && p.id !== exceptId) ?? null
  );
}

export function stealLocked(state: GameState, holderId: string | null): boolean {
  if (!holderId) return false;
  const step = state.stepNo;
  if (state.quaffleStealCooldownStepNo != null && step === state.quaffleStealCooldownStepNo + 1) return true;
  if (
    state.quaffleLockHolderId === holderId &&
    state.quaffleLockStepNo != null &&
    step === state.quaffleLockStepNo + 1
  ) {
    return true;
  }
  return false;
}

/** Collector rule: block the step the lock was written and the next one. */
export function stealBlockedByCollector(state: GameState, holderId: string | null): boolean {
  if (!holderId) return false;
  const step = state.stepNo;
  const spans = [state.quaffleLockStepNo, state.quaffleStealCooldownStepNo];
  for (const s of spans) {
    if (s == null) continue;
    if (step >= s && step <= s + 1) {
      if (s === state.quaffleLockStepNo && state.quaffleLockHolderId && state.quaffleLockHolderId !== holderId) {
        continue;
      }
      return true;
    }
  }
  return false;
}

export function actionOrigin(turn: TurnState, currentPos: string | null, actionFirst: boolean): string | null {
  if (actionFirst) return turn.originPos ?? currentPos;
  return turn.plannedTo ?? currentPos;
}

export function moveError(
  state: GameState,
  player: Participant,
  to: string | null,
  ignorePlayerOccupancy: boolean,
): string | null {
  if (!player.pos || !player.role || !player.side) return "no_position";
  if (!to) return null;
  const coord = normalizeCoord(to);
  if (!coord) return "invalid_position";
  if (!isAllowedMove(player.role, player.side, player.pos, coord)) {
    return isGoal(coord) ? "cannot_enter_goal" : "illegal_move";
  }
  if (ballCells(state).has(coord)) return "cell_occupied_by_ball";
  if (!ignorePlayerOccupancy && occupant(state, coord, player.id)) return "cell_taken";
  for (const [id, turn] of Object.entries(state.turns)) {
    if (id !== player.id && turn.stepNo === state.stepNo && turn.plannedTo === coord) return "cell_reserved";
  }
  return null;
}

export function validateAction(
  state: GameState,
  player: Participant,
  turn: TurnState,
  actionType: ActionType | null,
  actionTo: string | null,
  actionBludger: 1 | 2 | null,
  actionFirst: boolean,
): string | null {
  if (!actionType) {
    if (actionTo || actionBludger) return "invalid_action";
    return null;
  }
  if (!player.role || !player.side || !player.pos) return "no_position";
  const from = actionOrigin(turn, player.pos, actionFirst);
  if (!from) return "no_position";
  const target = actionTo ? normalizeCoord(actionTo) : null;
  if (actionTo && !target) return "invalid_target";

  if (actionType === "pickup" || actionType === "keeper_pickup") {
    if (actionBludger) return "invalid_target";
    if (actionType === "pickup") {
      if (target) return "invalid_target";
      if (!isChaser(player.role)) return "role_cannot_pickup";
    }
    if (actionType === "keeper_pickup") {
      if (!isKeeper(player.role)) return "role_cannot_pickup";
      if (!target || chebyshev(from, target) < 1 || chebyshev(from, target) > 6) return target ? "too_far" : "invalid_target";
    }
    if (!state.quafflePos || state.quaffleHolderId) return "quaffle_already_taken";
    if (chebyshev(from, state.quafflePos) > 1) return "too_far";
    return null;
  }

  if (actionType === "steal") {
    if (actionBludger) return "invalid_target";
    if (!isChaser(player.role) && !isKeeper(player.role)) return "role_cannot_steal";
    if (target && !isKeeper(player.role)) return "invalid_target";
    if (target && (chebyshev(from, target) < 1 || chebyshev(from, target) > 6)) return "too_far";
    const holder = state.participants.find((p) => p.id === state.quaffleHolderId) ?? null;
    if (!holder || holder.id === player.id) return "quaffle_not_held";
    if (holder.isObserver || (!isChaser(holder.role) && !isKeeper(holder.role))) return "not_opponent";
    if (!holder.side || holder.side === player.side) return "not_opponent";
    const holderPos = turnFor(state, holder.id)?.originPos ?? holder.pos;
    const pos = actionFirst ? holder.pos : holderPos;
    if (!pos || chebyshev(from, pos) > 1) return "too_far";
    if (stealLocked(state, holder.id)) {
      return state.quaffleStealCooldownStepNo != null && state.stepNo === state.quaffleStealCooldownStepNo + 1
        ? "steal_cooldown"
        : "steal_locked";
    }
    return null;
  }

  if (actionType === "pass") {
    if (actionBludger || !target) return "invalid_target";
    if (!isChaser(player.role)) return "role_cannot_pass";
    if (state.quaffleHolderId !== player.id) return "no_quaffle";
    const d = chebyshev(from, target);
    if (d < 1 || d > 2) return "too_far";
    const mate = occupant(state, target);
    if (!mate || !isChaser(mate.role) || mate.side !== player.side) return "invalid_target";
    return null;
  }

  if (actionType === "throw") {
    if (actionBludger || !target) return "invalid_target";
    if (!isChaser(player.role) && !isKeeper(player.role)) return "role_cannot_throw";
    if (state.quaffleHolderId !== player.id) return "no_quaffle";
    const d = chebyshev(from, target);
    if (isKeeper(player.role)) {
      if (d < 1 || d > 6) return "too_far";
      return null;
    }
    if (!attackGoals(player.side).includes(target) || d !== 2) return "not_opponent_goal";
    return null;
  }

  if (actionType === "hit_bludger") {
    if (!target || (actionBludger !== 1 && actionBludger !== 2)) return actionBludger ? "invalid_target" : "invalid_bludger";
    if (!isBeater(player.role) && !isKeeper(player.role)) return "role_cannot_hit";
    const bpos = actionBludger === 1 ? state.bludger1Pos : state.bludger2Pos;
    if (chebyshev(from, bpos) !== 1) return "too_far";
    if (!lineCells(bpos, target, 3)) return "invalid_target";
    if (state.quafflePos && target === state.quafflePos) return "invalid_target";
    return null;
  }

  return "invalid_action";
}

export function turnFor(state: GameState, id: string): TurnState | null {
  return state.turns[id] ?? null;
}

export function listLegalMoves(state: GameState, player: Participant, extraBlocked: Set<string> = new Set()): string[] {
  if (!player.pos || !player.role || !player.side) return [];
  const balls = ballCells(state);
  const moves: string[] = [];
  for (const coord of allCoords()) {
    if (!isAllowedMove(player.role, player.side, player.pos, coord)) continue;
    if (balls.has(coord) || extraBlocked.has(coord)) continue;
    if (occupant(state, coord, player.id)) continue;
    moves.push(coord);
  }
  return moves;
}

export function stableIndexFromId(id: string, mod: number): number {
  if (mod <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum % mod;
}

export function freshTurn(stepNo: number, stunned = false): TurnState {
  return {
    stepNo,
    ended: stunned,
    stunned,
    plannedTo: null,
    plannedActionFirst: null,
    plannedActionType: null,
    plannedActionTo: null,
    plannedActionBludger: null,
    actionSpent: false,
    originPos: null,
    declaredAt: null,
  };
}
