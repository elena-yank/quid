import { getSql, type Sql } from "@/lib/db";
import {
  addParticipant,
  buildResults,
  createMatch,
  emptyRoles,
  endTurn,
  fillBots,
  planMove,
  publicState,
  pump,
  removeParticipant,
  setBotDifficulty,
  startGame,
  submitScore,
  togglePause,
} from "./engine.ts";
import { isRoleKey, isTeamKey, type BotLevel, type GameState, type PlanInput, type RoleKey, type TeamKey } from "./types.ts";
import { nid, roomCode } from "./rules.ts";

type Row = { id: string; code: string; version: number; state: GameState | string };

const chains = new Map<string, Promise<void>>();

function lock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const key = code.toUpperCase();
  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  chains.set(key, tail);
  return run;
}

function parseState(raw: GameState | string): GameState {
  return typeof raw === "string" ? (JSON.parse(raw) as GameState) : raw;
}

async function load(sql: Sql, code: string): Promise<Row | null> {
  const rows = await sql.query<Row>("select id, code, version, state from kw_games where upper(code) = upper($1)", [code]);
  const row = rows[0];
  if (!row) return null;
  row.state = parseState(row.state);
  return row;
}

async function save(sql: Sql, row: Row, state: GameState): Promise<boolean> {
  const rows = await sql.query<{ version: number }>(
    "update kw_games set state = $1::jsonb, version = version + 1 where id = $2 and version = $3 returning version",
    [JSON.stringify(state), row.id, row.version],
  );
  if (!rows[0]) return false;
  row.version = rows[0].version;
  row.state = state;
  return true;
}

function nick(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length < 1 || v.length > 24) return null;
  return v;
}

function authed(state: GameState, id: unknown, token: unknown) {
  if (typeof id !== "string" || typeof token !== "string") return null;
  return state.participants.find((p) => p.id === id && p.sessionToken === token) ?? null;
}

export async function createRoom(data: { teamA?: string; teamB?: string; nickname?: string; team?: string; role?: string; fillBots?: boolean; difficulty?: number; judge?: boolean; observer?: boolean }) {
    if (!data.teamA || !data.teamB || !isTeamKey(data.teamA) || !isTeamKey(data.teamB) || data.teamA === data.teamB) {
      return { ok: false as const, error: "invalid_teams" };
    }
    const judge = Boolean(data.judge);
    const observer = Boolean(data.observer) || judge;
    const name = nick(data.nickname);
    if (!name) return { ok: false as const, error: "nickname_required" };
    if (!observer) {
      if (!data.team || !isTeamKey(data.team) || (data.team !== data.teamA && data.team !== data.teamB)) {
        return { ok: false as const, error: "invalid_team" };
      }
      if (!data.role || !isRoleKey(data.role)) return { ok: false as const, error: "invalid_role" };
    }
    const level = (data.difficulty === 1 || data.difficulty === 2 || data.difficulty === 3 ? data.difficulty : 2) as BotLevel;
    const state = createMatch(data.teamA, data.teamB);
    let code = roomCode();
    const sql = await getSql();
    for (let i = 0; i < 6; i++) {
      const exists = await sql.query<{ code: string }>("select code from kw_games where code = $1", [code]);
      if (!exists[0]) break;
      code = roomCode();
    }
    state.code = code;
    const token = nid(24);
    const player = addParticipant(state, {
      nickname: name,
      team: observer ? data.teamA : (data.team as TeamKey),
      role: observer ? null : (data.role as RoleKey),
      observer,
      judge,
      bot: false,
      difficulty: null,
      sessionToken: token,
    });
    if (data.fillBots !== false && !observer) fillBots(state, level);
    if (judge && data.fillBots !== false) fillBots(state, level);
    await sql.query("insert into kw_games (id, code, version, state) values ($1, $2, 1, $3::jsonb)", [
      state.id,
      state.code,
      JSON.stringify(state),
    ]);
    return { ok: true as const, code: state.code, participantId: player.id, sessionToken: token };
  }


export async function joinRoom(data: { code?: string; nickname?: string; team?: string; role?: string; mode?: string; force?: boolean }) {
    const code = (data.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return { ok: false as const, error: "invalid_code" };
    const name = nick(data.nickname);
    if (!name) return { ok: false as const, error: "nickname_required" };
    const observer = data.mode === "observer";
    return lock(code, async () => {
      const sql = await getSql();
      const row = await load(sql, code);
      if (!row) return { ok: false as const, error: "not_found" };
      const state = row.state as GameState;
      if (state.finished) return { ok: false as const, error: "game_finished" };
      let team: TeamKey = state.teamA;
      let role: RoleKey | null = null;
      if (!observer) {
        if (!data.team || !isTeamKey(data.team) || (data.team !== state.teamA && data.team !== state.teamB)) {
          return { ok: false as const, error: "invalid_team" };
        }
        if (!data.role || !isRoleKey(data.role)) return { ok: false as const, error: "invalid_role" };
        team = data.team;
        role = data.role;
        const taken = state.participants.find((p) => !p.isObserver && p.team === team && p.role === role);
        if (taken) {
          if (!data.force && !taken.isBot) return { ok: false as const, error: "role_taken" };
          removeParticipant(state, taken.id);
        }
      }
      const token = nid(24);
      const player = addParticipant(state, {
        nickname: name,
        team,
        role,
        observer,
        judge: false,
        bot: false,
        difficulty: null,
        sessionToken: token,
      });
      pump(state);
      const wrote = await save(sql, row, state);
      if (!wrote) return { ok: false as const, error: "conflict" };
      return { ok: true as const, code: state.code, participantId: player.id, sessionToken: token };
    });
  }


export async function syncRoom(data: { code?: string; participantId?: string; sessionToken?: string }) {
    const code = (data.code ?? "").trim().toUpperCase();
    if (!code) return { ok: false as const, error: "invalid_code" };
    return lock(code, async () => {
      const sql = await getSql();
      const row = await load(sql, code);
      if (!row) return { ok: false as const, error: "not_found" };
      const state = row.state as GameState;
      const viewer = authed(state, data.participantId, data.sessionToken);
      if ((data.participantId || data.sessionToken) && !viewer) return { ok: false as const, error: "invalid_session" };
      pump(state);
      await save(sql, row, state);
      return { ok: true as const, state: publicState(state, viewer?.id ?? null) };
    });
  }


export async function lobby(data: { code?: string }) {
    const code = (data.code ?? "").trim().toUpperCase();
    const sql = await getSql();
    const row = await load(sql, code);
    if (!row) return { ok: false as const, error: "not_found" };
    const state = row.state as GameState;
    return {
      ok: true as const,
      code: state.code,
      teamA: state.teamA,
      teamB: state.teamB,
      started: state.started,
      finished: state.finished,
      taken: state.participants
        .filter((p) => p.role && !p.isObserver)
        .map((p) => ({ team: p.team, role: p.role, nickname: p.nickname, isBot: p.isBot })),
    };
  }


function act(
  code: string,
  participantId: string,
  sessionToken: string,
  fn: (state: GameState, id: string) => string | null,
) {
  return lock(code, async () => {
    const sql = await getSql();
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = await load(sql, code);
      if (!row) return { ok: false as const, error: "not_found" };
      const state = row.state as GameState;
      const viewer = authed(state, participantId, sessionToken);
      if (!viewer) return { ok: false as const, error: "invalid_session" };
      const error = fn(state, viewer.id);
      if (error && error !== "alreadySubmitted") return { ok: false as const, error };
      pump(state);
      const wrote = await save(sql, row, state);
      if (!wrote) continue;
      return {
        ok: true as const,
        alreadySubmitted: error === "alreadySubmitted",
        state: publicState(state, viewer.id),
      };
    }
    return { ok: false as const, error: "conflict" };
  });
}

export async function sendPlan(data: { code?: string; participantId?: string; sessionToken?: string; to?: string | null }) {
    const code = (data.code ?? "").toUpperCase();
    return act(code, data.participantId ?? "", data.sessionToken ?? "", (state, id) => planMove(state, id, data.to ?? null));
  }


export async function sendTurn(data: { code?: string; participantId?: string; sessionToken?: string; plan?: PlanInput }) {
    const plan = data.plan ?? { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null };
    return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) =>
      endTurn(state, id, plan),
    );
  }


export async function sendDuel(data: { code?: string; participantId?: string; sessionToken?: string; duelId?: string; score?: number }) {
    return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) =>
      submitScore(state, id, data.duelId ?? "", Number(data.score)),
    );
  }


export async function sendStart(data: { code?: string; participantId?: string; sessionToken?: string }) {
  return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => startGame(state, id));
}


export async function sendPause(data: { code?: string; participantId?: string; sessionToken?: string }) {
  return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => togglePause(state, id));
}


export async function sendChat(data: { code?: string; participantId?: string; sessionToken?: string; scope?: string; text?: string }) {
    const text = (data.text ?? "").trim();
    if (!text) return { ok: false as const, error: "empty_text" };
    if (text.length > 280) return { ok: false as const, error: "empty_text" };
    const scope = data.scope === "team" ? "team" : data.scope === "all" ? "all" : null;
    if (!scope) return { ok: false as const, error: "invalid_scope" };
    return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => {
      const player = state.participants.find((p) => p.id === id);
      if (!player) return "not_found";
      if (state.finished) return "game_finished";
      if (scope === "team" && player.isObserver) return "observer_cannot_team_chat";
      state.chat.push({
        id: `c_${nid(8)}`,
        fromId: player.id,
        fromNick: player.nickname,
        fromTeam: player.team,
        fromObserver: player.isObserver && !player.isJudge,
        scope,
        toTeam: scope === "team" ? player.team : null,
        text,
        createdAt: Date.now(),
      });
      if (state.chat.length > 200) state.chat.splice(0, state.chat.length - 200);
      return null;
    });
  }


export async function sendLeave(data: { code?: string; participantId?: string; sessionToken?: string }) {
  return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => {
      removeParticipant(state, id);
      return null;
    });
}


export async function judgeCommand(data: {
      code?: string;
      participantId?: string;
      sessionToken?: string;
      op?: string;
      targetId?: string;
      team?: string;
      role?: string;
      difficulty?: number;
      replace?: string;
    }) {
    const level = (data.difficulty === 1 || data.difficulty === 2 || data.difficulty === 3 ? data.difficulty : 2) as BotLevel;
    return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => {
      const judge = state.participants.find((p) => p.id === id);
      if (!judge?.isJudge) return "not_judge";
      if (state.finished) return "game_finished";
      if (data.op === "pause") return togglePause(state, id);
      if (data.op === "bot") {
        if (!data.team || !isTeamKey(data.team) || !data.role || !isRoleKey(data.role)) return "invalid_slot";
        const taken = state.participants.find((p) => !p.isObserver && p.team === data.team && p.role === data.role);
        if (taken) return "slot_taken";
        const slots = emptyRoles(state).filter((s) => s.team === data.team && s.role === data.role);
        if (!slots[0]) return "slot_taken";
        fillOne(state, slots[0].team, slots[0].role, level);
        return null;
      }
      if (data.op === "difficulty") {
        if (!data.targetId) return "invalid_id";
        return setBotDifficulty(state, data.targetId, level);
      }
      if (data.op === "kick") {
        const target = state.participants.find((p) => p.id === data.targetId);
        if (!target || target.isObserver || !target.role || !target.side) return "invalid_id";
        const role = target.role;
        const team = target.team;
        removeParticipant(state, target.id);
        if (data.replace === "bot") fillOne(state, team, role, level);
        return null;
      }
      return "invalid_action";
    });
  }


function fillOne(state: GameState, team: TeamKey, role: RoleKey, level: BotLevel) {
  const before = new Set(state.participants.map((p) => p.id));
  const slots = emptyRoles(state);
  if (!slots.some((s) => s.team === team && s.role === role)) return;
  fillBots(state, level);
  const extras = state.participants.filter((p) => !before.has(p.id) && !(p.team === team && p.role === role)).map((p) => p.id);
  for (const id of extras) removeParticipant(state, id);
}

export async function listRooms() {
  const sql = await getSql();
  const rows = await sql.query<Row & { created_at?: string | Date }>(
    "select id, code, version, state, created_at from kw_games order by created_at desc limit 500",
  );
  return rows.map((row) => {
    const state = parseState(row.state);
    const observers = state.participants.filter((p) => p.isObserver).length;
    const created = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? "");
    return {
      code: state.code,
      teamA: state.teamA,
      teamB: state.teamB,
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      stepNo: state.stepNo,
      started: state.started,
      finished: state.finished,
      paused: state.paused,
      players: state.participants.length - observers,
      observers,
      createdAt: created,
    };
  });
}

export async function deleteRoom(data: { code?: string }) {
  const code = (data.code ?? "").trim().toUpperCase();
  if (!code) return { ok: false as const, error: "invalid_code" };
  const sql = await getSql();
  await sql.query("delete from kw_games where upper(code) = upper($1)", [code]);
  return { ok: true as const };
}

export async function deleteRooms(data: { codes?: string[] }) {
  const codes = [...new Set((data.codes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean))];
  if (!codes.length) return { ok: false as const, error: "invalid_code" };
  const sql = await getSql();
  await sql.query("delete from kw_games where upper(code) = any($1::text[])", [codes]);
  return { ok: true as const };
}


export async function fetchLogs(data: { code?: string; participantId?: string; sessionToken?: string }) {
    const sql = await getSql();
    const row = await load(sql, (data.code ?? "").toUpperCase());
    if (!row) return { ok: false as const, error: "not_found" };
    const state = row.state as GameState;
    const viewer = authed(state, data.participantId, data.sessionToken);
    if (!viewer) return { ok: false as const, error: "invalid_session" };
    return {
      ok: true as const,
      code: state.code,
      results: buildResults(state),
      snapshots: state.snapshots,
      events: state.events,
    };
  }

