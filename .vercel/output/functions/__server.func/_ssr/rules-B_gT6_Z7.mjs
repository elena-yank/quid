//#region node_modules/.nitro/vite/services/ssr/assets/rules-B_gT6_Z7.js
var BOARD_ROWS = [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G"
];
var GOALS_LEFT = [
	"C1",
	"D1",
	"E1"
];
var GOALS_RIGHT = [
	"C13",
	"D13",
	"E13"
];
var SNITCH_SPAWNS = [
	"A1",
	"G1",
	"A7",
	"G7",
	"A13",
	"G13"
];
var TURN_TIMEOUT_MS = 15e3;
var GOAL_SET = /* @__PURE__ */ new Set([...GOALS_LEFT, ...GOALS_RIGHT]);
function nid(len = 12) {
	const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const b of bytes) out += alphabet[b % 36];
	return out;
}
function roomCode() {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const bytes = /* @__PURE__ */ new Uint8Array(6);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const b of bytes) out += alphabet[b % 32];
	return out;
}
function normalizeCoord(raw) {
	if (!raw) return null;
	const v = raw.trim().toUpperCase();
	return /^[A-G](?:[1-9]|1[0-3])$/.test(v) ? v : null;
}
function coordToRC(coord) {
	return {
		r: BOARD_ROWS.indexOf(coord[0]),
		c: Number(coord.slice(1)) - 1
	};
}
function rcToCoord(r, c) {
	if (r < 0 || r >= BOARD_ROWS.length || c < 0 || c >= 13) return null;
	return `${BOARD_ROWS[r]}${c + 1}`;
}
function chebyshev(a, b) {
	const pa = coordToRC(a);
	const pb = coordToRC(b);
	return Math.max(Math.abs(pa.r - pb.r), Math.abs(pa.c - pb.c));
}
function isGoal(coord) {
	return GOAL_SET.has(coord);
}
function goalsForSide(side) {
	return side === "A" ? GOALS_LEFT : GOALS_RIGHT;
}
function attackGoals(side) {
	return side === "A" ? GOALS_RIGHT : GOALS_LEFT;
}
function keeperZone(side) {
	const set = /* @__PURE__ */ new Set();
	for (const g of goalsForSide(side)) {
		const { r, c } = coordToRC(g);
		for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
			const coord = rcToCoord(r + dr, c + dc);
			if (coord) set.add(coord);
		}
	}
	return set;
}
function defaultSpawn(role, side) {
	return {
		keeper: ["D1", "D13"],
		seeker: ["D5", "D9"],
		chaser1: ["C5", "C9"],
		chaser2: ["E5", "E9"],
		beater: ["D4", "D10"]
	}[role][side === "A" ? 0 : 1];
}
function isChaser(role) {
	return role === "chaser1" || role === "chaser2";
}
function isKeeper(role) {
	return role === "keeper";
}
function isBeater(role) {
	return role === "beater";
}
function isSeeker(role) {
	return role === "seeker";
}
function isActiveRole(role) {
	return role === "keeper" || role === "seeker" || role === "chaser1" || role === "chaser2" || role === "beater";
}
function isAllowedChaserMove(from, to) {
	if (from === to || isGoal(to)) return false;
	const a = coordToRC(from);
	const b = coordToRC(to);
	const dr = Math.abs(a.r - b.r);
	const dc = Math.abs(a.c - b.c);
	return dr === 0 && (dc === 1 || dc === 2) || dc === 0 && (dr === 1 || dr === 2) || dr === dc && (dr === 1 || dr === 2);
}
function isAllowedSeekerMove(from, to) {
	if (from === to || isGoal(to)) return false;
	const d = chebyshev(from, to);
	return d === 1 || d === 2;
}
function isAllowedKeeperMove(from, to, side) {
	if (from === to) return false;
	const zone = keeperZone(side);
	if (!zone.has(from) || !zone.has(to)) return false;
	return chebyshev(from, to) === 1;
}
function isAllowedMove(role, side, from, to) {
	if (isKeeper(role)) return isAllowedKeeperMove(from, to, side);
	if (isSeeker(role)) return isAllowedSeekerMove(from, to);
	if (isChaser(role) || isBeater(role)) return isAllowedChaserMove(from, to);
	return false;
}
function allCoords() {
	const list = [];
	for (let r = 0; r < BOARD_ROWS.length; r++) for (let c = 0; c < 13; c++) {
		const coord = rcToCoord(r, c);
		if (coord) list.push(coord);
	}
	return list;
}
function neighbors(coord) {
	const { r, c } = coordToRC(coord);
	const list = [];
	for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
		if (dr === 0 && dc === 0) continue;
		const next = rcToCoord(r + dr, c + dc);
		if (next) list.push(next);
	}
	return list;
}
/** Straight or diagonal line, 1–3 steps, inclusive of the target. */
function lineCells(from, to, maxSteps = 3) {
	const a = coordToRC(from);
	const b = coordToRC(to);
	const dr = b.r - a.r;
	const dc = b.c - a.c;
	const steps = Math.max(Math.abs(dr), Math.abs(dc));
	if (steps < 1 || steps > maxSteps) return null;
	if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
	const sr = Math.sign(dr);
	const sc = Math.sign(dc);
	const cells = [];
	for (let i = 1; i <= steps; i++) {
		const coord = rcToCoord(a.r + sr * i, a.c + sc * i);
		if (!coord) return null;
		cells.push(coord);
	}
	return cells[cells.length - 1] === to ? cells : null;
}
function sideOf(state, team) {
	if (team === state.teamA) return "A";
	if (team === state.teamB) return "B";
	return null;
}
function activePlayers(state) {
	return state.participants.filter((p) => !p.isObserver && isActiveRole(p.role));
}
function ballCells(state) {
	const set = /* @__PURE__ */ new Set();
	if (state.quafflePos) set.add(state.quafflePos);
	if (state.bludger1Pos) set.add(state.bludger1Pos);
	if (state.bludger2Pos) set.add(state.bludger2Pos);
	if (state.snitchPos) set.add(state.snitchPos);
	return set;
}
function occupant(state, coord, exceptId) {
	return state.participants.find((p) => !p.isObserver && p.pos === coord && p.id !== exceptId) ?? null;
}
function stealLocked(state, holderId) {
	if (!holderId) return false;
	const step = state.stepNo;
	if (state.quaffleStealCooldownStepNo != null && step === state.quaffleStealCooldownStepNo + 1) return true;
	if (state.quaffleLockHolderId === holderId && state.quaffleLockStepNo != null && step === state.quaffleLockStepNo + 1) return true;
	return false;
}
/** Collector rule: block the step the lock was written and the next one. */
function stealBlockedByCollector(state, holderId) {
	if (!holderId) return false;
	const step = state.stepNo;
	const spans = [state.quaffleLockStepNo, state.quaffleStealCooldownStepNo];
	for (const s of spans) {
		if (s == null) continue;
		if (step >= s && step <= s + 1) {
			if (s === state.quaffleLockStepNo && state.quaffleLockHolderId && state.quaffleLockHolderId !== holderId) continue;
			return true;
		}
	}
	return false;
}
function actionOrigin(turn, currentPos, actionFirst) {
	if (actionFirst) return turn.originPos ?? currentPos;
	return turn.plannedTo ?? currentPos;
}
function moveError(state, player, to, ignorePlayerOccupancy) {
	if (!player.pos || !player.role || !player.side) return "no_position";
	if (!to) return null;
	const coord = normalizeCoord(to);
	if (!coord) return "invalid_position";
	if (!isAllowedMove(player.role, player.side, player.pos, coord)) return isGoal(coord) ? "cannot_enter_goal" : "illegal_move";
	if (ballCells(state).has(coord)) return "cell_occupied_by_ball";
	if (!ignorePlayerOccupancy && occupant(state, coord, player.id)) return "cell_taken";
	for (const [id, turn] of Object.entries(state.turns)) if (id !== player.id && turn.stepNo === state.stepNo && turn.plannedTo === coord) return "cell_reserved";
	return null;
}
function validateAction(state, player, turn, actionType, actionTo, actionBludger, actionFirst) {
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
		if (target || actionBludger) return "invalid_target";
		if (actionType === "pickup" && !isChaser(player.role)) return "role_cannot_pickup";
		if (actionType === "keeper_pickup" && !isKeeper(player.role)) return "role_cannot_pickup";
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
		if (holder.isObserver || !isChaser(holder.role) && !isKeeper(holder.role)) return "not_opponent";
		if (!holder.side || holder.side === player.side) return "not_opponent";
		const holderPos = turnFor(state, holder.id)?.originPos ?? holder.pos;
		const pos = actionFirst ? holder.pos : holderPos;
		if (!pos || chebyshev(from, pos) > 1) return "too_far";
		if (stealLocked(state, holder.id)) return state.quaffleStealCooldownStepNo != null && state.stepNo === state.quaffleStealCooldownStepNo + 1 ? "steal_cooldown" : "steal_locked";
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
		if (!target || actionBludger !== 1 && actionBludger !== 2) return actionBludger ? "invalid_target" : "invalid_bludger";
		if (!isBeater(player.role) && !isKeeper(player.role)) return "role_cannot_hit";
		const bpos = actionBludger === 1 ? state.bludger1Pos : state.bludger2Pos;
		if (chebyshev(from, bpos) !== 1) return "too_far";
		if (!lineCells(bpos, target, 3)) return "invalid_target";
		if (state.quafflePos && target === state.quafflePos) return "invalid_target";
		return null;
	}
	return "invalid_action";
}
function turnFor(state, id) {
	return state.turns[id] ?? null;
}
function listLegalMoves(state, player, extraBlocked = /* @__PURE__ */ new Set()) {
	if (!player.pos || !player.role || !player.side) return [];
	const balls = ballCells(state);
	const moves = [];
	for (const coord of allCoords()) {
		if (!isAllowedMove(player.role, player.side, player.pos, coord)) continue;
		if (balls.has(coord) || extraBlocked.has(coord)) continue;
		if (occupant(state, coord, player.id)) continue;
		moves.push(coord);
	}
	return moves;
}
function stableIndexFromId(id, mod) {
	if (mod <= 0) return 0;
	let sum = 0;
	for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
	return sum % mod;
}
function freshTurn(stepNo, stunned = false) {
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
		originPos: null
	};
}
//#endregion
export { occupant as C, stealBlockedByCollector as D, stableIndexFromId as E, stealLocked as O, nid as S, sideOf as T, isSeeker as _, actionOrigin as a, moveError as b, attackGoals as c, defaultSpawn as d, freshTurn as f, isKeeper as g, isChaser as h, TURN_TIMEOUT_MS as i, validateAction as k, ballCells as l, isBeater as m, GOALS_RIGHT as n, activePlayers as o, isActiveRole as p, SNITCH_SPAWNS as r, allCoords as s, GOALS_LEFT as t, chebyshev as u, lineCells as v, roomCode as w, neighbors as x, listLegalMoves as y };
