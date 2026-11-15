import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Moon, Sun } from "lucide-react";
import type { ClientState } from "@/lib/quidditch/engine";
import {
  judgeCommand,
  sendChat,
  sendDuel,
  sendLeave,
  sendPause,
  sendPlan,
  sendStart,
  sendTurn,
  syncRoom,
} from "@/lib/quidditch/api";
import { actionOk, legalMoves, quaffleLocked } from "@/lib/quidditch/assist";
import { errorText } from "@/lib/quidditch/errors";
import { attackGoals, chebyshev, isBeater, isChaser, isKeeper, isSeeker, lineCells } from "@/lib/quidditch/rules";
import { roleLabel, teamLabel, type ActionType, type PlanInput } from "@/lib/quidditch/types";
import { captureFeed, type FeedSnap } from "@/lib/quidditch/feed";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { Board } from "./board";

const ROLE_ORDER = ["chaser1", "keeper", "seeker", "beater", "chaser2"] as const;

type Seat = { code: string; participantId: string; token: string };
type Draft = { type: ActionType | null; to: string | null; bludger: 1 | 2 | null; at: number | null };
const EMPTY: Draft = { type: null, to: null, bludger: null, at: null };

let countdownCtx: AudioContext | null = null;

function countdownAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  countdownCtx ??= new Ctx();
  return countdownCtx;
}

function tone(ctx: AudioContext, start: number, freq: number, peak: number, dur: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function playTurnTick(second: number) {
  const ctx = countdownAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const left = Math.max(0, Math.min(5, second));
  const tension = (5 - left) / 5;
  const now = ctx.currentTime;
  const freq = 360 + tension * 980;
  const peak = 0.04 + tension * 0.14;
  const type: OscillatorType = tension > 0.8 ? "square" : tension > 0.4 ? "triangle" : "sine";
  const pulses = second <= 0 ? 3 : second <= 1 ? 2 : 1;
  for (let i = 0; i < pulses; i++) {
    const start = now + i * (0.09 - tension * 0.02);
    tone(ctx, start, freq * (1 + i * 0.04), peak, 0.07 + (1 - tension) * 0.05, type);
    if (tension > 0.2) tone(ctx, start, freq * 1.5, peak * (0.18 + tension * 0.25), 0.05, tension > 0.6 ? "square" : "triangle");
  }
}

function readSeat(code: string): Seat | null {
  const raw = sessionStorage.getItem("quidditch.seat") || localStorage.getItem(`quidditch.seat.${code}`);
  if (!raw) return null;
  try {
    const seat = JSON.parse(raw) as Seat;
    return seat.code === code ? seat : null;
  } catch {
    return null;
  }
}

export function Room({ code }: { code: string }) {
  const navigate = useNavigate();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [view, setView] = useState<ClientState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [moveAt, setMoveAt] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [chatText, setChatText] = useState("");
  const [scope, setScope] = useState<"all" | "team">("all");
  const [chatOn, setChatOn] = useState(true);
  const [feed, setFeed] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [light, setLight] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roster, setRoster] = useState<null | "players" | "watchers">(null);
  const prevFeed = useRef<FeedSnap | null>(null);
  const seenEvents = useRef(new Set<string>());
  const auto = useRef("");
  const offset = useRef(0);
  const lastTick = useRef("");

  useEffect(() => {
    setSeat(readSeat(code));
    const theme = localStorage.getItem("quidditch.theme");
    const next = theme === "light";
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
  }, [code]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!seat) return;
    const current = seat;
    let stop = false;
    async function pull() {
      if (stop) return;
      const res = await syncRoom({ data: { code, participantId: current.participantId, sessionToken: current.token } });
      if (stop) return;
      if (!res.ok) {
        if (res.error === "invalid_session" || res.error === "not_found") {
          sessionStorage.removeItem("quidditch.seat");
          localStorage.removeItem(`quidditch.seat.${code}`);
          void navigate({ to: "/" });
        }
        return;
      }
      offset.current = res.state.serverNow - Date.now();
      setView(res.state);
      if (res.state.game.finished) setShowResults(true);
    }
    void pull();
    const id = window.setInterval(() => void pull(), 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [code, seat, navigate]);

  useEffect(() => {
    if (!view) return;
    const snap: FeedSnap = {
      code: view.game.code,
      counters: view.messageCounters,
      participants: view.participants.map((person) => ({
        id: person.id,
        nickname: person.nickname,
        team: person.team,
        role: person.role,
        isObserver: person.isObserver,
      })),
      holderId: view.quaffle.holderId,
      snitchRevealed: view.snitch.revealed,
      snitchCaughtById: view.snitch.caughtById,
      events: view.events,
      duel: view.duel
        ? {
            kind: view.duel.kind,
            attackerId: view.duel.attackerId,
            defenderId: view.duel.defenderId,
            winnerId: view.duel.winnerId,
          }
        : null,
    };
    const lines = captureFeed(prevFeed.current, snap, seenEvents.current);
    prevFeed.current = snap;
    if (lines.length) setFeed((items) => [...items, ...lines].slice(-60));
  }, [view]);

  const me = view?.participants.find((p) => p.id === seat?.participantId) ?? null;
  const turn = me && view ? view.turnStates[me.id] : null;
  const locked = view ? quaffleLocked(view) : false;
  const moves = useMemo(() => (view && me && !turn?.ended && !turn?.stunned ? legalMoves(view, me.id) : []), [view, me, turn?.ended, turn?.stunned]);
  const targets = useMemo(() => (view && me && draft.type ? targetCells(view, me.id, draft, turn?.plannedTo ?? null) : []), [view, me, draft, turn?.plannedTo]);

  useEffect(() => {
    if (!view || !me || !seat) return;
    if (!view.game.started || view.game.paused || view.game.finished || view.duel && !view.duel.resolvedAt) return;
    const mine = view.turnStates[me.id];
    if (!mine || mine.ended || mine.stunned || me.isObserver) return;
    if (moves.length > 0 || hasAction(view, me.id)) return;
    const key = `${view.game.stepNo}:${me.id}`;
    if (auto.current === key) return;
    auto.current = key;
    void sendTurn({
      data: {
        code,
        participantId: seat.participantId,
        sessionToken: seat.token,
        plan: { to: null, actionFirst: null, actionType: null, actionTo: null, actionBludger: null },
      },
    }).then((res) => {
      if (res.ok) setView(res.state);
    });
  }, [view, me, seat, moves.length, code]);

  function note(error?: string) {
    const beaterBall =
      me &&
      isBeater(me.role) &&
      (error === "steal_cooldown" ||
        error === "steal_locked" ||
        error === "role_cannot_steal" ||
        error === "role_cannot_pickup" ||
        error === "role_cannot_throw" ||
        error === "role_cannot_pass");
    setToast(beaterBall ? "Загонщик бьёт только бладжер" : errorText(error));
    window.setTimeout(() => setToast(""), 2400);
  }

  async function onCell(coord: string) {
    if (!view || !me || !seat || me.isObserver || turn?.ended || turn?.stunned || !view.game.started || view.game.paused) return;
    if (draft.type && needsTarget(draft.type) && targets.includes(coord)) {
      const bludger = draft.type === "hit_bludger" ? bludgerFor(view, turn?.plannedTo ?? me.pos, coord) ?? bludgerFor(view, me.pos, coord) : null;
      setDraft({ ...draft, to: coord, bludger });
      return;
    }
    if (turn?.plannedTo === coord) {
      const res = await sendPlan({ data: { code, participantId: seat.participantId, sessionToken: seat.token, to: null } });
      if (!res.ok) note(res.error);
      else setView(res.state);
      setMoveAt(null);
      return;
    }
    if (!moves.includes(coord)) {
      if (draft.type && needsTarget(draft.type)) note(draft.type === "throw" && isChaser(me.role) ? "not_opponent_goal" : "invalid_target");
      return;
    }
    const res = await sendPlan({ data: { code, participantId: seat.participantId, sessionToken: seat.token, to: coord } });
    if (!res.ok) note(res.error);
    else {
      setView(res.state);
      setMoveAt(Date.now());
    }
  }

  useEffect(() => {
    setDraft(EMPTY);
    setMoveAt(null);
  }, [view?.game.stepNo]);

  async function finish() {
    if (!view || !me || !seat) return;
    let type = draft.type;
    if (isBeater(me.role)) {
      if (type !== "hit_bludger") type = null;
    } else if (isSeeker(me.role) || (!isChaser(me.role) && !isKeeper(me.role))) {
      type = null;
    }
    if (type && needsTarget(type) && !draft.to) type = null;
    const plannedTo = view.turnStates[me.id]?.plannedTo ?? null;
    const to = plannedTo && moves.includes(plannedTo) ? plannedTo : null;
    let actionTo = type ? draft.to : null;
    let actionBludger = type === "hit_bludger" ? draft.bludger : null;
    let actionFirst = type ? chooseFirst(view, me.id, { ...draft, type }, to, moveAt) : null;
    if (type && actionOk(view, me.id, { to, actionFirst, actionType: type, actionTo, actionBludger })) {
      type = null;
      actionTo = null;
      actionBludger = null;
      actionFirst = null;
    }
    const plan: PlanInput = { to, actionType: type, actionTo, actionBludger, actionFirst };
    const res = await sendTurn({ data: { code, participantId: seat.participantId, sessionToken: seat.token, plan } });
    if (!res.ok) note(res.error);
    else {
      setView(res.state);
      setDraft(EMPTY);
      setMoveAt(null);
    }
  }

  async function clickScore(score: number) {
    if (!view?.duel || !seat) return;
    const res = await sendDuel({
      data: { code, participantId: seat.participantId, sessionToken: seat.token, duelId: view.duel.id, score },
    });
    if (!res.ok && res.error !== "alreadySubmitted") note(res.error);
    if (res.ok) setView(res.state);
  }

  const clock = view?.game.paused && view.game.pausedAt != null ? view.game.pausedAt : now + offset.current;
  const remain = view ? Math.max(0, Math.ceil((view.game.stepStartedAt + view.turnMs - clock) / 1000)) : 0;

  useEffect(() => {
    const unlock = () => {
      const ctx = countdownAudio();
      if (ctx?.state === "suspended") void ctx.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!view?.game.started || view.game.finished || view.game.paused || remain > 5) return;
    const mark = `${view.game.stepNo}:${remain}`;
    if (lastTick.current === mark) return;
    lastTick.current = mark;
    playTurnTick(remain);
  }, [remain, view?.game.finished, view?.game.paused, view?.game.started, view?.game.stepNo]);
  const judgeInRoom = view?.participants.some((p) => p.isJudge);
  const waiting = view ? view.participants.filter((p) => p.role && !p.isObserver && !view.turnStates[p.id]?.ended).length : 0;

  if (!seat) {
    return (
      <main className="shell">
        <section className="card form">
          <h1>Комната {code}</h1>
          <p>Сначала войдите с главной — место в матче хранится в этом браузере.</p>
          <button className="primary" type="button" onClick={() => void navigate({ to: "/" })}>
            На главную
          </button>
        </section>
      </main>
    );
  }
  if (!view || !me) {
    return (
      <main className="shell">
        <p className="tagline">Собираем поле…</p>
      </main>
    );
  }

  const canPlay = !me.isObserver && view.game.started && !view.game.paused && !view.game.finished && !turn?.ended && !turn?.stunned;

  return (
    <main className="shell">
      <header className="topbar">
        <img className="logo-mini" src="/assets/logo.png" alt="" />
        <div>
          <h1>
            {teamLabel(view.game.teamA)} — {teamLabel(view.game.teamB)}
          </h1>
          <p>
            Код {view.game.code}
            {view.game.paused ? " · пауза" : ""} {view.game.finished ? " · матч окончен" : ""}
          </p>
        </div>
        <div className="grow" />
        <button
          className="icon-btn"
          type="button"
          aria-label="Скопировать код"
          onClick={() => {
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
            const tell = (copied: boolean) => {
              setToast(copied ? "Код комнаты скопирован" : "Не удалось скопировать код");
              window.setTimeout(() => setToast(""), 2400);
            };
            if (navigator.clipboard?.writeText) {
              void navigator.clipboard.writeText(roomCode).then(
                () => tell(true),
                () => tell(legacyCopy()),
              );
              return;
            }
            tell(legacyCopy());
          }}
        >
          <Copy size={18} />
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label="Тема"
          onClick={() => {
            const next = !light;
            setLight(next);
            document.documentElement.dataset.theme = next ? "light" : "dark";
            localStorage.setItem("quidditch.theme", next ? "light" : "dark");
          }}
        >
          {light ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          className="ghost"
          type="button"
          onClick={() => {
            void sendLeave({ data: { code, participantId: seat.participantId, sessionToken: seat.token } }).finally(() => {
              sessionStorage.removeItem("quidditch.seat");
              void navigate({ to: "/" });
            });
          }}
        >
          Выйти
        </button>
      </header>
      <div className="layout">
        <div className="board-col">
          <div className="pitch-bar">
            <button className="ghost" type="button" onClick={() => setRoster(roster === "players" ? null : "players")}>
              Участники
            </button>
            <button className="ghost" type="button" onClick={() => setRoster(roster === "watchers" ? null : "watchers")}>
              Наблюдатели
            </button>
            <div className="grow" />
            <p className="pitch-status">
              Ход {view.game.stepNo}
              {view.game.started && !view.game.finished ? <span className={remain <= 3 ? "timer warn" : "timer"}> · {remain}с</span> : null}
              {" · "}
              <b className={`team-${view.game.teamA}`}>{view.game.scoreA}</b>
              {" : "}
              <b className={`team-${view.game.teamB}`}>{view.game.scoreB}</b>
              {view.game.started ? ` · Ждут заявок: ${waiting}` : " · Матч ещё не начат"}
            </p>
          </div>
          <Board
            view={view}
            meId={me.id}
            moves={canPlay ? moves : []}
            targets={canPlay ? targets : []}
            planned={turn?.plannedTo ?? null}
            actionTo={draft.to}
            onCell={(c) => void onCell(c)}
          />
        </div>
        <aside className="side">
          <section className="panel score-line" aria-label="Счёт">
            <b className={`team-${view.game.teamA}`}>{view.game.scoreA}</b>
            <span>:</span>
            <b className={`team-${view.game.teamB}`}>{view.game.scoreB}</b>
          </section>
          <section className="panel score-line" aria-label="Снитч">
            <span>Снитч:</span>
            <b className={`team-${view.game.teamA}`}>{snitchProgress(view, view.game.teamA)}%</b>
            <span>–</span>
            <b className={`team-${view.game.teamB}`}>{snitchProgress(view, view.game.teamB)}%</b>
          </section>
          {(!view.game.started && (me.isJudge || !me.isObserver || judgeInRoom)) || me.isJudge ? (
          <section className="panel">
            {!view.game.started && (me.isJudge || (!me.isObserver && !judgeInRoom)) ? (
              <button className="primary" type="button" onClick={() => void sendStart({ data: creds(code, seat) }).then((r) => (r.ok ? setView(r.state) : note(r.error)))}>
                Начать игру
              </button>
            ) : null}
            {!view.game.started && judgeInRoom && !me.isJudge ? <p>Ждём, пока судья начнёт матч.</p> : null}
            {me.isJudge ? (
              <button className="ghost" type="button" onClick={() => void sendPause({ data: creds(code, seat) }).then((r) => (r.ok ? setView(r.state) : note(r.error)))}>
                {view.game.paused ? "Продолжить" : "Пауза"}
              </button>
            ) : null}
          </section>
          ) : null}
          {canPlay ? (
            <section className="panel actions-panel">
              <div className="actions">
              {buttons(view, me, turn?.plannedTo ?? null).map((btn) => (
                  <button
                    key={btn.type}
                    className="ghost"
                    type="button"
                    aria-pressed={draft.type === btn.type}
                    onClick={() => setDraft(draft.type === btn.type ? EMPTY : { type: btn.type, to: null, bludger: null, at: Date.now() })}
                  >
                    {btn.label}
                  </button>
                ))}
                <button className="primary" type="button" onClick={() => void finish()}>
                  {(draft.type === "throw" || draft.type === "keeper_pickup") && draft.to ? "Бросить" : "Завершить"}
                </button>
              </div>
              {quaffleLockCopy(view, me, locked, turn?.plannedTo ?? null) ? (
                <p>Нельзя выхватить квоффл сразу после смены владельца.</p>
              ) : null}
              {draft.type === "steal" && !turn?.plannedTo ? <p>Сначала выхват, затем можно выбрать клетку хода.</p> : null}
              {stealHint(view, me, moves, turn?.plannedTo ?? null) ? (
                <p>Чтобы выхватить квоффл, выберите клетку рядом с соперником.</p>
              ) : null}
              {draft.type && needsTarget(draft.type) ? (
                <p>
                  {draft.to
                    ? `Цель: ${draft.to}. Нажмите «${draft.type === "throw" || draft.type === "keeper_pickup" ? "Бросить" : "Завершить"}».`
                    : draft.type === "throw" && isChaser(me.role)
                      ? "Выберите подсвеченное кольцо соперника."
                      : draft.type === "keeper_pickup" || (draft.type === "throw" && isKeeper(me.role))
                        ? "Выберите клетку, куда бросить квоффл."
                        : "Выберите подсвеченную клетку цели."}
                </p>
              ) : null}
            </section>
          ) : (
            <section className="panel">
              <p style={{ margin: 0 }}>
                {me.isObserver ? "Вы наблюдаете." : turn?.stunned ? "Вы оглушены и пропускаете шаг." : turn?.ended ? "Заявка принята." : "Сейчас ходить нельзя."}
              </p>
            </section>
          )}
          <section className="panel events-panel">
            <div className="events-head">
              <strong>События</strong>
              <form
                action={logAction()}
                method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  const popup = window.open("about:blank", "_blank");
                  if (!popup) setToast("Разрешите всплывающие окна, чтобы скачать файл");
                  else setToast("Собираем лог…");
                  const body = new FormData();
                  body.set("code", code);
                  body.set("participantId", seat.participantId);
                  body.set("sessionToken", seat.token);
                  void fetch(logAction(), { method: "POST", body })
                    .then(async (res) => {
                      const blob = await res.blob();
                      const name = fileName(res.headers.get("content-disposition")) ?? `quidditch-${code}-log.docx`;
                      deliverFile(popup, blob, name);
                      setToast("");
                    })
                    .catch(() => {
                      popup?.close();
                      setToast("Не удалось скачать лог");
                    });
                }}
              >
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="participantId" value={seat.participantId} />
                <input type="hidden" name="sessionToken" value={seat.token} />
                <button className="ghost" type="submit">
                  Логи
                </button>
              </form>
            </div>
            <div className="feed">
              {feed.length === 0 ? <p>События появятся по ходу матча.</p> : feed.map((line, i) => <p key={`${i}-${line.slice(0, 24)}`} dangerouslySetInnerHTML={{ __html: line }} />)}
            </div>
          </section>
        </aside>
      </div>
      {me.isJudge ? <JudgePanel view={view} code={code} seat={seat} onDone={setView} onError={note} /> : null}
      <section className="panel chat">
        <div className="score">
          <strong>Чат</strong>
          <button className="ghost" type="button" onClick={() => setChatOn((v) => !v)}>
            {chatOn ? "Скрыть" : "Показать"}
          </button>
        </div>
        {chatOn ? (
          <>
            <div className="chat-log">
              {view.chat.messages.map((m) => {
                const author = view.participants.find((p) => p.id === m.fromId);
                const spectator = m.fromObserver || (author ? author.isObserver && !author.isJudge : false);
                return (
                  <p key={m.id} className={spectator ? "chat-observer" : m.fromTeam ? `team-${m.fromTeam}` : ""}>
                    <b>{m.fromNick}</b>
                    {m.scope === "team" ? " (команда)" : ""}: {m.text}
                  </p>
                );
              })}
            </div>
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                void sendChat({ data: { ...creds(code, seat), scope, text: chatText } }).then((res) => {
                  if (!res.ok) note(res.error);
                  else {
                    setChatText("");
                    setView(res.state);
                  }
                });
              }}
            >
              {!me.isObserver ? (
                <button className="ghost" type="button" onClick={() => setScope(scope === "all" ? "team" : "all")}>
                  {scope === "all" ? "Всем" : "Команде"}
                </button>
              ) : null}
              <input
                className={me.isObserver && !me.isJudge ? "chat-observer" : me.team ? `team-${me.team}` : ""}
                value={chatText}
                maxLength={280}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Сообщение"
                disabled={view.game.finished}
              />
              <button className="primary" type="submit" disabled={view.game.finished}>
                <span className="chat-send-wide">Отправить</span>
                <span className="chat-send-tiny">Ок</span>
              </button>
            </form>
          </>
        ) : null}
      </section>
      {view.duel && !view.duel.resolvedAt && view.duel.participantIds.includes(me.id) && view.duel.scores[me.id] == null ? (
        <DuelBox duel={view.duel} names={view.participants} onScore={(n) => void clickScore(n)} />
      ) : null}
      {roster ? (
        <div className="overlay" onClick={() => setRoster(null)}>
          <div className="card modal roster-modal" onClick={(e) => e.stopPropagation()}>
            <div className="roster-top">
              <h2>{roster === "players" ? "Участники" : "Наблюдатели"}</h2>
              <button className="ghost" type="button" onClick={() => setRoster(null)}>
                закрыть
              </button>
            </div>
            {roster === "players" ? (
              <div className="roster-cols">
                {[view.game.teamA, view.game.teamB].map((team) => {
                  const members = view.participants
                    .filter((p) => !p.isObserver && p.team === team && p.role)
                    .sort((a, b) => ROLE_ORDER.indexOf(a.role ?? "keeper") - ROLE_ORDER.indexOf(b.role ?? "keeper"));
                  const ready = members.filter((p) => view.game.started && view.turnStates[p.id]?.ended).length;
                  return (
                    <section className="roster-team" key={team}>
                      <header>
                        <b className={`team-${team}`}>{teamLabel(team)}</b>
                        <span>
                          {ready}/{members.length}
                        </span>
                      </header>
                      {members.map((p) => (
                        <div className="roster-row" key={p.id}>
                          <i className={view.game.started && view.turnStates[p.id]?.ended ? "on" : ""} />
                          <b className={`team-${p.team}`}>{p.nickname}</b>
                          <span>{roleLabel(p.role)}</span>
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="roster-cols one">
                <section className="roster-team">
                  {view.participants.filter((p) => p.isObserver).length === 0 ? <p>Пока никого нет.</p> : null}
                  {view.participants
                    .filter((p) => p.isObserver)
                    .map((p) => (
                      <div className="roster-row" key={p.id}>
                        <i className="on" />
                        <b className={p.team ? `team-${p.team}` : ""}>{p.nickname}</b>
                        <span>{p.isJudge ? "Судья" : "Наблюдатель"}</span>
                      </div>
                    ))}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {showResults && view.results ? (
        <div className="overlay" onClick={() => setShowResults(false)}>
          <div className="results-sheet" onClick={(e) => e.stopPropagation()}>
            <ResultsTable view={view} />
            <div className="results-actions">
              <button className="primary" type="button" onClick={() => drawResults(view)}>
                Сохранить как изображение
              </button>
              <button className="ghost" type="button" onClick={() => setShowResults(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function creds(code: string, seat: Seat) {
  return { code, participantId: seat.participantId, sessionToken: seat.token };
}

function needsTarget(type: ActionType) {
  return type === "pass" || type === "throw" || type === "hit_bludger" || type === "keeper_pickup";
}

function buttons(view: ClientState, me: ClientState["participants"][number], plannedTo: string | null) {
  const list: { type: ActionType; label: string }[] = [];
  if (!me.role || !me.pos || !me.side) return list;
  const froms = [me.pos, ...(plannedTo && plannedTo !== me.pos ? [plannedTo] : [])];
  if (isBeater(me.role)) {
    if (froms.some((from) => view.bludgers.some((b) => chebyshev(from, b) === 1))) {
      list.push({ type: "hit_bludger", label: "Бладжер" });
    }
    return list;
  }
  if (isSeeker(me.role)) return list;
  const side = me.side;
  const hold = view.quaffle.holderId === me.id;
  const free = (from: string) => !view.quaffle.holderId && Boolean(view.quaffle.pos && chebyshev(from, view.quaffle.pos) <= 1);
  if (isChaser(me.role) && froms.some(free)) list.push({ type: "pickup", label: "Взять" });
  if (isKeeper(me.role) && froms.some(free)) list.push({ type: "keeper_pickup", label: "Поднять" });
  const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
  if (
    (isChaser(me.role) || isKeeper(me.role)) &&
    holder &&
    holder.side &&
    holder.side !== side &&
    !holder.isObserver &&
    (isChaser(holder.role) || isKeeper(holder.role)) &&
    holder.pos &&
    !quaffleLocked(view) &&
    froms.some((from) => chebyshev(from, holder.pos as string) <= 1)
  ) {
    list.push({ type: "steal", label: "Выхватить" });
  }
  if (isChaser(me.role) && hold) {
    const mate = (from: string) =>
      view.participants.some(
        (p) => p.side === side && isChaser(p.role) && p.id !== me.id && p.pos && chebyshev(from, p.pos) >= 1 && chebyshev(from, p.pos) <= 2,
      );
    if (froms.some(mate)) list.push({ type: "pass", label: "Дать пас" });
    if (froms.some((from) => attackGoals(side).some((g) => chebyshev(from, g) === 2))) list.push({ type: "throw", label: "Бросок" });
  }
  if (isKeeper(me.role) && hold) list.push({ type: "throw", label: "Бросок" });
  if (isKeeper(me.role) && froms.some((from) => view.bludgers.some((b) => chebyshev(from, b) === 1))) {
    list.push({ type: "hit_bludger", label: "Бладжер" });
  }
  return list;
}

function hasAction(view: ClientState, id: string) {
  const me = view.participants.find((p) => p.id === id);
  if (!me) return false;
  return buttons(view, me, view.turnStates[id]?.plannedTo ?? null).length > 0;
}

function stealHint(view: ClientState, me: ClientState["participants"][number], moves: string[], plannedTo: string | null) {
  if (!me.role || !me.pos || !me.side || quaffleLocked(view)) return false;
  if (!isChaser(me.role) && !isKeeper(me.role)) return false;
  const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
  if (!holder?.pos || !holder.side || holder.side === me.side || holder.isObserver) return false;
  if (!isChaser(holder.role) && !isKeeper(holder.role)) return false;
  const froms = [me.pos, ...(plannedTo ? [plannedTo] : [])];
  if (froms.some((from) => chebyshev(from, holder.pos as string) <= 1)) return false;
  return moves.some((cell) => chebyshev(cell, holder.pos as string) <= 1);
}

function quaffleLockCopy(view: ClientState, me: ClientState["participants"][number], locked: boolean, plannedTo: string | null) {
  if (!locked || !me.pos || !me.side || isBeater(me.role) || isSeeker(me.role)) return false;
  if (!isChaser(me.role) && !isKeeper(me.role)) return false;
  const holder = view.participants.find((p) => p.id === view.quaffle.holderId);
  if (!holder?.pos || holder.id === me.id || !holder.side || holder.side === me.side || holder.isObserver) return false;
  if (!isChaser(holder.role) && !isKeeper(holder.role)) return false;
  return chebyshev(me.pos, holder.pos) <= 1 || Boolean(plannedTo && chebyshev(plannedTo, holder.pos) <= 1);
}

function targetCells(view: ClientState, id: string, draft: Draft, plannedTo: string | null): string[] {
  const me = view.participants.find((p) => p.id === id);
  if (!me?.pos || !me.side || !draft.type) return [];
  const from = plannedTo ?? me.pos;
  const originPos = me.pos;
  const cells = new Set<string>();
  const consider = (coord: string, bludger: 1 | 2 | null, first: boolean, origin: string) => {
    const err = actionOk(view, id, {
      to: first ? null : plannedTo,
      actionFirst: first,
      actionType: draft.type,
      actionTo: coord,
      actionBludger: bludger,
    });
    if (!err) cells.add(coord);
    void origin;
  };
  if (draft.type === "pass") {
    for (const p of view.participants) {
      if (!p.pos || p.side !== me.side || !isChaser(p.role) || p.id === me.id) continue;
      consider(p.pos, null, true, me.pos);
      consider(p.pos, null, false, from);
    }
  } else if (draft.type === "throw" && isChaser(me.role)) {
    for (const g of attackGoals(me.side)) {
      consider(g, null, true, me.pos);
      consider(g, null, false, from);
    }
  } else if (draft.type === "throw" || draft.type === "keeper_pickup") {
    // keeper: any cell 1..6 from current or planned
    for (const origin of [me.pos, from]) {
      view.participants;
      for (let r = 0; r < 7; r++) {
        for (let c = 1; c <= 13; c++) {
          const coord = `${"ABCDEFG"[r]}${c}`;
          const d = chebyshev(origin, coord);
          if (d >= 1 && d <= 6) cells.add(coord);
        }
      }
    }
  } else if (draft.type === "hit_bludger") {
    view.bludgers.forEach((bpos, index) => {
      const which = (index + 1) as 1 | 2;
      if (chebyshev(originPos, bpos) !== 1 && chebyshev(from, bpos) !== 1) return;
      for (let r = 0; r < 7; r++) {
        for (let c = 1; c <= 13; c++) {
          const coord = `${"ABCDEFG"[r]}${c}`;
          if (lineCells(bpos, coord, 3)) cells.add(coord);
        }
      }
      void which;
    });
  }
  return [...cells];
}

function bludgerFor(view: ClientState, from: string | null, coord: string): 1 | 2 | null {
  if (!from) return null;
  for (const [index, bpos] of view.bludgers.entries()) {
    if (chebyshev(from, bpos) === 1 && lineCells(bpos, coord, 3)) return (index + 1) as 1 | 2;
  }
  return null;
}

function chooseFirst(view: ClientState, id: string, draft: Draft, plannedTo: string | null, moveAt: number | null): boolean | null {
  if (!draft.type) return null;
  const pre = actionOk(view, id, { to: null, actionFirst: true, actionType: draft.type, actionTo: draft.to, actionBludger: draft.bludger });
  const post = actionOk(view, id, { to: plannedTo, actionFirst: false, actionType: draft.type, actionTo: draft.to, actionBludger: draft.bludger });
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

const DUEL_LABEL: Record<string, string> = {
  pickup: "Кто подберёт квоффл",
  steal: "Выхват квоффла",
  throw_steal: "Бросок или выхват",
  hit_bludger: "Кто ударит бладжер",
  snitch: "Кто поймает снитч",
};

function DuelBox({
  duel,
  names,
  onScore,
}: {
  duel: NonNullable<ClientState["duel"]>;
  names: ClientState["participants"];
  onScore: (n: number) => void;
}) {
  const sent = useRef(false);
  const pctRef = useRef(0);
  const marker = useRef<HTMLElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;
  const [lockedScore, setLockedScore] = useState<number | null>(null);

  function stop() {
    if (sent.current) return;
    sent.current = true;
    const score = Math.max(0, Math.min(100, Math.round(pctRef.current)));
    if (marker.current) marker.current.style.left = `${score}%`;
    if (readout.current) readout.current.textContent = String(score);
    setLockedScore(score);
    onScoreRef.current(score);
  }

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      if (sent.current) return;
      const next = (((now - start) % 2200) / 2200) * 100;
      pctRef.current = next;
      if (marker.current) marker.current.style.left = `${next}%`;
      if (readout.current) readout.current.textContent = String(Math.round(next));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (event: KeyboardEvent) => {
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
  return (
    <div className="overlay">
      <div className="card modal form">
        <h2>{label}</h2>
        <p>{who}. Кликните по полосе или нажмите пробел ближе к правому краю.</p>
        <button
          className="duel-bar"
          type="button"
          disabled={lockedScore != null}
          onPointerDown={(event) => {
            event.preventDefault();
            stop();
          }}
        >
          <i ref={marker} />
        </button>
        <p ref={readout}>{lockedScore ?? 0}</p>
      </div>
    </div>
  );
}

function JudgePanel({
  view,
  code,
  seat,
  onDone,
  onError,
}: {
  view: ClientState;
  code: string;
  seat: Seat;
  onDone: (v: ClientState) => void;
  onError: (e?: string) => void;
}) {
  const players = view.participants.filter((p) => p.role && !p.isObserver);
  return (
    <section className="judge-bar">
      <strong>Судья</strong>
      <div className="judge-row">
        {players.map((p) => (
          <div className="judge-slot" key={p.id}>
            <span>
              {p.isBot && p.team ? <b className={`team-${p.team}`}>{p.nickname}</b> : p.nickname}
              {" · "}
              {roleLabel(p.role)}
              {p.isBot ? ` · бот ${p.botDifficulty}` : ""}
            </span>
            <button
              className="danger"
              type="button"
              onClick={() => {
                void judgeCommand({ data: { ...creds(code, seat), op: "kick", targetId: p.id } }).then((r) =>
                  r.ok ? onDone(r.state) : onError(r.error),
                );
              }}
            >
              Кикнуть
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                void judgeCommand({ data: { ...creds(code, seat), op: "kick", targetId: p.id, replace: "bot", difficulty: p.botDifficulty ?? 2 } }).then((r) =>
                  r.ok ? onDone(r.state) : onError(r.error),
                );
              }}
            >
              Заменить ботом
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultsTable({ view }: { view: ClientState }) {
  const results = view.results;
  if (!results) return null;
  const teams = [results.teamA, results.teamB];
  return (
    <>
      <h2>
        {results.winnerTeam ? (
          <>
            Победа: <span className={`team-${results.winnerTeam}`}>{teamLabel(results.winnerTeam)}</span>
          </>
        ) : (
          "Ничья"
        )}
      </h2>
      <p className="results-sub">
        Счёт: {results.scoreA} — {results.scoreB} · Ход: {view.game.stepNo}
      </p>
      <div className="results-scroll">
        <table className="results">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Роль</th>
              <th>
                Взято
                <br />
                квоффлов
              </th>
              <th>
                Украдено
                <br />
                квоффлов
              </th>
              <th>Пасы</th>
              <th>
                Удары по
                <br />
                бладжеру
              </th>
              <th>
                Попаданий
                <br />
                бладжером
              </th>
              <th>
                Поймано
                <br />
                голов
              </th>
              <th>
                Поймано
                <br />
                снитчей
              </th>
              <th>Очки</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <Fragment key={team.team}>
                <tr className="team">
                  <td className={`team-${team.team}`}>{teamLabel(team.team)}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
                {team.players.map((p) => (
                  <tr key={p.id}>
                    <td className={`team-${team.team}`} title={p.nickname}>
                      {p.nickname}
                    </td>
                    <td>{roleLabel(p.role)}</td>
                    <td>{p.pickups}</td>
                    <td>{p.steals}</td>
                    <td>{p.passes}</td>
                    <td>{p.bludgerHits}</td>
                    <td>{p.bludgerHitsToPlayers}</td>
                    <td>{p.goals}</td>
                    <td>{p.snitches}</td>
                    <td>{p.points}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <img className="results-logo" src="/assets/logo.png" alt="" />
    </>
  );
}

function drawResults(view: ClientState) {
  const popup = window.open("about:blank", "_blank");
  if (!view.results) {
    popup?.close();
    return;
  }
  const paint = (logo: HTMLImageElement | null) => {
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
  const prefix = typeof window === "undefined" ? "" : (previewPathPrefix(window.location.hostname, window.location.pathname) ?? "");
  img.src = `${prefix}/assets/logo.png`;
}

function renderResults(view: ClientState, logo: HTMLImageElement | null): Blob | null {
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

  const cols: { w: number; head: string[]; pick: (p: ResultsPlayer) => string }[] = [
    { w: 290, head: ["Имя"], pick: (p) => p.nickname },
    { w: 154, head: ["Роль"], pick: (p) => roleLabel(p.role) },
    { w: 154, head: ["Взято", "квоффлов"], pick: (p) => String(p.pickups) },
    { w: 154, head: ["Украдено", "квоффлов"], pick: (p) => String(p.steals) },
    { w: 154, head: ["Пасы"], pick: (p) => String(p.passes) },
    { w: 154, head: ["Удары по", "бладжеру"], pick: (p) => String(p.bludgerHits) },
    { w: 154, head: ["Попаданий", "бладжером"], pick: (p) => String(p.bludgerHitsToPlayers) },
    { w: 154, head: ["Поймано", "голов"], pick: (p) => String(p.goals) },
    { w: 154, head: ["Поймано", "снитчей"], pick: (p) => String(p.snitches) },
    { w: 154, head: ["Очки"], pick: (p) => String(p.points) },
  ];
  const xs: number[] = [];
  let x = marginX;
  for (const col of cols) {
    xs.push(x);
    x += col.w;
  }
  const tableRight = x;
  ctx.fillStyle = headerBg;
  ctx.fillRect(marginX, tableTop, tableRight - marginX, headerH);
  let y = tableTop + headerH;
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
    const top = tableTop + headerH / 2 - ((col.head.length - 1) * lh) / 2;
    col.head.forEach((lineText, li) => ctx.fillText(lineText, xs[i] + col.w / 2, top + li * lh));
  });

  y = tableTop + headerH;
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
    ctx.drawImage(logo, (width - logoW) / 2, y + 70, logoW, drawH);
  }

  const url = canvas.toDataURL("image/png");
  const bin = atob(url.split(",")[1] ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

type ResultsPlayer = NonNullable<ClientState["results"]>["teamA"]["players"][number];

function deliverFile(popup: Window | null, blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const image = blob.type.startsWith("image/") ? `<img alt="" src="${url}" style="max-width:100%;display:block;margin-top:16px">` : "";
  if (popup && !popup.closed) {
    popup.document.open();
    popup.document.write(
      `<!doctype html><meta charset="utf-8"><title>${safe}</title><body style="font-family:sans-serif;padding:24px;background:#140e09;color:#f4e7c4"><p><a id="dl" href="${url}" download="${safe}" style="color:#e0b84a">Скачать ${safe}</a></p>${image}</body>`,
    );
    popup.document.close();
    popup.document.getElementById("dl")?.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function fileName(header: string | null): string | null {
  if (!header) return null;
  return /filename="([^"]+)"/.exec(header)?.[1] ?? null;
}

function logAction() {
  if (typeof window === "undefined") return "/api/quidditch-log";
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}/api/quidditch-log`;
}

function snitchProgress(view: ClientState, team: ClientState["game"]["teamA"]): number {
  return view.seekerProgress.find((s) => s.team === team)?.progress ?? 0;
}
