import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { BOARD_CELLS } from "@/lib/quidditch/cells";
import { plainEventLine } from "@/lib/quidditch/feed";
import { roleLetter, teamLabel, teamRgb, type GameEvent, type RoleKey, type Snapshot, type TeamKey } from "@/lib/quidditch/types";

const CELLS = new Map(BOARD_CELLS.map((cell) => [cell.coord, cell]));

export async function buildLogDocx(input: {
  code: string;
  teamA: TeamKey;
  teamB: TeamKey;
  snapshots: Snapshot[];
  events: GameEvent[];
}): Promise<Blob> {
  const names = new Map<string, string>();
  const roles = new Map<string, { nickname: string; role: RoleKey | null }>();
  for (const snap of input.snapshots) {
    for (const player of snap.players) {
      names.set(player.id, player.nickname);
      roles.set(player.id, { nickname: player.nickname, role: player.role });
    }
  }
  const board = await loadBoard().catch(() => null);
  const width = 900;
  const ratio = board && board.naturalWidth > 0 ? board.naturalHeight / board.naturalWidth : 583 / 938;
  const height = Math.max(1, Math.round(width * ratio));
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`${teamLabel(input.teamA)} — ${teamLabel(input.teamB)} · ${input.code}`)],
    }),
  ];
  if (input.snapshots.length === 0) {
    children.push(new Paragraph("Завершённых ходов пока нет."));
  }
  for (const snap of input.snapshots) {
    const png = await drawPitch(board, snap, width, height);
    const lines = input.events
      .filter((event) => event.stepNo === snap.stepNo)
      .map((event) => describeEvent(event, names, roles));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(`Ход ${snap.stepNo}. Счёт ${snap.scoreA}:${snap.scoreB}`)],
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: png,
            transformation: { width: 620, height: Math.round((620 * height) / width) },
            altText: { title: `Ход ${snap.stepNo}`, description: `Поле на ходу ${snap.stepNo}`, name: `step-${snap.stepNo}` },
          }),
        ],
      }),
    );
    if (lines.length === 0) children.push(new Paragraph("Событий не было."));
    else for (const line of lines) children.push(new Paragraph(line));
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

function describeEvent(
  event: GameEvent,
  names: Map<string, string>,
  roles: Map<string, { nickname: string; role: RoleKey | null }>,
): string {
  const actor = event.actorId ? roles.get(event.actorId) ?? { nickname: names.get(event.actorId) ?? "Игрок", role: null } : null;
  return plainEventLine(event.kind, actor, event.targetPos, { ...event.meta, bludgerIdx: event.bludgerIdx }, names);
}

function loadBoard(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => reject(new Error("board")), 8000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("board"));
    };
    image.src = "/assets/board-log.jpg";
  });
}

async function drawPitch(board: HTMLImageElement | null, snap: Snapshot, width: number, height: number): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array();
  if (board) ctx.drawImage(board, 0, 0, width, height);
  else {
    ctx.fillStyle = "#1d4d28";
    ctx.fillRect(0, 0, width, height);
  }
  const holder = snap.players.find((player) => player.id === snap.quaffleHolderId);
  if (snap.quafflePos) ball(ctx, snap.quafflePos, width, height, "#c44536", 0.28);
  for (const pos of snap.bludgers) ball(ctx, pos, width, height, "#1a120c", 0.3);
  if (snap.snitchRevealed && snap.snitchPos) ball(ctx, snap.snitchPos, width, height, "#e0b84a", 0.24);
  for (const player of snap.players) {
    if (!player.pos) continue;
    piece(
      ctx,
      player.pos,
      width,
      height,
      player.stunned ? "#8d887c" : `rgb(${teamRgb(player.team)})`,
      roleLetter(player.role),
      player.id === holder?.id,
    );
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await (blob ?? new Blob()).arrayBuffer());
}

function piece(ctx: CanvasRenderingContext2D, coord: string, width: number, height: number, color: string, letter: string, quaffle: boolean) {
  const at = center(coord, width, height);
  if (!at) return;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(at.x, at.y, at.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.max(10, Math.round(at.r * 0.72))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, at.x, at.y + 1);
  if (quaffle) ball(ctx, coord, width, height, "#c44536", 0.16, at.r * 0.72, at.r * 0.55);
}

function ball(ctx: CanvasRenderingContext2D, coord: string, width: number, height: number, color: string, scale: number, dx = 0, dy = 0) {
  const at = center(coord, width, height);
  if (!at) return;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(at.x + dx, at.y + dy, Math.max(5, at.r * scale), 0, Math.PI * 2);
  ctx.fill();
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
