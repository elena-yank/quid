import { o as __toESM } from "../_runtime.mjs";
import { c as roleLetter, l as teamLabel, s as roleLabel, u as teamRgb } from "./types-B0hlOrFm.mjs";
import { S as require_jsx_runtime, Y as require_react, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as sendDuel, d as sendPlan, f as sendStart, i as judgeCommand, l as sendLeave, m as syncRoom, p as sendTurn, s as sendChat, u as sendPause } from "./api-BV6RFtb8.mjs";
import { O as stealLocked, _ as isSeeker, c as attackGoals, f as freshTurn, g as isKeeper, h as isChaser, k as validateAction, m as isBeater, n as GOALS_RIGHT, t as GOALS_LEFT, u as chebyshev, v as lineCells, y as listLegalMoves } from "./rules-B_gT6_Z7.mjs";
import { t as errorText } from "./errors-D7fKrWdQ.mjs";
import { n as captureFeed, t as BOARD_CELLS } from "./feed-DYlXBVt2.mjs";
import { a as Copy, i as Moon, n as Sun } from "../_libs/lucide-react.mjs";
import { n as Route, r as previewPathPrefix } from "./router-BfVueybo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/play._code-COXNHnFS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function shadow(view) {
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
		createdAt: p.createdAt
	}));
	const turns = {};
	for (const [id, turn] of Object.entries(view.turnStates)) turns[id] = {
		...freshTurn(view.game.stepNo, turn.stunned),
		ended: turn.ended,
		stunned: turn.stunned,
		plannedTo: turn.plannedTo,
		plannedActionFirst: turn.plannedActionFirst,
		plannedActionType: turn.plannedActionType,
		plannedActionTo: turn.plannedActionTo,
		plannedActionBludger: turn.plannedActionBludger,
		originPos: participants.find((p) => p.id === id)?.pos ?? null
	};
	for (const coord of view.reservedMoves) if (!Object.values(turns).some((t) => t.plannedTo === coord)) turns[`rsv_${coord}`] = {
		...freshTurn(view.game.stepNo),
		plannedTo: coord
	};
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
function actionOk(view, id, plan) {
	const state = shadow(view);
	const player = state.participants.find((p) => p.id === id);
	const turn = player ? state.turns[player.id] : null;
	if (!player || !turn) return "not_found";
	turn.plannedTo = plan.to;
	turn.originPos = player.pos;
	return validateAction(state, player, turn, plan.actionType, plan.actionTo, plan.actionBludger, Boolean(plan.actionFirst));
}
function legalMoves(view, id) {
	const state = shadow(view);
	const player = state.participants.find((p) => p.id === id);
	if (!player) return [];
	const blocked = new Set(view.reservedMoves.filter((c) => state.turns[id]?.plannedTo !== c));
	return listLegalMoves(state, player, blocked);
}
function quaffleLocked(view) {
	const state = shadow(view);
	return stealLocked(state, state.quaffleHolderId);
}
var GOALS = /* @__PURE__ */ new Set([...GOALS_LEFT, ...GOALS_RIGHT]);
function Board({ view, meId, moves, targets, planned, actionTo, onCell }) {
	const moveSet = new Set(moves);
	const targetSet = new Set(targets);
	const byPos = new Map(view.participants.filter((p) => p.pos).map((p) => [p.pos, p]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pitch-wrap",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			className: "pitch",
			src: "/assets/board.svg",
			alt: "Поле квиддича"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid",
			children: BOARD_CELLS.map((cell) => {
				const coord = cell.coord;
				const person = byPos.get(coord);
				const quaffle = view.quaffle.pos === coord;
				const bludger = view.bludgers[0] === coord ? 1 : view.bludgers[1] === coord ? 2 : 0;
				const snitch = view.snitch.revealed && view.snitch.pos === coord;
				const cls = [
					"cell",
					GOALS.has(coord) ? "gate" : "",
					moveSet.has(coord) ? "target" : "",
					targetSet.has(coord) ? "shot" : "",
					actionTo === coord ? "chosen" : "",
					planned === coord ? "planned" : ""
				].filter(Boolean).join(" ");
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: cls,
					title: coord,
					style: {
						left: `${cell.left}%`,
						top: `${cell.top}%`,
						width: `${cell.width}%`,
						height: `${cell.height}%`
					},
					onClick: () => onCell(coord),
					children: [
						quaffle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "ball quaffle" }) : null,
						bludger ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "ball bludger" }) : null,
						snitch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "ball snitch" }) : null,
						person ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `piece${person.id === meId ? " me" : ""}${view.turnStates[person.id]?.stunned ? " stunned" : ""}`,
							style: { background: `rgb(${teamRgb(person.team)})` },
							children: [roleLetter(person.role), view.quaffle.holderId === person.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "badge" }) : null]
						}) : null
					]
				}, coord);
			})
		})]
	});
}
var ROLE_ORDER = [
	"chaser1",
	"keeper",
	"seeker",
	"beater",
	"chaser2"
];
var EMPTY = {
	type: null,
	to: null,
	bludger: null,
	at: null
};
function readSeat(code) {
	const raw = sessionStorage.getItem("quidditch.seat") || localStorage.getItem(`quidditch.seat.${code}`);
	if (!raw) return null;
	try {
		const seat = JSON.parse(raw);
		return seat.code === code ? seat : null;
	} catch {
		return null;
	}
}
function Room({ code }) {
	const navigate = useNavigate();
	const [seat, setSeat] = (0, import_react.useState)(null);
	const [view, setView] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)(EMPTY);
	const [moveAt, setMoveAt] = (0, import_react.useState)(null);
	const [toast, setToast] = (0, import_react.useState)("");
	const [chatText, setChatText] = (0, import_react.useState)("");
	const [scope, setScope] = (0, import_react.useState)("all");
	const [chatOn, setChatOn] = (0, import_react.useState)(true);
	const [feed, setFeed] = (0, import_react.useState)([]);
	const [now, setNow] = (0, import_react.useState)(Date.now());
	const [light, setLight] = (0, import_react.useState)(false);
	const [showResults, setShowResults] = (0, import_react.useState)(false);
	const [roster, setRoster] = (0, import_react.useState)(null);
	const prevFeed = (0, import_react.useRef)(null);
	const seenEvents = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const auto = (0, import_react.useRef)("");
	const offset = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		setSeat(readSeat(code));
		const next = localStorage.getItem("quidditch.theme") === "light";
		setLight(next);
		document.documentElement.dataset.theme = next ? "light" : "dark";
	}, [code]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!seat) return;
		const current = seat;
		let stop = false;
		async function pull() {
			if (stop) return;
			const res = await syncRoom({ data: {
				code,
				participantId: current.participantId,
				sessionToken: current.token
			} });
			if (stop) return;
			if (!res.ok) {
				if (res.error === "invalid_session" || res.error === "not_found") {
					sessionStorage.removeItem("quidditch.seat");
					localStorage.removeItem(`quidditch.seat.${code}`);
					navigate({ to: "/" });
				}
				return;
			}
			offset.current = res.state.serverNow - Date.now();
			setView(res.state);
			if (res.state.game.finished) setShowResults(true);
		}
		pull();
		const id = window.setInterval(() => void pull(), 2e3);
		return () => {
			stop = true;
			window.clearInterval(id);
		};
	}, [
		code,
		seat,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (!view) return;
		const snap = {
			code: view.game.code,
			counters: view.messageCounters,
			participants: view.participants.map((person) => ({
				id: person.id,
				nickname: person.nickname,
				team: person.team,
				role: person.role,
				isObserver: person.isObserver
			})),
			holderId: view.quaffle.holderId,
			snitchRevealed: view.snitch.revealed,
			snitchCaughtById: view.snitch.caughtById,
			events: view.events,
			duel: view.duel ? {
				kind: view.duel.kind,
				attackerId: view.duel.attackerId,
				defenderId: view.duel.defenderId,
				winnerId: view.duel.winnerId
			} : null
		};
		const lines = captureFeed(prevFeed.current, snap, seenEvents.current);
		prevFeed.current = snap;
		if (lines.length) setFeed((items) => [...items, ...lines].slice(-60));
	}, [view]);
	const me = view?.participants.find((p) => p.id === seat?.participantId) ?? null;
	const turn = me && view ? view.turnStates[me.id] : null;
	const locked = view ? quaffleLocked(view) : false;
	const moves = (0, import_react.useMemo)(() => view && me && !turn?.ended && !turn?.stunned ? legalMoves(view, me.id) : [], [
		view,
		me,
		turn?.ended,
		turn?.stunned
	]);
	const targets = (0, import_react.useMemo)(() => view && me && draft.type ? targetCells(view, me.id, draft, turn?.plannedTo ?? null) : [], [
		view,
		me,
		draft,
		turn?.plannedTo
	]);
	(0, import_react.useEffect)(() => {
		if (!view || !me || !seat) return;
		if (!view.game.started || view.game.paused || view.game.finished || view.duel && !view.duel.resolvedAt) return;
		const mine = view.turnStates[me.id];
		if (!mine || mine.ended || mine.stunned || me.isObserver) return;
		if (moves.length > 0 || hasAction(view, me.id)) return;
		const key = `${view.game.stepNo}:${me.id}`;
		if (auto.current === key) return;
		auto.current = key;
		sendTurn({ data: {
			code,
			participantId: seat.participantId,
			sessionToken: seat.token,
			plan: {
				to: null,
				actionFirst: null,
				actionType: null,
				actionTo: null,
				actionBludger: null
			}
		} }).then((res) => {
			if (res.ok) setView(res.state);
		});
	}, [
		view,
		me,
		seat,
		moves.length,
		code
	]);
	function note(error) {
		const beaterBall = me && isBeater(me.role) && (error === "steal_cooldown" || error === "steal_locked" || error === "role_cannot_steal" || error === "role_cannot_pickup" || error === "role_cannot_throw" || error === "role_cannot_pass");
		setToast(beaterBall ? "Загонщик бьёт только бладжер" : errorText(error));
		window.setTimeout(() => setToast(""), 2400);
	}
	async function onCell(coord) {
		if (!view || !me || !seat || me.isObserver || turn?.ended || turn?.stunned || !view.game.started || view.game.paused) return;
		if (draft.type && needsTarget(draft.type) && targets.includes(coord)) {
			const bludger = draft.type === "hit_bludger" ? bludgerFor(view, turn?.plannedTo ?? me.pos, coord) ?? bludgerFor(view, me.pos, coord) : null;
			setDraft({
				...draft,
				to: coord,
				bludger
			});
			return;
		}
		if (turn?.plannedTo === coord) {
			const res = await sendPlan({ data: {
				code,
				participantId: seat.participantId,
				sessionToken: seat.token,
				to: null
			} });
			if (!res.ok) note(res.error);
			else setView(res.state);
			setMoveAt(null);
			return;
		}
		if (!moves.includes(coord)) {
			if (draft.type && needsTarget(draft.type)) note(draft.type === "throw" && isChaser(me.role) ? "not_opponent_goal" : "invalid_target");
			return;
		}
		const res = await sendPlan({ data: {
			code,
			participantId: seat.participantId,
			sessionToken: seat.token,
			to: coord
		} });
		if (!res.ok) note(res.error);
		else {
			setView(res.state);
			setMoveAt(Date.now());
		}
	}
	async function finish() {
		if (!view || !me || !seat) return;
		let type = draft.type;
		if (isBeater(me.role)) {
			if (type !== "hit_bludger") type = null;
		} else if (isSeeker(me.role) || !isChaser(me.role) && !isKeeper(me.role)) type = null;
		if (type && needsTarget(type) && !draft.to) {
			note("invalid_target");
			return;
		}
		const plannedTo = view.turnStates[me.id]?.plannedTo ?? null;
		const actionFirst = chooseFirst(view, me.id, {
			...draft,
			type
		}, plannedTo, moveAt);
		const plan = {
			to: plannedTo,
			actionType: type,
			actionTo: type ? draft.to : null,
			actionBludger: type === "hit_bludger" ? draft.bludger : null,
			actionFirst
		};
		if (type) {
			const err = actionOk(view, me.id, plan);
			if (err) {
				note(err);
				return;
			}
		}
		const res = await sendTurn({ data: {
			code,
			participantId: seat.participantId,
			sessionToken: seat.token,
			plan
		} });
		if (!res.ok) note(res.error);
		else {
			setView(res.state);
			setDraft(EMPTY);
			setMoveAt(null);
		}
	}
	async function clickScore(score) {
		if (!view?.duel || !seat) return;
		const res = await sendDuel({ data: {
			code,
			participantId: seat.participantId,
			sessionToken: seat.token,
			duelId: view.duel.id,
			score
		} });
		if (!res.ok && res.error !== "alreadySubmitted") note(res.error);
		if (res.ok) setView(res.state);
	}
	const remain = view ? Math.max(0, Math.ceil((view.game.stepStartedAt + view.turnMs - (now + offset.current)) / 1e3)) : 0;
	const judgeInRoom = view?.participants.some((p) => p.isJudge);
	const waiting = view ? view.participants.filter((p) => p.role && !p.isObserver && !view.turnStates[p.id]?.ended).length : 0;
	if (!seat) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "shell",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card form",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: ["Комната ", code] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Сначала войдите с главной — место в матче хранится в этом браузере." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary",
					type: "button",
					onClick: () => void navigate({ to: "/" }),
					children: "На главную"
				})
			]
		})
	});
	if (!view || !me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "shell",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "tagline",
			children: "Собираем поле…"
		})
	});
	const canPlay = !me.isObserver && view.game.started && !view.game.paused && !view.game.finished && !turn?.ended && !turn?.stunned;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "logo-mini",
						src: "/assets/logo.png",
						alt: ""
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
						teamLabel(view.game.teamA),
						" — ",
						teamLabel(view.game.teamB)
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Код ",
						view.game.code,
						view.game.paused ? " · пауза" : "",
						" ",
						view.game.finished ? " · матч окончен" : ""
					] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grow" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "icon-btn",
						type: "button",
						"aria-label": "Скопировать код",
						onClick: () => {
							const roomCode = view.game.code || code;
							const legacyCopy = () => {
								const area = document.createElement("textarea");
								area.value = roomCode;
								area.setAttribute("readonly", "");
								area.style.position = "fixed";
								area.style.top = "0";
								area.style.left = "0";
								area.style.opacity = "0";
								document.body.appendChild(area);
								area.focus();
								area.select();
								let copied = false;
								try {
									copied = document.execCommand("copy");
								} catch {
									copied = false;
								}
								area.remove();
								return copied;
							};
							const tell = (copied) => {
								setToast(copied ? "Код комнаты скопирован" : "Не удалось скопировать код");
								window.setTimeout(() => setToast(""), 2400);
							};
							if (navigator.clipboard?.writeText) {
								navigator.clipboard.writeText(roomCode).then(() => tell(true), () => tell(legacyCopy()));
								return;
							}
							tell(legacyCopy());
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 18 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "icon-btn",
						type: "button",
						"aria-label": "Тема",
						onClick: () => {
							const next = !light;
							setLight(next);
							document.documentElement.dataset.theme = next ? "light" : "dark";
							localStorage.setItem("quidditch.theme", next ? "light" : "dark");
						},
						children: light ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { size: 18 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "ghost",
						type: "button",
						onClick: () => {
							sendLeave({ data: {
								code,
								participantId: seat.participantId,
								sessionToken: seat.token
							} }).finally(() => {
								sessionStorage.removeItem("quidditch.seat");
								navigate({ to: "/" });
							});
						},
						children: "Выйти"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "layout",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "board-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pitch-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "ghost",
								type: "button",
								onClick: () => setRoster(roster === "players" ? null : "players"),
								children: "Участники"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "ghost",
								type: "button",
								onClick: () => setRoster(roster === "watchers" ? null : "watchers"),
								children: "Наблюдатели"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grow" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "pitch-status",
								children: [
									"Ход ",
									view.game.stepNo,
									view.game.started && !view.game.finished ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: remain <= 3 ? "timer warn" : "timer",
										children: [
											" · ",
											remain,
											"с"
										]
									}) : null,
									" · ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: `team-${view.game.teamA}`,
										children: view.game.scoreA
									}),
									" : ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: `team-${view.game.teamB}`,
										children: view.game.scoreB
									}),
									view.game.started ? ` · Ждут заявок: ${waiting}` : " · Матч ещё не начат"
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {
						view,
						meId: me.id,
						moves: canPlay ? moves : [],
						targets: canPlay ? targets : [],
						planned: turn?.plannedTo ?? null,
						actionTo: draft.to,
						onCell: (c) => void onCell(c)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "side",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel score-line",
							"aria-label": "Счёт",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: `team-${view.game.teamA}`,
									children: view.game.scoreA
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ":" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: `team-${view.game.teamB}`,
									children: view.game.scoreB
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel score-line",
							"aria-label": "Снитч",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Снитч:" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
									className: `team-${view.game.teamA}`,
									children: [snitchProgress(view, view.game.teamA), "%"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "–" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
									className: `team-${view.game.teamB}`,
									children: [snitchProgress(view, view.game.teamB), "%"]
								})
							]
						}),
						!view.game.started || me.isJudge ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel",
							children: [
								!view.game.started && (!judgeInRoom || me.isJudge) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "primary",
									type: "button",
									onClick: () => void sendStart({ data: creds(code, seat) }).then((r) => r.ok ? setView(r.state) : note(r.error)),
									children: "Начать игру"
								}) : null,
								!view.game.started && judgeInRoom && !me.isJudge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ждём, пока судья начнёт матч." }) : null,
								me.isJudge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "ghost",
									type: "button",
									onClick: () => void sendPause({ data: creds(code, seat) }).then((r) => r.ok ? setView(r.state) : note(r.error)),
									children: view.game.paused ? "Продолжить" : "Пауза"
								}) : null
							]
						}) : null,
						canPlay ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "actions",
									children: [buttons(view, me, turn?.plannedTo ?? null).map((btn) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "ghost",
										type: "button",
										"aria-pressed": draft.type === btn.type,
										onClick: () => setDraft(draft.type === btn.type ? EMPTY : {
											type: btn.type,
											to: null,
											bludger: null,
											at: Date.now()
										}),
										children: btn.label
									}, btn.type)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "primary",
										type: "button",
										onClick: () => void finish(),
										children: draft.type === "throw" && draft.to ? "Бросить" : "Завершить ход"
									})]
								}),
								quaffleLockCopy(view, me, locked, turn?.plannedTo ?? null) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Нельзя выхватить квоффл сразу после смены владельца." }) : null,
								draft.type === "steal" && !turn?.plannedTo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Сначала выхват, затем можно выбрать клетку хода." }) : null,
								stealHint(view, me, moves, turn?.plannedTo ?? null) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Чтобы выхватить квоффл, выберите клетку рядом с соперником." }) : null,
								draft.type && needsTarget(draft.type) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: draft.to ? `Цель: ${draft.to}. Нажмите «${draft.type === "throw" ? "Бросить" : "Завершить ход"}».` : draft.type === "throw" && isChaser(me.role) ? "Выберите подсвеченное кольцо соперника." : "Выберите подсвеченную клетку цели." }) : null
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: "panel",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: { margin: 0 },
								children: me.isObserver ? "Вы наблюдаете." : turn?.stunned ? "Вы оглушены и пропускаете шаг." : turn?.ended ? "Заявка принята." : "Сейчас ходить нельзя."
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "events-head",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "События" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									action: logAction(),
									method: "post",
									onSubmit: () => {
										setToast("Собираем лог…");
										window.setTimeout(() => setToast(""), 4e3);
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "hidden",
											name: "code",
											value: code
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "hidden",
											name: "participantId",
											value: seat.participantId
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "hidden",
											name: "sessionToken",
											value: seat.token
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "ghost",
											type: "submit",
											children: "Логи"
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "feed",
								children: feed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "События появятся по ходу матча." }) : feed.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { dangerouslySetInnerHTML: { __html: line } }, `${i}-${line.slice(0, 24)}`))
							})]
						}),
						me.isJudge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JudgePanel, {
							view,
							code,
							seat,
							onDone: setView,
							onError: note
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "panel chat",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "score",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Чат" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "ghost",
						type: "button",
						onClick: () => setChatOn((v) => !v),
						children: chatOn ? "Скрыть" : "Показать"
					})]
				}), chatOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "chat-log",
					children: view.chat.messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: m.fromTeam ? `team-${m.fromTeam}` : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: m.fromNick }),
							m.scope === "team" ? " (команда)" : "",
							": ",
							m.text
						]
					}, m.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "chat-form",
					onSubmit: (e) => {
						e.preventDefault();
						sendChat({ data: {
							...creds(code, seat),
							scope,
							text: chatText
						} }).then((res) => {
							if (!res.ok) note(res.error);
							else {
								setChatText("");
								setView(res.state);
							}
						});
					},
					children: [
						!me.isObserver ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "ghost",
							type: "button",
							onClick: () => setScope(scope === "all" ? "team" : "all"),
							children: scope === "all" ? "Всем" : "Команде"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: me.team ? `team-${me.team}` : "",
							value: chatText,
							maxLength: 280,
							onChange: (e) => setChatText(e.target.value),
							placeholder: "Сообщение",
							disabled: view.game.finished
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "primary",
							type: "submit",
							disabled: view.game.finished,
							children: "Отправить"
						})
					]
				})] }) : null]
			}),
			view.duel && !view.duel.resolvedAt && view.duel.participantIds.includes(me.id) && view.duel.scores[me.id] == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DuelBox, {
				duel: view.duel,
				names: view.participants,
				onScore: (n) => void clickScore(n)
			}) : null,
			roster ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overlay",
				onClick: () => setRoster(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card modal roster-modal",
					onClick: (e) => e.stopPropagation(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "roster-top",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: roster === "players" ? "Участники" : "Наблюдатели" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "ghost",
							type: "button",
							onClick: () => setRoster(null),
							children: "закрыть"
						})]
					}), roster === "players" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "roster-cols",
						children: [view.game.teamA, view.game.teamB].map((team) => {
							const members = view.participants.filter((p) => !p.isObserver && p.team === team && p.role).sort((a, b) => ROLE_ORDER.indexOf(a.role ?? "keeper") - ROLE_ORDER.indexOf(b.role ?? "keeper"));
							const ready = members.filter((p) => view.game.started && view.turnStates[p.id]?.ended).length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "roster-team",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: `team-${team}`,
									children: teamLabel(team)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									ready,
									"/",
									members.length
								] })] }), members.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "roster-row",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: view.game.started && view.turnStates[p.id]?.ended ? "on" : "" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
											className: `team-${p.team}`,
											children: p.nickname
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: roleLabel(p.role) })
									]
								}, p.id))]
							}, team);
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "roster-cols one",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "roster-team",
							children: [view.participants.filter((p) => p.isObserver).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Пока никого нет." }) : null, view.participants.filter((p) => p.isObserver).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "roster-row",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "on" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: p.team ? `team-${p.team}` : "",
										children: p.nickname
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.isJudge ? "Судья" : "Наблюдатель" })
								]
							}, p.id))]
						})
					})]
				})
			}) : null,
			showResults && view.results ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overlay",
				onClick: () => setShowResults(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card modal form",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: ["Итог: ", view.results.winnerTeam ? teamLabel(view.results.winnerTeam) : "ничья"] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultsTable, { view }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "primary",
							type: "button",
							onClick: () => drawResults(view),
							children: "Сохранить как изображение"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "ghost",
							type: "button",
							onClick: () => setShowResults(false),
							children: "Закрыть"
						})
					]
				})
			}) : null,
			toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "toast",
				children: toast
			}) : null
		]
	});
}
function creds(code, seat) {
	return {
		code,
		participantId: seat.participantId,
		sessionToken: seat.token
	};
}
function needsTarget(type) {
	return type === "pass" || type === "throw" || type === "hit_bludger";
}
function buttons(view, me, plannedTo) {
	const list = [];
	if (!me.role || !me.pos || !me.side) return list;
	const froms = [me.pos, ...plannedTo && plannedTo !== me.pos ? [plannedTo] : []];
	if (isBeater(me.role)) {
		if (froms.some((from) => view.bludgers.some((b) => chebyshev(from, b) === 1))) list.push({
			type: "hit_bludger",
			label: "Ударить бладжер"
		});
		return list;
	}
	if (isSeeker(me.role)) return list;
	const side = me.side;
	const hold = view.quaffle.holderId === me.id;
	const free = (from) => !view.quaffle.holderId && Boolean(view.quaffle.pos && chebyshev(from, view.quaffle.pos) <= 1);
	if (isChaser(me.role) && froms.some(free)) list.push({
		type: "pickup",
		label: "Взять квоффл"
	});
	if (isKeeper(me.role) && froms.some(free)) list.push({
		type: "keeper_pickup",
		label: "Поднять квоффл"
	});
	const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
	if ((isChaser(me.role) || isKeeper(me.role)) && holder && holder.side && holder.side !== side && !holder.isObserver && (isChaser(holder.role) || isKeeper(holder.role)) && holder.pos && !quaffleLocked(view) && froms.some((from) => chebyshev(from, holder.pos) <= 1)) list.push({
		type: "steal",
		label: "Выхватить квоффл"
	});
	if (isChaser(me.role) && hold) {
		const mate = (from) => view.participants.some((p) => p.side === side && isChaser(p.role) && p.id !== me.id && p.pos && chebyshev(from, p.pos) >= 1 && chebyshev(from, p.pos) <= 2);
		if (froms.some(mate)) list.push({
			type: "pass",
			label: "Дать пас"
		});
		if (froms.some((from) => attackGoals(side).some((g) => chebyshev(from, g) === 2))) list.push({
			type: "throw",
			label: "Бросок"
		});
	}
	if (isKeeper(me.role) && hold) list.push({
		type: "throw",
		label: "Бросок"
	});
	if (isKeeper(me.role) && froms.some((from) => view.bludgers.some((b) => chebyshev(from, b) === 1))) list.push({
		type: "hit_bludger",
		label: "Ударить бладжер"
	});
	return list;
}
function hasAction(view, id) {
	const me = view.participants.find((p) => p.id === id);
	if (!me) return false;
	return buttons(view, me, view.turnStates[id]?.plannedTo ?? null).length > 0;
}
function stealHint(view, me, moves, plannedTo) {
	if (!me.role || !me.pos || !me.side || quaffleLocked(view)) return false;
	if (!isChaser(me.role) && !isKeeper(me.role)) return false;
	const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
	if (!holder?.pos || !holder.side || holder.side === me.side || holder.isObserver) return false;
	if (!isChaser(holder.role) && !isKeeper(holder.role)) return false;
	if ([me.pos, ...plannedTo ? [plannedTo] : []].some((from) => chebyshev(from, holder.pos) <= 1)) return false;
	return moves.some((cell) => chebyshev(cell, holder.pos) <= 1);
}
function quaffleLockCopy(view, me, locked, plannedTo) {
	if (!locked || !me.pos || !me.side || isBeater(me.role) || isSeeker(me.role)) return false;
	if (!isChaser(me.role) && !isKeeper(me.role)) return false;
	const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
	if (!holder?.pos || holder.id === me.id || !holder.side || holder.side === me.side || holder.isObserver) return false;
	if (!isChaser(holder.role) && !isKeeper(holder.role)) return false;
	return chebyshev(me.pos, holder.pos) <= 1 || Boolean(plannedTo && chebyshev(plannedTo, holder.pos) <= 1);
}
function targetCells(view, id, draft, plannedTo) {
	const me = view.participants.find((p) => p.id === id);
	if (!me?.pos || !me.side || !draft.type) return [];
	const from = plannedTo ?? me.pos;
	const originPos = me.pos;
	const cells = /* @__PURE__ */ new Set();
	const consider = (coord, bludger, first, origin) => {
		if (!actionOk(view, id, {
			to: first ? null : plannedTo,
			actionFirst: first,
			actionType: draft.type,
			actionTo: coord,
			actionBludger: bludger
		})) cells.add(coord);
	};
	if (draft.type === "pass") for (const p of view.participants) {
		if (!p.pos || p.side !== me.side || !isChaser(p.role) || p.id === me.id) continue;
		consider(p.pos, null, true, me.pos);
		consider(p.pos, null, false, from);
	}
	else if (draft.type === "throw" && isChaser(me.role)) for (const g of attackGoals(me.side)) {
		consider(g, null, true, me.pos);
		consider(g, null, false, from);
	}
	else if (draft.type === "throw") for (const origin of [me.pos, from]) {
		view.participants;
		for (let r = 0; r < 7; r++) for (let c = 1; c <= 13; c++) {
			const coord = `${"ABCDEFG"[r]}${c}`;
			const d = chebyshev(origin, coord);
			if (d >= 1 && d <= 6) cells.add(coord);
		}
	}
	else if (draft.type === "hit_bludger") view.bludgers.forEach((bpos, index) => {
		index + 1;
		if (chebyshev(originPos, bpos) !== 1 && chebyshev(from, bpos) !== 1) return;
		for (let r = 0; r < 7; r++) for (let c = 1; c <= 13; c++) {
			const coord = `${"ABCDEFG"[r]}${c}`;
			if (lineCells(bpos, coord, 3)) cells.add(coord);
		}
	});
	return [...cells];
}
function bludgerFor(view, from, coord) {
	if (!from) return null;
	for (const [index, bpos] of view.bludgers.entries()) if (chebyshev(from, bpos) === 1 && lineCells(bpos, coord, 3)) return index + 1;
	return null;
}
function chooseFirst(view, id, draft, plannedTo, moveAt) {
	if (!draft.type) return null;
	const pre = actionOk(view, id, {
		to: null,
		actionFirst: true,
		actionType: draft.type,
		actionTo: draft.to,
		actionBludger: draft.bludger
	});
	const post = actionOk(view, id, {
		to: plannedTo,
		actionFirst: false,
		actionType: draft.type,
		actionTo: draft.to,
		actionBludger: draft.bludger
	});
	const preOk = !pre;
	const postOk = !post;
	if (preOk && postOk) {
		if (draft.at != null && (moveAt == null || draft.at < moveAt)) return true;
		return false;
	}
	if (preOk) return true;
	if (postOk) return false;
	return true;
}
var DUEL_LABEL = {
	pickup: "Кто подберёт квоффл",
	steal: "Выхват квоффла",
	throw_steal: "Бросок или выхват",
	hit_bludger: "Кто ударит бладжер",
	snitch: "Кто поймает снитч"
};
function DuelBox({ duel, names, onScore }) {
	const sent = (0, import_react.useRef)(false);
	const pctRef = (0, import_react.useRef)(0);
	const marker = (0, import_react.useRef)(null);
	const readout = (0, import_react.useRef)(null);
	const onScoreRef = (0, import_react.useRef)(onScore);
	onScoreRef.current = onScore;
	const [lockedScore, setLockedScore] = (0, import_react.useState)(null);
	function stop() {
		if (sent.current) return;
		sent.current = true;
		const score = Math.max(0, Math.min(100, Math.round(pctRef.current)));
		if (marker.current) marker.current.style.left = `${score}%`;
		if (readout.current) readout.current.textContent = String(score);
		setLockedScore(score);
		onScoreRef.current(score);
	}
	(0, import_react.useEffect)(() => {
		let raf = 0;
		const start = performance.now();
		const loop = (now) => {
			if (sent.current) return;
			const next = (now - start) % 2200 / 2200 * 100;
			pctRef.current = next;
			if (marker.current) marker.current.style.left = `${next}%`;
			if (readout.current) readout.current.textContent = String(Math.round(next));
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		const onKey = (event) => {
			if (event.code !== "Space" && event.key !== " ") return;
			event.preventDefault();
			event.stopPropagation();
			stop();
		};
		window.addEventListener("keydown", onKey, true);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("keydown", onKey, true);
		};
	}, [duel.id]);
	const label = DUEL_LABEL[duel.kind] ?? "Дуэль";
	const who = duel.participantIds.map((id) => names.find((p) => p.id === id)?.nickname ?? "игрок").join(" · ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overlay",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "card modal form",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: label }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [who, ". Кликните по полосе или нажмите пробел ближе к правому краю."] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "duel-bar",
					type: "button",
					disabled: lockedScore != null,
					onPointerDown: (event) => {
						event.preventDefault();
						stop();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { ref: marker })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					ref: readout,
					children: lockedScore ?? 0
				})
			]
		})
	});
}
function JudgePanel({ view, code, seat, onDone, onError }) {
	const players = view.participants.filter((p) => p.role && !p.isObserver);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Судья" }), players.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "score",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				p.nickname,
				" · ",
				roleLabel(p.role),
				" ",
				p.isBot ? `· бот ${p.botDifficulty}` : ""
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "danger",
				type: "button",
				onClick: () => {
					judgeCommand({ data: {
						...creds(code, seat),
						op: "kick",
						targetId: p.id,
						replace: "bot",
						difficulty: p.botDifficulty ?? 2
					} }).then((r) => r.ok ? onDone(r.state) : onError(r.error));
				},
				children: "Заменить ботом"
			})]
		}, p.id))]
	});
}
function ResultsTable({ view }) {
	const results = view.results;
	if (!results) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: [results.teamA, results.teamB].map((team) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
		teamLabel(team.team),
		" · ",
		team.team === view.game.teamA ? results.scoreA : results.scoreB
	] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
		className: "results",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Имя" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Роль" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Взято" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Украдено" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Пасы" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Бладжеры" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Попадания" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Голы" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Сейвы" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Снитчи" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Очки" })
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: team.players.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.nickname }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: roleLabel(p.role) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.pickups }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.steals }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.passes }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.bludgerHits }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.bludgerHitsToPlayers }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.goals }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.saves }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.snitches }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.points })
		] }, p.id)) })]
	})] }, team.team)) });
}
function drawResults(view) {
	const canvas = document.createElement("canvas");
	canvas.width = 1100;
	canvas.height = 760;
	const ctx = canvas.getContext("2d");
	if (!ctx || !view.results) return;
	ctx.fillStyle = "#140e09";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#e0b84a";
	ctx.font = "64px Georgia";
	ctx.fillText("Квиддич", 48, 90);
	ctx.font = "28px sans-serif";
	ctx.fillStyle = "#f4e7c4";
	const title = `${teamLabel(view.game.teamA)} ${view.results.scoreA} : ${view.results.scoreB} ${teamLabel(view.game.teamB)}`;
	ctx.fillText(title, 48, 140);
	let y = 200;
	for (const team of [view.results.teamA, view.results.teamB]) {
		ctx.fillStyle = "#e0b84a";
		ctx.fillText(teamLabel(team.team), 48, y);
		y += 36;
		ctx.fillStyle = "#f4e7c4";
		ctx.font = "20px sans-serif";
		for (const p of team.players) {
			ctx.fillText(`${p.nickname} · ${roleLabel(p.role)} · ${p.points} очк. · голы ${p.goals} · снитчи ${p.snitches}`, 48, y);
			y += 30;
		}
		y += 20;
		ctx.font = "28px sans-serif";
	}
	const a = document.createElement("a");
	a.href = canvas.toDataURL("image/png");
	a.download = `quidditch-${view.game.code}.png`;
	a.click();
}
function logAction() {
	if (typeof window === "undefined") return "/api/quidditch-log";
	return `${previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}/api/quidditch-log`;
}
function snitchProgress(view, team) {
	return view.seekerProgress.find((s) => s.team === team)?.progress ?? 0;
}
var SplitComponent = function Play() {
	const { code } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Room, { code });
};
//#endregion
export { SplitComponent as component };
