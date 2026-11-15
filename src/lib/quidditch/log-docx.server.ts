import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import jpeg from "jpeg-js";
import { BOARD_CELLS } from "./cells.ts";
import { plainEventLine } from "./feed.ts";
import { placePts, SNITCH, snitchFeathersCached } from "./snitch-shape.ts";
import { roleLetter, teamLabel, teamRgb, type GameEvent, type RoleKey, type Snapshot, type TeamKey } from "./types.ts";

const CELLS = new Map(BOARD_CELLS.map((cell) => [cell.coord, cell]));
const DRAW_W = 560;

const GLYPH: Record<string, string[]> = {
  "О": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "В": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "Л": ["00100", "01010", "01010", "10001", "10001", "10001", "10001"],
  "З": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
};

export async function buildLogDocxBuffer(input: {
  code: string;
  teamA: TeamKey;
  teamB: TeamKey;
  snapshots: Snapshot[];
  events: GameEvent[];
  boardJpeg?: Uint8Array | null;
}): Promise<Uint8Array> {
  const names = new Map<string, string>();
  const roles = new Map<string, { nickname: string; role: RoleKey | null }>();
  for (const snap of input.snapshots) {
    for (const player of snap.players) {
      names.set(player.id, player.nickname);
      roles.set(player.id, { nickname: player.nickname, role: player.role });
    }
  }
  const base = rasterBase(input.boardJpeg ?? null);
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`${teamLabel(input.teamA)} — ${teamLabel(input.teamB)} · ${input.code}`)],
    }),
  ];
  if (input.snapshots.length === 0) children.push(new Paragraph("Завершённых ходов пока нет."));
  for (const snap of input.snapshots) {
    const png = drawPitch(base, snap);
    const lines = input.events
      .filter((event) => event.stepNo === snap.stepNo)
      .map((event) => {
        const actor = event.actorId ? roles.get(event.actorId) ?? { nickname: names.get(event.actorId) ?? "Игрок", role: null } : null;
        return plainEventLine(event.kind, actor, event.targetPos, { ...event.meta, bludgerIdx: event.bludgerIdx }, names);
      });
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(`Ход ${snap.stepNo}. Счёт ${snap.scoreA}:${snap.scoreB}`)],
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type: "jpg",
            data: png,
            transformation: { width: 620, height: Math.round((620 * base.height) / base.width) },
            altText: { title: `Ход ${snap.stepNo}`, description: `Поле на ходу ${snap.stepNo}`, name: `step-${snap.stepNo}` },
          }),
        ],
      }),
    );
    if (lines.length === 0) children.push(new Paragraph("Событий не было."));
    else for (const line of lines) children.push(new Paragraph(line));
  }
  const doc = new Document({ sections: [{ children }] });
  return new Uint8Array(await Packer.toBuffer(doc));
}

function rasterBase(boardJpeg: Uint8Array | null): { data: Uint8Array; width: number; height: number } {
  if (boardJpeg && boardJpeg.byteLength > 32) {
    try {
      const decoded = jpeg.decode(boardJpeg, { useTArray: true, formatAsRGBA: true });
      const width = DRAW_W;
      const height = Math.max(1, Math.round((width * decoded.height) / decoded.width));
      return { data: scaleRgba(decoded.data, decoded.width, decoded.height, width, height), width, height };
    } catch {
      /* green field below */
    }
  }
  const width = DRAW_W;
  const height = Math.round((width * 622) / 1000);
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 29;
    data[i + 1] = 77;
    data[i + 2] = 40;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function drawPitch(base: { data: Uint8Array; width: number; height: number }, snap: Snapshot): Uint8Array {
  const data = base.data.slice();
  const { width, height } = base;
  const holder = snap.players.find((player) => player.id === snap.quaffleHolderId);
  if (snap.quafflePos) paintBall(data, width, height, snap.quafflePos, "quaffle");
  for (const pos of snap.bludgers) paintBall(data, width, height, pos, "bludger");
  if (snap.snitchRevealed && snap.snitchPos) paintBall(data, width, height, snap.snitchPos, "snitch");
  for (const player of snap.players) {
    if (!player.pos) continue;
    const color = player.stunned ? ([141, 136, 124] as Rgb) : parseRgb(teamRgb(player.team));
    piece(data, width, height, player.pos, color, roleLetter(player.role), player.id === holder?.id);
  }
  const encoded = jpeg.encode({ data, width, height }, 55);
  return encoded.data;
}

type Rgb = [number, number, number];

function piece(data: Uint8Array, width: number, height: number, coord: string, color: Rgb, letter: string, quaffle: boolean) {
  const at = center(coord, width, height);
  if (!at) return;
  disc(data, width, height, at.x, at.y, at.r + 1.6, [255, 255, 255]);
  disc(data, width, height, at.x, at.y, at.r, color);
  stamp(data, width, height, letter, at.x, at.y + 0.5, letter.length > 1 ? 1 : 2, ink(color));
  if (quaffle) paintBall(data, width, height, coord, "quaffle", at.r * 0.72, at.r * 0.55, 0.62);
}

function disc(data: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number, color: Rgb) {
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * width + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }
}

function paintBall(
  data: Uint8Array,
  width: number,
  height: number,
  coord: string,
  kind: "quaffle" | "bludger" | "snitch",
  dx = 0,
  dy = 0,
  scale = 1,
) {
  const at = center(coord, width, height);
  if (!at) return;
  const cell = at.r / 0.34;
  const x = at.x + dx;
  const y = at.y + dy;
  if (kind === "snitch") {
    paintSnitch(data, width, height, coord, x, y);
    return;
  }
  const radius = Math.max(4, cell * (kind === "bludger" ? 0.2 : 0.26) * scale);
  if (kind === "bludger") {
    disc(data, width, height, x, y, radius, [8, 7, 6]);
    disc(data, width, height, x - radius * 0.32, y - radius * 0.28, Math.max(1.5, radius * 0.32), [186, 182, 174]);
    for (let t = 0; t <= 1; t += 0.1) {
      const wave = Math.sin(t * Math.PI) * radius * 0.22;
      disc(data, width, height, x - radius * 0.85 + t * radius * 1.7, y + radius * 0.08 - wave, Math.max(0.55, radius * 0.07), [0, 0, 0]);
    }
    disc(data, width, height, x + radius * 0.42, y - radius * 0.36, Math.max(0.9, radius * 0.14), [0, 0, 0]);
    disc(data, width, height, x + radius * 0.08, y + radius * 0.32, Math.max(0.75, radius * 0.12), [0, 0, 0]);
    return;
  }
  disc(data, width, height, x, y, radius, [92, 16, 14]);
  disc(data, width, height, x - radius * 0.08, y - radius * 0.06, radius * 0.86, [198, 42, 34]);
  disc(data, width, height, x - radius * 0.3, y - radius * 0.34, Math.max(2, radius * 0.28), [255, 186, 170]);
  dimples(data, width, height, x, y, radius);
}

function paintSnitch(data: Uint8Array, width: number, height: number, coord: string, cx: number, cy: number) {
  const cell = CELLS.get(coord);
  if (!cell) return;
  const x0 = (cell.left / 100) * width;
  const y0 = (cell.top / 100) * height;
  const x1 = ((cell.left + cell.width) / 100) * width;
  const y1 = ((cell.top + cell.height) / 100) * height;
  const scale = Math.min(((x1 - x0) * 0.96) / SNITCH.viewW, ((y1 - y0) * 0.96) / SNITCH.viewH);
  const ox = cx - SNITCH.cx * scale;
  const oy = cy - SNITCH.cy * scale;
  const toPx = (pts: Array<[number, number]>) => pts.map(([px, py]) => [ox + px * scale, oy + py * scale] as [number, number]);
  const wing: Rgb = [244, 241, 234];
  const wingEdge: Rgb = [196, 190, 180];
  const ball: Rgb = [232, 184, 48];
  const deep: Rgb = [154, 104, 18];
  const shine: Rgb = [255, 246, 214];
  for (const side of ["left", "right"] as const) {
    for (const feather of snitchFeathersCached()) {
      const pts = toPx(placePts(feather.spine, side));
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1]!;
        const [bx, by] = pts[i]!;
        const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const px = ax + (bx - ax) * t;
          const py = ay + (by - ay) * t;
          if (px < x0 || py < y0 || px > x1 || py > y1) continue;
          const u = (i - 1 + t) / Math.max(1, pts.length - 1);
          disc(data, width, height, px, py, Math.max(0.55, scale * SNITCH.feather * 0.42), u < 0.35 ? wing : wingEdge);
        }
      }
    }
  }
  const br = Math.max(2.1, SNITCH.ballR * scale);
  const paint = (px: number, py: number, r: number, color: Rgb) => {
    if (px < x0 || py < y0 || px > x1 || py > y1) return;
    disc(data, width, height, px, py, r, color);
  };
  paint(cx, cy, br, deep);
  paint(cx - br * 0.06, cy - br * 0.04, br * 0.78, ball);
  paint(cx - br * 0.28, cy - br * 0.32, Math.max(0.8, br * 0.34), shine);
}

function dimples(data: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number) {
  const holes: Array<[number, number, number]> = [
    [0.0, -0.7, 0.34],
    [-0.55, 0.58, 0.32],
    [0.55, 0.58, 0.32],
  ];
  for (const [ox, oy, size] of holes) {
    const hx = cx + ox * radius;
    const hy = cy + oy * radius;
    const hr = Math.max(1.1, radius * size);
    disc(data, width, height, hx, hy, hr, [92, 18, 18]);
    disc(data, width, height, hx - hr * 0.12, hy - hr * 0.12, hr * 0.62, [48, 10, 12]);
  }
}

function stamp(data: Uint8Array, width: number, height: number, label: string, cx: number, cy: number, scale: number, color: Rgb) {
  const glyphs = [...label].map((ch) => GLYPH[ch]).filter((glyph): glyph is string[] => Boolean(glyph));
  if (!glyphs.length) return;
  const gw = 5;
  const gh = 7;
  const gap = 1;
  const total = glyphs.length * gw + (glyphs.length - 1) * gap;
  let originX = Math.round(cx - (total * scale) / 2);
  const originY = Math.round(cy - (gh * scale) / 2);
  for (const glyph of glyphs) {
    for (let row = 0; row < gh; row++) {
      const bits = glyph[row] ?? "";
      for (let col = 0; col < gw; col++) {
        if (bits[col] !== "1") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
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
    }
    originX += (gw + gap) * scale;
  }
}

function center(coord: string, width: number, height: number) {
  const cell = CELLS.get(coord);
  if (!cell) return null;
  return {
    x: ((cell.left + cell.width / 2) / 100) * width,
    y: ((cell.top + cell.height / 2) / 100) * height,
    r: (cell.width / 100) * width * 0.34,
  };
}

function parseRgb(value: string): Rgb {
  const [r, g, b] = value.split(",").map((part) => Number(part.trim()));
  return [r || 0, g || 0, b || 0];
}

function ink(color: Rgb): Rgb {
  const lum = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2];
  return lum > 170 ? [20, 16, 12] : [255, 255, 255];
}

function scaleRgba(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const dst = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / dw));
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
