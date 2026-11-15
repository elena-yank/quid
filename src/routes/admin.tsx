import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { deleteRoom, listRooms } from "@/lib/quidditch/api";
import { teamLabel, type TeamKey } from "@/lib/quidditch/types";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const [rooms, setRooms] = useState<Awaited<ReturnType<typeof listRooms>>>([]);
  async function reload() {
    setRooms(await listRooms());
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <main className="shell">
      <div className="topbar">
        <h1>Комнаты</h1>
        <div className="grow" />
        <Link to="/" className="ghost" style={{ display: "grid", placeItems: "center" }}>
          На главную
        </Link>
      </div>
      <section className="card form">
        {rooms.length === 0 ? <p>Пока нет матчей.</p> : null}
        {rooms.map((room) => (
          <div className="score" key={room.code}>
            <div>
              <b style={{ fontSize: "1.3rem" }}>{room.code}</b>
              <p className="tagline" style={{ margin: 0 }}>
                {teamLabel(room.teamA as TeamKey)} {room.scoreA}:{room.scoreB} {teamLabel(room.teamB as TeamKey)} · ход {room.stepNo} · {room.players} уч.
              </p>
            </div>
            <button
              className="danger"
              type="button"
              onClick={() => {
                void deleteRoom({ data: { code: room.code } }).then(reload);
              }}
            >
              Удалить
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
