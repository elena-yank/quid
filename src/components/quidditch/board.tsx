import type { ClientState } from "@/lib/quidditch/engine";
import { BOARD_CELLS } from "@/lib/quidditch/cells";
import { GOALS_LEFT, GOALS_RIGHT } from "@/lib/quidditch/rules";
import { roleLetter, teamRgb } from "@/lib/quidditch/types";
import { Ball } from "./balls";

const GOALS = new Set([...GOALS_LEFT, ...GOALS_RIGHT]);

export function Board({
  view,
  meId,
  moves,
  targets,
  planned,
  actionTo,
  onCell,
}: {
  view: ClientState;
  meId: string | null;
  moves: string[];
  targets: string[];
  planned: string | null;
  actionTo: string | null;
  onCell: (coord: string) => void;
}) {
  const moveSet = new Set(moves);
  const targetSet = new Set(targets);
  const byPos = new Map(view.participants.filter((p) => p.pos).map((p) => [p.pos as string, p]));
  return (
    <div className="pitch-wrap">
      <img className="pitch" src="/assets/board.svg" alt="Поле квиддича" />
      <div className="grid">
        {BOARD_CELLS.map((cell) => {
            const coord = cell.coord;
            const cls = [
              "cell",
              GOALS.has(coord) ? "gate" : "",
              moveSet.has(coord) ? "target" : "",
              targetSet.has(coord) ? "shot" : "",
              actionTo === coord ? "chosen" : "",
              planned === coord ? "planned" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const box = { left: `${cell.left}%`, top: `${cell.top}%`, width: `${cell.width}%`, height: `${cell.height}%` };
            return (
              <button key={coord} type="button" className={cls} title={coord} style={box} onClick={() => onCell(coord)} />
            );
        })}
        <div className="tokens">
          {BOARD_CELLS.map((cell) => {
            const coord = cell.coord;
            const person = byPos.get(coord);
            const quaffle = view.quaffle.pos === coord;
            const bludger = view.bludgers[0] === coord ? 1 : view.bludgers[1] === coord ? 2 : 0;
            const snitch = view.snitch.revealed && view.snitch.pos === coord;
            if (!person && !quaffle && !bludger && !snitch) return null;
            const box = { left: `${cell.left}%`, top: `${cell.top}%`, width: `${cell.width}%`, height: `${cell.height}%` };
            return (
              <div key={coord} className="token" style={box}>
                {quaffle ? <Ball kind="quaffle" /> : null}
                {bludger ? <Ball kind="bludger" className={[person ? "on-player" : "", bludger === 2 ? "dart-b" : ""].filter(Boolean).join(" ") || undefined} /> : null}
                {snitch ? <Ball kind="snitch" /> : null}
                {person ? (
                  <span
                    className={`piece${person.id === meId ? " me" : ""}${view.turnStates[person.id]?.stunned ? " stunned" : ""}`}
                    style={{ background: `rgb(${teamRgb(person.team)})` }}
                  >
                    {roleLetter(person.role)}
                    {view.quaffle.holderId === person.id ? <Ball kind="quaffle" className="badge" /> : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
