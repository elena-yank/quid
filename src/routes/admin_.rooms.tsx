import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { deleteRoom, deleteRooms, listRooms } from "@/lib/quidditch/api";
import { teamLabel, type TeamKey } from "@/lib/quidditch/types";

export const Route = createFileRoute("/admin_/rooms")({ component: RoomsAdmin });

type RoomRow = Awaited<ReturnType<typeof listRooms>>[number];

function RoomsAdmin() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setRooms(await listRooms());
  }

  useEffect(() => {
    void reload();
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return rooms;
    return rooms.filter((room) => room.code.toUpperCase().includes(q));
  }, [rooms, query]);

  const allPicked = shown.length > 0 && shown.every((room) => picked.includes(room.code));

  function toggle(code: string) {
    setPicked((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  }

  function toggleAll() {
    setPicked((prev) => {
      if (allPicked) return prev.filter((code) => !shown.some((room) => room.code === code));
      return [...new Set([...prev, ...shown.map((room) => room.code)])];
    });
  }

  async function remove(codes: string[]) {
    if (!codes.length) return;
    setBusy(true);
    try {
      if (codes.length === 1) await deleteRoom({ data: { code: codes[0] } });
      else await deleteRooms({ data: { codes } });
      setPicked((prev) => prev.filter((code) => !codes.includes(code)));
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell rooms-page">
      <section className="rooms-card">
        <header className="rooms-head">
          <h1>Комнаты</h1>
          <div className="rooms-tools">
            <input
              value={query}
              placeholder="Поиск по коду"
              aria-label="Поиск по коду"
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="ghost" type="button" onClick={() => void reload()}>
              Обновить
            </button>
            <span className="rooms-count">Комнат: {rooms.length}</span>
            {picked.length > 0 ? (
              <button className="danger" type="button" disabled={busy} onClick={() => void remove(picked)}>
                Удалить выбранные
              </button>
            ) : null}
          </div>
        </header>
        <div className="rooms-scroll">
          <table className="rooms">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Выбрать все" />
                </th>
                <th>Код</th>
                <th>Матч</th>
                <th>Счет</th>
                <th>Ход</th>
                <th>Участники</th>
                <th>Создана</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rooms-empty">
                    {rooms.length === 0 ? "Пока нет матчей." : "Ничего не найдено."}
                  </td>
                </tr>
              ) : null}
              {shown.map((room) => {
                const when = formatCreated(room.createdAt);
                return (
                  <tr key={room.code}>
                    <td>
                      <input
                        type="checkbox"
                        checked={picked.includes(room.code)}
                        onChange={() => toggle(room.code)}
                        aria-label={`Выбрать ${room.code}`}
                      />
                    </td>
                    <td>
                      <Link to="/play/$code" params={{ code: room.code }} className="rooms-code">
                        {room.code}
                      </Link>
                    </td>
                    <td>
                      <Link to="/play/$code" params={{ code: room.code }} className="rooms-match">
                        <span className={`team-${room.teamA}`}>{teamLabel(room.teamA as TeamKey)}</span>
                        {" vs"}
                        <br />
                        <span className={`team-${room.teamB}`}>{teamLabel(room.teamB as TeamKey)}</span>
                      </Link>
                    </td>
                    <td className="rooms-score">
                      {room.scoreA} - {room.scoreB}
                    </td>
                    <td>{room.stepNo}</td>
                    <td>
                      {room.players} (+{room.observers} набл.)
                    </td>
                    <td className="rooms-when">
                      {when.date}
                      <br />
                      {when.time}
                    </td>
                    <td>
                      <div className="rooms-actions">
                        <button className="ghost" type="button" onClick={() => copyCode(room.code)}>
                          Копировать код
                        </button>
                        <button className="danger" type="button" disabled={busy} onClick={() => void remove([room.code])}>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function formatCreated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" };
  return {
    date: date.toLocaleDateString("ru-RU"),
    time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function copyCode(code: string) {
  const legacy = () => {
    const area = document.createElement("textarea");
    area.value = code;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    area.remove();
  };
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(code).catch(legacy);
    return;
  }
  legacy();
}
