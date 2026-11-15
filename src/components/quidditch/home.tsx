import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { createRoom, joinRoom, lobby } from "@/lib/quidditch/api";
import { errorText } from "@/lib/quidditch/errors";
import { BOT_DIFFICULTIES, ROLES, TEAMS, type RoleKey, type TeamKey } from "@/lib/quidditch/types";

type Tab = "create" | "join" | "watch" | "judge";

const NEXT_TEAM: Record<TeamKey, TeamKey> = {
  gryffindor: "hufflepuff",
  hufflepuff: "ravenclaw",
  ravenclaw: "slytherin",
  slytherin: "gryffindor",
};

function teamLabel(key: TeamKey) {
  return TEAMS.find((t) => t.key === key)?.label ?? key;
}

function saveSeat(code: string, participantId: string, token: string) {
  const seat = JSON.stringify({ code, participantId, token });
  sessionStorage.setItem("quidditch.seat", seat);
  localStorage.setItem(`quidditch.seat.${code}`, seat);
}

export function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("create");
  const [teamA, setTeamA] = useState<TeamKey>("gryffindor");
  const [teamB, setTeamB] = useState<TeamKey>("hufflepuff");
  const [team, setTeam] = useState<TeamKey>("gryffindor");
  const [role, setRole] = useState<RoleKey>("chaser1");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fill, setFill] = useState(false);
  const [difficulty, setDifficulty] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(false);
  const [taken, setTaken] = useState<{ team: string; role: string | null; nickname: string; isBot: boolean }[]>([]);
  const [loaded, setLoaded] = useState<{ teamA: TeamKey; teamB: TeamKey } | null>(null);

  useEffect(() => {
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

  function pickA(value: TeamKey) {
    setTeamA(value);
    const other = value === teamB ? NEXT_TEAM[value] : teamB;
    if (other !== teamB) setTeamB(other);
    setTeam((current) => (current === value || current === other ? current : value));
  }

  function pickB(value: TeamKey) {
    setTeamB(value);
    const other = value === teamA ? NEXT_TEAM[value] : teamA;
    if (other !== teamA) setTeamA(other);
    setTeam((current) => (current === value || current === other ? current : value));
  }

  async function enter(result: { ok: boolean; error?: string; code?: string; participantId?: string; sessionToken?: string }) {
    if (!result.ok || !result.code || !result.participantId || !result.sessionToken) {
      setError(errorText(result.error));
      return;
    }
    saveSeat(result.code, result.participantId, result.sessionToken);
    await navigate({ to: "/play/$code", params: { code: result.code } });
  }

  async function onCreate(judge: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await createRoom({
        data: { teamA, teamB, nickname: name, team, role, fillBots: fill, difficulty, judge },
      });
      await enter(result);
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
      setLoaded({ teamA: result.teamA, teamB: result.teamB });
      setTeam(result.teamA);
      setTaken(result.taken ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(observer: boolean, force = false) {
    setBusy(true);
    setError("");
    try {
      const result = await joinRoom({
        data: { code, nickname: name, team, role, mode: observer ? "observer" : "player", force },
      });
      if (!result.ok && result.error === "role_taken" && !force) {
        if (window.confirm("Роль занята. Занять её вместо текущего игрока?")) {
          await onJoin(false, true);
        }
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
  const submit =
    tab === "watch" ? "Наблюдать" : tab === "join" ? "Присоединиться" : "Создать и войти";

  return (
    <main className="lobby">
      {menu ? <button className="lobby-scrim" type="button" aria-label="Закрыть меню" onClick={() => setMenu(false)} /> : null}
      <button
        className="lobby-gear"
        type="button"
        aria-label="Настройки"
        aria-expanded={menu}
        onClick={() => setMenu((open) => !open)}
      >
        <Settings size={18} strokeWidth={1.75} />
      </button>
      {menu ? (
        <div className="lobby-menu" role="menu">
          <button type="button" role="menuitem" onClick={toggleTheme}>
            {light ? "Тёмная тема" : "Светлая тема"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTab("judge");
              setMenu(false);
              setError("");
            }}
          >
            Комната судьи
          </button>
        </div>
      ) : null}

      <header className="hero">
        <a className="hero-logo" href="https://vk.ru/magichogwarts_school" target="_blank" rel="noreferrer">
          <img src="/assets/logo-mark.png" alt="Мир Гарри Поттера — Квиддич" />
        </a>
      </header>

      <section className="lobby-card">
        <div className="lobby-tabs" role="tablist">
          {(
            [
              ["create", "Создать"],
              ["join", "Присоединиться"],
              ["watch", "Наблюдать"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id || (id === "create" && tab === "judge")}
              onClick={() => {
                setTab(id);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          className="lobby-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === "create") void onCreate(false);
            else if (tab === "judge") void onCreate(true);
            else if (tab === "watch") void onJoin(true);
            else void onJoin(false);
          }}
        >
          {tab === "judge" ? (
            <p className="lobby-note">
              Комната судьи. Вы наблюдаете и ведёте матч.
              <button type="button" onClick={() => setTab("create")}>
                Обычный матч
              </button>
            </p>
          ) : null}

          {tab === "watch" ? <img className="watch-art" src="/assets/spectating.png" alt="Трибуны стадиона" /> : null}

          {creating ? (
            <div className="lobby-split">
              <label>
                Команда A
                <TeamSelect value={teamA} onChange={pickA} />
              </label>
              <label>
                Команда B
                <TeamSelect value={teamB} onChange={pickB} />
              </label>
            </div>
          ) : null}

          {tab === "join" || tab === "watch" ? (
            <label className="lobby-block">
              Код комнаты
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setLoaded(null);
                  setTaken([]);
                }}
                maxLength={6}
                placeholder="например, K7M2QP"
                autoCapitalize="characters"
              />
            </label>
          ) : null}

          {tab === "join" ? (
            <button className="lobby-quiet" type="button" disabled={busy} onClick={() => void loadLobby()}>
              Загрузить команды
            </button>
          ) : null}

          {tab === "join" && loaded ? (
            <div className="lobby-split">
              <label>
                Команда
                <select value={team} onChange={(e) => setTeam(e.target.value as TeamKey)}>
                  <option value={loaded.teamA}>{teamLabel(loaded.teamA)}</option>
                  <option value={loaded.teamB}>{teamLabel(loaded.teamB)}</option>
                </select>
              </label>
              <label>
                Роль
                <RoleSelect value={role} onChange={setRole} />
              </label>
            </div>
          ) : null}

          {tab === "join" && taken.length > 0 ? (
            <p className="lobby-note">Занято: {taken.map((t) => `${t.nickname}${t.isBot ? " (бот)" : ""}`).join(", ")}</p>
          ) : null}

          {tab === "create" ? (
            <div className="lobby-split">
              <label>
                Моя команда
                <select value={team} onChange={(e) => setTeam(e.target.value as TeamKey)}>
                  <option value={teamA}>{teamLabel(teamA)}</option>
                  {teamB !== teamA ? <option value={teamB}>{teamLabel(teamB)}</option> : null}
                </select>
              </label>
              <label>
                Роль
                <RoleSelect value={role} onChange={setRole} />
              </label>
            </div>
          ) : null}

          <label className="lobby-block">
            Имя
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="например, Гарри" />
          </label>

          {creating ? (
            <div className="lobby-split">
              <label>
                Боты в пустые места
                <select value={fill ? "yes" : "no"} onChange={(e) => setFill(e.target.value === "yes")}>
                  <option value="no">нет</option>
                  <option value="yes">да</option>
                </select>
              </label>
              <label>
                Сложность ботов
                <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                  {BOT_DIFFICULTIES.map((d) => (
                    <option key={d.level} value={d.level}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {error ? <p className="lobby-error">{error}</p> : null}
          <button className="lobby-submit" type="submit" disabled={busy}>
            {submit}
          </button>
        </form>
      </section>
    </main>
  );
}

function TeamSelect({ value, onChange }: { value: TeamKey; onChange: (v: TeamKey) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as TeamKey)}>
      {TEAMS.map((t) => (
        <option key={t.key} value={t.key}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function RoleSelect({ value, onChange }: { value: RoleKey; onChange: (v: RoleKey) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as RoleKey)}>
      {ROLES.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
