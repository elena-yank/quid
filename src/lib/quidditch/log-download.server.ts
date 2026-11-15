import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchLogs } from "./api.server.ts";
import { errorText } from "./errors.ts";
import { buildLogDocxBuffer } from "./log-docx.server.ts";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function downloadLog(request: Request): Promise<Response> {
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
    const logs = await fetchLogs({ code, participantId, sessionToken });
    if (!logs.ok) return textAttachment(errorText(logs.error), `quidditch-${safe}-log.txt`);
    const bytes = await buildLogDocxBuffer({
      code: logs.code,
      teamA: logs.results.teamA.team,
      teamB: logs.results.teamB.team,
      snapshots: logs.snapshots,
      events: logs.events,
      boardJpeg: await readBoard(request),
    });
    return fileAttachment(bytes, filename, DOCX);
  } catch {
    return textAttachment("Не удалось собрать лог", `quidditch-${safe}-log.txt`);
  }
}

async function readBoard(request: Request): Promise<Uint8Array | null> {
  const candidates = [join(process.cwd(), "public/assets/board-log.jpg")];
  for (const path of candidates) {
    try {
      return new Uint8Array(await readFile(path));
    } catch {
      /* try the public url */
    }
  }
  try {
    const url = new URL("/assets/board-log.jpg", request.url);
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function fileAttachment(body: Uint8Array, filename: string, type: string) {
  const copy = new Uint8Array(body.byteLength);
  copy.set(body);
  return new Response(copy, {
    headers: {
      "content-type": type,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function textAttachment(text: string, filename: string) {
  return fileAttachment(new TextEncoder().encode(text), filename, "text/plain; charset=utf-8");
}
