import { o as __toESM } from "../_runtime.mjs";
import { n as ROLES, r as TEAMS, t as BOT_DIFFICULTIES } from "./types-B0hlOrFm.mjs";
import { S as require_jsx_runtime, Y as require_react, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as lobby, r as joinRoom, t as createRoom } from "./api-BV6RFtb8.mjs";
import { t as errorText } from "./errors-D7fKrWdQ.mjs";
import { r as Settings } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Tg1kn1Nh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var NEXT_TEAM = {
	gryffindor: "hufflepuff",
	hufflepuff: "ravenclaw",
	ravenclaw: "slytherin",
	slytherin: "gryffindor"
};
function teamLabel(key) {
	return TEAMS.find((t) => t.key === key)?.label ?? key;
}
function saveSeat(code, participantId, token) {
	const seat = JSON.stringify({
		code,
		participantId,
		token
	});
	sessionStorage.setItem("quidditch.seat", seat);
	localStorage.setItem(`quidditch.seat.${code}`, seat);
}
function Home() {
	const navigate = useNavigate();
	const [tab, setTab] = (0, import_react.useState)("create");
	const [teamA, setTeamA] = (0, import_react.useState)("gryffindor");
	const [teamB, setTeamB] = (0, import_react.useState)("hufflepuff");
	const [team, setTeam] = (0, import_react.useState)("gryffindor");
	const [role, setRole] = (0, import_react.useState)("chaser1");
	const [name, setName] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [fill, setFill] = (0, import_react.useState)(false);
	const [difficulty, setDifficulty] = (0, import_react.useState)(2);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [menu, setMenu] = (0, import_react.useState)(false);
	const [light, setLight] = (0, import_react.useState)(false);
	const [taken, setTaken] = (0, import_react.useState)([]);
	const [loaded, setLoaded] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const next = localStorage.getItem("quidditch.theme") === "light";
		setLight(next);
		document.documentElement.dataset.theme = next ? "light" : "dark";
	}, []);
	function toggleTheme() {
		const next = !light;
		setLight(next);
		document.documentElement.dataset.theme = next ? "light" : "dark";
		localStorage.setItem("quidditch.theme", next ? "light" : "dark");
	}
	function pickA(value) {
		setTeamA(value);
		const other = value === teamB ? NEXT_TEAM[value] : teamB;
		if (other !== teamB) setTeamB(other);
		setTeam((current) => current === value || current === other ? current : value);
	}
	function pickB(value) {
		setTeamB(value);
		const other = value === teamA ? NEXT_TEAM[value] : teamA;
		if (other !== teamA) setTeamA(other);
		setTeam((current) => current === value || current === other ? current : value);
	}
	async function enter(result) {
		if (!result.ok || !result.code || !result.participantId || !result.sessionToken) {
			setError(errorText(result.error));
			return;
		}
		saveSeat(result.code, result.participantId, result.sessionToken);
		await navigate({
			to: "/play/$code",
			params: { code: result.code }
		});
	}
	async function onCreate(judge) {
		setBusy(true);
		setError("");
		try {
			await enter(await createRoom({ data: {
				teamA,
				teamB,
				nickname: name,
				team,
				role,
				fillBots: fill,
				difficulty,
				judge
			} }));
		} catch {
			setError("Не удалось создать комнату");
		} finally {
			setBusy(false);
		}
	}
	async function loadLobby() {
		setBusy(true);
		setError("");
		try {
			const result = await lobby({ data: { code } });
			if (!result.ok || !result.teamA || !result.teamB) {
				setLoaded(null);
				setError(errorText(result.error));
				return;
			}
			setLoaded({
				teamA: result.teamA,
				teamB: result.teamB
			});
			setTeam(result.teamA);
			setTaken(result.taken ?? []);
		} finally {
			setBusy(false);
		}
	}
	async function onJoin(observer, force = false) {
		setBusy(true);
		setError("");
		try {
			const result = await joinRoom({ data: {
				code,
				nickname: name,
				team,
				role,
				mode: observer ? "observer" : "player",
				force
			} });
			if (!result.ok && result.error === "role_taken" && !force) {
				if (window.confirm("Роль занята. Занять её вместо текущего игрока?")) await onJoin(false, true);
				return;
			}
			await enter(result);
		} catch {
			setError("Не удалось войти");
		} finally {
			setBusy(false);
		}
	}
	const creating = tab === "create" || tab === "judge";
	const submit = tab === "watch" ? "Наблюдать" : tab === "join" ? "Присоединиться" : "Создать и войти";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "lobby",
		children: [
			menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "lobby-scrim",
				type: "button",
				"aria-label": "Закрыть меню",
				onClick: () => setMenu(false)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "lobby-gear",
				type: "button",
				"aria-label": "Настройки",
				"aria-expanded": menu,
				onClick: () => setMenu((open) => !open),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
					size: 18,
					strokeWidth: 1.75
				})
			}),
			menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lobby-menu",
				role: "menu",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					onClick: toggleTheme,
					children: light ? "Тёмная тема" : "Светлая тема"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					onClick: () => {
						setTab("judge");
						setMenu(false);
						setError("");
					},
					children: "Комната судьи"
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "hero",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "hero-logo",
					href: "https://vk.ru/magichogwarts_school",
					target: "_blank",
					rel: "noreferrer",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/assets/logo-mark.png",
						alt: "Мир Гарри Поттера — Квиддич"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "lobby-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lobby-tabs",
					role: "tablist",
					children: [
						["create", "Создать"],
						["join", "Присоединиться"],
						["watch", "Наблюдать"]
					].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": tab === id || id === "create" && tab === "judge",
						onClick: () => {
							setTab(id);
							setError("");
						},
						children: label
					}, id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "lobby-form",
					onSubmit: (e) => {
						e.preventDefault();
						if (tab === "create") onCreate(false);
						else if (tab === "judge") onCreate(true);
						else if (tab === "watch") onJoin(true);
						else onJoin(false);
					},
					children: [
						tab === "judge" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "lobby-note",
							children: ["Комната судьи. Вы наблюдаете и ведёте матч.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setTab("create"),
								children: "Обычный матч"
							})]
						}) : null,
						tab === "watch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							className: "watch-art",
							src: "/assets/spectating.png",
							alt: "Трибуны стадиона"
						}) : null,
						creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lobby-split",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Команда A", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamSelect, {
								value: teamA,
								onChange: pickA
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Команда B", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamSelect, {
								value: teamB,
								onChange: pickB
							})] })]
						}) : null,
						tab === "join" || tab === "watch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "lobby-block",
							children: ["Код комнаты", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: code,
								onChange: (e) => {
									setCode(e.target.value.toUpperCase());
									setLoaded(null);
									setTaken([]);
								},
								maxLength: 6,
								placeholder: "например, K7M2QP",
								autoCapitalize: "characters"
							})]
						}) : null,
						tab === "join" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "lobby-quiet",
							type: "button",
							disabled: busy,
							onClick: () => void loadLobby(),
							children: "Загрузить команды"
						}) : null,
						tab === "join" && loaded ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lobby-split",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Команда", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: team,
								onChange: (e) => setTeam(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: loaded.teamA,
									children: teamLabel(loaded.teamA)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: loaded.teamB,
									children: teamLabel(loaded.teamB)
								})]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Роль", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleSelect, {
								value: role,
								onChange: setRole
							})] })]
						}) : null,
						tab === "join" && taken.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "lobby-note",
							children: ["Занято: ", taken.map((t) => `${t.nickname}${t.isBot ? " (бот)" : ""}`).join(", ")]
						}) : null,
						tab === "create" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lobby-split",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Моя команда", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: team,
								onChange: (e) => setTeam(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: teamA,
									children: teamLabel(teamA)
								}), teamB !== teamA ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: teamB,
									children: teamLabel(teamB)
								}) : null]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Роль", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleSelect, {
								value: role,
								onChange: setRole
							})] })]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "lobby-block",
							children: ["Имя", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: name,
								onChange: (e) => setName(e.target.value),
								maxLength: 24,
								placeholder: "например, Гарри"
							})]
						}),
						creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lobby-split",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Боты в пустые места", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: fill ? "yes" : "no",
								onChange: (e) => setFill(e.target.value === "yes"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "no",
									children: "нет"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "yes",
									children: "да"
								})]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Сложность ботов", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: difficulty,
								onChange: (e) => setDifficulty(Number(e.target.value)),
								children: BOT_DIFFICULTIES.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: d.level,
									children: d.label
								}, d.level))
							})] })]
						}) : null,
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "lobby-error",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "lobby-submit",
							type: "submit",
							disabled: busy,
							children: submit
						})
					]
				})]
			})
		]
	});
}
function TeamSelect({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		value,
		onChange: (e) => onChange(e.target.value),
		children: TEAMS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: t.key,
			children: t.label
		}, t.key))
	});
}
function RoleSelect({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		value,
		onChange: (e) => onChange(e.target.value),
		children: ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: r.key,
			children: r.label
		}, r.key))
	});
}
var SplitComponent = Home;
//#endregion
export { SplitComponent as component };
