import { teamLabel, type Counters, type RoleKey, type TeamKey } from "@/lib/quidditch/types";
import { MESSAGES, type MessageKey } from "@/lib/quidditch/messages";

const FALLBACK: Record<MessageKey, string> = {
  free_quaffle_pickup: "[Имя игрока] подбирает квоффл!",
  quaffle_pass: "[Имя игрока делающего пас] отдаёт пас!",
  quaffle_steal: "[Имя игрока] выхватывает квоффл!",
  bludger_hit: "[Имя игрока] бьёт по бладжеру!",
  bludger_stun: "[Имя игрока] оглушён бладжером!",
  snitch_reveal: "Снитч обнаружен!",
  snitch_hide: "Снитч снова скрылся!",
  goal_scored: "Гол! [Имя игрока] не успевает!",
};

const ROLE_LETTER: Record<string, string> = {
  keeper: "В",
  seeker: "Л",
  chaser1: "О1",
  chaser2: "О2",
  beater: "З",
};

export type FeedPerson = {
  id: string;
  nickname: string;
  team: TeamKey;
  role: RoleKey | null;
  isObserver?: boolean;
};

export type FeedSnap = {
  code: string;
  counters: Counters;
  participants: FeedPerson[];
  holderId: string | null;
  snitchRevealed: boolean;
  snitchCaughtById: string | null;
  events: { id: string; kind: string; actorId: string | null }[];
  duel: { kind: string; attackerId: string | null; defenderId: string | null; winnerId: string | null } | null;
};

const orderCache = new Map<string, number[]>();

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickMessageByOccurrence(roomCode: string, key: MessageKey, occurrenceNo: number): string {
  const pool = MESSAGES[key];
  const fallback = FALLBACK[key];
  if (!pool.length) return fallback;
  const idx0 = occurrenceNo > 0 ? occurrenceNo - 1 : 0;
  const cycle = Math.floor(idx0 / pool.length);
  const pos = idx0 % pool.length;
  const cacheKey = `${roomCode}|${key}|${pool.length}|${cycle}`;
  let order = orderCache.get(cacheKey);
  if (!order) {
    order = pool.map((_, index) => index);
    const rand = mulberry32(fnv1a(cacheKey));
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const swap = order[i];
      order[i] = order[j] ?? i;
      order[j] = swap ?? j;
    }
    orderCache.set(cacheKey, order);
  }
  return pool[order[pos] ?? 0] ?? fallback;
}

export function pickRandomMessage(key: MessageKey, rng: () => number = Math.random): string {
  const pool = MESSAGES[key];
  if (!pool.length) return FALLBACK[key];
  return pool[Math.floor(rng() * pool.length)] ?? FALLBACK[key];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&\u0061mp;")
    .replace(/</g, "&\u006ct;")
    .replace(/>/g, "&\u0067t;")
    .replace(/"/g, "&\u0071uot;")
    .replace(/'/g, "&\u002339;");
}

export function personHtml(person: FeedPerson): string {
  const role = person.role ? ROLE_LETTER[person.role] : "";
  const label = role && !person.isObserver ? `${person.nickname} (${role})` : person.nickname;
  return `<span class="eventName team-${person.team}">${escapeHtml(label)}</span>`;
}

function fill(template: string, names: { actor?: string; passer?: string; catcher?: string; team?: string }): string {
  return template
    .replaceAll("[Имя игрока делающего пас]", names.passer ?? "")
    .replaceAll("[Имя игрока принимающего пас]", names.catcher ?? "")
    .replaceAll("[Имя игркока принимающего пас]", names.catcher ?? "")
    .replaceAll("[Имя игррка]", names.actor ?? "")
    .replaceAll("[Имя игрока]", names.actor ?? names.catcher ?? "")
    .replaceAll("[Название команды игрока]", names.team ?? "");
}

function isChaser(role: RoleKey | null): boolean {
  return role === "chaser1" || role === "chaser2";
}

export function captureFeed(prev: FeedSnap | null, next: FeedSnap, seen: Set<string>): string[] {
  if (!prev) {
    for (const event of next.events) seen.add(event.id);
    return [];
  }
  const lines: string[] = [];
  const people = new Map<string, FeedPerson>();
  for (const person of [...prev.participants, ...next.participants]) people.set(person.id, person);
  const named = (id: string | null, html: boolean) => {
    const person = id ? people.get(id) : undefined;
    if (!person) return null;
    return html ? personHtml(person) : person.nickname;
  };
  const push = (key: MessageKey, occurrence: number, names: { actor?: string; passer?: string; catcher?: string; team?: string }) => {
    lines.push(fill(pickMessageByOccurrence(next.code, key, occurrence), names));
  };
  const batches: Record<string, MessageKey> = {
    hit_bludger: "bludger_hit",
    stun_bludger: "bludger_stun",
    goal: "goal_scored",
  };
  for (const [kind, key] of Object.entries(batches)) {
    const fresh = next.events.filter((event) => event.kind === kind && !seen.has(event.id));
    const counter =
      key === "bludger_hit" ? next.counters.bludgerHit : key === "bludger_stun" ? next.counters.bludgerStun : next.counters.goalScored;
    const total = Math.max(fresh.length, counter ?? 0);
    const startNo = Math.max(1, total - fresh.length + 1);
    fresh.forEach((event, index) => {
      seen.add(event.id);
      const actor = named(event.actorId, true);
      if (!actor) return;
      const person = event.actorId ? people.get(event.actorId) : undefined;
      push(key, startNo + index, { actor, team: person ? teamLabel(person.team) : "" });
    });
  }
  for (const event of next.events) seen.add(event.id);
  if (!prev.snitchRevealed && next.snitchRevealed) push("snitch_reveal", next.counters.snitchReveal ?? 0, {});
  if (prev.snitchRevealed && !next.snitchRevealed && !next.snitchCaughtById) push("snitch_hide", next.counters.snitchHide ?? 0, {});
  const prevHolder = prev.holderId ? people.get(prev.holderId) : undefined;
  const nextHolder = next.holderId ? people.get(next.holderId) : undefined;
  if (!prev.holderId && next.holderId && nextHolder) {
    push("free_quaffle_pickup", next.counters.freeQuafflePickup ?? 0, { actor: personHtml(nextHolder), team: teamLabel(nextHolder.team) });
  } else if (prevHolder && nextHolder && prevHolder.id !== nextHolder.id) {
    if (prevHolder.team === nextHolder.team && isChaser(prevHolder.role) && isChaser(nextHolder.role)) {
      push("quaffle_pass", next.counters.quafflePass ?? 0, {
        passer: personHtml(prevHolder),
        catcher: personHtml(nextHolder),
        actor: personHtml(prevHolder),
        team: teamLabel(prevHolder.team),
      });
    } else {
      const duelSteal =
        next.duel?.kind === "steal" &&
        next.duel.winnerId === nextHolder.id &&
        next.duel.attackerId === nextHolder.id &&
        next.duel.defenderId === prevHolder.id;
      const cross = prevHolder.team !== nextHolder.team && (isChaser(nextHolder.role) || nextHolder.role === "keeper");
      if (duelSteal || cross) {
        push("quaffle_steal", next.counters.quaffleSteal ?? 0, { actor: personHtml(nextHolder), team: teamLabel(nextHolder.team) });
      }
    }
  }
  return lines;
}

export function plainEventLine(
  kind: string,
  actor: { nickname: string; role: RoleKey | null } | null,
  targetPos: string | null,
  meta: Record<string, unknown>,
  names: Map<string, string>,
): string {
  const who = actor ? `${actor.nickname} (${actor.role ? ROLE_LETTER[actor.role] ?? "" : ""})` : "Игрок";
  const other = (id: unknown) => (typeof id === "string" ? names.get(id) ?? id : "");
  if (kind === "quaffle_pickup") return `${who} подобрал квоффл у клетки ${targetPos ?? ""}`.trim();
  if (kind === "quaffle_pass") return `${who} отдал пас в ${targetPos ?? ""} игроку ${other(meta.receiverId)}`.trim();
  if (kind === "quaffle_throw") return `${who} бросил квоффл из ${String(meta.fromPos ?? "")} в ${String(meta.toPos ?? targetPos ?? "")}; исход: ${String(meta.outcome ?? "")}`;
  if (kind === "quaffle_throw_result") return `${who} завершил бросок квоффла: ${String(meta.outcome ?? "")}`;
  if (kind === "quaffle_duel_score") return `${who} участвовал в борьбе за квоффл: ${String(meta.score ?? "")}%`;
  if (kind === "quaffle_duel_result") return `Борьба за квоффл завершена${meta.winnerId ? `, победитель ${other(meta.winnerId)}` : ""}`;
  if (kind === "hit_bludger") return `${who} ударил бладжер ${String(meta.bludgerIdx ?? "")} в ${targetPos ?? ""}`.trim();
  if (kind === "stun_bludger") return `${who} оглушился бладжером в ${targetPos ?? ""}`.trim();
  if (kind === "goal") return `Гол! ${who} пропустил гол`;
  if (kind === "snitch_catch") return `${who} поймал снитч`;
  if (kind === "snitch_reveal") return "Снитч обнаружен";
  if (kind === "snitch_hide") return "Снитч скрылся";
  return kind;
}
