import type { ActionType, GameState, PlanInput } from "./types.ts";
import type { ClientState } from "./engine.ts";
import { freshTurn, listLegalMoves, stealLocked, validateAction } from "./rules.ts";

export function shadow(view: ClientState): GameState {
  const participants = view.participants.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    team: p.team,
    side: p.side,
    role: p.role,
    sessionToken: "",
    isJudge: p.isJudge,
    isObserver: p.isObserver,
    isBot: p.isBot,
    botDifficulty: p.botDifficulty,
    pos: p.pos,
    snitchProgress: p.snitchProgress,
    stats: p.stats,
    createdAt: p.createdAt,
  }));
  const turns: GameState["turns"] = {};
  for (const [id, turn] of Object.entries(view.turnStates)) {
    turns[id] = {
      ...freshTurn(view.game.stepNo, turn.stunned),
      ended: turn.ended,
      stunned: turn.stunned,
      plannedTo: turn.plannedTo,
      plannedActionFirst: turn.plannedActionFirst,
      plannedActionType: turn.plannedActionType,
      plannedActionTo: turn.plannedActionTo,
      plannedActionBludger: turn.plannedActionBludger,
      originPos: participants.find((p) => p.id === id)?.pos ?? null,
    };
  }
  for (const coord of view.reservedMoves) {
    const owned = Object.values(turns).some((t) => t.plannedTo === coord);
    if (!owned) {
      turns[`rsv_${coord}`] = { ...freshTurn(view.game.stepNo), plannedTo: coord };
    }
  }
  return {
    id: "shadow",
    code: view.game.code,
    teamA: view.game.teamA,
    teamB: view.game.teamB,
    started: view.game.started,
    startedAt: null,
    finished: view.game.finished,
    finishedAt: view.game.finishedAt,
    winnerTeam: view.game.winnerTeam,
    scoreA: view.game.scoreA,
    scoreB: view.game.scoreB,
    paused: view.game.paused,
    pausedAt: view.game.pausedAt,
    snitchPos: view.snitch.pos,
    snitchRevealed: view.snitch.revealed,
    snitchCaughtById: view.snitch.caughtById,
    snitchCaughtStepNo: null,
    snitchRevealCount: 0,
    snitchHideCount: 0,
    quafflePos: view.quaffle.pos,
    quaffleHolderId: view.quaffle.holderId,
    quaffleLockHolderId: view.game.quaffleLockHolderId,
    quaffleLockStepNo: view.game.quaffleLockStepNo,
    quaffleStealCooldownStepNo: view.game.quaffleStealCooldownStepNo,
    bludger1Pos: view.bludgers[0],
    bludger2Pos: view.bludgers[1],
    bludger1Prev: null,
    bludger2Prev: null,
    stepNo: view.game.stepNo,
    stepStartedAt: view.game.stepStartedAt,
    createdAt: view.game.createdAt,
    participants,
    turns,
    duel: null,
    events: [],
    chat: [],
    snapshots: [],
    counters: {
      freeQuafflePickup: 0,
      quafflePass: 0,
      quaffleSteal: 0,
      bludgerHit: 0,
      bludgerStun: 0,
      goalScored: 0,
      snitchReveal: 0,
      snitchHide: 0,
    },
    pendingGoal: null,
    phase: "pre_collect",
    stepPrepared: false,
    stunnedNow: [],
    stunnedForNext: [],
    bludgerHit: [false, false],
    snitchDone: false,
    version: 1,
  };
}

export function actionOk(view: ClientState, id: string, plan: PlanInput): string | null {
  const state = shadow(view);
  const player = state.participants.find((p) => p.id === id);
  const turn = player ? state.turns[player.id] : null;
  if (!player || !turn) return "not_found";
  turn.plannedTo = plan.to;
  turn.originPos = player.pos;
  return validateAction(state, player, turn, plan.actionType, plan.actionTo, plan.actionBludger, Boolean(plan.actionFirst));
}

export function legalMoves(view: ClientState, id: string): string[] {
  const state = shadow(view);
  const player = state.participants.find((p) => p.id === id);
  if (!player) return [];
  const blocked = new Set(view.reservedMoves.filter((c) => state.turns[id]?.plannedTo !== c));
  return listLegalMoves(state, player, blocked);
}

export function quaffleLocked(view: ClientState): boolean {
  const state = shadow(view);
  return stealLocked(state, state.quaffleHolderId);
}

export type { ActionType };
