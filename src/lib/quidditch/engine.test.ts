import assert from "node:assert/strict";
import test from "node:test";
import { addParticipant, createMatch, endTurn, publicState, pump, startGame, submitScore } from "./engine.ts";
import { legalMoves, takenCells } from "./assist.ts";
import { captureFeed, plainEventLine } from "./feed.ts";
import { isAllowedChaserMove, isAllowedKeeperMove, neighbors, TURN_TIMEOUT_MS } from "./rules.ts";

function match() {
  const state = createMatch("gryffindor", "slytherin", () => 0);
  state.code = "TEST01";
  return state;
}

test("chaser cannot enter a goal and keeper stays in the crease", () => {
  assert.equal(isAllowedChaserMove("C3", "C1"), false);
  assert.equal(isAllowedChaserMove("C3", "C2"), true);
  assert.equal(isAllowedChaserMove("D4", "F6"), true);
  assert.equal(isAllowedKeeperMove("D1", "C2", "A"), true);
  assert.equal(isAllowedKeeperMove("D1", "D3", "A"), false);
});

test("pickup duel gives the quaffle to the higher score", () => {
  const state = match();
  const a = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const b = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  a.pos = "D6";
  b.pos = "D8";
  assert.equal(startGame(state, a.id), null);
  assert.equal(endTurn(state, a.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, b.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  pump(state, () => 0);
  assert.equal(state.duel?.kind, "pickup");
  assert.ok(state.duel);
  submitScore(state, a.id, state.duel.id, 90);
  submitScore(state, b.id, state.duel.id, 40);
  pump(state, () => 0);
  assert.equal(state.quaffleHolderId, a.id);
  assert.equal(a.stats.quafflePickups, 1);
});

test("pickup duel tie leaves the quaffle free", () => {
  const state = match();
  const a = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const b = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  a.pos = "D6";
  b.pos = "D8";
  startGame(state, a.id);
  endTurn(state, a.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null });
  endTurn(state, b.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null });
  pump(state, () => 0);
  assert.ok(state.duel);
  submitScore(state, a.id, state.duel.id, 50);
  submitScore(state, b.id, state.duel.id, 50);
  pump(state, () => 0);
  assert.equal(state.quaffleHolderId, null);
  assert.equal(state.quafflePos, "D7");
});

test("keeper can step into the hoop and save a pre-move shot", () => {
  const state = match();
  const chaser = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const keeper = addParticipant(state, {
    nickname: "Кира",
    team: "slytherin",
    role: "keeper",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  chaser.pos = "C11";
  keeper.pos = "D13";
  state.quaffleHolderId = chaser.id;
  state.quafflePos = null;
  startGame(state, chaser.id);
  assert.equal(
    endTurn(state, chaser.id, { to: null, actionFirst: true, actionType: "throw", actionTo: "C13", actionBludger: null }),
    null,
  );
  assert.equal(endTurn(state, keeper.id, { to: "C13", actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.scoreA, 0);
  assert.equal(state.quaffleHolderId, keeper.id);
  assert.equal(keeper.stats.goalsSaved, 1);
  assert.equal(keeper.pos, "C13");
});

test("chaser can steal on the turn they fly next to the holder", () => {
  const state = match();
  const me = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const hunter = addParticipant(state, {
    nickname: "Бот",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: true,
    difficulty: 2,
  });
  me.pos = "D5";
  hunter.pos = "D7";
  state.quaffleHolderId = hunter.id;
  state.quafflePos = null;
  startGame(state, me.id);
  assert.equal(
    endTurn(state, me.id, { to: "D6", actionFirst: false, actionType: "steal", actionTo: null, actionBludger: null }),
    null,
  );
  assert.equal(endTurn(state, hunter.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "steal");
  assert.equal(state.duel?.participantIds.includes(me.id), true);
});

test("winning a throw interception still takes the shot", () => {
  const state = match();
  const me = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const hunter = addParticipant(state, {
    nickname: "Бот",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: true,
    difficulty: 2,
  });
  me.pos = "D11";
  hunter.pos = "D12";
  state.quaffleHolderId = me.id;
  state.quafflePos = null;
  startGame(state, me.id);
  assert.equal(
    endTurn(state, me.id, { to: null, actionFirst: true, actionType: "throw", actionTo: "D13", actionBludger: null }),
    null,
  );
  assert.equal(
    endTurn(state, hunter.id, { to: null, actionFirst: true, actionType: "steal", actionTo: null, actionBludger: null }),
    null,
  );
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "throw_steal");
  assert.ok(state.duel);
  submitScore(state, me.id, state.duel.id, 90);
  submitScore(state, hunter.id, state.duel.id, 20);
  pump(state, () => 0.2);
  assert.equal(state.scoreA, 10);
  assert.equal(me.stats.goalsScored, 1);
  assert.equal(state.quafflePos, "D13");
});

test("keeper steal contests a chaser shot", () => {
  const state = match();
  const keeper = addParticipant(state, {
    nickname: "Кип",
    team: "slytherin",
    role: "keeper",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const chaser = addParticipant(state, {
    nickname: "Охот",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  keeper.pos = "D13";
  chaser.pos = "D11";
  state.quaffleHolderId = chaser.id;
  state.quafflePos = null;
  startGame(state, keeper.id);
  assert.equal(endTurn(state, keeper.id, { to: "D12", actionFirst: false, actionType: "steal", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, chaser.id, { to: null, actionFirst: true, actionType: "throw", actionTo: "D13", actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "throw_steal");
  assert.ok(state.duel?.participantIds.includes(keeper.id));
  submitScore(state, keeper.id, state.duel!.id, 80);
  submitScore(state, chaser.id, state.duel!.id, 20);
  pump(state, () => 0.2);
  assert.equal(state.scoreA, 0);
  assert.equal(state.quaffleHolderId, keeper.id);
});

test("a shot with nobody in the hoop scores ten", () => {
  const state = match();
  const chaser = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  chaser.pos = "D11";
  state.quaffleHolderId = chaser.id;
  state.quafflePos = null;
  startGame(state, chaser.id);
  assert.equal(
    endTurn(state, chaser.id, { to: null, actionFirst: false, actionType: "throw", actionTo: "D13", actionBludger: null }),
    null,
  );
  pump(state, () => 0.2);
  assert.equal(state.scoreA, 10);
  assert.equal(chaser.stats.goalsScored, 1);
  assert.equal(state.quafflePos, "D13");
});

function seat(state: ReturnType<typeof match>, nickname: string, team: "gryffindor" | "slytherin", role: "beater" | "keeper" | "chaser1") {
  return addParticipant(state, {
    nickname,
    team,
    role,
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
}

test("beater cannot pick up or steal the quaffle", () => {
  const state = match();
  const beater = seat(state, "Заг", "gryffindor", "beater");
  const chaser = seat(state, "Охот", "slytherin", "chaser1");
  beater.pos = "D6";
  chaser.pos = "D8";
  state.quaffleHolderId = chaser.id;
  state.quafflePos = null;
  startGame(state, beater.id);
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "steal", actionTo: null, actionBludger: null }),
    null,
  );
  assert.equal(state.turns[beater.id]?.plannedActionType, null);
  assert.equal(state.turns[beater.id]?.ended, true);
});

test("two beaters hitting the same bludger open a duel", () => {
  const state = match();
  const a = seat(state, "Аня", "gryffindor", "beater");
  const b = seat(state, "Боря", "slytherin", "beater");
  a.pos = "A6";
  b.pos = "C8";
  state.bludger1Pos = "B7";
  startGame(state, a.id);
  const plan = { to: null, actionFirst: true as const, actionType: "hit_bludger" as const, actionTo: "B8", actionBludger: 1 as const };
  assert.equal(endTurn(state, a.id, plan), null);
  assert.equal(endTurn(state, b.id, plan), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "hit_bludger");
  assert.deepEqual(state.duel?.participantIds.slice().sort(), [a.id, b.id].sort());
});

test("a beater and a keeper hitting the same bludger open a duel", () => {
  const state = match();
  const keeper = seat(state, "Кира", "gryffindor", "keeper");
  const beater = seat(state, "Боря", "slytherin", "beater");
  keeper.pos = "D1";
  beater.pos = "B2";
  state.bludger1Pos = "C2";
  startGame(state, keeper.id);
  const plan = { to: null, actionFirst: true as const, actionType: "hit_bludger" as const, actionTo: "E2", actionBludger: 1 as const };
  assert.equal(endTurn(state, keeper.id, plan), null);
  assert.equal(endTurn(state, beater.id, plan), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "hit_bludger");
  assert.ok(state.duel?.participantIds.includes(keeper.id));
  assert.ok(state.duel?.participantIds.includes(beater.id));
});

test("beaters who hit the same bludger before and after the move share one duel", () => {
  const state = match();
  const a = seat(state, "Аня", "gryffindor", "beater");
  const b = seat(state, "Боря", "slytherin", "beater");
  a.pos = "A6";
  b.pos = "C8";
  state.bludger1Pos = "B7";
  startGame(state, a.id);
  assert.equal(endTurn(state, a.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "B8", actionBludger: 1 }), null);
  assert.equal(endTurn(state, b.id, { to: null, actionFirst: false, actionType: "hit_bludger", actionTo: "B9", actionBludger: 1 }), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "hit_bludger");
  assert.equal(state.duels.filter((duel) => !duel.resolvedAt).length, 1);
  assert.deepEqual(state.duel?.participantIds.slice().sort(), [a.id, b.id].sort());
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(state.counters.bludgerHit, 0);
});

test("a thrown bludger stuns whoever it lands on, including the keeper", () => {
  const state = match();
  const keeper = seat(state, "Кира", "gryffindor", "keeper");
  const beater = seat(state, "Боря", "slytherin", "beater");
  keeper.pos = "D1";
  beater.pos = "C2";
  state.bludger1Pos = "D2";
  state.bludger2Pos = "G7";
  startGame(state, keeper.id);
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "D1", actionBludger: 1 }),
    null,
  );
  assert.equal(endTurn(state, keeper.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.bludger1Pos, "D1");
  assert.equal(state.turns[keeper.id]?.stunned, true);
  assert.equal(state.events.some((event) => event.kind === "stun_bludger" && event.actorId === keeper.id), true);
  assert.equal(state.bludger1Pos, keeper.pos);
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "D4", actionBludger: 1 }),
    null,
  );
  pump(state, () => 0.2);
  assert.equal(state.turns[keeper.id]?.stunned, false);
  assert.equal(state.bludger1Pos, "D4");
});

test("a stun against bots stays on the player until the turn clock ends, then the bludger steps aside", () => {
  const state = match();
  const human = addParticipant(state, {
    nickname: "Кира",
    team: "gryffindor",
    role: "keeper",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  addParticipant(state, {
    nickname: "Бот",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: true,
    difficulty: 2,
  });
  human.pos = "D6";
  state.bludger1Pos = "E7";
  state.bludger1Prev = null;
  state.bludger2Pos = "A13";
  state.quafflePos = "G13";
  startGame(state, human.id);
  const stay = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, human.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.turns[human.id]?.stunned, true);
  assert.equal(state.bludger1Pos, human.pos);
  pump(state, () => 0);
  assert.equal(state.turns[human.id]?.stunned, true);
  assert.equal(state.bludger1Pos, human.pos);
  state.stepStartedAt = Date.now() - TURN_TIMEOUT_MS - 5;
  pump(state, () => 0);
  assert.equal(state.turns[human.id]?.stunned, false);
  assert.notEqual(state.bludger1Pos, human.pos);
  assert.equal(neighbors(human.pos as string).includes(state.bludger1Pos), true);
});

test("a wandering bludger stuns the player whose cell it enters", () => {
  const state = match();
  const keeper = seat(state, "Кира", "gryffindor", "keeper");
  const beater = seat(state, "Боря", "slytherin", "beater");
  keeper.pos = "D6";
  beater.pos = "A3";
  state.bludger1Pos = "E7";
  state.bludger1Prev = null;
  state.bludger2Pos = "A1";
  state.quafflePos = "G13";
  startGame(state, keeper.id);
  const stay = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, keeper.id, stay), null);
  assert.equal(endTurn(state, beater.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.bludger1Pos, "D6");
  assert.equal(state.turns[keeper.id]?.stunned, true);
  assert.equal(state.turns[beater.id]?.stunned, false);
  assert.equal(endTurn(state, beater.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.turns[keeper.id]?.stunned, false);
  assert.equal(state.bludgerGhost[keeper.id] ?? 0, 0);
  assert.notEqual(state.bludger1Pos, keeper.pos);
  assert.equal(neighbors(keeper.pos as string).includes(state.bludger1Pos), true);
});

test("two seekers who reach 100 on the same step duel for the snitch", () => {
  const state = match();
  const a = addParticipant(state, {
    nickname: "Ловец А",
    team: "gryffindor",
    role: "seeker",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const b = addParticipant(state, {
    nickname: "Ловец Б",
    team: "slytherin",
    role: "seeker",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  a.pos = "E6";
  b.pos = "E8";
  a.snitchProgress = 90;
  b.snitchProgress = 95;
  state.snitchPos = "D7";
  state.snitchRevealed = true;
  startGame(state, a.id);
  assert.equal(endTurn(state, a.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, b.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0);
  assert.equal(a.snitchProgress, 100);
  assert.equal(b.snitchProgress, 100);
  assert.equal(state.duel?.kind, "snitch");
  assert.equal(state.snitchCaughtById, null);
  assert.ok(state.duel);
  submitScore(state, a.id, state.duel.id, 70);
  submitScore(state, b.id, state.duel.id, 70);
  pump(state, () => 0);
  assert.equal(state.snitchCaughtById, null);
  assert.equal(state.snitchPos == null, false);
  assert.equal(a.snitchProgress, 100);
  assert.equal(b.snitchProgress, 100);
  assert.equal(endTurn(state, a.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, b.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0);
  assert.equal(state.duel?.kind, "snitch");
  assert.equal(state.duel?.resolvedAt, null);
  assert.ok(state.duel);
  submitScore(state, a.id, state.duel.id, 88);
  submitScore(state, b.id, state.duel.id, 12);
  pump(state, () => 0.2);
  assert.equal(state.snitchCaughtById, a.id);
  assert.equal(state.scoreA, 30);
  assert.equal(a.stats.snitchCatches, 1);
});

test("every player who reaches for the free quaffle joins one duel", () => {
  const state = match();
  const players = [
    ["Аня", "gryffindor", "chaser1", "B2"],
    ["Вера", "gryffindor", "chaser2", "C3"],
    ["Боря", "slytherin", "chaser1", "D2"],
    ["Глеб", "slytherin", "chaser2", "D3"],
    ["Кира", "gryffindor", "keeper", "D1"],
  ] as const;
  const seated = players.map(([nickname, team, role, pos]) => {
    const person = addParticipant(state, {
      nickname,
      team,
      role,
      observer: false,
      judge: false,
      bot: false,
      difficulty: null,
    });
    person.pos = pos;
    return person;
  });
  state.quafflePos = "C2";
  state.quaffleHolderId = null;
  startGame(state, seated[0].id);
  for (const person of seated) {
    const plan =
      person.role === "keeper"
        ? { to: null, actionFirst: true as const, actionType: "keeper_pickup" as const, actionTo: "F2", actionBludger: null }
        : { to: null, actionFirst: true as const, actionType: "pickup" as const, actionTo: null, actionBludger: null };
    assert.equal(endTurn(state, person.id, plan), null);
  }
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "pickup");
  assert.equal(state.duels.filter((duel) => !duel.resolvedAt).length, 1);
  assert.deepEqual(state.duel?.participantIds.slice().sort(), seated.map((person) => person.id).sort());
  assert.equal(state.quaffleHolderId, null);
  for (const person of seated) {
    const score = person.nickname === "Аня" ? 91 : 20 + person.nickname.length;
    assert.equal(submitScore(state, person.id, state.duel!.id, score), null);
  }
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, seated[0].id);
});

test("quaffle and bludger duels in the same step stay open together", () => {
  const state = match();
  const chaserA = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const chaserB = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const beaterA = addParticipant(state, {
    nickname: "Витя",
    team: "gryffindor",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const beaterB = addParticipant(state, {
    nickname: "Гена",
    team: "slytherin",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  chaserA.pos = "D6";
  chaserB.pos = "D8";
  beaterA.pos = "A6";
  beaterB.pos = "C8";
  state.quafflePos = "D7";
  state.bludger1Pos = "B7";
  startGame(state, chaserA.id);
  const pickup = { to: null, actionFirst: true as const, actionType: "pickup" as const, actionTo: null, actionBludger: null };
  const hit = { to: null, actionFirst: true as const, actionType: "hit_bludger" as const, actionTo: "B8", actionBludger: 1 as const };
  assert.equal(endTurn(state, chaserA.id, pickup), null);
  assert.equal(endTurn(state, chaserB.id, pickup), null);
  assert.equal(endTurn(state, beaterA.id, hit), null);
  assert.equal(endTurn(state, beaterB.id, hit), null);
  pump(state, () => 0.2);
  const open = state.duels.filter((duel) => !duel.resolvedAt);
  assert.deepEqual(open.map((duel) => duel.kind).sort(), ["hit_bludger", "pickup"]);
  assert.equal(state.quaffleHolderId, null);
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(state.phase, "pre_collect");
  const quaffle = open.find((duel) => duel.kind === "pickup");
  const bludger = open.find((duel) => duel.kind === "hit_bludger");
  assert.ok(quaffle && bludger);
  assert.equal(submitScore(state, chaserA.id, quaffle.id, 80), null);
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, null);
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(state.duels.some((duel) => duel.kind === "hit_bludger" && !duel.resolvedAt), true);
  assert.equal(submitScore(state, chaserB.id, quaffle.id, 30), null);
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, chaserA.id);
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(state.phase, "pre_collect");
  assert.equal(state.duels.some((duel) => duel.kind === "hit_bludger" && !duel.resolvedAt), true);
  assert.equal(submitScore(state, beaterA.id, bludger.id, 70), null);
  assert.equal(submitScore(state, beaterB.id, bludger.id, 15), null);
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, chaserA.id);
  assert.equal(state.bludger1Pos, "B8");
  assert.equal(state.duels.some((duel) => !duel.resolvedAt), false);
});

test("a keeper and both beaters share one bludger duel", () => {
  const state = match();
  const keeper = seat(state, "Кира", "gryffindor", "keeper");
  const ours = seat(state, "Аня", "gryffindor", "beater");
  const theirs = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  keeper.pos = "D1";
  ours.pos = "B2";
  theirs.pos = "D3";
  state.bludger1Pos = "C2";
  startGame(state, keeper.id);
  const plan = { to: null, actionFirst: true as const, actionType: "hit_bludger" as const, actionTo: "E2", actionBludger: 1 as const };
  assert.equal(endTurn(state, keeper.id, plan), null);
  assert.equal(endTurn(state, ours.id, plan), null);
  assert.equal(endTurn(state, theirs.id, plan), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "hit_bludger");
  assert.equal(state.duels.filter((duel) => !duel.resolvedAt).length, 1);
  assert.deepEqual(state.duel?.participantIds.slice().sort(), [keeper.id, ours.id, theirs.id].sort());
});

test("every opponent who tries to steal joins the holder in one duel", () => {
  const state = match();
  const holder = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const one = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const two = addParticipant(state, {
    nickname: "Глеб",
    team: "slytherin",
    role: "chaser2",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const keeper = addParticipant(state, {
    nickname: "Кира",
    team: "slytherin",
    role: "keeper",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  holder.pos = "C3";
  one.pos = "B3";
  two.pos = "C4";
  keeper.pos = "C2";
  state.quaffleHolderId = holder.id;
  state.quafflePos = null;
  state.quaffleLockStepNo = null;
  state.quaffleStealCooldownStepNo = null;
  startGame(state, holder.id);
  assert.equal(endTurn(state, holder.id, { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, one.id, { to: null, actionFirst: true, actionType: "steal", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, two.id, { to: null, actionFirst: true, actionType: "steal", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, keeper.id, { to: null, actionFirst: true, actionType: "steal", actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.duel?.kind, "steal");
  assert.equal(state.duels.filter((duel) => !duel.resolvedAt).length, 1);
  assert.deepEqual(state.duel?.participantIds.slice().sort(), [holder.id, one.id, two.id, keeper.id].sort());
  assert.equal(state.quaffleHolderId, holder.id);
});

test("a quaffle duel and a later bludger duel open together and the hit waits for movement", () => {
  const state = match();
  const chaserA = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const chaserB = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const beaterA = addParticipant(state, {
    nickname: "Витя",
    team: "gryffindor",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const beaterB = addParticipant(state, {
    nickname: "Гена",
    team: "slytherin",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const leaving = addParticipant(state, {
    nickname: "Лена",
    team: "gryffindor",
    role: "chaser2",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const arriving = addParticipant(state, {
    nickname: "Сеня",
    team: "slytherin",
    role: "chaser2",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  chaserA.pos = "D6";
  chaserB.pos = "D8";
  beaterA.pos = "B6";
  beaterB.pos = "B8";
  leaving.pos = "C7";
  arriving.pos = "C6";
  state.quafflePos = "D7";
  state.bludger1Pos = "B7";
  state.bludger2Pos = "G1";
  startGame(state, chaserA.id);
  const done = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, chaserA.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, chaserB.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  const hit = { to: null, actionFirst: false as const, actionType: "hit_bludger" as const, actionTo: "C7", actionBludger: 1 as const };
  assert.equal(endTurn(state, beaterA.id, hit), null);
  assert.equal(endTurn(state, beaterB.id, hit), null);
  assert.equal(endTurn(state, leaving.id, { ...done, to: "C8" }), null);
  assert.equal(endTurn(state, arriving.id, { ...done, to: "C7" }), null);
  pump(state, () => 0.2);
  const open = state.duels.filter((duel) => !duel.resolvedAt);
  assert.deepEqual(open.map((duel) => duel.kind).sort(), ["hit_bludger", "pickup"]);
  assert.equal(state.phase, "pre_collect");
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(arriving.pos, "C6");
  const quaffle = open.find((duel) => duel.kind === "pickup");
  const bludger = open.find((duel) => duel.kind === "hit_bludger");
  assert.ok(quaffle && bludger);
  assert.equal(submitScore(state, chaserA.id, quaffle.id, 80), null);
  assert.equal(submitScore(state, chaserB.id, quaffle.id, 20), null);
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, chaserA.id);
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(arriving.pos, "C6");
  assert.equal(state.duels.some((duel) => duel.kind === "hit_bludger" && !duel.resolvedAt), true);
  assert.equal(submitScore(state, beaterA.id, bludger.id, 90), null);
  assert.equal(submitScore(state, beaterB.id, bludger.id, 10), null);
  pump(state, () => 0.2);
  assert.equal(state.quaffleHolderId, chaserA.id);
  assert.equal(leaving.pos, "C8");
  assert.equal(arriving.pos, "C7");
  assert.equal(state.bludger1Pos, "C7");
  assert.equal(state.turns[arriving.id]?.stunned, true);
  assert.equal(state.turns[leaving.id]?.stunned, false);
  assert.equal(state.duels.some((duel) => !duel.resolvedAt), false);
});

test("pre and post hitters of one bludger join the keeper while a quaffle duel is also open", () => {
  const state = match();
  const keeper = seat(state, "Кира", "gryffindor", "keeper");
  const early = seat(state, "Аня", "gryffindor", "beater");
  const late = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "beater",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const chaserA = addParticipant(state, {
    nickname: "Вера",
    team: "gryffindor",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const chaserB = addParticipant(state, {
    nickname: "Глеб",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  keeper.pos = "D1";
  early.pos = "B2";
  late.pos = "D3";
  chaserA.pos = "D6";
  chaserB.pos = "D8";
  state.bludger1Pos = "C2";
  state.quafflePos = "D7";
  startGame(state, keeper.id);
  const hit = { to: null, actionFirst: true as const, actionType: "hit_bludger" as const, actionTo: "E2", actionBludger: 1 as const };
  assert.equal(endTurn(state, keeper.id, { ...hit, actionFirst: false }), null);
  assert.equal(endTurn(state, early.id, hit), null);
  assert.equal(endTurn(state, late.id, { ...hit, actionFirst: false }), null);
  assert.equal(endTurn(state, chaserA.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, chaserB.id, { to: null, actionFirst: true, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  const open = state.duels.filter((duel) => !duel.resolvedAt);
  assert.deepEqual(open.map((duel) => duel.kind).sort(), ["hit_bludger", "pickup"]);
  const bludger = open.find((duel) => duel.kind === "hit_bludger");
  assert.deepEqual(bludger?.participantIds.slice().sort(), [keeper.id, early.id, late.id].sort());
  assert.equal(state.bludger1Pos, "C2");
  assert.equal(state.quaffleHolderId, null);
});

test("quaffle and both bludgers can be contested in the same step", () => {
  const state = match();
  const chaserA = seat(state, "Аня", "gryffindor", "chaser1");
  const chaserB = seat(state, "Боря", "slytherin", "chaser1");
  const beaterA = seat(state, "Витя", "gryffindor", "beater");
  const beaterB = seat(state, "Гена", "slytherin", "beater");
  const keeperA = seat(state, "Кира", "gryffindor", "keeper");
  const keeperB = seat(state, "Лев", "slytherin", "keeper");
  chaserA.pos = "D6";
  chaserB.pos = "D8";
  beaterA.pos = "A6";
  beaterB.pos = "C8";
  keeperA.pos = "D10";
  keeperB.pos = "F10";
  state.quafflePos = "D7";
  state.bludger1Pos = "B7";
  state.bludger2Pos = "E10";
  startGame(state, chaserA.id);
  const pickup = { to: null, actionFirst: true as const, actionType: "pickup" as const, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, chaserA.id, pickup), null);
  assert.equal(endTurn(state, chaserB.id, pickup), null);
  assert.equal(endTurn(state, beaterA.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "B8", actionBludger: 1 }), null);
  assert.equal(endTurn(state, beaterB.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "B8", actionBludger: 1 }), null);
  assert.equal(endTurn(state, keeperA.id, { to: null, actionFirst: false, actionType: "hit_bludger", actionTo: "E11", actionBludger: 2 }), null);
  assert.equal(endTurn(state, keeperB.id, { to: null, actionFirst: false, actionType: "hit_bludger", actionTo: "E11", actionBludger: 2 }), null);
  pump(state, () => 0.2);
  const open = state.duels.filter((duel) => !duel.resolvedAt);
  assert.equal(open.length, 3);
  assert.equal(open.filter((duel) => duel.kind === "pickup").length, 1);
  assert.deepEqual(
    open.filter((duel) => duel.kind === "hit_bludger").map((duel) => duel.targetPos).sort(),
    ["b1", "b2"],
  );
  assert.equal(state.quaffleHolderId, null);
  assert.equal(state.bludger1Pos, "B7");
  assert.equal(state.bludger2Pos, "E10");
  assert.equal(state.phase, "pre_collect");
});

test("a lone pickup after the move does not free the quaffle cell early", () => {
  const state = match();
  const grabber = seat(state, "Аня", "gryffindor", "chaser1");
  const blocker = seat(state, "Боря", "slytherin", "chaser1");
  grabber.pos = "D5";
  blocker.pos = "D8";
  state.quafflePos = "D7";
  startGame(state, grabber.id);
  assert.equal(endTurn(state, grabber.id, { to: "D6", actionFirst: false, actionType: "pickup", actionTo: null, actionBludger: null }), null);
  assert.equal(endTurn(state, blocker.id, { to: "D7", actionFirst: null, actionType: null, actionTo: null, actionBludger: null }), null);
  pump(state, () => 0.2);
  assert.equal(state.duel, null);
  assert.equal(grabber.pos, "D6");
  assert.equal(state.quaffleHolderId, grabber.id);
  assert.equal(blocker.pos, "D8");
});

test("two bludger stuns in a row make the player invisible for the next two turns", () => {
  const state = match();
  const player = seat(state, "Кира", "gryffindor", "keeper");
  const beater = seat(state, "Боря", "slytherin", "beater");
  player.pos = "D6";
  beater.pos = "A1";
  state.bludger1Pos = "E7";
  state.bludger1Prev = null;
  state.bludger2Pos = "A13";
  state.quafflePos = "G13";
  startGame(state, player.id);
  const stay = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, player.id, stay), null);
  assert.equal(endTurn(state, beater.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.turns[player.id]?.stunned, true);
  assert.equal(state.bludger1Pos, player.pos);
  assert.equal(state.bludgerGhost[player.id] ?? 0, 0);

  state.bludger1Pos = "A12";
  state.bludger1Prev = "D6";
  state.bludger2Pos = "D5";
  beater.pos = "C5";
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "D6", actionBludger: 2 }),
    null,
  );
  pump(state, () => 0);
  assert.equal(state.turns[player.id]?.stunned, true);
  assert.equal(state.bludger2Pos, player.pos);
  assert.equal(state.bludgerGhost[player.id] ?? 0, 0);

  beater.pos = "A1";
  assert.equal(endTurn(state, beater.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.turns[player.id]?.stunned, false);
  assert.equal(state.bludgerGhost[player.id], 2);
  assert.notEqual(state.bludger1Pos, player.pos);
  assert.notEqual(state.bludger2Pos, player.pos);

  const where = player.pos as string;
  for (const left of [1, 0]) {
    state.bludger1Pos = "E7";
    state.bludger1Prev = null;
    state.bludger2Pos = "A13";
    state.bludger2Prev = null;
    assert.equal(endTurn(state, player.id, stay), null);
    assert.equal(endTurn(state, beater.id, stay), null);
    pump(state, () => 0);
    assert.notEqual(state.bludger1Pos, where);
    assert.equal(state.turns[player.id]?.stunned, false);
    assert.equal(state.bludgerGhost[player.id] ?? 0, left);
  }

  state.bludger1Pos = "E7";
  state.bludger1Prev = null;
  assert.equal(endTurn(state, player.id, stay), null);
  assert.equal(endTurn(state, beater.id, stay), null);
  pump(state, () => 0);
  assert.equal(state.bludger1Pos, where);
  assert.equal(state.turns[player.id]?.stunned, true);
});

test("a bludger hit toward an invisible player flies through without stunning", () => {
  const state = match();
  const player = seat(state, "Кира", "gryffindor", "keeper");
  const beater = seat(state, "Боря", "slytherin", "beater");
  player.pos = "D6";
  beater.pos = "C4";
  state.bludger1Pos = "D4";
  state.bludger2Pos = "A1";
  state.quafflePos = "G13";
  state.bludgerGhost = { [player.id]: 1 };
  startGame(state, player.id);
  const stay = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, player.id, stay), null);
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "D6", actionBludger: 1 }),
    null,
  );
  pump(state, () => 0);
  assert.equal(state.turns[player.id]?.stunned, false);
  assert.equal(state.bludger1Pos, "D7");
  assert.equal(state.bludgerGhost[player.id] ?? 0, 0);
});

test("only the player stunned twice in a row is invisible, everyone else can still be stunned", () => {
  const state = match();
  const ghost = seat(state, "Кира", "gryffindor", "keeper");
  const victim = seat(state, "Охот", "slytherin", "chaser1");
  const beater = seat(state, "Боря", "gryffindor", "beater");
  ghost.pos = "D5";
  victim.pos = "D6";
  beater.pos = "C4";
  state.bludger1Pos = "D4";
  state.bludger2Pos = "A1";
  state.quafflePos = "G13";
  state.bludgerGhost = { [ghost.id]: 2 };
  startGame(state, ghost.id);
  const stay = { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
  assert.equal(endTurn(state, ghost.id, stay), null);
  assert.equal(endTurn(state, victim.id, stay), null);
  assert.equal(
    endTurn(state, beater.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "D6", actionBludger: 1 }),
    null,
  );
  pump(state, () => 0);
  assert.equal(state.bludger1Pos, victim.pos);
  assert.equal(state.turns[ghost.id]?.stunned, false);
  assert.equal(state.turns[victim.id]?.stunned, true);
  assert.equal(state.bludgerGhost[victim.id] ?? 0, 0);

  const wander = match();
  const skipped = seat(wander, "Кира", "gryffindor", "keeper");
  const other = seat(wander, "Охот", "slytherin", "chaser1");
  const beater2 = seat(wander, "Боря", "gryffindor", "beater");
  skipped.pos = "D8";
  other.pos = "D6";
  beater2.pos = "A1";
  wander.bludger1Pos = "E7";
  wander.bludger1Prev = null;
  wander.bludger2Pos = "A13";
  wander.quafflePos = "G13";
  wander.bludgerGhost = { [skipped.id]: 2 };
  startGame(wander, skipped.id);
  assert.equal(endTurn(wander, skipped.id, stay), null);
  assert.equal(endTurn(wander, other.id, stay), null);
  assert.equal(endTurn(wander, beater2.id, stay), null);
  pump(wander, () => 0);
  assert.equal(wander.bludger1Pos, other.pos);
  assert.equal(wander.turns[other.id]?.stunned, true);
  assert.equal(wander.turns[skipped.id]?.stunned, false);
  assert.equal(wander.bludgerGhost[skipped.id], 1);
});

test("other players' reserved cells show as taken, but a keeper's destination stays hidden and blocked", () => {
  const state = match();
  const viewer = addParticipant(state, {
    nickname: "Аня",
    team: "gryffindor",
    role: "chaser2",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const other = addParticipant(state, {
    nickname: "Боря",
    team: "slytherin",
    role: "chaser1",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  const keeper = addParticipant(state, {
    nickname: "Вера",
    team: "gryffindor",
    role: "keeper",
    observer: false,
    judge: false,
    bot: false,
    difficulty: null,
  });
  viewer.pos = "C10";
  other.pos = "G10";
  keeper.pos = "D1";
  assert.equal(startGame(state, viewer.id), null);
  state.turns[other.id].plannedTo = "C12";
  state.turns[keeper.id].plannedTo = "C11";
  const view = publicState(state, viewer.id);
  assert.equal(legalMoves(view, viewer.id).includes("C12"), false);
  assert.equal(legalMoves(view, viewer.id).includes("C11"), false);
  assert.deepEqual(takenCells(view, viewer.id), ["C12"]);
  assert.equal(view.shownReserved.includes("C11"), false);
  const keeperView = publicState(state, keeper.id);
  assert.equal(keeperView.turnStates[keeper.id]?.plannedTo, "C11");
  assert.equal(keeperView.shownReserved.includes("C11"), false);
});

test("a keeper save is not announced as a goal", () => {
  const counters = {
    freeQuafflePickup: 0,
    quafflePass: 0,
    quaffleSteal: 0,
    bludgerHit: 0,
    bludgerStun: 0,
    goalScored: 0,
    snitchReveal: 0,
    snitchHide: 0,
  };
  const keeper = { id: "k", nickname: "Вера", team: "gryffindor" as const, role: "keeper" as const };
  const shooter = { id: "s", nickname: "Боря", team: "slytherin" as const, role: "chaser1" as const };
  const base = {
    code: "TEST01",
    counters,
    participants: [keeper, shooter],
    snitchRevealed: false,
    snitchCaughtById: null,
    duel: null,
  };
  const lines = captureFeed(
    { ...base, holderId: shooter.id, events: [] },
    {
      ...base,
      holderId: keeper.id,
      events: [{ id: "save", kind: "goal", actorId: keeper.id, meta: { outcome: "saved_by_keeper" } }],
    },
    new Set(),
  );
  assert.equal(lines.some((line) => /гол/i.test(line)), false);
  assert.equal(lines.length, 0);
  assert.match(plainEventLine("goal", { nickname: "Вера", role: "keeper" }, "A2", { outcome: "saved_by_keeper" }, new Map()), /спас ворота/);

  const goal = captureFeed(
    { ...base, holderId: shooter.id, events: [] },
    {
      ...base,
      counters: { ...counters, goalScored: 1 },
      holderId: null,
      events: [{ id: "goal", kind: "goal", actorId: keeper.id, meta: { outcome: "goal" } }],
    },
    new Set(),
  );
  assert.equal(goal.length, 1);
  assert.match(goal[0], /Вера/);
});



