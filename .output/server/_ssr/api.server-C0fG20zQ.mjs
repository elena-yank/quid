import { a as isRoleKey, i as emptyStats, o as isTeamKey } from "./types-B0hlOrFm.mjs";
import { C as occupant, D as stealBlockedByCollector, E as stableIndexFromId, S as nid, T as sideOf, _ as isSeeker, a as actionOrigin, b as moveError, c as attackGoals, d as defaultSpawn, f as freshTurn, g as isKeeper, h as isChaser, i as TURN_TIMEOUT_MS, k as validateAction, l as ballCells, m as isBeater, o as activePlayers, p as isActiveRole, r as SNITCH_SPAWNS, s as allCoords, u as chebyshev, v as lineCells, w as roomCode, x as neighbors } from "./rules-bQvFd9LH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api.server-C0fG20zQ.js
var _0002_quidditch_default = "create table if not exists kw_games (\n  id text primary key,\n  code text unique not null,\n  version integer not null default 1,\n  state jsonb not null,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists kw_games_created_idx on kw_games (created_at desc);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_quidditch.sql": _0002_quidditch_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
/** Mirrors root bot.names.js. chaser1 and chaser2 share the chaser pool. */
var BOT_NAMES = {
	chaser: [
		"Витя Квоффлохват",
		"Игорёк Мячеслав",
		"Арсений Подквоффл",
		"Стасик Точнопопадкин",
		"Кирюша Мячемёткин",
		"Богдан Воротобьющий",
		"Лёнька Подстрахов",
		"Димон Мячеруб",
		"Ромка Забиванцев",
		"Серёга Големёткин"
	],
	beater: [
		"Битя Бладжер",
		"Коля Колотун",
		"Макс Череполом",
		"Паша Молотилов",
		"Кирюша Колотуша",
		"Егор Отшибаев",
		"Ванька Мозготряс",
		"Женька Отлетанцев",
		"Денис Черепобив",
		"Игорёк Битапорылов"
	],
	seeker: [
		"Златан Снитч",
		"Витя Золотарь",
		"Дима Ловкач",
		"Паша Снитчехват",
		"Фёдор Снитчеглот",
		"Ваня Снитчеглав",
		"Игорёк Снитчман",
		"Тёма БыстрыйГлаз",
		"Саня Снитчер",
		"Славик Ловцов"
	],
	keeper: [
		"Колька Отбиватор",
		"Тёма Стенка",
		"Денис Голоблокер",
		"Стас Непробивной",
		"Вован Непробивайло",
		"Никитос Мячестоп",
		"Жека Голобарьер",
		"Лёха Танк",
		"Витёк Квоффлостоп",
		"Егор Мощь"
	]
};
function botNamePoolForRole(role) {
	if (role === "chaser1" || role === "chaser2") return [...BOT_NAMES.chaser];
	if (role === "beater" || role === "seeker" || role === "keeper") return [...BOT_NAMES[role]];
	return [];
}
function pickUniqueBotNickname(role, used, rng = Math.random) {
	const pool = botNamePoolForRole(role).map((name) => name.trim()).filter(Boolean);
	const available = pool.filter((name) => !used.has(name));
	if (available.length > 0) {
		const name = available[Math.floor(rng() * available.length)] ?? pool[0] ?? "Бот";
		used.add(name);
		return name;
	}
	const base = pool[0] || "Бот";
	let i = 2;
	while (used.has(`${base} ${i}`)) i += 1;
	const name = `${base} ${i}`;
	used.add(name);
	return name;
}
var PHASES = [
	"pre_collect",
	"pre_actions",
	"move",
	"goal",
	"post_collect",
	"snitch",
	"auto_keeper",
	"post_actions",
	"bludgers",
	"finalize"
];
function createMatch(teamA, teamB, rng = Math.random) {
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
			snitchHide: 0
		},
		pendingGoal: null,
		phase: "pre_collect",
		stepPrepared: false,
		stunnedNow: [],
		stunnedForNext: [],
		bludgerHit: [false, false],
		snitchDone: false,
		version: 1
	};
}
function blankTurn(stepNo, stunned = false) {
	return freshTurn(stepNo, stunned);
}
function addParticipant(state, input) {
	const side = input.observer || input.judge ? null : sideOf(state, input.team);
	const pos = input.role && side ? defaultSpawn(input.role, side) : null;
	const participant = {
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
		createdAt: Date.now()
	};
	state.participants.push(participant);
	if (participant.role && !participant.isObserver) state.turns[participant.id] = blankTurn(state.stepNo, false);
	return participant;
}
function removeParticipant(state, id, rng = Math.random) {
	const player = state.participants.find((p) => p.id === id);
	if (!player) return;
	if (state.duel && !state.duel.resolvedAt && state.duel.participantIds.includes(id)) {
		state.duel.scores[id] = 0;
		const other = state.duel.participantIds.find((pid) => pid !== id);
		if (other) state.duel.scores[other] = Math.max(state.duel.scores[other] ?? 0, 100);
		for (const pid of state.duel.participantIds) if (state.duel.scores[pid] == null) state.duel.scores[pid] = pid === id ? 0 : 1;
		resolveDuel(state, rng);
	}
	if (state.quaffleHolderId === id) releaseQuaffle(state, nearestFree(state, player.pos ?? "D7"), true);
	state.participants = state.participants.filter((p) => p.id !== id);
	delete state.turns[id];
}
function playerById(state, id) {
	if (!id) return null;
	return state.participants.find((p) => p.id === id) ?? null;
}
function ensureTurn(state, id) {
	if (!state.turns[id] || state.turns[id].stepNo !== state.stepNo) {
		const stunned = state.turns[id]?.stunned && state.turns[id]?.stepNo === state.stepNo;
		state.turns[id] = blankTurn(state.stepNo, Boolean(stunned));
	}
	return state.turns[id];
}
function event(state, kind, actorId, targetPos, meta = {}, bludgerIdx = null) {
	state.events.push({
		id: `e_${nid(8)}`,
		stepNo: state.stepNo,
		kind,
		actorId,
		bludgerIdx,
		targetPos,
		meta,
		createdAt: Date.now()
	});
	if (state.events.length > 120) state.events.splice(0, state.events.length - 120);
}
function giveQuaffle(state, id, mode) {
	state.quaffleHolderId = id;
	state.quafflePos = null;
	state.quaffleLockHolderId = id;
	state.quaffleLockStepNo = state.stepNo;
	if (mode === "both") state.quaffleStealCooldownStepNo = state.stepNo;
}
function releaseQuaffle(state, pos, keepCooldown) {
	state.quaffleHolderId = null;
	state.quafflePos = pos;
	state.quaffleLockHolderId = null;
	state.quaffleLockStepNo = null;
	if (!keepCooldown) state.quaffleStealCooldownStepNo = null;
}
function nearestFree(state, from) {
	const blocked = /* @__PURE__ */ new Set();
	for (const p of state.participants) if (!p.isObserver && p.pos) blocked.add(p.pos);
	if (state.bludger1Pos) blocked.add(state.bludger1Pos);
	if (state.bludger2Pos) blocked.add(state.bludger2Pos);
	if (state.snitchPos) blocked.add(state.snitchPos);
	if (state.quafflePos) blocked.add(state.quafflePos);
	if (!blocked.has(from)) return from;
	const origin = from;
	const { r, c } = (() => {
		const m = /^([A-G])(\d+)$/.exec(origin);
		if (!m) return {
			r: 3,
			c: 6
		};
		return {
			r: "ABCDEFG".indexOf(m[1]),
			c: Number(m[2]) - 1
		};
	})();
	for (let rad = 1; rad <= 20; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
		if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
		const rr = r + dr;
		const cc = c + dc;
		if (rr < 0 || rr > 6 || cc < 0 || cc > 12) continue;
		const coord = `${"ABCDEFG"[rr]}${cc + 1}`;
		if (!blocked.has(coord)) return coord;
	}
	return "D7";
}
function stunByBludger(state, id, pos, which, actorId) {
	if (state.stunnedForNext.includes(id)) return;
	stunPlayer(state, id);
	if (actorId) {
		const actor = playerById(state, actorId);
		if (actor) actor.stats.bludgerHitsToPlayers += 1;
	}
	state.counters.bludgerStun += 1;
	event(state, "stun_bludger", id, pos, actorId ? {} : { source: "wander" }, which);
}
function stunPlayer(state, id) {
	if (!state.stunnedNow.includes(id)) state.stunnedNow.push(id);
	if (!state.stunnedForNext.includes(id)) state.stunnedForNext.push(id);
	const turn = state.turns[id];
	if (turn) {
		turn.actionSpent = true;
		turn.plannedTo = null;
	}
	if (state.quaffleHolderId === id) releaseQuaffle(state, nearestFree(state, playerById(state, id)?.pos ?? "D7"), true);
}
function addScore(state, side, points) {
	if (side === "A") state.scoreA += points;
	else state.scoreB += points;
}
function concedingKeeper(state, attackSide) {
	const defend = attackSide === "A" ? "B" : "A";
	return activePlayers(state).find((p) => p.side === defend && isKeeper(p.role)) ?? null;
}
function scoreGoal(state, shooterId, target) {
	const shooter = playerById(state, shooterId);
	if (!shooter?.side) return;
	addScore(state, shooter.side, 10);
	shooter.stats.goalsScored += 1;
	state.counters.goalScored += 1;
	const keeper = concedingKeeper(state, shooter.side);
	releaseQuaffle(state, target, false);
	event(state, "goal", keeper?.id ?? null, target, {
		shooterId,
		keeperId: keeper?.id ?? null,
		outcome: "goal"
	});
	event(state, "quaffle_throw_result", shooterId, target, {
		outcome: "goal",
		keeperId: keeper?.id ?? null,
		finalPos: target
	});
}
function scoreSave(state, shooterId, keeper, target) {
	keeper.stats.goalsSaved += 1;
	giveQuaffle(state, keeper.id, "both");
	playerById(state, shooterId);
	event(state, "goal", keeper.id, target, {
		shooterId,
		keeperId: keeper.id,
		outcome: "saved_by_keeper"
	});
	event(state, "quaffle_throw_result", shooterId, target, {
		outcome: "saved_by_keeper",
		keeperId: keeper.id,
		finalHolderId: keeper.id,
		finalPos: null
	});
}
function performThrow(state, actorId, actionFirst, targetOverride) {
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
		event(state, "quaffle_throw", actorId, target, {
			phase: actionFirst ? "pre" : "post",
			fromPos: from,
			toPos: target
		});
		if (catcher && isChaser(catcher.role)) {
			if (catcher.side === actor.side) {
				actor.stats.quafflePasses += 1;
				state.counters.quafflePass += 1;
				event(state, "quaffle_pass", actorId, target, {
					receiverId: catcher.id,
					fromPos: from,
					toPos: target
				});
			}
			giveQuaffle(state, catcher.id, "both");
			event(state, "quaffle_throw_result", actorId, target, {
				outcome: "caught_by_player",
				finalHolderId: catcher.id
			});
			return;
		}
		releaseQuaffle(state, target, false);
		event(state, "quaffle_throw_result", actorId, target, {
			outcome: "landed",
			finalPos: target
		});
		return;
	}
	if (!isChaser(actor.role)) return;
	if (!attackGoals(actor.side).includes(target) || d !== 2) return;
	const keeperThere = activePlayers(state).find((p) => isKeeper(p.role) && p.side !== actor.side && p.pos === target);
	event(state, "quaffle_throw", actorId, target, {
		phase: actionFirst ? "pre" : "post",
		fromPos: from,
		toPos: target,
		outcome: keeperThere ? "saved_by_keeper" : actionFirst ? "pending_goal_resolution" : "goal"
	});
	if (keeperThere) {
		scoreSave(state, actorId, keeperThere, target);
		return;
	}
	if (actionFirst) {
		state.quaffleHolderId = null;
		state.quafflePos = null;
		state.pendingGoal = {
			shooterId: actorId,
			target,
			fromPos: from
		};
		return;
	}
	scoreGoal(state, actorId, target);
}
function applyHit(state, actorId, which, target) {
	const from = which === 1 ? state.bludger1Pos : state.bludger2Pos;
	const cells = lineCells(from, target, 3);
	if (!cells) return;
	if (state.bludgerHit[which - 1]) return;
	let land = target;
	let victim = null;
	let hitCell = null;
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
function applySimpleAction(state, player, actionFirst) {
	const turn = state.turns[player.id];
	if (!turn || turn.actionSpent || state.stunnedNow.includes(player.id)) return;
	if (Boolean(turn.plannedActionFirst) !== actionFirst) return;
	const type = turn.plannedActionType;
	if (!type) return;
	if (validateAction(state, player, turn, type, turn.plannedActionTo, turn.plannedActionBludger, actionFirst)) {
		turn.actionSpent = true;
		return;
	}
	if (type === "pickup" || type === "keeper_pickup") {
		if (!state.quafflePos) return;
		giveQuaffle(state, player.id, "both");
		player.stats.quafflePickups += 1;
		state.counters.freeQuafflePickup += 1;
		turn.actionSpent = true;
		event(state, "quaffle_pickup", player.id, turn.originPos, {
			phase: actionFirst ? "pre" : "post",
			finalHolderId: player.id
		});
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
		event(state, "quaffle_pass", player.id, turn.plannedActionTo, {
			receiverId: mate.id,
			phase: actionFirst ? "pre" : "post"
		});
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
function predictedFrom(player, turn, actionFirst) {
	if (actionFirst) return turn.originPos ?? player.pos;
	return turn.plannedTo ?? player.pos;
}
function collectPickup(state, postPhase) {
	if (!state.quafflePos || state.quaffleHolderId) return [];
	const out = [];
	for (const p of activePlayers(state)) {
		const turn = state.turns[p.id];
		if (!turn || turn.actionSpent || state.stunnedNow.includes(p.id)) continue;
		const type = turn.plannedActionType;
		if (type !== "pickup" && type !== "keeper_pickup") continue;
		if (type === "pickup" && !isChaser(p.role)) continue;
		if (type === "keeper_pickup" && !isKeeper(p.role)) continue;
		const first = Boolean(turn.plannedActionFirst);
		if (postPhase && first) continue;
		if (!postPhase || !first) {}
		if (postPhase && first) continue;
		const from = predictedFrom(p, turn, first);
		if (!from || chebyshev(from, state.quafflePos) > 1) continue;
		out.push(p);
	}
	return out;
}
function collectSteal(state, postPhase) {
	const holder = playerById(state, state.quaffleHolderId);
	if (!holder || stealBlockedByCollector(state, holder.id)) return [];
	const out = [];
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
function openDuel(state, kind, ids, attackerId, defenderId, targetPos) {
	const scores = {};
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
		holderId: state.quaffleHolderId
	};
}
function pickWinner(duel, holderId) {
	let best = -1;
	const bestIds = [];
	for (const id of duel.participantIds) {
		const score = duel.scores[id] ?? 0;
		if (score > best) {
			best = score;
			bestIds.length = 0;
			bestIds.push(id);
		} else if (score === best) bestIds.push(id);
	}
	const topTie = bestIds.length > 1;
	if (!topTie) return {
		winnerId: bestIds[0] ?? null,
		topTie,
		bestScore: best,
		bestIds,
		tiePolicy: "max"
	};
	if (duel.kind === "steal" || duel.kind === "throw_steal") return {
		winnerId: holderId,
		topTie,
		bestScore: best,
		bestIds,
		tiePolicy: "holder"
	};
	if (duel.kind === "pickup" || duel.kind === "snitch") return {
		winnerId: null,
		topTie,
		bestScore: best,
		bestIds,
		tiePolicy: "free"
	};
	return {
		winnerId: [...bestIds].sort()[0] ?? null,
		topTie,
		bestScore: best,
		bestIds,
		tiePolicy: "lex"
	};
}
function resolveDuel(state, _rng) {
	const duel = state.duel;
	if (!duel || duel.resolvedAt) return;
	const picked = pickWinner(duel, duel.holderId);
	duel.resolvedAt = Date.now();
	duel.winnerId = picked.winnerId;
	if (duel.kind === "pickup" || duel.kind === "steal" || duel.kind === "throw_steal") for (const id of duel.participantIds) {
		const score = duel.scores[id] ?? 0;
		event(state, "quaffle_duel_score", id, duel.kind === "pickup" ? duel.quafflePos : null, {
			duelId: duel.id,
			duelKind: duel.kind,
			score,
			bestScore: picked.bestScore,
			isTopScore: picked.bestIds.includes(id),
			tiedTopIds: picked.bestIds,
			currentHolderId: state.quaffleHolderId
		});
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
			} else giveQuaffle(state, picked.winnerId, "both");
		}
	} else if (duel.kind === "hit_bludger") {
		const winner = picked.winnerId ? playerById(state, picked.winnerId) : null;
		const turn = picked.winnerId ? state.turns[picked.winnerId] : null;
		if (winner && turn?.plannedActionBludger && turn.plannedActionTo && !state.stunnedNow.includes(winner.id)) applyHit(state, winner.id, turn.plannedActionBludger, turn.plannedActionTo);
	} else if (duel.kind === "snitch") {
		if (picked.winnerId && state.snitchPos && !state.snitchCaughtById) catchSnitch(state, picked.winnerId);
	}
	if (duel.kind === "pickup" || duel.kind === "steal" || duel.kind === "throw_steal") event(state, "quaffle_duel_result", picked.winnerId, duel.targetPos, {
		duelId: duel.id,
		duelKind: duel.kind,
		winnerId: picked.winnerId,
		topTie: picked.topTie,
		tiedTopIds: picked.bestIds,
		tiePolicy: picked.tiePolicy,
		finalHolderId: state.quaffleHolderId,
		finalPos: state.quafflePos
	});
	for (const id of duel.participantIds) {
		const turn = state.turns[id];
		if (!turn) continue;
		if (duel.kind === "steal" && id === duel.holderId) continue;
		turn.actionSpent = true;
	}
}
function catchSnitch(state, seekerId) {
	const seeker = playerById(state, seekerId);
	if (!seeker?.side) return;
	addScore(state, seeker.side, 30);
	seeker.stats.snitchCatches += 1;
	seeker.snitchProgress = 100;
	state.snitchCaughtById = seekerId;
	state.snitchCaughtStepNo = state.stepNo;
	state.snitchPos = null;
	if (state.snitchRevealed) state.snitchRevealed = false;
	event(state, "snitch_catch", seekerId, null, {});
}
function beginStep(state) {
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
function everyoneEnded(state) {
	const players = activePlayers(state);
	if (players.length === 0) return false;
	return players.every((p) => state.turns[p.id]?.ended);
}
function applyMovement(state) {
	const movers = activePlayers(state).filter((p) => {
		const turn = state.turns[p.id];
		return turn?.plannedTo && !state.stunnedNow.includes(p.id) && !turn.stunned;
	}).sort((a, b) => a.createdAt - b.createdAt);
	const cancelled = /* @__PURE__ */ new Set();
	const claimed = /* @__PURE__ */ new Set();
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
			if (activePlayers(state).some((q) => {
				if (q.pos !== to) return false;
				if (q.id === p.id) return false;
				return !movers.some((m) => m.id === q.id && !cancelled.has(q.id));
			})) {
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
function resolvePending(state) {
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
function runCollect(state, postPhase) {
	const pickups = collectPickup(state, postPhase).filter((p) => postPhase ? !state.turns[p.id].plannedActionFirst : true);
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
		openDuel(state, throwing ? "throw_steal" : "steal", [holder.id, ...stealers.map((p) => p.id)], stealers[0].id, holder.id, throwing ? `throw:${postPhase ? "post" : "pre"}:${holder.id}` : null);
		return true;
	}
	if (stealers.length && holder) {
		openDuel(state, "steal", [holder.id, ...stealers.map((p) => p.id)], stealers[0].id, holder.id, null);
		return true;
	}
	if (!postPhase || postPhase) {
		const byBludger = /* @__PURE__ */ new Map();
		for (const p of activePlayers(state)) {
			const turn = state.turns[p.id];
			if (!turn || turn.actionSpent || turn.plannedActionType !== "hit_bludger" || !turn.plannedActionBludger) continue;
			if (!isBeater(p.role) && !isKeeper(p.role)) continue;
			if (postPhase === Boolean(turn.plannedActionFirst)) continue;
			if (state.bludgerHit[turn.plannedActionBludger - 1]) continue;
			const list = byBludger.get(turn.plannedActionBludger) ?? [];
			list.push(p);
			byBludger.set(turn.plannedActionBludger, list);
		}
		for (const [idx, list] of byBludger) if (list.length >= 2) {
			openDuel(state, "hit_bludger", list.map((p) => p.id), list[0].id, list[1].id, `b${idx}:${postPhase ? "post" : "pre"}`);
			return true;
		}
	}
	return false;
}
function processSnitch(state, rng) {
	if (state.snitchDone) return;
	if (state.snitchPos == null && state.snitchCaughtStepNo != null && state.stepNo >= state.snitchCaughtStepNo + 3) {
		state.snitchPos = pickRespawn(state, rng);
		state.snitchRevealed = false;
		state.snitchCaughtById = null;
		state.snitchCaughtStepNo = null;
		for (const p of activePlayers(state)) if (isSeeker(p.role)) p.snitchProgress = 0;
	}
	if (!state.snitchPos) return;
	const reserved = new Set(activePlayers(state).map((p) => p.pos).filter((x) => Boolean(x)));
	const dirs = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
		[1, 1],
		[1, -1],
		[-1, 1],
		[-1, -1]
	];
	const options = [];
	const { r, c } = (() => {
		const m = /^([A-G])(\d+)$/.exec(state.snitchPos);
		return {
			r: "ABCDEFG".indexOf(m?.[1] ?? "A"),
			c: Number(m?.[2] ?? "1") - 1
		};
	})();
	for (const [dr, dc] of dirs) for (let dist = 1; dist <= 3; dist++) {
		const rr = r + dr * dist;
		const cc = c + dc * dist;
		if (rr < 0 || rr > 6 || cc < 0 || cc > 12) continue;
		const coord = `${"ABCDEFG"[rr]}${cc + 1}`;
		if (!reserved.has(coord)) options.push(coord);
	}
	if (options.length) state.snitchPos = options[Math.floor(rng() * options.length)] ?? state.snitchPos;
	const seekers = activePlayers(state).filter((p) => isSeeker(p.role) && !state.stunnedNow.includes(p.id) && p.pos);
	const was = state.snitchRevealed;
	if (seekers.length === 0) state.snitchRevealed = false;
	else if (seekers.map((s) => chebyshev(s.pos, state.snitchPos)).some((d) => d <= 2)) state.snitchRevealed = true;
	else state.snitchRevealed = false;
	if (!was && state.snitchRevealed) {
		state.snitchRevealCount += 1;
		state.counters.snitchReveal += 1;
		event(state, "snitch_reveal", null, state.snitchPos, {});
	} else if (was && !state.snitchRevealed && !state.snitchCaughtById) {
		state.snitchHideCount += 1;
		state.counters.snitchHide += 1;
		event(state, "snitch_hide", null, state.snitchPos, {});
	}
	if (state.snitchRevealed && state.snitchPos) for (const s of seekers) {
		const d = chebyshev(s.pos, state.snitchPos);
		if (d === 1) s.snitchProgress = Math.min(100, s.snitchProgress + 10);
		else if (d === 2) s.snitchProgress = Math.min(100, s.snitchProgress + 5);
	}
	const reachers = seekers.filter((s) => s.snitchProgress >= 100);
	if (reachers.length === 1) catchSnitch(state, reachers[0].id);
	else if (reachers.length >= 2) openDuel(state, "snitch", reachers.slice(0, 2).map((s) => s.id), reachers[0].id, reachers[1].id, state.snitchPos);
	state.snitchDone = true;
}
function pickRespawn(state, rng) {
	const seekers = activePlayers(state).filter((p) => isSeeker(p.role) && !state.stunnedNow.includes(p.id) && p.pos);
	const taken = new Set(activePlayers(state).map((p) => p.pos).filter((x) => Boolean(x)));
	const free = allCoords().filter((c) => !taken.has(c));
	if (seekers.length === 0) return SNITCH_SPAWNS.find((s) => !taken.has(s)) ?? free[0] ?? "A7";
	let best = -1;
	const pool = [];
	for (const cell of free) {
		const ds = seekers.map((s) => chebyshev(s.pos, cell));
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
function autoKeeper(state) {
	if (state.pendingGoal || !state.quafflePos || state.quaffleHolderId) return;
	const keeper = occupant(state, state.quafflePos);
	if (!keeper || !isKeeper(keeper.role) || state.stunnedNow.includes(keeper.id)) return;
	giveQuaffle(state, keeper.id, "both");
	keeper.stats.quafflePickups += 1;
	state.counters.freeQuafflePickup += 1;
	event(state, "quaffle_pickup", keeper.id, state.quafflePos, {
		phase: "post_auto_keeper",
		finalHolderId: keeper.id
	});
}
function moveBludgers(state, rng) {
	const resting = (pos) => activePlayers(state).some((p) => p.pos === pos && (state.stunnedNow.includes(p.id) || state.stunnedForNext.includes(p.id)));
	const stepOne = (idx, ownPrev, extraBan) => {
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
	for (const which of [1, 2]) {
		const pos = which === 1 ? state.bludger1Pos : state.bludger2Pos;
		const who = occupant(state, pos);
		if (!who || state.stunnedNow.includes(who.id) || state.stunnedForNext.includes(who.id)) continue;
		stunByBludger(state, who.id, pos, which, null);
	}
}
function finalize(state) {
	const players = activePlayers(state).map((p) => ({
		id: p.id,
		nickname: p.nickname,
		team: p.team,
		role: p.role,
		pos: p.pos,
		stunned: state.stunnedForNext.includes(p.id),
		snitchProgress: p.snitchProgress
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
		players
	});
	if (state.snapshots.length > 160) state.snapshots.splice(0, state.snapshots.length - 160);
	if (state.scoreA >= 100 || state.scoreB >= 100) {
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
	for (const p of activePlayers(state)) state.turns[p.id] = blankTurn(state.stepNo, nextStun.has(p.id));
}
function runPhase(state, rng, phase) {
	if (phase === "pre_collect" || phase === "post_collect") return runCollect(state, phase === "post_collect");
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
function maybeAdvance(state, rng, depth = 0) {
	if (depth > 6 || state.finished || !state.started || state.paused) return;
	if (!everyoneEnded(state)) return;
	if (state.duel && !state.duel.resolvedAt) return;
	beginStep(state);
	while (state.phase !== "finalize") {
		if (runPhase(state, rng, state.phase) || state.duel && !state.duel.resolvedAt) return;
		state.phase = PHASES[PHASES.indexOf(state.phase) + 1] ?? "finalize";
	}
	finalize(state);
	if (state.finished) return;
	if (activePlayers(state).length && activePlayers(state).every((p) => state.turns[p.id]?.stunned)) maybeAdvance(state, rng, depth + 1);
}
function duelComplete(duel) {
	return duel.participantIds.every((id) => duel.scores[id] != null);
}
function fillDuelGaps(state, rng, timedOut) {
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
function botDuelScore(level, rng) {
	const [mean, spread] = {
		1: [45, 22],
		2: [62, 16],
		3: [78, 12]
	}[level];
	const raw = mean + (rng() * 2 - 1) * spread;
	return Math.max(0, Math.min(100, Math.round(raw)));
}
function pump(state, rng = Math.random) {
	if (state.paused && state.pausedAt == null) state.pausedAt = Date.now();
	for (let i = 0; i < 10; i++) {
		if (state.finished || !state.started || state.paused) return;
		if (state.duel && !state.duel.resolvedAt) {
			fillDuelGaps(state, rng, Date.now() - state.duel.startedAt >= TURN_TIMEOUT_MS);
			if (duelComplete(state.duel)) resolveDuel(state, rng);
			else return;
		}
		if (!(state.duel && !state.duel.resolvedAt && (state.duel.kind === "steal" || state.duel.kind === "pickup" || state.duel.kind === "throw_steal" || state.duel.kind === "snitch")) && state.started && Date.now() - state.stepStartedAt >= 15e3) for (const p of activePlayers(state)) {
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
		planBots(state, rng);
		if (!everyoneEnded(state)) return;
		const step = state.stepNo;
		const phase = state.phase;
		maybeAdvance(state, rng);
		if (state.duel && !state.duel.resolvedAt) continue;
		if (state.stepNo === step && state.phase === phase && !state.finished) return;
	}
}
function submitScore(state, participantId, duelId, score) {
	if (!state.started) return "game_not_started";
	if (state.finished) return "game_finished";
	if (!state.duel || state.duel.id !== duelId || state.duel.resolvedAt) return "invalid_duel";
	if (!state.duel.participantIds.includes(participantId)) return "not_participant";
	if (!Number.isInteger(score) || score < 0 || score > 100) return "invalid_score";
	if (state.duel.scores[participantId] != null) return "alreadySubmitted";
	state.duel.scores[participantId] = score;
	return null;
}
function gate(state, player, kind) {
	if (player.isObserver) return kind === "plan" ? "observer_cannot_plan" : "observer_cannot_end";
	if (!isActiveRole(player.role)) return kind === "plan" ? "role_cannot_plan" : "role_cannot_end";
	if (state.finished) return "game_finished";
	if (state.paused) return "game_paused";
	if (!state.started) return "game_not_started";
	const turn = state.turns[player.id];
	if (turn?.stunned) return "stunned";
	if (turn?.ended) return "turn_ended";
	if (Date.now() - state.stepStartedAt >= 15e3) return "turn_timed_out";
	return null;
}
function planMove(state, playerId, to) {
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
function endTurn(state, playerId, plan) {
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
function startGame(state, playerId) {
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
function togglePause(state, playerId) {
	if (!playerById(state, playerId)?.isJudge) return "not_judge";
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
function setBotDifficulty(state, botId, level) {
	const bot = playerById(state, botId);
	if (!bot?.isBot) return "not_bot";
	bot.botDifficulty = level;
	return null;
}
function emptyRoles(state) {
	const taken = new Set(activePlayers(state).map((p) => `${p.side}:${p.role}`));
	const roles = [
		"keeper",
		"seeker",
		"chaser1",
		"chaser2",
		"beater"
	];
	const out = [];
	for (const side of ["A", "B"]) for (const role of roles) if (!taken.has(`${side}:${role}`)) out.push({
		side,
		role,
		team: side === "A" ? state.teamA : state.teamB
	});
	return out;
}
function fillBots(state, level, rng = Math.random) {
	const used = new Set(state.participants.map((p) => p.nickname.trim()).filter(Boolean));
	for (const slot of emptyRoles(state)) addParticipant(state, {
		nickname: pickUniqueBotNickname(slot.role, used, rng),
		team: slot.team,
		role: slot.role,
		observer: false,
		judge: false,
		bot: true,
		difficulty: level
	});
}
function buildResults(state) {
	const pack = (side) => {
		return {
			team: side === "A" ? state.teamA : state.teamB,
			players: state.participants.filter((p) => p.side === side && p.role).map((p) => ({
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
				points: p.stats.goalsScored * 10 + p.stats.snitchCatches * 30
			})).sort((a, b) => {
				return b.points - a.points || b.snitches - a.snitches || b.goals - a.goals || b.saves - a.saves || b.steals - a.steals || b.pickups - a.pickups || b.passes - a.passes || a.nickname.localeCompare(b.nickname, "ru");
			})
		};
	};
	return {
		finished: state.finished,
		finishedAt: state.finishedAt,
		winnerTeam: state.winnerTeam,
		scoreA: state.scoreA,
		scoreB: state.scoreB,
		teamA: pack("A"),
		teamB: pack("B")
	};
}
function planBots(state, rng) {
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
		if (plan.actionType ? validateAction(state, bot, turn, plan.actionType, plan.actionTo, plan.actionBludger, Boolean(plan.actionFirst)) : null) {
			turn.plannedActionType = null;
			turn.plannedActionTo = null;
			turn.plannedActionBludger = null;
			turn.plannedActionFirst = null;
		}
		if (moveError(state, bot, turn.plannedTo, true)) turn.plannedTo = null;
		if (turn.plannedActionType) {
			if (validateAction(state, bot, turn, turn.plannedActionType, turn.plannedActionTo, turn.plannedActionBludger, Boolean(turn.plannedActionFirst))) {
				turn.plannedActionType = null;
				turn.plannedActionTo = null;
				turn.plannedActionBludger = null;
				turn.plannedActionFirst = null;
			}
		}
		turn.ended = true;
	}
}
function chooseBotPlan(state, bot, rng) {
	const profile = bot.botDifficulty === 1 ? {
		a: .55,
		m: .38,
		h: .05
	} : bot.botDifficulty === 3 ? {
		a: .95,
		m: .06,
		h: .95
	} : {
		a: .8,
		m: .18,
		h: .4
	};
	const empty = {
		to: null,
		actionFirst: null,
		actionType: null,
		actionTo: null,
		actionBludger: null
	};
	if (!bot.pos || !bot.role || !bot.side) return empty;
	const blocked = /* @__PURE__ */ new Set();
	for (const t of Object.values(state.turns)) if (t.plannedTo) blocked.add(t.plannedTo);
	const moves = listMoves(state, bot, blocked);
	const toward = (target, allowStay = true) => pickMove(bot.pos, moves, target, rng, profile.m, allowStay);
	if (isChaser(bot.role)) {
		if (state.quaffleHolderId === bot.id && bot.side) {
			const rings = attackGoals(bot.side).filter((g) => chebyshev(bot.pos, g) === 2);
			const open = rings.find((g) => !activePlayers(state).some((p) => isKeeper(p.role) && p.pos === g)) ?? rings[0];
			if (open && rng() < profile.a) return {
				to: rng() < (bot.botDifficulty === 3 ? .65 : bot.botDifficulty === 1 ? .12 : .35) ? toward(open) : null,
				actionFirst: true,
				actionType: "throw",
				actionTo: open,
				actionBludger: null
			};
			const ring = attackGoals(bot.side).slice().sort((a, b) => chebyshev(bot.pos, a) - chebyshev(bot.pos, b))[0];
			return {
				...empty,
				to: toward(ring ?? null)
			};
		}
		if (!state.quaffleHolderId && state.quafflePos) {
			const d = chebyshev(bot.pos, state.quafflePos);
			if (d <= 1 && rng() < profile.a) return {
				...empty,
				actionFirst: true,
				actionType: "pickup"
			};
			return {
				...empty,
				to: toward(state.quafflePos),
				actionFirst: false,
				actionType: d <= 2 ? "pickup" : null
			};
		}
		const holder = playerById(state, state.quaffleHolderId);
		if (holder?.pos && holder.side !== bot.side) {
			if (chebyshev(bot.pos, holder.pos) <= 1 && rng() < profile.a) return {
				...empty,
				actionFirst: true,
				actionType: "steal"
			};
			return {
				...empty,
				to: toward(holder.pos),
				actionFirst: false,
				actionType: "steal"
			};
		}
		return {
			...empty,
			to: toward(state.quafflePos)
		};
	}
	if (isKeeper(bot.role) && bot.side) {
		const home = defaultSpawn("keeper", bot.side);
		if (!state.quaffleHolderId && state.quafflePos && chebyshev(bot.pos, state.quafflePos) <= 1) {
			const land = activePlayers(state).filter((p) => p.side === bot.side && isChaser(p.role) && p.pos && chebyshev(bot.pos, p.pos) >= 1 && chebyshev(bot.pos, p.pos) <= 6).sort((a, b) => chebyshev(bot.pos, a.pos) - chebyshev(bot.pos, b.pos))[0]?.pos ?? keeperToss(bot.pos, bot.side);
			return {
				...empty,
				actionFirst: true,
				actionType: "keeper_pickup",
				actionTo: land
			};
		}
		if (state.quaffleHolderId === bot.id) {
			const mate = activePlayers(state).filter((p) => p.side === bot.side && isChaser(p.role) && p.pos).sort((a, b) => chebyshev(bot.pos, a.pos) - chebyshev(bot.pos, b.pos))[0];
			if (mate?.pos && chebyshev(bot.pos, mate.pos) <= 6 && chebyshev(bot.pos, mate.pos) >= 1 && rng() < profile.a) return {
				...empty,
				actionFirst: true,
				actionType: "throw",
				actionTo: mate.pos
			};
			return {
				...empty,
				to: toward(mate?.pos ?? home)
			};
		}
		const holder = playerById(state, state.quaffleHolderId);
		if (holder?.pos && holder.side !== bot.side && chebyshev(bot.pos, holder.pos) <= 1 && rng() < profile.a) return {
			...empty,
			actionFirst: true,
			actionType: "steal"
		};
		for (const which of [1, 2]) {
			const bpos = which === 1 ? state.bludger1Pos : state.bludger2Pos;
			if (chebyshev(bot.pos, bpos) === 1) {
				const foe = activePlayers(state).find((p) => p.side !== bot.side && p.pos && lineCells(bpos, p.pos, 3));
				if (foe?.pos && rng() < profile.a) return {
					...empty,
					actionFirst: true,
					actionType: "hit_bludger",
					actionTo: foe.pos,
					actionBludger: which
				};
			}
		}
		return {
			...empty,
			to: toward(home)
		};
	}
	if (isSeeker(bot.role) && bot.side) {
		if (state.snitchCaughtById) return {
			...empty,
			to: toward(defaultSpawn("seeker", bot.side))
		};
		const real = state.snitchPos;
		const target = Boolean(real && (state.snitchRevealed || rng() < profile.h)) ? real : SNITCH_SPAWNS[Math.floor(rng() * SNITCH_SPAWNS.length)];
		return {
			...empty,
			to: toward(target ?? null)
		};
	}
	if (isBeater(bot.role)) {
		const bludgers = [{
			idx: 1,
			pos: state.bludger1Pos
		}, {
			idx: 2,
			pos: state.bludger2Pos
		}].sort((a, b) => chebyshev(bot.pos, a.pos) - chebyshev(bot.pos, b.pos));
		for (const b of bludgers) {
			if (chebyshev(bot.pos, b.pos) !== 1) continue;
			const foe = activePlayers(state).find((p) => p.side !== bot.side && p.pos && lineCells(b.pos, p.pos, 3));
			if (foe?.pos && rng() < profile.a) return {
				...empty,
				actionFirst: true,
				actionType: "hit_bludger",
				actionTo: foe.pos,
				actionBludger: b.idx
			};
		}
		let best = null;
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
			if (cell === bot.pos) score -= .2;
			if (score > bestScore) {
				bestScore = score;
				best = cell;
			}
		}
		return {
			...empty,
			to: best && best !== bot.pos ? best : null
		};
	}
	return empty;
}
function listMoves(state, bot, blocked) {
	if (!bot.pos || !bot.role || !bot.side) return [];
	const balls = ballCells(state);
	const list = [];
	for (const coord of allCoords()) {
		if (!bot.role || !bot.side) continue;
		if ((isKeeper(bot.role) && bot.side ? chebyshev(bot.pos, coord) === 1 && keeperOk(bot.side, bot.pos, coord) : isSeeker(bot.role) ? chebyshev(bot.pos, coord) >= 1 && chebyshev(bot.pos, coord) <= 2 && !isGoalCell(coord) : chaserOk(bot.pos, coord)) && !balls.has(coord) && !blocked.has(coord) && !occupant(state, coord, bot.id)) list.push(coord);
	}
	return list;
}
function isGoalCell(coord) {
	return coord === "C1" || coord === "D1" || coord === "E1" || coord === "C13" || coord === "D13" || coord === "E13";
}
function keeperOk(side, from, to) {
	const goals = side === "A" ? [
		"C1",
		"D1",
		"E1"
	] : [
		"C13",
		"D13",
		"E13"
	];
	const zone = /* @__PURE__ */ new Set();
	for (const g of goals) {
		const row = "ABCDEFG".indexOf(g[0]);
		const col = Number(g.slice(1));
		for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
			const r = row + dr;
			const c = col + dc;
			if (r >= 0 && r <= 6 && c >= 1 && c <= 13) zone.add(`${"ABCDEFG"[r]}${c}`);
		}
	}
	return zone.has(from) && zone.has(to);
}
function keeperToss(from, side) {
	const forward = side === "A" ? 1 : -1;
	const row = from.charCodeAt(0) - 65;
	const col = Number(from.slice(1));
	let best = "D7";
	let bestScore = -999;
	for (let r = 0; r < 7; r++) for (let c = 1; c <= 13; c++) {
		const coord = `${"ABCDEFG"[r]}${c}`;
		const d = chebyshev(from, coord);
		if (d < 1 || d > 6) continue;
		const score = (c - col) * forward * 3 - Math.abs(r - row);
		if (score > bestScore) {
			bestScore = score;
			best = coord;
		}
	}
	return best;
}
function chaserOk(from, to) {
	if (from === to || isGoalCell(to)) return false;
	const dr = Math.abs("ABCDEFG".indexOf(from[0]) - "ABCDEFG".indexOf(to[0]));
	const dc = Math.abs(Number(from.slice(1)) - Number(to.slice(1)));
	return dr === 0 && (dc === 1 || dc === 2) || dc === 0 && (dr === 1 || dr === 2) || dr === dc && (dr === 1 || dr === 2);
}
function pickMove(from, moves, target, rng, mistake, _allowStay) {
	if (rng() < mistake) {
		if (rng() < .35) return null;
		if (!moves.length) return null;
		return moves[Math.floor(rng() * moves.length)] ?? null;
	}
	if (!target) return moves[0] ?? null;
	let best = null;
	let bestD = chebyshev(from, target) - .2;
	for (const m of moves) {
		const d = chebyshev(m, target);
		if (d < bestD) {
			bestD = d;
			best = m;
		}
	}
	return best;
}
function publicState(state, viewerId) {
	const viewer = viewerId ? playerById(state, viewerId) : null;
	const takenRoles = {};
	for (const p of activePlayers(state)) if (p.role) takenRoles[`${p.team}:${p.role}`] = {
		participantId: p.id,
		nickname: p.nickname,
		isBot: p.isBot,
		botDifficulty: p.botDifficulty
	};
	const reservedMoves = Object.values(state.turns).map((t) => t.plannedTo).filter((x) => Boolean(x));
	const duel = state.duel && (!state.duel.resolvedAt || Date.now() - state.duel.resolvedAt < 1e4) ? {
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
		scores: state.duel.scores
	} : null;
	const chat = state.chat.filter((m) => {
		if (m.scope === "all") return true;
		if (!viewer || viewer.isObserver) return false;
		return m.toTeam === viewer.team;
	}).slice(-80);
	return {
		serverNow: Date.now(),
		turnMs: TURN_TIMEOUT_MS,
		messageCounters: state.counters,
		you: viewer ? {
			id: viewer.id,
			isJudge: viewer.isJudge,
			isObserver: viewer.isObserver,
			team: viewer.team,
			role: viewer.role
		} : null,
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
			createdAt: state.createdAt
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
			createdAt: p.createdAt
		})),
		takenRoles,
		turnStates: Object.fromEntries(activePlayers(state).map((p) => {
			const t = state.turns[p.id];
			const own = viewer?.id === p.id && !viewer.isObserver;
			return [p.id, {
				ended: Boolean(t?.ended),
				stunned: Boolean(t?.stunned),
				plannedTo: own ? t?.plannedTo ?? null : null,
				plannedActionType: own ? t?.plannedActionType ?? null : null,
				plannedActionTo: own ? t?.plannedActionTo ?? null : null,
				plannedActionBludger: own ? t?.plannedActionBludger ?? null : null,
				plannedActionFirst: own ? t?.plannedActionFirst ?? null : null
			}];
		})),
		reservedMoves,
		bludgers: [state.bludger1Pos, state.bludger2Pos],
		snitch: {
			pos: state.snitchRevealed ? state.snitchPos : null,
			revealed: state.snitchRevealed,
			caughtById: state.snitchCaughtById
		},
		quaffle: {
			holderId: state.quaffleHolderId,
			pos: state.quafflePos
		},
		events: state.events.slice(-20).map((e) => ({
			id: e.id,
			kind: e.kind,
			actorId: e.actorId,
			stepNo: e.stepNo,
			bludgerIdx: e.bludgerIdx,
			targetPos: e.targetPos,
			createdAt: e.createdAt,
			meta: e.meta
		})),
		chat: { messages: chat },
		duel,
		seekerProgress: activePlayers(state).filter((p) => isSeeker(p.role)).map((p) => ({
			id: p.id,
			team: p.team,
			nickname: p.nickname,
			progress: p.snitchProgress
		}))
	};
}
var chains = /* @__PURE__ */ new Map();
function lock(code, fn) {
	const key = code.toUpperCase();
	const run = (chains.get(key) ?? Promise.resolve()).catch(() => void 0).then(fn);
	const tail = run.then(() => void 0, () => void 0);
	chains.set(key, tail);
	return run;
}
function parseState(raw) {
	return typeof raw === "string" ? JSON.parse(raw) : raw;
}
async function load(sql, code) {
	const row = (await sql.query("select id, code, version, state from kw_games where upper(code) = upper($1)", [code]))[0];
	if (!row) return null;
	row.state = parseState(row.state);
	return row;
}
async function save(sql, row, state) {
	const rows = await sql.query("update kw_games set state = $1::jsonb, version = version + 1 where id = $2 and version = $3 returning version", [
		JSON.stringify(state),
		row.id,
		row.version
	]);
	if (!rows[0]) return false;
	row.version = rows[0].version;
	row.state = state;
	return true;
}
function nick(value) {
	if (typeof value !== "string") return null;
	const v = value.trim();
	if (v.length < 1 || v.length > 24) return null;
	return v;
}
function authed(state, id, token) {
	if (typeof id !== "string" || typeof token !== "string") return null;
	return state.participants.find((p) => p.id === id && p.sessionToken === token) ?? null;
}
async function createRoom(data) {
	if (!data.teamA || !data.teamB || !isTeamKey(data.teamA) || !isTeamKey(data.teamB) || data.teamA === data.teamB) return {
		ok: false,
		error: "invalid_teams"
	};
	const judge = Boolean(data.judge);
	const observer = Boolean(data.observer) || judge;
	const name = nick(data.nickname);
	if (!name) return {
		ok: false,
		error: "nickname_required"
	};
	if (!observer) {
		if (!data.team || !isTeamKey(data.team) || data.team !== data.teamA && data.team !== data.teamB) return {
			ok: false,
			error: "invalid_team"
		};
		if (!data.role || !isRoleKey(data.role)) return {
			ok: false,
			error: "invalid_role"
		};
	}
	const level = data.difficulty === 1 || data.difficulty === 2 || data.difficulty === 3 ? data.difficulty : 2;
	const state = createMatch(data.teamA, data.teamB);
	let code = roomCode();
	const sql = await getSql();
	for (let i = 0; i < 6; i++) {
		if (!(await sql.query("select code from kw_games where code = $1", [code]))[0]) break;
		code = roomCode();
	}
	state.code = code;
	const token = nid(24);
	const player = addParticipant(state, {
		nickname: name,
		team: observer ? data.teamA : data.team,
		role: observer ? null : data.role,
		observer,
		judge,
		bot: false,
		difficulty: null,
		sessionToken: token
	});
	if (data.fillBots !== false && !observer) fillBots(state, level);
	if (judge && data.fillBots !== false) fillBots(state, level);
	await sql.query("insert into kw_games (id, code, version, state) values ($1, $2, 1, $3::jsonb)", [
		state.id,
		state.code,
		JSON.stringify(state)
	]);
	return {
		ok: true,
		code: state.code,
		participantId: player.id,
		sessionToken: token
	};
}
async function joinRoom(data) {
	const code = (data.code ?? "").trim().toUpperCase();
	if (!/^[A-Z0-9]{6}$/.test(code)) return {
		ok: false,
		error: "invalid_code"
	};
	const name = nick(data.nickname);
	if (!name) return {
		ok: false,
		error: "nickname_required"
	};
	const observer = data.mode === "observer";
	return lock(code, async () => {
		const sql = await getSql();
		const row = await load(sql, code);
		if (!row) return {
			ok: false,
			error: "not_found"
		};
		const state = row.state;
		if (state.finished) return {
			ok: false,
			error: "game_finished"
		};
		let team = state.teamA;
		let role = null;
		if (!observer) {
			if (!data.team || !isTeamKey(data.team) || data.team !== state.teamA && data.team !== state.teamB) return {
				ok: false,
				error: "invalid_team"
			};
			if (!data.role || !isRoleKey(data.role)) return {
				ok: false,
				error: "invalid_role"
			};
			team = data.team;
			role = data.role;
			const taken = state.participants.find((p) => !p.isObserver && p.team === team && p.role === role);
			if (taken) {
				if (!data.force && !taken.isBot) return {
					ok: false,
					error: "role_taken"
				};
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
			sessionToken: token
		});
		pump(state);
		if (!await save(sql, row, state)) return {
			ok: false,
			error: "conflict"
		};
		return {
			ok: true,
			code: state.code,
			participantId: player.id,
			sessionToken: token
		};
	});
}
async function syncRoom(data) {
	const code = (data.code ?? "").trim().toUpperCase();
	if (!code) return {
		ok: false,
		error: "invalid_code"
	};
	return lock(code, async () => {
		const sql = await getSql();
		const row = await load(sql, code);
		if (!row) return {
			ok: false,
			error: "not_found"
		};
		const state = row.state;
		const viewer = authed(state, data.participantId, data.sessionToken);
		if ((data.participantId || data.sessionToken) && !viewer) return {
			ok: false,
			error: "invalid_session"
		};
		pump(state);
		await save(sql, row, state);
		return {
			ok: true,
			state: publicState(state, viewer?.id ?? null)
		};
	});
}
async function lobby(data) {
	const code = (data.code ?? "").trim().toUpperCase();
	const row = await load(await getSql(), code);
	if (!row) return {
		ok: false,
		error: "not_found"
	};
	const state = row.state;
	return {
		ok: true,
		code: state.code,
		teamA: state.teamA,
		teamB: state.teamB,
		started: state.started,
		finished: state.finished,
		taken: state.participants.filter((p) => p.role && !p.isObserver).map((p) => ({
			team: p.team,
			role: p.role,
			nickname: p.nickname,
			isBot: p.isBot
		}))
	};
}
function act(code, participantId, sessionToken, fn) {
	return lock(code, async () => {
		const sql = await getSql();
		for (let attempt = 0; attempt < 4; attempt++) {
			const row = await load(sql, code);
			if (!row) return {
				ok: false,
				error: "not_found"
			};
			const state = row.state;
			const viewer = authed(state, participantId, sessionToken);
			if (!viewer) return {
				ok: false,
				error: "invalid_session"
			};
			const error = fn(state, viewer.id);
			if (error && error !== "alreadySubmitted") return {
				ok: false,
				error
			};
			pump(state);
			if (!await save(sql, row, state)) continue;
			return {
				ok: true,
				alreadySubmitted: error === "alreadySubmitted",
				state: publicState(state, viewer.id)
			};
		}
		return {
			ok: false,
			error: "conflict"
		};
	});
}
async function sendPlan(data) {
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => planMove(state, id, data.to ?? null));
}
async function sendTurn(data) {
	const plan = data.plan ?? {
		to: null,
		actionFirst: null,
		actionType: null,
		actionTo: null,
		actionBludger: null
	};
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => endTurn(state, id, plan));
}
async function sendDuel(data) {
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => submitScore(state, id, data.duelId ?? "", Number(data.score)));
}
async function sendStart(data) {
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => startGame(state, id));
}
async function sendPause(data) {
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => togglePause(state, id));
}
async function sendChat(data) {
	const text = (data.text ?? "").trim();
	if (!text) return {
		ok: false,
		error: "empty_text"
	};
	if (text.length > 280) return {
		ok: false,
		error: "empty_text"
	};
	const scope = data.scope === "team" ? "team" : data.scope === "all" ? "all" : null;
	if (!scope) return {
		ok: false,
		error: "invalid_scope"
	};
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
			scope,
			toTeam: scope === "team" ? player.team : null,
			text,
			createdAt: Date.now()
		});
		if (state.chat.length > 200) state.chat.splice(0, state.chat.length - 200);
		return null;
	});
}
async function sendLeave(data) {
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => {
		removeParticipant(state, id);
		return null;
	});
}
async function judgeCommand(data) {
	const level = data.difficulty === 1 || data.difficulty === 2 || data.difficulty === 3 ? data.difficulty : 2;
	return act((data.code ?? "").toUpperCase(), data.participantId ?? "", data.sessionToken ?? "", (state, id) => {
		if (!state.participants.find((p) => p.id === id)?.isJudge) return "not_judge";
		if (state.finished) return "game_finished";
		if (data.op === "pause") return togglePause(state, id);
		if (data.op === "bot") {
			if (!data.team || !isTeamKey(data.team) || !data.role || !isRoleKey(data.role)) return "invalid_slot";
			if (state.participants.find((p) => !p.isObserver && p.team === data.team && p.role === data.role)) return "slot_taken";
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
function fillOne(state, team, role, level) {
	const before = new Set(state.participants.map((p) => p.id));
	if (!emptyRoles(state).some((s) => s.team === team && s.role === role)) return;
	fillBots(state, level);
	const extras = state.participants.filter((p) => !before.has(p.id) && !(p.team === team && p.role === role)).map((p) => p.id);
	for (const id of extras) removeParticipant(state, id);
}
async function listRooms() {
	return (await (await getSql()).query("select id, code, version, state, created_at from kw_games order by created_at desc limit 200")).map((row) => {
		const state = parseState(row.state);
		return {
			id: state.id,
			code: state.code,
			teamA: state.teamA,
			teamB: state.teamB,
			scoreA: state.scoreA,
			scoreB: state.scoreB,
			stepNo: state.stepNo,
			started: state.started,
			finished: state.finished,
			paused: state.paused,
			players: state.participants.length
		};
	});
}
async function deleteRoom(data) {
	const code = (data.code ?? "").trim().toUpperCase();
	if (!code) return {
		ok: false,
		error: "invalid_code"
	};
	await (await getSql()).query("delete from kw_games where upper(code) = upper($1)", [code]);
	return { ok: true };
}
async function fetchLogs(data) {
	const row = await load(await getSql(), (data.code ?? "").toUpperCase());
	if (!row) return {
		ok: false,
		error: "not_found"
	};
	const state = row.state;
	if (!authed(state, data.participantId, data.sessionToken)) return {
		ok: false,
		error: "invalid_session"
	};
	return {
		ok: true,
		code: state.code,
		results: buildResults(state),
		snapshots: state.snapshots,
		events: state.events
	};
}
//#endregion
export { createRoom, deleteRoom, fetchLogs, joinRoom, judgeCommand, listRooms, lobby, sendChat, sendDuel, sendLeave, sendPause, sendPlan, sendStart, sendTurn, syncRoom };
