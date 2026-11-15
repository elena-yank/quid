import assert from "node:assert/strict";
import test from "node:test";
import { addParticipant, createMatch, endTurn, pump, startGame, submitScore } from "./engine.ts";
import { isAllowedChaserMove, isAllowedKeeperMove } from "./rules.ts";

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

test("the same bludger hit before and after the move is not a duel", () => {
  const state = match();
  const a = seat(state, "Аня", "gryffindor", "beater");
  const b = seat(state, "Боря", "slytherin", "beater");
  a.pos = "A6";
  b.pos = "C8";
  state.bludger1Pos = "B7";
  startGame(state, a.id);
  assert.equal(
    endTurn(state, a.id, { to: null, actionFirst: true, actionType: "hit_bludger", actionTo: "B8", actionBludger: 1 }),
    null,
  );
  assert.equal(
    endTurn(state, b.id, { to: null, actionFirst: false, actionType: "hit_bludger", actionTo: "B9", actionBludger: 1 }),
    null,
  );
  pump(state, () => 0.2);
  assert.equal(state.duel, null);
  assert.equal(state.counters.bludgerHit, 1);
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
