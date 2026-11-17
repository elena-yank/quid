import { o as __toESM } from "../_runtime.mjs";
import { c as roleLetter, l as teamLabel, s as roleLabel, u as teamRgb } from "./types-B0hlOrFm.mjs";
import { S as require_jsx_runtime, Y as require_react, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as sendDuel, d as sendPlan, f as sendStart, i as judgeCommand, l as sendLeave, m as syncRoom, p as sendTurn, s as sendChat, u as sendPause } from "./api-BV6RFtb8.mjs";
import { O as stealLocked, _ as isSeeker, c as attackGoals, f as freshTurn, g as isKeeper, h as isChaser, k as validateAction, m as isBeater, n as GOALS_RIGHT, t as GOALS_LEFT, u as chebyshev, v as lineCells, y as listLegalMoves } from "./rules-bQvFd9LH.mjs";
import { t as errorText } from "./errors-D7fKrWdQ.mjs";
import { c as snitchHub, i as placeFeatherPath, n as SNITCH, r as captureFeed, s as snitchFeathersCached, t as BOARD_CELLS } from "./snitch-shape-SbXf0C1L.mjs";
import { a as Copy, i as Moon, n as Sun } from "../_libs/lucide-react.mjs";
import { n as Route, r as previewPathPrefix } from "./router-6_Dx2pvE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/play._code-D6KE4jU5.js
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
function Wing({ side, grad }) {
	const [hx, hy] = snitchHub(side);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", {
		className: `wing ${side}`,
		style: {
			transformBox: "view-box",
			transformOrigin: `${hx / SNITCH.viewW * 100}% ${hy / SNITCH.viewH * 100}%`
		},
		children: snitchFeathersCached().map((feather, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: placeFeatherPath(feather, side),
				fill: "none",
				stroke: "#c5bfb4",
				strokeWidth: SNITCH.feather + .45,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: placeFeatherPath(feather, side),
				fill: "none",
				stroke: `url(#${grad})`,
				strokeWidth: SNITCH.feather,
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: placeFeatherPath(feather, side),
				fill: "none",
				stroke: "#fff",
				strokeWidth: "0.55",
				strokeLinecap: "round",
				opacity: "0.9"
			})
		] }, i))
	});
}
function Ball({ kind, className }) {
	const uid = (0, import_react.useId)().replace(/[^a-zA-Z0-9]/g, "");
	const cls = [
		"ball",
		kind,
		className
	].filter(Boolean).join(" ");
	if (kind === "snitch") {
		const { cx, cy, ballR: r, viewW, viewH } = SNITCH;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			className: cls,
			viewBox: `0 0 ${viewW} ${viewH}`,
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx,
					cy: cy - 1,
					rx: "46",
					ry: "22",
					fill: `url(#${uid}-glow)`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wing, {
					side: "left",
					grad: `${uid}-wing`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wing, {
					side: "right",
					grad: `${uid}-wing`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx,
					cy,
					r,
					fill: `url(#${uid}-gold)`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					clipPath: `url(#${uid}-clip)`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
							cx,
							cy: cy + 1.1,
							rx: r - .4,
							ry: "1.7",
							fill: "none",
							stroke: "#7a5612",
							strokeWidth: "0.55"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
							cx,
							cy: cy + 3.1,
							rx: r - 1.8,
							ry: "1.25",
							fill: "none",
							stroke: "#6e4c10",
							strokeWidth: "0.5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: `M ${cx - 2.3} ${cy + 1.6} v 3.3 M ${cx} ${cy + 1.2} v 4 M ${cx + 2.3} ${cy + 1.6} v 3.3`,
							fill: "none",
							stroke: "#6a480e",
							strokeWidth: "0.55",
							strokeLinecap: "round"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: cx - 2.1,
					cy: cy - 2.5,
					rx: "2.5",
					ry: "1.45",
					fill: "#fff6d4",
					opacity: "0.9"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("radialGradient", {
						id: `${uid}-glow`,
						cx: "50%",
						cy: "50%",
						r: "50%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#ffe7a0",
								stopOpacity: "0.22"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "42%",
								stopColor: "#f0b43a",
								stopOpacity: "0.1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#f0b43a",
								stopOpacity: "0"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("radialGradient", {
						id: `${uid}-gold`,
						cx: "35%",
						cy: "32%",
						r: "75%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#fff6c2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "40%",
								stopColor: "#f0c84a"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#8a5a0e"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: `${uid}-wing`,
						x1: "0",
						y1: "0",
						x2: "0",
						y2: "1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#ffffff"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "55%",
								stopColor: "#f4f1ea"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#d5cfc4"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", {
						id: `${uid}-clip`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx,
							cy,
							r: r - .25
						})
					})
				] })
			]
		});
	}
	if (kind === "bludger") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: cls,
		viewBox: "0 0 32 32",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "16",
				cy: "16",
				r: "14",
				fill: `url(#${uid}-iron)`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: "10.4",
				cy: "11.2",
				rx: "4.6",
				ry: "2.8",
				fill: "#fff",
				opacity: "0.55",
				transform: "rotate(-28 10.4 11.2)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
				clipPath: `url(#${uid}-ironClip)`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M2.2 16.8C6.4 20.4 10.2 19.6 14 15C17.8 10.4 22.4 11.2 29.8 15.2",
						fill: "none",
						stroke: "#d2cdc4",
						strokeWidth: "2.8",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M2.2 17.2C6.4 20.8 10.2 20 14 15.4C17.8 10.8 22.4 11.6 29.8 15.6",
						fill: "none",
						stroke: "#050403",
						strokeWidth: "1.55",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
						cx: "23.4",
						cy: "10.2",
						rx: "2.7",
						ry: "1.9",
						fill: "#050403",
						stroke: "#d2cdc4",
						strokeWidth: "0.7",
						transform: "rotate(-16 23.4 10.2)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
						cx: "22.9",
						cy: "9.8",
						rx: "1.2",
						ry: "0.7",
						fill: "#5c5852",
						transform: "rotate(-16 22.9 9.8)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
						cx: "17.2",
						cy: "21.2",
						rx: "2.45",
						ry: "1.7",
						fill: "#050403",
						stroke: "#d2cdc4",
						strokeWidth: "0.7",
						transform: "rotate(14 17.2 21.2)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
						cx: "16.8",
						cy: "20.8",
						rx: "1.05",
						ry: "0.6",
						fill: "#5c5852",
						transform: "rotate(14 16.8 20.8)"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("radialGradient", {
				id: `${uid}-iron`,
				cx: "32%",
				cy: "30%",
				r: "78%",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0%",
						stopColor: "#4a4642"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "20%",
						stopColor: "#161412"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "100%",
						stopColor: "#050403"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", {
				id: `${uid}-ironClip`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "16",
					cy: "16",
					r: "13.6"
				})
			})] })
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		className: cls,
		viewBox: "0 0 181 176",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("image", {
			href: "/assets/quaffle.png",
			width: "181",
			height: "176"
		})
	});
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
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid",
			children: [BOARD_CELLS.map((cell) => {
				const coord = cell.coord;
				const cls = [
					"cell",
					GOALS.has(coord) ? "gate" : "",
					moveSet.has(coord) ? "target" : "",
					targetSet.has(coord) ? "shot" : "",
					actionTo === coord ? "chosen" : "",
					planned === coord ? "planned" : ""
				].filter(Boolean).join(" ");
				const box = {
					left: `${cell.left}%`,
					top: `${cell.top}%`,
					width: `${cell.width}%`,
					height: `${cell.height}%`
				};
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cls,
					title: coord,
					style: box,
					onClick: () => onCell(coord)
				}, coord);
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "tokens",
				children: BOARD_CELLS.map((cell) => {
					const coord = cell.coord;
					const person = byPos.get(coord);
					const quaffle = view.quaffle.pos === coord;
					const bludger = view.bludgers[0] === coord ? 1 : view.bludgers[1] === coord ? 2 : 0;
					const snitch = view.snitch.revealed && view.snitch.pos === coord;
					if (!person && !quaffle && !bludger && !snitch) return null;
					const box = {
						left: `${cell.left}%`,
						top: `${cell.top}%`,
						width: `${cell.width}%`,
						height: `${cell.height}%`
					};
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "token",
						style: box,
						children: [
							quaffle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ball, { kind: "quaffle" }) : null,
							bludger ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ball, {
								kind: "bludger",
								className: [person ? "on-player" : "", bludger === 2 ? "dart-b" : ""].filter(Boolean).join(" ") || void 0
							}) : null,
							snitch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ball, { kind: "snitch" }) : null,
							person ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `piece${person.id === meId ? " me" : ""}${view.turnStates[person.id]?.stunned ? " stunned" : ""}`,
								style: { background: `rgb(${teamRgb(person.team)})` },
								children: [roleLetter(person.role), view.quaffle.holderId === person.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ball, {
									kind: "quaffle",
									className: "badge"
								}) : null]
							}) : null
						]
					}, coord);
				})
			})]
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
var countdownCtx = null;
function countdownAudio() {
	if (typeof window === "undefined") return null;
	const Ctx = window.AudioContext ?? window.webkitAudioContext;
	if (!Ctx) return null;
	countdownCtx ??= new Ctx();
	return countdownCtx;
}
function tone(ctx, start, freq, peak, dur, type) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	gain.gain.setValueAtTime(1e-4, start);
	gain.gain.exponentialRampToValueAtTime(Math.max(peak, 2e-4), start + .012);
	gain.gain.exponentialRampToValueAtTime(1e-4, start + dur);
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.start(start);
	osc.stop(start + dur + .02);
}
function playTurnTick(second) {
	const ctx = countdownAudio();
	if (!ctx) return;
	if (ctx.state === "suspended") ctx.resume();
	const tension = (5 - Math.max(0, Math.min(5, second))) / 5;
	const now = ctx.currentTime;
	const freq = 360 + tension * 980;
	const peak = .04 + tension * .14;
	const type = tension > .8 ? "square" : tension > .4 ? "triangle" : "sine";
	const pulses = second <= 0 ? 3 : second <= 1 ? 2 : 1;
	for (let i = 0; i < pulses; i++) {
		const start = now + i * (.09 - tension * .02);
		tone(ctx, start, freq * (1 + i * .04), peak, .07 + (1 - tension) * .05, type);
		if (tension > .2) tone(ctx, start, freq * 1.5, peak * (.18 + tension * .25), .05, tension > .6 ? "square" : "triangle");
	}
}
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
	const lastTick = (0, import_react.useRef)("");
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
	(0, import_react.useEffect)(() => {
		setDraft(EMPTY);
		setMoveAt(null);
	}, [view?.game.stepNo]);
	async function finish() {
		if (!view || !me || !seat) return;
		let type = draft.type;
		if (isBeater(me.role)) {
			if (type !== "hit_bludger") type = null;
		} else if (isSeeker(me.role) || !isChaser(me.role) && !isKeeper(me.role)) type = null;
		if (type && needsTarget(type) && !draft.to) type = null;
		const plannedTo = view.turnStates[me.id]?.plannedTo ?? null;
		const to = plannedTo && moves.includes(plannedTo) ? plannedTo : null;
		let actionTo = type ? draft.to : null;
		let actionBludger = type === "hit_bludger" ? draft.bludger : null;
		let actionFirst = type ? chooseFirst(view, me.id, {
			...draft,
			type
		}, to, moveAt) : null;
		if (type && actionOk(view, me.id, {
			to,
			actionFirst,
			actionType: type,
			actionTo,
			actionBludger
		})) {
			type = null;
			actionTo = null;
			actionBludger = null;
			actionFirst = null;
		}
		const plan = {
			to,
			actionType: type,
			actionTo,
			actionBludger,
			actionFirst
		};
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
	const clock = view?.game.paused && view.game.pausedAt != null ? view.game.pausedAt : now + offset.current;
	const remain = view ? Math.max(0, Math.ceil((view.game.stepStartedAt + view.turnMs - clock) / 1e3)) : 0;
	(0, import_react.useEffect)(() => {
		const unlock = () => {
			const ctx = countdownAudio();
			if (ctx?.state === "suspended") ctx.resume();
		};
		window.addEventListener("pointerdown", unlock);
		window.addEventListener("keydown", unlock);
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!view?.game.started || view.game.finished || view.game.paused || remain > 5) return;
		const mark = `${view.game.stepNo}:${remain}`;
		if (lastTick.current === mark) return;
		lastTick.current = mark;
		playTurnTick(remain);
	}, [
		remain,
		view?.game.finished,
		view?.game.paused,
		view?.game.started,
		view?.game.stepNo
	]);
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
							className: "panel actions-panel",
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
										children: (draft.type === "throw" || draft.type === "keeper_pickup") && draft.to ? "Бросить" : "Завершить"
									})]
								}),
								quaffleLockCopy(view, me, locked, turn?.plannedTo ?? null) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Нельзя выхватить квоффл сразу после смены владельца." }) : null,
								draft.type === "steal" && !turn?.plannedTo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Сначала выхват, затем можно выбрать клетку хода." }) : null,
								stealHint(view, me, moves, turn?.plannedTo ?? null) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Чтобы выхватить квоффл, выберите клетку рядом с соперником." }) : null,
								draft.type && needsTarget(draft.type) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: draft.to ? `Цель: ${draft.to}. Нажмите «${draft.type === "throw" || draft.type === "keeper_pickup" ? "Бросить" : "Завершить"}».` : draft.type === "throw" && isChaser(me.role) ? "Выберите подсвеченное кольцо соперника." : draft.type === "keeper_pickup" || draft.type === "throw" && isKeeper(me.role) ? "Выберите клетку, куда бросить квоффл." : "Выберите подсвеченную клетку цели." }) : null
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: "panel",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: { margin: 0 },
								children: me.isObserver ? "Вы наблюдаете." : turn?.stunned ? "Вы оглушены и пропускаете шаг." : turn?.ended ? "Заявка принята." : "Сейчас ходить нельзя."
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "panel events-panel",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "events-head",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "События" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									action: logAction(),
									method: "post",
									onSubmit: (e) => {
										e.preventDefault();
										const popup = window.open("about:blank", "_blank");
										if (!popup) setToast("Разрешите всплывающие окна, чтобы скачать файл");
										else setToast("Собираем лог…");
										const body = new FormData();
										body.set("code", code);
										body.set("participantId", seat.participantId);
										body.set("sessionToken", seat.token);
										fetch(logAction(), {
											method: "POST",
											body
										}).then(async (res) => {
											const blob = await res.blob();
											const name = fileName(res.headers.get("content-disposition")) ?? `quidditch-${code}-log.docx`;
											deliverFile(popup, blob, name);
											setToast("");
										}).catch(() => {
											popup?.close();
											setToast("Не удалось скачать лог");
										});
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
						})
					]
				})]
			}),
			me.isJudge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JudgePanel, {
				view,
				code,
				seat,
				onDone: setView,
				onError: note
			}) : null,
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "primary",
							type: "submit",
							disabled: view.game.finished,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "chat-send-wide",
								children: "Отправить"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "chat-send-tiny",
								children: "Ок"
							})]
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
					className: "results-sheet",
					onClick: (e) => e.stopPropagation(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultsTable, { view }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "results-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "primary",
							type: "button",
							onClick: () => drawResults(view),
							children: "Сохранить как изображение"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "ghost",
							type: "button",
							onClick: () => setShowResults(false),
							children: "Закрыть"
						})]
					})]
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
	return type === "pass" || type === "throw" || type === "hit_bludger" || type === "keeper_pickup";
}
function buttons(view, me, plannedTo) {
	const list = [];
	if (!me.role || !me.pos || !me.side) return list;
	const froms = [me.pos, ...plannedTo && plannedTo !== me.pos ? [plannedTo] : []];
	if (isBeater(me.role)) {
		if (froms.some((from) => view.bludgers.some((b) => chebyshev(from, b) === 1))) list.push({
			type: "hit_bludger",
			label: "Бладжер"
		});
		return list;
	}
	if (isSeeker(me.role)) return list;
	const side = me.side;
	const hold = view.quaffle.holderId === me.id;
	const free = (from) => !view.quaffle.holderId && Boolean(view.quaffle.pos && chebyshev(from, view.quaffle.pos) <= 1);
	if (isChaser(me.role) && froms.some(free)) list.push({
		type: "pickup",
		label: "Взять"
	});
	if (isKeeper(me.role) && froms.some(free)) list.push({
		type: "keeper_pickup",
		label: "Поднять"
	});
	const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
	if ((isChaser(me.role) || isKeeper(me.role)) && holder && holder.side && holder.side !== side && !holder.isObserver && (isChaser(holder.role) || isKeeper(holder.role)) && holder.pos && !quaffleLocked(view) && froms.some((from) => chebyshev(from, holder.pos) <= 1)) list.push({
		type: "steal",
		label: "Выхватить"
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
		label: "Бладжер"
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
	else if (draft.type === "throw" || draft.type === "keeper_pickup") for (const origin of [me.pos, from]) {
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
		className: "judge-bar",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Судья" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "judge-row",
			children: players.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "judge-slot",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						p.isBot && p.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: `team-${p.team}`,
							children: p.nickname
						}) : p.nickname,
						" · ",
						roleLabel(p.role),
						p.isBot ? ` · бот ${p.botDifficulty}` : ""
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "danger",
						type: "button",
						onClick: () => {
							judgeCommand({ data: {
								...creds(code, seat),
								op: "kick",
								targetId: p.id
							} }).then((r) => r.ok ? onDone(r.state) : onError(r.error));
						},
						children: "Кикнуть"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "ghost",
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
					})
				]
			}, p.id))
		})]
	});
}
function ResultsTable({ view }) {
	const results = view.results;
	if (!results) return null;
	const teams = [results.teamA, results.teamB];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: results.winnerTeam ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Победа: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `team-${results.winnerTeam}`,
			children: teamLabel(results.winnerTeam)
		})] }) : "Ничья" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "results-sub",
			children: [
				"Счёт: ",
				results.scoreA,
				" — ",
				results.scoreB,
				" · Ход: ",
				view.game.stepNo
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "results-scroll",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "results",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Имя" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Роль" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Взято",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"квоффлов"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Украдено",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"квоффлов"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Пасы" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Удары по",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"бладжеру"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Попаданий",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"бладжером"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Поймано",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"голов"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", { children: [
						"Поймано",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"снитчей"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Очки" })
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: teams.map((team) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "team",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `team-${team.team}`,
							children: teamLabel(team.team)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {})
					]
				}), team.players.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: `team-${team.team}`,
						title: p.nickname,
						children: p.nickname
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: roleLabel(p.role) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.pickups }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.steals }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.passes }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.bludgerHits }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.bludgerHitsToPlayers }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.goals }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.snitches }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.points })
				] }, p.id))] }, team.team)) })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			className: "results-logo",
			src: "/assets/logo.png",
			alt: ""
		})
	] });
}
function drawResults(view) {
	const popup = window.open("about:blank", "_blank");
	if (!view.results) {
		popup?.close();
		return;
	}
	const paint = (logo) => {
		const blob = renderResults(view, logo);
		if (!blob) {
			popup?.close();
			return;
		}
		deliverFile(popup, blob, `quidditch-${view.game.code}-results.png`);
	};
	const img = new Image();
	img.onload = () => paint(img);
	img.onerror = () => paint(null);
	img.src = `${typeof window === "undefined" ? "" : previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}/assets/logo.png`;
}
function renderResults(view, logo) {
	const results = view.results;
	if (!results) return null;
	const teams = [results.teamA, results.teamB];
	const bodyRows = teams.reduce((sum, team) => sum + 1 + team.players.length, 0);
	const width = 1758;
	const marginX = 31;
	const tableTop = 144;
	const headerH = 84;
	const rowH = 56;
	const tableH = headerH + bodyRows * rowH;
	const logoH = logo ? 130 : 0;
	const height = tableTop + tableH + (logo ? 78 + logoH + 52 : 64);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	const bg = "#101c16";
	const headerBg = "#28332e";
	const teamBg = "#0d1712";
	const line = "#2d3832";
	const ink = "#e7f1ea";
	const sub = "#c7d1ca";
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = ink;
	ctx.textBaseline = "middle";
	ctx.font = "700 40px Manrope, Segoe UI, sans-serif";
	const title = results.winnerTeam ? `Победа: ${teamLabel(results.winnerTeam)}` : "Ничья";
	ctx.fillText(title, marginX, 62);
	ctx.fillStyle = sub;
	ctx.font = "400 22px Manrope, Segoe UI, sans-serif";
	ctx.fillText(`Счёт: ${results.scoreA} — ${results.scoreB} · Ход: ${view.game.stepNo}`, marginX, 104);
	const cols = [
		{
			w: 290,
			head: ["Имя"],
			pick: (p) => p.nickname
		},
		{
			w: 154,
			head: ["Роль"],
			pick: (p) => roleLabel(p.role)
		},
		{
			w: 154,
			head: ["Взято", "квоффлов"],
			pick: (p) => String(p.pickups)
		},
		{
			w: 154,
			head: ["Украдено", "квоффлов"],
			pick: (p) => String(p.steals)
		},
		{
			w: 154,
			head: ["Пасы"],
			pick: (p) => String(p.passes)
		},
		{
			w: 154,
			head: ["Удары по", "бладжеру"],
			pick: (p) => String(p.bludgerHits)
		},
		{
			w: 154,
			head: ["Попаданий", "бладжером"],
			pick: (p) => String(p.bludgerHitsToPlayers)
		},
		{
			w: 154,
			head: ["Поймано", "голов"],
			pick: (p) => String(p.goals)
		},
		{
			w: 154,
			head: ["Поймано", "снитчей"],
			pick: (p) => String(p.snitches)
		},
		{
			w: 154,
			head: ["Очки"],
			pick: (p) => String(p.points)
		}
	];
	const xs = [];
	let x = marginX;
	for (const col of cols) {
		xs.push(x);
		x += col.w;
	}
	const tableRight = x;
	ctx.fillStyle = headerBg;
	ctx.fillRect(marginX, tableTop, tableRight - marginX, headerH);
	let y = 228;
	for (const team of teams) {
		ctx.fillStyle = teamBg;
		ctx.fillRect(marginX, y, tableRight - marginX, rowH);
		y += rowH;
		for (let n = 0; n < team.players.length; n++) {
			ctx.fillStyle = bg;
			ctx.fillRect(marginX, y, tableRight - marginX, rowH);
			y += rowH;
		}
	}
	ctx.strokeStyle = line;
	ctx.lineWidth = 2;
	ctx.beginPath();
	const tableBottom = y;
	for (const px of [...xs, tableRight]) {
		ctx.moveTo(px, tableTop);
		ctx.lineTo(px, tableBottom);
	}
	for (let py = tableTop; py <= tableBottom; py += py === tableTop ? headerH : rowH) {
		ctx.moveTo(marginX, py);
		ctx.lineTo(tableRight, py);
	}
	ctx.stroke();
	cols.forEach((col, i) => {
		ctx.fillStyle = ink;
		ctx.textAlign = "center";
		ctx.font = "700 18px Manrope, Segoe UI, sans-serif";
		const lh = 24;
		const top = 186 - (col.head.length - 1) * lh / 2;
		col.head.forEach((lineText, li) => ctx.fillText(lineText, xs[i] + col.w / 2, top + li * lh));
	});
	y = 228;
	for (const team of teams) {
		ctx.fillStyle = ink;
		ctx.textAlign = "left";
		ctx.font = "700 22px Manrope, Segoe UI, sans-serif";
		ctx.fillText(teamLabel(team.team), xs[0] + 18, y + rowH / 2);
		y += rowH;
		for (const player of team.players) {
			ctx.fillStyle = ink;
			ctx.font = "400 20px Manrope, Segoe UI, sans-serif";
			cols.forEach((col, i) => {
				const text = col.pick(player);
				if (i < 2) {
					ctx.textAlign = "left";
					ctx.fillText(text, xs[i] + 18, y + rowH / 2);
				} else {
					ctx.textAlign = "center";
					ctx.fillText(text, xs[i] + col.w / 2, y + rowH / 2);
				}
			});
			y += rowH;
		}
	}
	if (logo) {
		const logoW = 420;
		const drawH = logoW * (logo.height / logo.width);
		ctx.drawImage(logo, 669, y + 70, logoW, drawH);
	}
	const url = canvas.toDataURL("image/png");
	const bin = atob(url.split(",")[1] ?? "");
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: "image/png" });
}
function deliverFile(popup, blob, filename) {
	const url = URL.createObjectURL(blob);
	const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
	const image = blob.type.startsWith("image/") ? `<img alt="" src="${url}" style="max-width:100%;display:block;margin-top:16px">` : "";
	if (popup && !popup.closed) {
		popup.document.open();
		popup.document.write(`<!doctype html><meta charset="utf-8"><title>${safe}</title><body style="font-family:sans-serif;padding:24px;background:#140e09;color:#f4e7c4"><p><a id="dl" href="${url}" download="${safe}" style="color:#e0b84a">Скачать ${safe}</a></p>${image}</body>`);
		popup.document.close();
		popup.document.getElementById("dl")?.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 12e4);
		return;
	}
	const a = document.createElement("a");
	a.href = url;
	a.download = safe;
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 12e4);
}
function fileName(header) {
	if (!header) return null;
	return /filename="([^"]+)"/.exec(header)?.[1] ?? null;
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
