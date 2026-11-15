import { createServerFn } from "@tanstack/react-start";
import type { PlanInput } from "./types.ts";

export const createRoom = createServerFn({ method: "POST" })
  .validator(
    (input: {
      teamA?: string;
      teamB?: string;
      nickname?: string;
      team?: string;
      role?: string;
      fillBots?: boolean;
      difficulty?: number;
      judge?: boolean;
      observer?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.createRoom(data);
  });

export const joinRoom = createServerFn({ method: "POST" })
  .validator(
    (input: { code?: string; nickname?: string; team?: string; role?: string; mode?: string; force?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.joinRoom(data);
  });

export const syncRoom = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.syncRoom(data);
  });

export const lobby = createServerFn({ method: "POST" })
  .validator((input: { code?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.lobby(data);
  });

export const sendPlan = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string; to?: string | null }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendPlan(data);
  });

export const sendTurn = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string; plan?: PlanInput }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendTurn(data);
  });

export const sendDuel = createServerFn({ method: "POST" })
  .validator(
    (input: { code?: string; participantId?: string; sessionToken?: string; duelId?: string; score?: number }) => input,
  )
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendDuel(data);
  });

export const sendStart = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendStart(data);
  });

export const sendPause = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendPause(data);
  });

export const sendChat = createServerFn({ method: "POST" })
  .validator(
    (input: { code?: string; participantId?: string; sessionToken?: string; scope?: string; text?: string }) => input,
  )
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendChat(data);
  });

export const sendLeave = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.sendLeave(data);
  });

export const judgeCommand = createServerFn({ method: "POST" })
  .validator(
    (input: {
      code?: string;
      participantId?: string;
      sessionToken?: string;
      op?: string;
      targetId?: string;
      team?: string;
      role?: string;
      difficulty?: number;
      replace?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.judgeCommand(data);
  });

export const listRooms = createServerFn({ method: "GET" }).handler(async () => {
  const mod = await import("./api.server.ts");
  return mod.listRooms();
});

export const deleteRoom = createServerFn({ method: "POST" })
  .validator((input: { code?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.deleteRoom(data);
  });

export const deleteRooms = createServerFn({ method: "POST" })
  .validator((input: { codes?: string[] }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.deleteRooms(data);
  });

export const fetchLogs = createServerFn({ method: "POST" })
  .validator((input: { code?: string; participantId?: string; sessionToken?: string }) => input)
  .handler(async ({ data }) => {
    const mod = await import("./api.server.ts");
    return mod.fetchLogs(data);
  });
