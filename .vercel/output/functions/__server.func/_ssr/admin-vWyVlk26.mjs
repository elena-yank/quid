import { o as __toESM } from "../_runtime.mjs";
import { l as teamLabel } from "./types-B0hlOrFm.mjs";
import { S as require_jsx_runtime, Y as require_react, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as listRooms, n as deleteRoom } from "./api-BV6RFtb8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-vWyVlk26.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Admin() {
	const [rooms, setRooms] = (0, import_react.useState)([]);
	async function reload() {
		setRooms(await listRooms());
	}
	(0, import_react.useEffect)(() => {
		reload();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "shell",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "topbar",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Комнаты" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grow" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "ghost",
					style: {
						display: "grid",
						placeItems: "center"
					},
					children: "На главную"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "card form",
			children: [rooms.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Пока нет матчей." }) : null, rooms.map((room) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "score",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
					style: { fontSize: "1.3rem" },
					children: room.code
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "tagline",
					style: { margin: 0 },
					children: [
						teamLabel(room.teamA),
						" ",
						room.scoreA,
						":",
						room.scoreB,
						" ",
						teamLabel(room.teamB),
						" · ход ",
						room.stepNo,
						" · ",
						room.players,
						" уч."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "danger",
					type: "button",
					onClick: () => {
						deleteRoom({ data: { code: room.code } }).then(reload);
					},
					children: "Удалить"
				})]
			}, room.code))]
		})]
	});
}
//#endregion
export { Admin as component };
