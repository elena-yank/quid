import { o as __toESM } from "../_runtime.mjs";
import { c as roleLetter, l as teamLabel, u as teamRgb } from "./types-B0hlOrFm.mjs";
import { fetchLogs } from "./api.server-C0fG20zQ.mjs";
import { t as errorText } from "./errors-D7fKrWdQ.mjs";
import { a as placePts, n as SNITCH, o as plainEventLine, s as snitchFeathersCached, t as BOARD_CELLS } from "./snitch-shape-SbXf0C1L.mjs";
import { a as Paragraph, i as Packer, n as HeadingLevel, o as TextRun, r as ImageRun, t as File } from "../_libs/docx.mjs";
import { t as require_jpeg_js } from "../_libs/jpeg-js.mjs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
//#region node_modules/.nitro/vite/services/ssr/assets/log-download.server-CsUvZlav.js
var import_jpeg_js = /* @__PURE__ */ __toESM(require_jpeg_js());
var CELLS = new Map(BOARD_CELLS.map((cell) => [cell.coord, cell]));
var DRAW_W = 560;
var GLYPH = {
	"О": [
		"01110",
		"10001",
		"10001",
		"10001",
		"10001",
		"10001",
		"01110"
	],
	"1": [
		"00100",
		"01100",
		"00100",
		"00100",
		"00100",
		"00100",
		"01110"
	],
	"2": [
		"01110",
		"10001",
		"00001",
		"00110",
		"01000",
		"10000",
		"11111"
	],
	"В": [
		"11110",
		"10001",
		"10001",
		"11110",
		"10001",
		"10001",
		"11110"
	],
	"Л": [
		"00100",
		"01010",
		"01010",
		"10001",
		"10001",
		"10001",
		"10001"
	],
	"З": [
		"11110",
		"00001",
		"00001",
		"01110",
		"00001",
		"00001",
		"11110"
	]
};
async function buildLogDocxBuffer(input) {
	const names = /* @__PURE__ */ new Map();
	const roles = /* @__PURE__ */ new Map();
	for (const snap of input.snapshots) for (const player of snap.players) {
		names.set(player.id, player.nickname);
		roles.set(player.id, {
			nickname: player.nickname,
			role: player.role
		});
	}
	const base = rasterBase(input.boardJpeg ?? null);
	const children = [new Paragraph({
		heading: HeadingLevel.HEADING_1,
		children: [new TextRun(`${teamLabel(input.teamA)} — ${teamLabel(input.teamB)} · ${input.code}`)]
	})];
	if (input.snapshots.length === 0) children.push(new Paragraph("Завершённых ходов пока нет."));
	for (const snap of input.snapshots) {
		const png = drawPitch(base, snap);
		const lines = input.events.filter((event) => event.stepNo === snap.stepNo).map((event) => {
			const actor = event.actorId ? roles.get(event.actorId) ?? {
				nickname: names.get(event.actorId) ?? "Игрок",
				role: null
			} : null;
			return plainEventLine(event.kind, actor, event.targetPos, {
				...event.meta,
				bludgerIdx: event.bludgerIdx
			}, names);
		});
		children.push(new Paragraph({
			heading: HeadingLevel.HEADING_2,
			children: [new TextRun(`Ход ${snap.stepNo}. Счёт ${snap.scoreA}:${snap.scoreB}`)]
		}), new Paragraph({ children: [new ImageRun({
			type: "jpg",
			data: png,
			transformation: {
				width: 620,
				height: Math.round(620 * base.height / base.width)
			},
			altText: {
				title: `Ход ${snap.stepNo}`,
				description: `Поле на ходу ${snap.stepNo}`,
				name: `step-${snap.stepNo}`
			}
		})] }));
		if (lines.length === 0) children.push(new Paragraph("Событий не было."));
		else for (const line of lines) children.push(new Paragraph(line));
	}
	const doc = new File({ sections: [{ children }] });
	return new Uint8Array(await Packer.toBuffer(doc));
}
function rasterBase(boardJpeg) {
	if (boardJpeg && boardJpeg.byteLength > 32) try {
		const decoded = import_jpeg_js.default.decode(boardJpeg, {
			useTArray: true,
			formatAsRGBA: true
		});
		const width = DRAW_W;
		const height = Math.max(1, Math.round(width * decoded.height / decoded.width));
		return {
			data: scaleRgba(decoded.data, decoded.width, decoded.height, width, height),
			width,
			height
		};
	} catch {}
	const width = DRAW_W;
	const height = Math.round(width * 622 / 1e3);
	const data = new Uint8Array(width * height * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 29;
		data[i + 1] = 77;
		data[i + 2] = 40;
		data[i + 3] = 255;
	}
	return {
		data,
		width,
		height
	};
}
function drawPitch(base, snap) {
	const data = base.data.slice();
	const { width, height } = base;
	const holder = snap.players.find((player) => player.id === snap.quaffleHolderId);
	if (snap.quafflePos) paintBall(data, width, height, snap.quafflePos, "quaffle");
	for (const pos of snap.bludgers) paintBall(data, width, height, pos, "bludger");
	if (snap.snitchRevealed && snap.snitchPos) paintBall(data, width, height, snap.snitchPos, "snitch");
	for (const player of snap.players) {
		if (!player.pos) continue;
		const color = player.stunned ? [
			141,
			136,
			124
		] : parseRgb(teamRgb(player.team));
		piece(data, width, height, player.pos, color, roleLetter(player.role), player.id === holder?.id);
	}
	return import_jpeg_js.default.encode({
		data,
		width,
		height
	}, 55).data;
}
function piece(data, width, height, coord, color, letter, quaffle) {
	const at = center(coord, width, height);
	if (!at) return;
	disc(data, width, height, at.x, at.y, at.r + 1.6, [
		255,
		255,
		255
	]);
	disc(data, width, height, at.x, at.y, at.r, color);
	stamp(data, width, height, letter, at.x, at.y + .5, letter.length > 1 ? 1 : 2, ink(color));
	if (quaffle) paintBall(data, width, height, coord, "quaffle", at.r * .72, at.r * .55, .62);
}
function disc(data, width, height, cx, cy, radius, color) {
	const r2 = radius * radius;
	const x0 = Math.max(0, Math.floor(cx - radius));
	const x1 = Math.min(width - 1, Math.ceil(cx + radius));
	const y0 = Math.max(0, Math.floor(cy - radius));
	const y1 = Math.min(height - 1, Math.ceil(cy + radius));
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
		const dx = x + .5 - cx;
		const dy = y + .5 - cy;
		if (dx * dx + dy * dy > r2) continue;
		const i = (y * width + x) * 4;
		data[i] = color[0];
		data[i + 1] = color[1];
		data[i + 2] = color[2];
		data[i + 3] = 255;
	}
}
function paintBall(data, width, height, coord, kind, dx = 0, dy = 0, scale = 1) {
	const at = center(coord, width, height);
	if (!at) return;
	const cell = at.r / .34;
	const x = at.x + dx;
	const y = at.y + dy;
	if (kind === "snitch") {
		paintSnitch(data, width, height, coord, x, y);
		return;
	}
	const radius = Math.max(4, cell * (kind === "bludger" ? .2 : .26) * scale);
	if (kind === "bludger") {
		disc(data, width, height, x, y, radius, [
			8,
			7,
			6
		]);
		disc(data, width, height, x - radius * .32, y - radius * .28, Math.max(1.5, radius * .32), [
			186,
			182,
			174
		]);
		for (let t = 0; t <= 1; t += .1) {
			const wave = Math.sin(t * Math.PI) * radius * .22;
			disc(data, width, height, x - radius * .85 + t * radius * 1.7, y + radius * .08 - wave, Math.max(.55, radius * .07), [
				0,
				0,
				0
			]);
		}
		disc(data, width, height, x + radius * .42, y - radius * .36, Math.max(.9, radius * .14), [
			0,
			0,
			0
		]);
		disc(data, width, height, x + radius * .08, y + radius * .32, Math.max(.75, radius * .12), [
			0,
			0,
			0
		]);
		return;
	}
	disc(data, width, height, x, y, radius, [
		92,
		16,
		14
	]);
	disc(data, width, height, x - radius * .08, y - radius * .06, radius * .86, [
		198,
		42,
		34
	]);
	disc(data, width, height, x - radius * .3, y - radius * .34, Math.max(2, radius * .28), [
		255,
		186,
		170
	]);
	dimples(data, width, height, x, y, radius);
}
function paintSnitch(data, width, height, coord, cx, cy) {
	const cell = CELLS.get(coord);
	if (!cell) return;
	const x0 = cell.left / 100 * width;
	const y0 = cell.top / 100 * height;
	const x1 = (cell.left + cell.width) / 100 * width;
	const y1 = (cell.top + cell.height) / 100 * height;
	const scale = Math.min((x1 - x0) * .96 / SNITCH.viewW, (y1 - y0) * .96 / SNITCH.viewH);
	const ox = cx - SNITCH.cx * scale;
	const oy = cy - SNITCH.cy * scale;
	const toPx = (pts) => pts.map(([px, py]) => [ox + px * scale, oy + py * scale]);
	const wing = [
		244,
		241,
		234
	];
	const wingEdge = [
		196,
		190,
		180
	];
	const ball = [
		232,
		184,
		48
	];
	const deep = [
		154,
		104,
		18
	];
	const shine = [
		255,
		246,
		214
	];
	for (const side of ["left", "right"]) for (const feather of snitchFeathersCached()) {
		const pts = toPx(placePts(feather.spine, side));
		for (let i = 1; i < pts.length; i++) {
			const [ax, ay] = pts[i - 1];
			const [bx, by] = pts[i];
			const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
			for (let s = 0; s <= steps; s++) {
				const t = s / steps;
				const px = ax + (bx - ax) * t;
				const py = ay + (by - ay) * t;
				if (px < x0 || py < y0 || px > x1 || py > y1) continue;
				const u = (i - 1 + t) / Math.max(1, pts.length - 1);
				disc(data, width, height, px, py, Math.max(.55, scale * SNITCH.feather * .42), u < .35 ? wing : wingEdge);
			}
		}
	}
	const br = Math.max(2.1, SNITCH.ballR * scale);
	const paint = (px, py, r, color) => {
		if (px < x0 || py < y0 || px > x1 || py > y1) return;
		disc(data, width, height, px, py, r, color);
	};
	paint(cx, cy, br, deep);
	paint(cx - br * .06, cy - br * .04, br * .78, ball);
	paint(cx - br * .28, cy - br * .32, Math.max(.8, br * .34), shine);
}
function dimples(data, width, height, cx, cy, radius) {
	for (const [ox, oy, size] of [
		[
			0,
			-.7,
			.34
		],
		[
			-.55,
			.58,
			.32
		],
		[
			.55,
			.58,
			.32
		]
	]) {
		const hx = cx + ox * radius;
		const hy = cy + oy * radius;
		const hr = Math.max(1.1, radius * size);
		disc(data, width, height, hx, hy, hr, [
			92,
			18,
			18
		]);
		disc(data, width, height, hx - hr * .12, hy - hr * .12, hr * .62, [
			48,
			10,
			12
		]);
	}
}
function stamp(data, width, height, label, cx, cy, scale, color) {
	const glyphs = [...label].map((ch) => GLYPH[ch]).filter((glyph) => Boolean(glyph));
	if (!glyphs.length) return;
	const gw = 5;
	const gh = 7;
	const total = glyphs.length * gw + (glyphs.length - 1) * 1;
	let originX = Math.round(cx - total * scale / 2);
	const originY = Math.round(cy - gh * scale / 2);
	for (const glyph of glyphs) {
		for (let row = 0; row < gh; row++) {
			const bits = glyph[row] ?? "";
			for (let col = 0; col < gw; col++) {
				if (bits[col] !== "1") continue;
				for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
					const x = originX + col * scale + dx;
					const y = originY + row * scale + dy;
					if (x < 0 || y < 0 || x >= width || y >= height) continue;
					const i = (y * width + x) * 4;
					data[i] = color[0];
					data[i + 1] = color[1];
					data[i + 2] = color[2];
				}
			}
		}
		originX += 6 * scale;
	}
}
function center(coord, width, height) {
	const cell = CELLS.get(coord);
	if (!cell) return null;
	return {
		x: (cell.left + cell.width / 2) / 100 * width,
		y: (cell.top + cell.height / 2) / 100 * height,
		r: cell.width / 100 * width * .34
	};
}
function parseRgb(value) {
	const [r, g, b] = value.split(",").map((part) => Number(part.trim()));
	return [
		r || 0,
		g || 0,
		b || 0
	];
}
function ink(color) {
	return .3 * color[0] + .59 * color[1] + .11 * color[2] > 170 ? [
		20,
		16,
		12
	] : [
		255,
		255,
		255
	];
}
function scaleRgba(src, sw, sh, dw, dh) {
	const dst = new Uint8Array(dw * dh * 4);
	for (let y = 0; y < dh; y++) {
		const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
		for (let x = 0; x < dw; x++) {
			const sx = Math.min(sw - 1, Math.floor(x * sw / dw));
			const si = (sy * sw + sx) * 4;
			const di = (y * dw + x) * 4;
			dst[di] = src[si] ?? 0;
			dst[di + 1] = src[si + 1] ?? 0;
			dst[di + 2] = src[si + 2] ?? 0;
			dst[di + 3] = 255;
		}
	}
	return dst;
}
var DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
async function downloadLog(request) {
	let code = "";
	let participantId = "";
	let sessionToken = "";
	try {
		const form = await request.formData();
		code = String(form.get("code") ?? "");
		participantId = String(form.get("participantId") ?? "");
		sessionToken = String(form.get("sessionToken") ?? "");
	} catch {
		return textAttachment("Не удалось прочитать запрос", "quidditch-log.txt");
	}
	const safe = code.toUpperCase().replace(/[^A-Z0-9]/g, "") || "LOG";
	const filename = `quidditch-${safe}-log.docx`;
	try {
		const logs = await fetchLogs({
			code,
			participantId,
			sessionToken
		});
		if (!logs.ok) return textAttachment(errorText(logs.error), `quidditch-${safe}-log.txt`);
		return fileAttachment(await buildLogDocxBuffer({
			code: logs.code,
			teamA: logs.results.teamA.team,
			teamB: logs.results.teamB.team,
			snapshots: logs.snapshots,
			events: logs.events,
			boardJpeg: await readBoard(request)
		}), filename, DOCX);
	} catch {
		return textAttachment("Не удалось собрать лог", `quidditch-${safe}-log.txt`);
	}
}
async function readBoard(request) {
	const candidates = [join(process.cwd(), "public/assets/board-log.jpg")];
	for (const path of candidates) try {
		return new Uint8Array(await readFile(path));
	} catch {}
	try {
		const url = new URL("/assets/board-log.jpg", request.url);
		const res = await fetch(url);
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	} catch {
		return null;
	}
}
function fileAttachment(body, filename, type) {
	const copy = new Uint8Array(body.byteLength);
	copy.set(body);
	return new Response(copy, { headers: {
		"content-type": type,
		"content-disposition": `attachment; filename="${filename}"`,
		"cache-control": "no-store",
		"x-content-type-options": "nosniff"
	} });
}
function textAttachment(text, filename) {
	return fileAttachment(new TextEncoder().encode(text), filename, "text/plain; charset=utf-8");
}
//#endregion
export { downloadLog };
