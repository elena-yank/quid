import type {
  ActionType,
  BotLevel,
  DuelKind,
  DuelState,
  EventValue,
  GameState,
  Participant,
  Phase,
  PlanInput,
  Rng,
  RoleKey,
  Side,
  TeamKey,
} from "./types.ts";
import { emptyStats } from "./types.ts";
import { pickUniqueBotNickname } from "./bot-names.ts";
import {
  TURN_TIMEOUT_MS,
  WIN_SCORE,
  GOAL_POINTS,
  SNITCH_POINTS,
  SNITCH_SPAWNS,
  activePlayers,
  allCoords,
  attackGoals,
  actionOrigin,
  ballCells,
  chebyshev,
  defaultSpawn,
  freshTurn,
  isActiveRole,
  isBeater,
  isChaser,
  isKeeper,
  isSeeker,
  lineCells,
  moveError,
  neighbors,
  nid,
  occupant,
  sideOf,
  stableIndexFromId,
  stealBlockedByCollector,
  validateAction,
} from "./rules.ts";

const PHASES: Phase[] = [
  "pre_collect",
  "pre_actions",
  "move",
  "goal",
  "post_collect",
  "snitch",
  "auto_keeper",
  "post_actions",
  "bludgers",
  "finalize",
];

export function createMatch(teamA: TeamKey, teamB: TeamKey, rng: Rng = Math.random): GameState {
  const now = Date.now();
  const spawn = SNITCH_SPAWNS[Math.floor(rng() * SNITCH_SPAWNS.length)] ?? "A7";
  return {
    id: `g_${nid(10)}`,
    code: "",
    teamA,
    teamB,
    started: false,
    startedAt: null,
    finished: false,
    finishedAt: null,
    winnerTeam: null,
    scoreA: 0,
    scoreB: 0,
    paused: false,
    pausedAt: null,
    snitchPos: spawn,
    snitchRevealed: false,
    snitchCaughtById: null,
    snitchCaughtStepNo: null,
    snitchRevealCount: 0,
    snitchHideCount: 0,
    quafflePos: "D7",
    quaffleHolderId: null,
    quaffleLockHolderId: null,
    quaffleLockStepNo: null,
    quaffleStealCooldownStepNo: null,
    bludger1Pos: "A7",
    bludger2Pos: "G7",
    bludger1Prev: null,
    bludger2Prev: null,
    stepNo: 1,
    stepStartedAt: now,
    createdAt: now,
    participants: [],
    turns: {},
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

function blankTurn(stepNo: number, stunned = false) {
  return freshTurn(stepNo, stunned);
}

export function addParticipant(
  state: GameState,
  input: {
    nickname: string;
    team: TeamKey;
    role: RoleKey | null;
    observer: boolean;
    judge: boolean;
    bot: boolean;
    difficulty: BotLevel | null;
    sessionToken?: string;
  },
): Participant {
  const side = input.observer || input.judge ? null : sideOf(state, input.team);
  const pos = input.role && side ? defaultSpawn(input.role, side) : null;
  const participant: Participant = {
    id: `p_${nid(10)}`,
    nickname: input.nickname,
    team: input.team,
    side,
    role: input.observer || input.judge ? null : input.role,
    sessionToken: input.sessionToken ?? nid(24),
    isJudge: input.judge,
    isObserver: input.observer || input.judge,
    isBot: input.bot,
    botDifficulty: input.bot ? input.difficulty : null,
    pos,
    snitchProgress: 0,
    stats: emptyStats(),
    createdAt: Date.now(),
  };
  state.participants.push(participant);
  if (participant.role && !participant.isObserver) {
    state.turns[participant.id] = blankTurn(state.stepNo, false);
  }
  return participant;
}

export function removeParticipant(state: GameState, id: string, rng: Rng = Math.random): void {
  const player = state.participants.find((p) => p.id === id);
  if (!player) return;
  if (state.duel && !state.duel.resolvedAt && state.duel.participantIds.includes(id)) {
    state.duel.scores[id] = 0;
    const other = state.duel.participantIds.find((pid) => pid !== id);
    if (other) state.duel.scores[other] = Math.max(state.duel.scores[other] ?? 0, 100);
    for (const pid of state.duel.participantIds) {
      if (state.duel.scores[pid] == null) state.duel.scores[pid] = pid === id ? 0 : 1;
    }
    resolveDuel(state, rng);
  }
  if (state.quaffleHolderId === id) {
    const from = player.pos ?? "D7";
    releaseQuaffle(state, nearestFree(state, from), true);
  }
  state.participants = state.participants.filter((p) => p.id !== id);
  delete state.turns[id];
}

function playerById(state: GameState, id: string | null): Participant | null {
  if (!id) return null;
  return state.participants.find((p) => p.id === id) ?? null;
}

function ensureTurn(state: GameState, id: string) {
  if (!state.turns[id] || state.turns[id].stepNo !== state.stepNo) {
    const stunned = state.turns[id]?.stunned && state.turns[id]?.stepNo === state.stepNo;
    state.turns[id] = blankTurn(state.stepNo, Boolean(stunned));
  }
  return state.turns[id];
}

function event(
  state: GameState,
  kind: string,
  actorId: string | null,
  targetPos: string | null,
  meta: Record<string, EventValue> = {},
  bludgerIdx: number | null = null,
) {
  state.events.push({
    id: `e_${nid(8)}`,
    stepNo: state.stepNo,
    kind,
    actorId,
    bludgerIdx,
    targetPos,
    meta,
    createdAt: Date.now(),
  });
  if (state.events.length > 120) state.events.splice(0, state.events.length - 120);
}

function giveQuaffle(state: GameState, id: string, mode: "both" | "lock") {
  state.quaffleHolderId = id;
  state.quafflePos = null;
  state.quaffleLockHolderId = id;
  state.quaffleLockStepNo = state.stepNo;
  if (mode === "both") state.quaffleStealCooldownStepNo = state.stepNo;
}

function releaseQuaffle(state: GameState, pos: string, keepCooldown: boolean) {
  state.quaffleHolderId = null;
  state.quafflePos = pos;
  state.quaffleLockHolderId = null;
  state.quaffleLockStepNo = null;
  if (!keepCooldown) state.quaffleStealCooldownStepNo = null;
}

function nearestFree(state: GameState, from: string): string {
  const blocked = new Set<string>();
  for (const p of state.participants) if (!p.isObserver && p.pos) blocked.add(p.pos);
  if (state.bludger1Pos) blocked.add(state.bludger1Pos);
  if (state.bludger2Pos) blocked.add(state.bludger2Pos);
  if (state.snitchPos) blocked.add(state.snitchPos);
  if (state.quafflePos) blocked.add(state.quafflePos);
  if (!blocked.has(from)) return from;
  const origin = from;
  const { r, c } = (() => {
    const m = /^([A-G])(\d+)$/.exec(origin);
    if (!m) return { r: 3, c: 6 };
    return { r: "ABCDEFG".indexOf(m[1]), c: Number(m[2]) - 1 };
  })();
  for (let rad = 1; rad <= 20; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr > 6 || cc < 0 || cc > 12) continue;
        const coord = `${"ABCDEFG"[rr]}${cc + 1}`;
        if (!blocked.has(coord)) return coord;
      }
    }
  }
  return "D7";
}

function stunByBludger(state: GameState, id: string, pos: string, which: 1 | 2, actorId: string | null) {
  if (state.stunnedForNext.includes(id)) return;
  stunPlayer(state, id);
  if (actorId) {
    const actor = playerById(state, actorId);
    if (actor) actor.stats.bludgerHitsToPlayers += 1;
  }
  state.counters.bludgerStun += 1;
  event(state, "stun_bludger", id, pos, actorId ? {} : { source: "wander" }, which);
}

function stunPlayer(state: GameState, id: string) {
  if (!state.stunnedNow.includes(id)) state.stunnedNow.push(id);
  if (!state.stunnedForNext.includes(id)) state.stunnedForNext.push(id);
  const turn = state.turns[id];
  if (turn) {
    turn.actionSpent = true;
    turn.plannedTo = null;
  }
  if (state.quaffleHolderId === id) {
    const pos = playerById(state, id)?.pos ?? "D7";
    releaseQuaffle(state, nearestFree(state, pos), true);
  }
}

function addScore(state: GameState, side: Side, points: number) {
  if (side === "A") state.scoreA += points;
  else state.scoreB += points;
}

function concedingKeeper(state: GameState, attackSide: Side): Participant | null {
  const defend: Side = attackSide === "A" ? "B" : "A";
  return activePlayers(state).find((p) => p.side === defend && isKeeper(p.role)) ?? null;
}

function scoreGoal(state: GameState, shooterId: string, target: string) {
  const shooter = playerById(state, shooterId);
  if (!shooter?.side) return;
  addScore(state, shooter.side, GOAL_POINTS);
  shooter.stats.goalsScored += 1;
  state.counters.goalScored += 1;
  const keeper = concedingKeeper(state, shooter.side);
  releaseQuaffle(state, target, false);
  event(state, "goal", keeper?.id ?? null, target, { shooterId, keeperId: keeper?.id ?? null, outcome: "goal" });
  event(state, "quaffle_throw_result", shooterId, target, { outcome: "goal", keeperId: keeper?.id ?? null, finalPos: target });
}

function scoreSave(state: GameState, shooterId: string, keeper: Participant, target: string) {
  keeper.stats.goalsSaved += 1;
  giveQuaffle(state, keeper.id, "both");
  const shooter = playerById(state, shooterId);
  event(state, "goal", keeper.id, target, { shooterId, keeperId: keeper.id, outcome: "saved_by_keeper" });
  event(state, "quaffle_throw_result", shooterId, target, {
    outcome: "saved_by_keeper",
    keeperId: keeper.id,
    finalHolderId: keeper.id,
    finalPos: null,
  });
  void shooter;
}

export function performThrow(state: GameState, actorId: string, actionFirst: boolean, targetOverride?: string | null): void {
  const actor = playerById(state, actorId);
  const turn = state.turns[actorId];
  if (!actor?.side || !actor.pos || !turn) return;
  if (state.quaffleHolderId !== actorId) return;
  const from = actionOrigin(turn, actor.pos, actionFirst);
  const target = targetOverride ?? turn.plannedActionTo;
  if (!target || !from) return;
  const d = chebyshev(from, target);
  if (isKeeper(actor.role)) {
    if (d < 1 || d > 6) return;
    const catcher = occupant(state, target);
    event(state, "quaffle_throw", actorId, target, { phase: actionFirst ? "pre" : "post", fromPos: from, toPos: target });
    if (catcher && isChaser(catcher.role)) {
      if (catcher.side === actor.side) {
        actor.stats.quafflePasses += 1;
        state.counters.quafflePass += 1;
        event(state, "quaffle_pass", actorId, target, { receiverId: catcher.id, fromPos: from, toPos: target });
      }
      giveQuaffle(state, catcher.id, "both");
      event(state, "quaffle_throw_result", actorId, target, { outcome: "caught_by_player", finalHolderId: catcher.id });
      return;
    }
    releaseQuaffle(state, target, false);
    event(state, "quaffle_throw_result", actorId, target, { outcome: "landed", finalPos: target });
    return;
  }
  if (!isChaser(actor.role)) return;
  if (!attackGoals(actor.side).includes(target) || d !== 2) return;
  const keeperThere = activePlayers(state).find((p) => isKeeper(p.role) && p.side !== actor.side && p.pos === target);
  event(state, "quaffle_throw", actorId, target, {
    phase: actionFirst ? "pre" : "post",
    fromPos: from,
    toPos: target,
    outcome: keeperThere ? "saved_by_keeper" : actionFirst ? "pending_goal_resolution" : "goal",
  });
  if (keeperThere) {
    scoreSave(state, actorId, keeperThere, target);
    return;
  }
  if (actionFirst) {
    state.quaffleHolderId = null;
    state.quafflePos = null;
    state.pendingGoal = { shooterId: actorId, target, fromPos: from };
    return;
  }
  scoreGoal(state, actorId, target);
}

function applyHit(state: GameState, actorId: string, which: 1 | 2, target: string) {
  const from = which === 1 ? state.bludger1Pos : state.bludger2Pos;
  const cells = lineCells(from, target, 3);
  if (!cells) return;
  if (state.bludgerHit[which - 1]) return;
  let land = target;
  let victim: string | null = null;
  let hitCell: string | null = null;
  for (const cell of cells) {
    const who = occupant(state, cell);
    if (who) {
      land = cell;
      victim = who.id;
      hitCell = cell;
      break;
    }
  }
  const other = which === 1 ? state.bludger2Pos : state.bludger1Pos;
  if (land === other) {
    const options = neighbors(land).filter((n) => n !== other && n !== state.quafflePos && !occupant(state, n));
    options.sort((a, b) => chebyshev(a, target) - chebyshev(b, target) || a.localeCompare(b));
    land = options[0] ?? from;
  }
  if (which === 1) state.bludger1Pos = land;
  else state.bludger2Pos = land;
  state.bludgerHit[which - 1] = true;
  const actor = playerById(state, actorId);
  if (actor) actor.stats.bludgerHits += 1;
  state.counters.bludgerHit += 1;
  event(state, "hit_bludger", actorId, land, {}, which);
  if (victim && hitCell) stunByBludger(state, victim, hitCell, which, actorId);
  const sitting = occupant(state, land);
  if (sitting && sitting.id !== victim) stunByBludger(state, sitting.id, land, which, actorId);
}

function applySimpleAction(state: GameState, player: Participant, actionFirst: boolean) {
  const turn = state.turns[player.id];
  if (!turn || turn.actionSpent || state.stunnedNow.includes(player.id)) return;
  if (Boolean(turn.plannedActionFirst) !== actionFirst) return;
  const type = turn.plannedActionType;
  if (!type) return;
  const err = validateAction(state, player, turn, type, turn.plannedActionTo, turn.plannedActionBludger, actionFirst);
  if (err) {
    turn.actionSpent = true;
    return;
  }
  if (type === "pickup" || type === "keeper_pickup") {
    if (!state.quafflePos) return;
    giveQuaffle(state, player.id, "both");
    player.stats.quafflePickups += 1;
    state.counters.freeQuafflePickup += 1;
    turn.actionSpent = true;
    event(state, "quaffle_pickup", player.id, turn.originPos, { phase: actionFirst ? "pre" : "post", finalHolderId: player.id });
    if (type === "keeper_pickup" && turn.plannedActionTo) performThrow(state, player.id, actionFirst);
    return;
  }
  if (type === "pass" && turn.plannedActionTo) {
    const mate = occupant(state, turn.plannedActionTo);
    if (!mate) return;
    player.stats.quafflePasses += 1;
    state.counters.quafflePass += 1;
    giveQuaffle(state, mate.id, "both");
    turn.actionSpent = true;
    event(state, "quaffle_pass", player.id, turn.plannedActionTo, { receiverId: mate.id, phase: actionFirst ? "pre" : "post" });
    return;
  }
  if (type === "throw") {
    performThrow(state, player.id, actionFirst);
    turn.actionSpent = true;
    return;
  }
  if (type === "hit_bludger" && turn.plannedActionBludger && turn.plannedActionTo) {
    applyHit(state, player.id, turn.plannedActionBludger, turn.plannedActionTo);
    turn.actionSpent = true;
  }
}

function predictedFrom(player: Participant, turn: { plannedTo: string | null; originPos: string | null }, actionFirst: boolean): string | null {
  if (actionFirst) return turn.originPos ?? player.pos;
  return turn.plannedTo ?? player.pos;
}

function collectPickup(state: GameState, postPhase: boolean): Participant[] {
  if (!state.quafflePos || state.quaffleHolderId) return [];
  const out: Participant[] = [];
  for (const p of activePlayers(state)) {
    const turn = state.turns[p.id];
    if (!turn || turn.actionSpent || state.stunnedNow.includes(p.id)) continue;
    const type = turn.plannedActionType;
    if (type !== "pickup" && type !== "keeper_pickup") continue;
    if (type === "pickup" && !isChaser(p.role)) continue;
    if (type === "keeper_pickup" && !isKeeper(p.role)) continue;
    const first = Boolean(turn.plannedActionFirst);
    if (postPhase && first) continue;
    if (!postPhase || !first) {
      /* pre phase accepts both; post accepts only post */
    }
    if (postPhase && first) continue;
    const from = predictedFrom(p, turn, first);
    if (!from || chebyshev(from, state.quafflePos) > 1) continue;
    out.push(p);
  }
  return out;
}

function collectSteal(state: GameState, postPhase: boolean): Participant[] {
  const holder = playerById(state, state.quaffleHolderId);
  if (!holder || stealBlockedByCollector(state, holder.id)) return [];
  const out: Participant[] = [];
  for (const p of activePlayers(state)) {
    if (p.id === holder.id || p.side === holder.side) continue;
    const turn = state.turns[p.id];
    if (!turn || turn.actionSpent || turn.plannedActionType !== "steal" || state.stunnedNow.includes(p.id)) continue;
    if (!isChaser(p.role) && !isKeeper(p.role)) continue;
    const start = turn.originPos ?? p.pos;
    const dest = turn.plannedTo ?? start;
    if (postPhase) {
      if (!p.pos || chebyshev(p.pos, holder.pos ?? "") > 1) continue;
    } else {
      const h = holder.pos;
      if (!h) continue;
      const beside = Boolean(start && chebyshev(start, h) <= 1);
      const arriving = Boolean(dest && chebyshev(dest, h) <= 1);
      if (!beside && !arriving) continue;
    }
    out.push(p);
  }
  return out;
}

function openDuel(
  state: GameState,
  kind: DuelKind,
  ids: string[],
  attackerId: string,
  defenderId: string,
  targetPos: string | null,
): void {
  const scores: Record<string, number | null> = {};
  for (const id of ids) scores[id] = null;
  state.duel = {
    id: `d_${nid(8)}`,
    kind,
    participantIds: ids,
    attackerId,
    defenderId,
    targetPos,
    createdStepNo: state.stepNo,
    startedAt: Date.now(),
    scores,
    resolvedAt: null,
    winnerId: null,
    quafflePos: state.quafflePos,
    holderId: state.quaffleHolderId,
  };
}

function pickWinner(duel: DuelState, holderId: string | null) {
  let best = -1;
  const bestIds: string[] = [];
  for (const id of duel.participantIds) {
    const score = duel.scores[id] ?? 0;
    if (score > best) {
      best = score;
      bestIds.length = 0;
      bestIds.push(id);
    } else if (score === best) bestIds.push(id);
  }
  const topTie = bestIds.length > 1;
  if (!topTie) return { winnerId: bestIds[0] ?? null, topTie, bestScore: best, bestIds, tiePolicy: "max" };
  if (duel.kind === "steal" || duel.kind === "throw_steal") {
    return { winnerId: holderId, topTie, bestScore: best, bestIds, tiePolicy: "holder" };
  }
  if (duel.kind === "pickup" || duel.kind === "snitch") {
    return { winnerId: null, topTie, bestScore: best, bestIds, tiePolicy: "free" };
  }
  return { winnerId: [...bestIds].sort()[0] ?? null, topTie, bestScore: best, bestIds, tiePolicy: "lex" };
}

function resolveDuel(state: GameState, _rng: Rng) {
  const duel = state.duel;
  if (!duel || duel.resolvedAt) return;
  const picked = pickWinner(duel, duel.holderId);
  duel.resolvedAt = Date.now();
  duel.winnerId = picked.winnerId;
  if (duel.kind === "pickup" || duel.kind === "steal" || duel.kind === "throw_steal") {
    for (const id of duel.participantIds) {
      const score = duel.scores[id] ?? 0;
      event(state, "quaffle_duel_score", id, duel.kind === "pickup" ? duel.quafflePos : null, {
        duelId: duel.id,
        duelKind: duel.kind,
        score,
        bestScore: picked.bestScore,
        isTopScore: picked.bestIds.includes(id),
        tiedTopIds: picked.bestIds,
        currentHolderId: state.quaffleHolderId,
      });
    }
  }
  if (duel.kind === "pickup") {
    if (picked.winnerId && !state.quaffleHolderId && state.quafflePos && state.quafflePos === duel.quafflePos) {
      giveQuaffle(state, picked.winnerId, "lock");
      const winner = playerById(state, picked.winnerId);
      if (winner) winner.stats.quafflePickups += 1;
      state.counters.freeQuafflePickup += 1;
      event(state, "quaffle_pickup", picked.winnerId, duel.quafflePos, { finalHolderId: picked.winnerId });
      const turn = state.turns[picked.winnerId];
      if (winner && isKeeper(winner.role) && turn?.plannedActionTo) performThrow(state, picked.winnerId, Boolean(turn.plannedActionFirst));
    }
  } else if (duel.kind === "steal") {
    if (picked.winnerId && picked.winnerId !== duel.holderId && state.quaffleHolderId === duel.holderId) {
      giveQuaffle(state, picked.winnerId, "both");
      const winner = playerById(state, picked.winnerId);
      if (winner) winner.stats.quaffleSteals += 1;
      state.counters.quaffleSteal += 1;
    }
  } else if (duel.kind === "throw_steal") {
    const holderTurn = duel.holderId ? state.turns[duel.holderId] : null;
    const holderFirst = Boolean(holderTurn?.plannedActionFirst);
    if (!picked.winnerId || picked.winnerId === duel.holderId) {
      if (duel.holderId && state.quaffleHolderId === duel.holderId) performThrow(state, duel.holderId, holderFirst);
    } else if (state.quaffleHolderId === duel.holderId) {
      const winner = playerById(state, picked.winnerId);
      const turn = state.turns[picked.winnerId];
      winner && (winner.stats.quaffleSteals += 1);
      state.counters.quaffleSteal += 1;
      if (winner && isKeeper(winner.role) && turn?.plannedActionTo) {
        giveQuaffle(state, winner.id, "both");
        performThrow(state, winner.id, true, turn.plannedActionTo);
      } else {
        giveQuaffle(state, picked.winnerId, "both");
      }
    }
  } else if (duel.kind === "hit_bludger") {
    const winner = picked.winnerId ? playerById(state, picked.winnerId) : null;
    const turn = picked.winnerId ? state.turns[picked.winnerId] : null;
    if (winner && turn?.plannedActionBludger && turn.plannedActionTo && !state.stunnedNow.includes(winner.id)) {
      applyHit(state, winner.id, turn.plannedActionBludger, turn.plannedActionTo);
    }
  } else if (duel.kind === "snitch") {
    if (picked.winnerId && state.snitchPos && !state.snitchCaughtById) catchSnitch(state, picked.winnerId);
  }
  if (duel.kind === "pickup" || duel.kind === "steal" || duel.kind === "throw_steal") {
    event(state, "quaffle_duel_result", picked.winnerId, duel.targetPos, {
      duelId: duel.id,
      duelKind: duel.kind,
      winnerId: picked.winnerId,
      topTie: picked.topTie,
      tiedTopIds: picked.bestIds,
      tiePolicy: picked.tiePolicy,
      finalHolderId: state.quaffleHolderId,
      finalPos: state.quafflePos,
    });
  }
  for (const id of duel.participantIds) {
    const turn = state.turns[id];
    if (!turn) continue;
    if (duel.kind === "steal" && id === duel.holderId) continue;
    turn.actionSpent = true;
  }
}

function catchSnitch(state: GameState, seekerId: string) {
  const seeker = playerById(state, seekerId);
  if (!seeker?.side) return;
  addScore(state, seeker.side, SNITCH_POINTS);
  seeker.stats.snitchCatches += 1;
  seeker.snitchProgress = 100;
  state.snitchCaughtById = seekerId;
  state.snitchCaughtStepNo = state.stepNo;
  state.snitchPos = null;
  if (state.snitchRevealed) state.snitchRevealed = false;
  event(state, "snitch_catch", seekerId, null, {});
}

function beginStep(state: GameState) {
  if (state.stepPrepared) return;
  state.stepPrepared = true;
  state.stunnedNow = [];
  state.stunnedForNext = [];
  state.bludgerHit = [false, false];
  state.snitchDone = false;
  state.pendingGoal = null;
  for (const p of activePlayers(state)) {
    const turn = ensureTurn(state, p.id);
    turn.originPos = p.pos;
    if (turn.stunned) state.stunnedNow.push(p.id);
  }
}

function everyoneEnded(state: GameState): boolean {
  const players = activePlayers(state);
  if (players.length === 0) return false;
  return players.every((p) => state.turns[p.id]?.ended);
}

function applyMovement(state: GameState) {
  const movers = activePlayers(state)
    .filter((p) => {
      const turn = state.turns[p.id];
      return turn?.plannedTo && !state.stunnedNow.includes(p.id) && !turn.stunned;
    })
    .sort((a, b) => a.createdAt - b.createdAt);
  const cancelled = new Set<string>();
  const claimed = new Set<string>();
  for (const p of movers) {
    const to = state.turns[p.id].plannedTo;
    if (!to || claimed.has(to)) cancelled.add(p.id);
    else claimed.add(to);
  }
  let guard = 0;
  let changed = true;
  while (changed && guard < 20) {
    changed = false;
    guard += 1;
    for (const p of movers) {
      if (cancelled.has(p.id)) continue;
      const to = state.turns[p.id].plannedTo;
      if (!to) continue;
      if (ballCells(state).has(to)) {
        cancelled.add(p.id);
        changed = true;
        continue;
      }
      const blockedByStill = activePlayers(state).some((q) => {
        if (q.pos !== to) return false;
        if (q.id === p.id) return false;
        const movingAway = movers.some((m) => m.id === q.id && !cancelled.has(q.id));
        return !movingAway;
      });
      if (blockedByStill) {
        cancelled.add(p.id);
        changed = true;
      }
    }
  }
  for (const p of movers) {
    if (cancelled.has(p.id)) continue;
    const to = state.turns[p.id].plannedTo;
    if (to) p.pos = to;
  }
}

function resolvePending(state: GameState) {
  const pending = state.pendingGoal;
  if (!pending) return;
  state.pendingGoal = null;
  if (state.quaffleHolderId || state.quafflePos) return;
  const shooter = playerById(state, pending.shooterId);
  if (!shooter?.side) return;
  const keeper = activePlayers(state).find((p) => isKeeper(p.role) && p.side !== shooter.side && p.pos === pending.target);
  if (keeper) scoreSave(state, shooter.id, keeper, pending.target);
  else scoreGoal(state, shooter.id, pending.target);
}

function runCollect(state: GameState, postPhase: boolean): boolean {
  const pickups = collectPickup(state, postPhase).filter((p) => (postPhase ? !state.turns[p.id].plannedActionFirst : true));
  const preAndPost = postPhase ? pickups : collectPickup(state, false);
  if (preAndPost.length >= 2) {
    openDuel(state, "pickup", preAndPost.map((p) => p.id), preAndPost[0].id, preAndPost[1].id, state.quafflePos);
    return true;
  }
  if (preAndPost.length === 1) {
    const p = preAndPost[0];
    const turn = state.turns[p.id];
    applySimpleAction(state, p, Boolean(turn.plannedActionFirst));
  }
  const stealers = collectSteal(state, postPhase);
  const holder = playerById(state, state.quaffleHolderId);
  const holderTurn = holder ? state.turns[holder.id] : null;
  const throwing = Boolean(holder && holderTurn && !holderTurn.actionSpent && holderTurn.plannedActionType === "throw");
  if (stealers.length && holder && (throwing || !postPhase)) {
    openDuel(
      state,
      throwing ? "throw_steal" : "steal",
      [holder.id, ...stealers.map((p) => p.id)],
      stealers[0].id,
      holder.id,
      throwing ? `throw:${postPhase ? "post" : "pre"}:${holder.id}` : null,
    );
    return true;
  }
  if (stealers.length && holder) {
    openDuel(state, "steal", [holder.id, ...stealers.map((p) => p.id)], stealers[0].id, holder.id, null);
    return true;
  }
  if (!postPhase || postPhase) {
    const byBludger = new Map<1 | 2, Participant[]>();
    for (const p of activePlayers(state)) {
      const turn = state.turns[p.id];
      if (!turn || turn.actionSpent || turn.plannedActionType !== "hit_bludger" || !turn.plannedActionBludger) continue;
      if (!isBeater(p.role) && !isKeeper(p.role)) continue;
      const first = Boolean(turn.plannedActionFirst);
      if (postPhase === first) continue;
      if (state.bludgerHit[turn.plannedActionBludger - 1]) continue;
      const list = byBludger.get(turn.plannedActionBludger) ?? [];
      list.push(p);
      byBludger.set(turn.plannedActionBludger, list);
    }
    for (const [idx, list] of byBludger) {
      if (list.length >= 2) {
        openDuel(state, "hit_bludger", list.map((p) => p.id), list[0].id, list[1].id, `b${idx}:${postPhase ? "post" : "pre"}`);
        return true;
      }
    }
  }
  return false;
}

function processSnitch(state: GameState, rng: Rng) {
  if (state.snitchDone) return;
  if (state.snitchPos == null && state.snitchCaughtStepNo != null && state.stepNo >= state.snitchCaughtStepNo + 3) {
    state.snitchPos = pickRespawn(state, rng);
    state.snitchRevealed = false;
    state.snitchCaughtById = null;
    state.snitchCaughtStepNo = null;
    for (const p of activePlayers(state)) if (isSeeker(p.role)) p.snitchProgress = 0;
  }
  if (!state.snitchPos) return;
  const reserved = new Set(activePlayers(state).map((p) => p.pos).filter((x): x is string => Boolean(x)));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const options: string[] = [];
  const { r, c } = (() => {
    const m = /^([A-G])(\d+)$/.exec(state.snitchPos);
    return { r: "ABCDEFG".indexOf(m?.[1] ?? "A"), c: Number(m?.[2] ?? "1") - 1 };
  })();
  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= 3; dist++) {
      const rr = r + dr * dist;
      const cc = c + dc * dist;
      if (rr < 0 || rr > 6 || cc < 0 || cc > 12) continue;
      const coord = `${"ABCDEFG"[rr]}${cc + 1}`;
      if (!reserved.has(coord)) options.push(coord);
    }
  }
  if (options.length) state.snitchPos = options[Math.floor(rng() * options.length)] ?? state.snitchPos;
  const seekers = activePlayers(state).filter((p) => isSeeker(p.role) && !state.stunnedNow.includes(p.id) && p.pos);
  const was = state.snitchRevealed;
  if (seekers.length === 0) state.snitchRevealed = false;
  else {
    const dists = seekers.map((s) => chebyshev(s.pos as string, state.snitchPos as string));
    if (dists.some((d) => d <= 2)) state.snitchRevealed = true;
    else state.snitchRevealed = false;
  }
  if (!was && state.snitchRevealed) {
    state.snitchRevealCount += 1;
    state.counters.snitchReveal += 1;
    event(state, "snitch_reveal", null, state.snitchPos, {});
  } else if (was && !state.snitchRevealed && !state.snitchCaughtById) {
    state.snitchHideCount += 1;
    state.counters.snitchHide += 1;
    event(state, "snitch_hide", null, state.snitchPos, {});
  }
  if (state.snitchRevealed && state.snitchPos) {
    for (const s of seekers) {
      const d = chebyshev(s.pos as string, state.snitchPos);
      if (d === 1) s.snitchProgress = Math.min(100, s.snitchProgress + 10);
      else if (d === 2) s.snitchProgress = Math.min(100, s.snitchProgress + 5);
    }
  }
  const reachers = seekers.filter((s) => s.snitchProgress >= 100);
  if (reachers.length === 1) catchSnitch(state, reachers[0].id);
  else if (reachers.length >= 2) {
    openDuel(state, "snitch", reachers.slice(0, 2).map((s) => s.id), reachers[0].id, reachers[1].id, state.snitchPos);
  }
  state.snitchDone = true;
}

function pickRespawn(state: GameState, rng: Rng): string {
  const seekers = activePlayers(state).filter((p) => isSeeker(p.role) && !state.stunnedNow.includes(p.id) && p.pos);
  const taken = new Set(activePlayers(state).map((p) => p.pos).filter((x): x is string => Boolean(x)));
  const free = allCoords().filter((c) => !taken.has(c));
  if (seekers.length === 0) {
    const spawn = SNITCH_SPAWNS.find((s) => !taken.has(s));
    return spawn ?? free[0] ?? "A7";
  }
  let best = -1;
  const pool: string[] = [];
  for (const cell of free) {
    const ds = seekers.map((s) => chebyshev(s.pos as string, cell));
    const minD = Math.min(...ds);
    const sumD = ds.reduce((a, b) => a + b, 0);
    const score = minD * 100 + sumD;
    if (score > best) {
      best = score;
      pool.length = 0;
      pool.push(cell);
    } else if (score === best) pool.push(cell);
  }
  if (pool.length) return pool[Math.floor(rng() * pool.length)] ?? pool[0];
  return SNITCH_SPAWNS.find((s) => !taken.has(s)) ?? "A7";
}

function autoKeeper(state: GameState) {
  if (state.pendingGoal || !state.quafflePos || state.quaffleHolderId) return;
  const keeper = occupant(state, state.quafflePos);
  if (!keeper || !isKeeper(keeper.role) || state.stunnedNow.includes(keeper.id)) return;
  giveQuaffle(state, keeper.id, "both");
  keeper.stats.quafflePickups += 1;
  state.counters.freeQuafflePickup += 1;
  event(state, "quaffle_pickup", keeper.id, state.quafflePos, { phase: "post_auto_keeper", finalHolderId: keeper.id });
}

function moveBludgers(state: GameState, rng: Rng) {
  const resting = (pos: string) =>
    activePlayers(state).some((p) => p.pos === pos && (state.stunnedNow.includes(p.id) || state.stunnedForNext.includes(p.id)));
  const stepOne = (idx: 1 | 2, ownPrev: string | null, extraBan: string | null) => {
    const pos = idx === 1 ? state.bludger1Pos : state.bludger2Pos;
    if (state.bludgerHit[idx - 1] || resting(pos)) return pos;
    const other = idx === 1 ? state.bludger2Pos : state.bludger1Pos;
    const options = neighbors(pos).filter((n) => n !== other && n !== state.quafflePos && n !== ownPrev && n !== extraBan);
    if (!options.length) return pos;
    return options[Math.floor(rng() * options.length)] ?? pos;
  };
  const prev1 = state.bludger1Pos;
  const next1 = stepOne(1, state.bludger1Prev, null);
  if (next1 !== state.bludger1Pos) {
    state.bludger1Prev = state.bludger1Pos;
    state.bludger1Pos = next1;
    const who = occupant(state, next1);
    if (who) stunByBludger(state, who.id, next1, 1, null);
  }
  const next2 = stepOne(2, state.bludger2Prev, prev1);
  if (next2 !== state.bludger1Pos && next2 !== state.bludger2Pos) {
    state.bludger2Prev = state.bludger2Pos;
    state.bludger2Pos = next2;
    const who = occupant(state, next2);
    if (who) stunByBludger(state, who.id, next2, 2, null);
  }
  for (const which of [1, 2] as const) {
    const pos = which === 1 ? state.bludger1Pos : state.bludger2Pos;
    const who = occupant(state, pos);
    if (!who || state.stunnedNow.includes(who.id) || state.stunnedForNext.includes(who.id)) continue;
    stunByBludger(state, who.id, pos, which, null);
  }
}

function finalize(state: GameState) {
  const players = activePlayers(state).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    team: p.team,
    role: p.role,
    pos: p.pos,
    stunned: state.stunnedForNext.includes(p.id),
    snitchProgress: p.snitchProgress,
  }));
  state.snapshots.push({
    stepNo: state.stepNo,
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    quafflePos: state.quafflePos,
    quaffleHolderId: state.quaffleHolderId,
    bludgers: [state.bludger1Pos, state.bludger2Pos],
    snitchPos: state.snitchPos,
    snitchRevealed: state.snitchRevealed,
    players,
  });
  if (state.snapshots.length > 160) state.snapshots.splice(0, state.snapshots.length - 160);
  if (state.scoreA >= WIN_SCORE || state.scoreB >= WIN_SCORE) {
    state.finished = true;
    state.finishedAt = Date.now();
    if (state.scoreA > state.scoreB) state.winnerTeam = state.teamA;
    else if (state.scoreB > state.scoreA) state.winnerTeam = state.teamB;
    else state.winnerTeam = null;
  }
  state.stepNo += 1;
  state.stepStartedAt = Date.now();
  state.phase = "pre_collect";
  state.stepPrepared = false;
  state.pendingGoal = null;
  const nextStun = new Set(state.stunnedForNext);
  state.stunnedNow = [];
  state.stunnedForNext = [];
  state.bludgerHit = [false, false];
  for (const p of activePlayers(state)) {
    state.turns[p.id] = blankTurn(state.stepNo, nextStun.has(p.id));
  }
}

function runPhase(state: GameState, rng: Rng, phase: Phase): boolean {
  if (phase === "pre_collect" || phase === "post_collect") {
    return runCollect(state, phase === "post_collect");
  }
  if (phase === "pre_actions" || phase === "post_actions") {
    const first = phase === "pre_actions";
    const ordered = [...activePlayers(state)].sort((a, b) => a.createdAt - b.createdAt);
    for (const p of ordered) applySimpleAction(state, p, first);
    return false;
  }
  if (phase === "move") {
    applyMovement(state);
    return false;
  }
  if (phase === "goal") {
    resolvePending(state);
    return false;
  }
  if (phase === "snitch") {
    processSnitch(state, rng);
    return Boolean(state.duel && !state.duel.resolvedAt);
  }
  if (phase === "auto_keeper") {
    autoKeeper(state);
    return false;
  }
  if (phase === "bludgers") {
    moveBludgers(state, rng);
    return false;
  }
  return false;
}

function maybeAdvance(state: GameState, rng: Rng, depth = 0) {
  if (depth > 6 || state.finished || !state.started || state.paused) return;
  if (!everyoneEnded(state)) return;
  if (state.duel && !state.duel.resolvedAt) return;
  beginStep(state);
  while (state.phase !== "finalize") {
    const opened = runPhase(state, rng, state.phase);
    if (opened || (state.duel && !state.duel.resolvedAt)) return;
    const idx = PHASES.indexOf(state.phase);
    state.phase = PHASES[idx + 1] ?? "finalize";
  }
  finalize(state);
  if (state.finished) return;
  if (activePlayers(state).length && activePlayers(state).every((p) => state.turns[p.id]?.stunned)) {
    maybeAdvance(state, rng, depth + 1);
  }
}

function duelComplete(duel: DuelState): boolean {
  return duel.participantIds.every((id) => duel.scores[id] != null);
}

function fillDuelGaps(state: GameState, rng: Rng, timedOut: boolean) {
  const duel = state.duel;
  if (!duel || duel.resolvedAt) return;
  for (const id of duel.participantIds) {
    if (duel.scores[id] != null) continue;
    const p = playerById(state, id);
    if (p?.isBot) duel.scores[id] = botDuelScore(p.botDifficulty ?? 2, rng);
  }
  const missing = duel.participantIds.filter((id) => duel.scores[id] == null);
  if (!missing.length || !timedOut) return;
  if (missing.length === duel.participantIds.length) {
    if (duel.kind === "steal" && duel.holderId) {
      for (const id of duel.participantIds) duel.scores[id] = id === duel.holderId ? 1 : 0;
      return;
    }
    const idx = stableIndexFromId(duel.id, duel.participantIds.length);
    duel.participantIds.forEach((id, i) => {
      duel.scores[id] = i === idx ? 1 : 0;
    });
    return;
  }
  for (const id of missing) duel.scores[id] = 0;
}

export function botDuelScore(level: BotLevel, rng: Rng): number {
  const table = { 1: [45, 22], 2: [62, 16], 3: [78, 12] } as const;
  const [mean, spread] = table[level];
  const raw = mean + (rng() * 2 - 1) * spread;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function pump(state: GameState, rng: Rng = Math.random): void {
  if (state.paused && state.pausedAt == null) state.pausedAt = Date.now();
  for (let i = 0; i < 10; i++) {
    if (state.finished || !state.started || state.paused) return;
    if (state.duel && !state.duel.resolvedAt) {
      const timedOut = Date.now() - state.duel.startedAt >= TURN_TIMEOUT_MS;
      fillDuelGaps(state, rng, timedOut);
      if (duelComplete(state.duel)) resolveDuel(state, rng);
      else return;
    }
    const blocking =
      state.duel &&
      !state.duel.resolvedAt &&
      (state.duel.kind === "steal" || state.duel.kind === "pickup" || state.duel.kind === "throw_steal" || state.duel.kind === "snitch");
    if (!blocking && state.started && Date.now() - state.stepStartedAt >= TURN_TIMEOUT_MS) {
      for (const p of activePlayers(state)) {
        const turn = ensureTurn(state, p.id);
        if (!turn.ended) {
          turn.ended = true;
          turn.plannedTo = null;
          turn.plannedActionType = null;
          turn.plannedActionTo = null;
          turn.plannedActionBludger = null;
          turn.plannedActionFirst = null;
        }
      }
    }
    planBots(state, rng);
    if (!everyoneEnded(state)) return;
    const step = state.stepNo;
    const phase = state.phase;
    maybeAdvance(state, rng);
    if (state.duel && !state.duel.resolvedAt) continue;
    if (state.stepNo === step && state.phase === phase && !state.finished) return;
  }
}

export function submitScore(state: GameState, participantId: string, duelId: string, score: number): string | null {
  if (!state.started) return "game_not_started";
  if (state.finished) return "game_finished";
  if (!state.duel || state.duel.id !== duelId || state.duel.resolvedAt) return "invalid_duel";
  if (!state.duel.participantIds.includes(participantId)) return "not_participant";
  if (!Number.isInteger(score) || score < 0 || score > 100) return "invalid_score";
  if (state.duel.scores[participantId] != null) return "alreadySubmitted";
  state.duel.scores[participantId] = score;
  return null;
}

function gate(state: GameState, player: Participant, kind: "plan" | "end"): string | null {
  if (player.isObserver) return kind === "plan" ? "observer_cannot_plan" : "observer_cannot_end";
  if (!isActiveRole(player.role)) return kind === "plan" ? "role_cannot_plan" : "role_cannot_end";
  if (state.finished) return "game_finished";
  if (state.paused) return "game_paused";
  if (!state.started) return "game_not_started";
  const turn = state.turns[player.id];
  if (turn?.stunned) return "stunned";
  if (turn?.ended) return "turn_ended";
  if (Date.now() - state.stepStartedAt >= TURN_TIMEOUT_MS) return "turn_timed_out";
  return null;
}

export function planMove(state: GameState, playerId: string, to: string | null): string | null {
  const player = playerById(state, playerId);
  if (!player) return "not_found";
  const err = gate(state, player, "plan");
  if (err) return err;
  const turn = ensureTurn(state, player.id);
  const coord = to ? to : null;
  const moveErr = moveError(state, player, coord, false);
  if (moveErr) return moveErr;
  turn.plannedTo = coord;
  return null;
}

export function endTurn(state: GameState, playerId: string, plan: PlanInput): string | null {
  const player = playerById(state, playerId);
  if (!player) return "not_found";
  const err = gate(state, player, "end");
  if (err) return err;
  const turn = ensureTurn(state, player.id);
  let to = plan.to;
  if (moveError(state, player, to, true)) to = null;
  let actionType = plan.actionType;
  let actionTo = plan.actionTo;
  let actionBludger = plan.actionBludger;
  const first = actionType ? Boolean(plan.actionFirst) : false;
  turn.plannedTo = to;
  turn.originPos = player.pos;
  if (validateAction(state, player, turn, actionType, actionTo, actionBludger, first)) {
    actionType = null;
    actionTo = null;
    actionBludger = null;
  }
  turn.plannedActionType = actionType;
  turn.plannedActionTo = actionType ? actionTo : null;
  turn.plannedActionBludger = actionType === "hit_bludger" ? actionBludger : null;
  turn.plannedActionFirst = actionType ? first : null;
  turn.ended = true;
  turn.actionSpent = false;
  return null;
}

export function startGame(state: GameState, playerId: string): string | null {
  const player = playerById(state, playerId);
  if (!player) return "not_found";
  if (state.finished) return "game_finished";
  if (state.started) return null;
  const judge = state.participants.find((p) => p.isJudge);
  if (judge && player.id !== judge.id) return "not_judge";
  if (!judge && player.isObserver) return "observer_cannot_start";
  state.started = true;
  state.startedAt = Date.now();
  state.stepStartedAt = Date.now();
  for (const p of activePlayers(state)) state.turns[p.id] = blankTurn(state.stepNo, false);
  return null;
}

export function togglePause(state: GameState, playerId: string): string | null {
  const player = playerById(state, playerId);
  if (!player?.isJudge) return "not_judge";
  if (state.finished) return "game_finished";
  if (!state.paused) {
    state.paused = true;
    state.pausedAt = Date.now();
    return null;
  }
  const pausedAt = state.pausedAt ?? Date.now();
  const held = Math.max(0, Date.now() - pausedAt);
  state.stepStartedAt += held;
  if (state.duel && !state.duel.resolvedAt) state.duel.startedAt += held;
  state.paused = false;
  state.pausedAt = null;
  return null;
}

export function setBotDifficulty(state: GameState, botId: string, level: BotLevel): string | null {
  const bot = playerById(state, botId);
  if (!bot?.isBot) return "not_bot";
  bot.botDifficulty = level;
  return null;
}

export function emptyRoles(state: GameState): { side: Side; role: RoleKey; team: TeamKey }[] {
  const taken = new Set(activePlayers(state).map((p) => `${p.side}:${p.role}`));
  const roles: RoleKey[] = ["keeper", "seeker", "chaser1", "chaser2", "beater"];
  const out: { side: Side; role: RoleKey; team: TeamKey }[] = [];
  for (const side of ["A", "B"] as Side[]) {
    for (const role of roles) {
      if (!taken.has(`${side}:${role}`)) out.push({ side, role, team: side === "A" ? state.teamA : state.teamB });
    }
  }
  return out;
}

export function fillBots(state: GameState, level: BotLevel, rng: Rng = Math.random): void {
  const used = new Set(state.participants.map((p) => p.nickname.trim()).filter(Boolean));
  for (const slot of emptyRoles(state)) {
    const name = pickUniqueBotNickname(slot.role, used, rng);
    addParticipant(state, {
      nickname: name,
      team: slot.team,
      role: slot.role,
      observer: false,
      judge: false,
      bot: true,
      difficulty: level,
    });
  }
}

export function buildResults(state: GameState) {
  const pack = (side: Side) => {
    const team = side === "A" ? state.teamA : state.teamB;
    const players = state.participants
      .filter((p) => p.side === side && p.role)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        role: p.role,
        isBot: p.isBot,
        goals: p.stats.goalsScored,
        saves: p.stats.goalsSaved,
        snitches: p.stats.snitchCatches,
        steals: p.stats.quaffleSteals,
        pickups: p.stats.quafflePickups,
        passes: p.stats.quafflePasses,
        bludgerHits: p.stats.bludgerHits,
        bludgerHitsToPlayers: p.stats.bludgerHitsToPlayers,
        points: p.stats.goalsScored * 10 + p.stats.snitchCatches * 30,
      }))
      .sort((a, b) => {
        return (
          b.points - a.points ||
          b.snitches - a.snitches ||
          b.goals - a.goals ||
          b.saves - a.saves ||
          b.steals - a.steals ||
          b.pickups - a.pickups ||
          b.passes - a.passes ||
          a.nickname.localeCompare(b.nickname, "ru")
        );
      });
    return { team, players };
  };
  return {
    finished: state.finished,
    finishedAt: state.finishedAt,
    winnerTeam: state.winnerTeam,
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    teamA: pack("A"),
    teamB: pack("B"),
  };
}

function planBots(state: GameState, rng: Rng) {
  if (!state.started || state.paused || state.finished) return;
  if (state.duel && !state.duel.resolvedAt) return;
  for (const bot of activePlayers(state)) {
    if (!bot.isBot) continue;
    const turn = ensureTurn(state, bot.id);
    if (turn.ended || turn.stunned) continue;
    const plan = chooseBotPlan(state, bot, rng);
    turn.plannedTo = plan.to;
    turn.plannedActionType = plan.actionType;
    turn.plannedActionTo = plan.actionTo;
    turn.plannedActionBludger = plan.actionBludger;
    turn.plannedActionFirst = plan.actionType ? plan.actionFirst : null;
    turn.originPos = bot.pos;
    const actionErr = plan.actionType
      ? validateAction(state, bot, turn, plan.actionType, plan.actionTo, plan.actionBludger, Boolean(plan.actionFirst))
      : null;
    if (actionErr) {
      turn.plannedActionType = null;
      turn.plannedActionTo = null;
      turn.plannedActionBludger = null;
      turn.plannedActionFirst = null;
    }
    const moveErr = moveError(state, bot, turn.plannedTo, true);
    if (moveErr) turn.plannedTo = null;
    if (turn.plannedActionType) {
      const again = validateAction(
        state,
        bot,
        turn,
        turn.plannedActionType,
        turn.plannedActionTo,
        turn.plannedActionBludger,
        Boolean(turn.plannedActionFirst),
      );
      if (again) {
        turn.plannedActionType = null;
        turn.plannedActionTo = null;
        turn.plannedActionBludger = null;
        turn.plannedActionFirst = null;
      }
    }
    turn.ended = true;
  }
}

function chooseBotPlan(state: GameState, bot: Participant, rng: Rng): PlanInput {
  const profile = bot.botDifficulty === 1 ? { a: 0.55, m: 0.38, h: 0.05 } : bot.botDifficulty === 3 ? { a: 0.95, m: 0.06, h: 0.95 } : { a: 0.8, m: 0.18, h: 0.4 };
  const empty: PlanInput = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  if (!bot.pos || !bot.role || !bot.side) return empty;
  const blocked = new Set<string>();
  for (const t of Object.values(state.turns)) if (t.plannedTo) blocked.add(t.plannedTo);
  const moves = listMoves(state, bot, blocked);
  const toward = (target: string | null, allowStay = true) => pickMove(bot.pos as string, moves, target, rng, profile.m, allowStay);

  if (isChaser(bot.role)) {
    if (state.quaffleHolderId === bot.id && bot.side) {
      const rings = attackGoals(bot.side).filter((g) => chebyshev(bot.pos as string, g) === 2);
      const open = rings.find((g) => !activePlayers(state).some((p) => isKeeper(p.role) && p.pos === g)) ?? rings[0];
      if (open && rng() < profile.a) {
        const after = rng() < (bot.botDifficulty === 3 ? 0.65 : bot.botDifficulty === 1 ? 0.12 : 0.35);
        return { to: after ? toward(open) : null, actionFirst: true, actionType: "throw", actionTo: open, actionBludger: null };
      }
      const ring = attackGoals(bot.side).slice().sort((a, b) => chebyshev(bot.pos as string, a) - chebyshev(bot.pos as string, b))[0];
      return { ...empty, to: toward(ring ?? null) };
    }
    if (!state.quaffleHolderId && state.quafflePos) {
      const d = chebyshev(bot.pos, state.quafflePos);
      if (d <= 1 && rng() < profile.a) return { ...empty, actionFirst: true, actionType: "pickup" };
      return { ...empty, to: toward(state.quafflePos), actionFirst: false, actionType: d <= 2 ? "pickup" : null };
    }
    const holder = playerById(state, state.quaffleHolderId);
    if (holder?.pos && holder.side !== bot.side) {
      const d = chebyshev(bot.pos, holder.pos);
      if (d <= 1 && rng() < profile.a) return { ...empty, actionFirst: true, actionType: "steal" };
      return { ...empty, to: toward(holder.pos), actionFirst: false, actionType: "steal" };
    }
    return { ...empty, to: toward(state.quafflePos) };
  }

  if (isKeeper(bot.role) && bot.side) {
    const home = defaultSpawn("keeper", bot.side);
    if (!state.quaffleHolderId && state.quafflePos && chebyshev(bot.pos, state.quafflePos) <= 1) {
      const mates = activePlayers(state)
        .filter((p) => p.side === bot.side && isChaser(p.role) && p.pos && chebyshev(bot.pos as string, p.pos) >= 1 && chebyshev(bot.pos as string, p.pos) <= 6)
        .sort((a, b) => chebyshev(bot.pos as string, a.pos as string) - chebyshev(bot.pos as string, b.pos as string));
      const land = mates[0]?.pos ?? keeperToss(bot.pos as string, bot.side);
      return { ...empty, actionFirst: true, actionType: "keeper_pickup", actionTo: land };
    }
    if (state.quaffleHolderId === bot.id) {
      const mates = activePlayers(state)
        .filter((p) => p.side === bot.side && isChaser(p.role) && p.pos)
        .sort((a, b) => chebyshev(bot.pos as string, a.pos as string) - chebyshev(bot.pos as string, b.pos as string));
      const mate = mates[0];
      if (mate?.pos && chebyshev(bot.pos, mate.pos) <= 6 && chebyshev(bot.pos, mate.pos) >= 1 && rng() < profile.a) {
        return { ...empty, actionFirst: true, actionType: "throw", actionTo: mate.pos };
      }
      return { ...empty, to: toward(mate?.pos ?? home) };
    }
    const holder = playerById(state, state.quaffleHolderId);
    if (holder?.pos && holder.side !== bot.side && chebyshev(bot.pos, holder.pos) <= 1 && rng() < profile.a) {
      return { ...empty, actionFirst: true, actionType: "steal" };
    }
    for (const which of [1, 2] as const) {
      const bpos = which === 1 ? state.bludger1Pos : state.bludger2Pos;
      if (chebyshev(bot.pos, bpos) === 1) {
        const foe = activePlayers(state).find((p) => p.side !== bot.side && p.pos && lineCells(bpos, p.pos, 3));
        if (foe?.pos && rng() < profile.a) {
          return { ...empty, actionFirst: true, actionType: "hit_bludger", actionTo: foe.pos, actionBludger: which };
        }
      }
    }
    return { ...empty, to: toward(home) };
  }

  if (isSeeker(bot.role) && bot.side) {
    if (state.snitchCaughtById) return { ...empty, to: toward(defaultSpawn("seeker", bot.side)) };
    const real = state.snitchPos;
    const chase = Boolean(real && (state.snitchRevealed || rng() < profile.h));
    const target = chase ? real : SNITCH_SPAWNS[Math.floor(rng() * SNITCH_SPAWNS.length)];
    return { ...empty, to: toward(target ?? null) };
  }

  if (isBeater(bot.role)) {
    const bludgers = [
      { idx: 1 as const, pos: state.bludger1Pos },
      { idx: 2 as const, pos: state.bludger2Pos },
    ].sort((a, b) => chebyshev(bot.pos as string, a.pos) - chebyshev(bot.pos as string, b.pos));
    for (const b of bludgers) {
      if (chebyshev(bot.pos as string, b.pos) !== 1) continue;
      const foe = activePlayers(state).find((p) => p.side !== bot.side && p.pos && lineCells(b.pos, p.pos, 3));
      if (foe?.pos && rng() < profile.a) {
        return { ...empty, actionFirst: true, actionType: "hit_bludger", actionTo: foe.pos, actionBludger: b.idx };
      }
    }
    let best: string | null = null;
    let bestScore = -999;
    const candidates = [bot.pos, ...moves];
    for (const cell of candidates) {
      if (!cell) continue;
      let score = 0;
      for (const b of bludgers) {
        const d = chebyshev(cell, b.pos);
        if (d === 0) score -= 100;
        else if (d === 1) score += 100;
        else if (d === 2) score += 10;
      }
      if (cell === bot.pos) score -= 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    return { ...empty, to: best && best !== bot.pos ? best : null };
  }
  return empty;
}

function listMoves(state: GameState, bot: Participant, blocked: Set<string>): string[] {
  if (!bot.pos || !bot.role || !bot.side) return [];
  const balls = ballCells(state);
  const list: string[] = [];
  for (const coord of allCoords()) {
    if (!bot.role || !bot.side) continue;
    const ok =
      (isKeeper(bot.role) && bot.side
        ? chebyshev(bot.pos, coord) === 1 && keeperOk(bot.side, bot.pos, coord)
        : isSeeker(bot.role)
          ? chebyshev(bot.pos, coord) >= 1 && chebyshev(bot.pos, coord) <= 2 && !isGoalCell(coord)
          : chaserOk(bot.pos, coord)) && !balls.has(coord) && !blocked.has(coord) && !occupant(state, coord, bot.id);
    if (ok) list.push(coord);
  }
  return list;
}

function isGoalCell(coord: string): boolean {
  return coord === "C1" || coord === "D1" || coord === "E1" || coord === "C13" || coord === "D13" || coord === "E13";
}

function keeperOk(side: Side, from: string, to: string): boolean {
  const goals = side === "A" ? ["C1", "D1", "E1"] : ["C13", "D13", "E13"];
  const zone = new Set<string>();
  for (const g of goals) {
    const row = "ABCDEFG".indexOf(g[0]);
    const col = Number(g.slice(1));
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r <= 6 && c >= 1 && c <= 13) zone.add(`${"ABCDEFG"[r]}${c}`);
      }
    }
  }
  return zone.has(from) && zone.has(to);
}

function keeperToss(from: string, side: Side): string {
  const forward = side === "A" ? 1 : -1;
  const row = from.charCodeAt(0) - 65;
  const col = Number(from.slice(1));
  let best = "D7";
  let bestScore = -999;
  for (let r = 0; r < 7; r++) {
    for (let c = 1; c <= 13; c++) {
      const coord = `${"ABCDEFG"[r]}${c}`;
      const d = chebyshev(from, coord);
      if (d < 1 || d > 6) continue;
      const score = (c - col) * forward * 3 - Math.abs(r - row);
      if (score > bestScore) {
        bestScore = score;
        best = coord;
      }
    }
  }
  return best;
}

function chaserOk(from: string, to: string): boolean {
  if (from === to || isGoalCell(to)) return false;
  const dr = Math.abs("ABCDEFG".indexOf(from[0]) - "ABCDEFG".indexOf(to[0]));
  const dc = Math.abs(Number(from.slice(1)) - Number(to.slice(1)));
  const ortho = (dr === 0 && (dc === 1 || dc === 2)) || (dc === 0 && (dr === 1 || dr === 2));
  const diag = dr === dc && (dr === 1 || dr === 2);
  return ortho || diag;
}

function pickMove(from: string, moves: string[], target: string | null, rng: Rng, mistake: number, _allowStay: boolean): string | null {
  if (rng() < mistake) {
    if (rng() < 0.35) return null;
    if (!moves.length) return null;
    return moves[Math.floor(rng() * moves.length)] ?? null;
  }
  if (!target) return moves[0] ?? null;
  let best: string | null = null;
  let bestD = chebyshev(from, target) - 0.2;
  for (const m of moves) {
    const d = chebyshev(m, target);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

export function publicState(state: GameState, viewerId: string | null) {
  const viewer = viewerId ? playerById(state, viewerId) : null;
  const takenRoles: Record<string, { participantId: string; nickname: string; isBot: boolean; botDifficulty: BotLevel | null }> = {};
  for (const p of activePlayers(state)) {
    if (p.role) takenRoles[`${p.team}:${p.role}`] = { participantId: p.id, nickname: p.nickname, isBot: p.isBot, botDifficulty: p.botDifficulty };
  }
  const reservedMoves = Object.values(state.turns)
    .map((t) => t.plannedTo)
    .filter((x): x is string => Boolean(x));
  const duel =
    state.duel && (!state.duel.resolvedAt || Date.now() - state.duel.resolvedAt < 10000)
      ? {
          id: state.duel.id,
          attackerId: state.duel.attackerId,
          defenderId: state.duel.defenderId,
          participantIds: state.duel.participantIds,
          kind: state.duel.kind,
          targetPos: state.duel.targetPos,
          createdStepNo: state.duel.createdStepNo,
          startedAt: state.duel.startedAt,
          resolvedAt: state.duel.resolvedAt,
          winnerId: state.duel.winnerId,
          scores: state.duel.scores,
        }
      : null;
  const chat = state.chat
    .filter((m) => {
      if (m.scope === "all") return true;
      if (!viewer || viewer.isObserver) return false;
      return m.toTeam === viewer.team;
    })
    .slice(-80);
  return {
    serverNow: Date.now(),
    turnMs: TURN_TIMEOUT_MS,
    messageCounters: state.counters,
    you: viewer ? { id: viewer.id, isJudge: viewer.isJudge, isObserver: viewer.isObserver, team: viewer.team, role: viewer.role } : null,
    game: {
      code: state.code,
      teamA: state.teamA,
      teamB: state.teamB,
      started: state.started,
      finished: state.finished,
      finishedAt: state.finishedAt,
      winnerTeam: state.winnerTeam,
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      paused: state.paused,
      pausedAt: state.paused ? state.pausedAt : null,
      quaffleLockHolderId: state.quaffleLockHolderId,
      quaffleLockStepNo: state.quaffleLockStepNo,
      quaffleStealCooldownStepNo: state.quaffleStealCooldownStepNo,
      stepNo: state.stepNo,
      stepStartedAt: state.stepStartedAt,
      createdAt: state.createdAt,
    },
    results: state.finished ? buildResults(state) : null,
    participants: state.participants.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      team: p.team,
      role: p.role,
      side: p.side,
      pos: p.pos,
      snitchProgress: p.snitchProgress,
      stats: p.stats,
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      isObserver: p.isObserver,
      isJudge: p.isJudge,
      createdAt: p.createdAt,
    })),
    takenRoles,
    turnStates: Object.fromEntries(
      activePlayers(state).map((p) => {
        const t = state.turns[p.id];
        const own = viewer?.id === p.id && !viewer.isObserver;
        return [
          p.id,
          {
            ended: Boolean(t?.ended),
            stunned: Boolean(t?.stunned),
            plannedTo: own ? (t?.plannedTo ?? null) : null,
            plannedActionType: own ? (t?.plannedActionType ?? null) : null,
            plannedActionTo: own ? (t?.plannedActionTo ?? null) : null,
            plannedActionBludger: own ? (t?.plannedActionBludger ?? null) : null,
            plannedActionFirst: own ? (t?.plannedActionFirst ?? null) : null,
          },
        ];
      }),
    ),
    reservedMoves,
    bludgers: [state.bludger1Pos, state.bludger2Pos] as [string, string],
    snitch: {
      pos: state.snitchRevealed ? state.snitchPos : null,
      revealed: state.snitchRevealed,
      caughtById: state.snitchCaughtById,
    },
    quaffle: { holderId: state.quaffleHolderId, pos: state.quafflePos },
    events: state.events.slice(-20).map((e) => ({
      id: e.id,
      kind: e.kind,
      actorId: e.actorId,
      stepNo: e.stepNo,
      bludgerIdx: e.bludgerIdx,
      targetPos: e.targetPos,
      createdAt: e.createdAt,
      meta: e.meta,
    })),
    chat: { messages: chat },
    duel,
    seekerProgress: activePlayers(state)
      .filter((p) => isSeeker(p.role))
      .map((p) => ({ id: p.id, team: p.team, nickname: p.nickname, progress: p.snitchProgress })),
  };
}

export type ClientState = ReturnType<typeof publicState>;
