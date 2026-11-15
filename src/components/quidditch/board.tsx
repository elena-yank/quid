import type { ClientState } from "@/lib/quidditch/engine";
import { BOARD_CELLS } from "@/lib/quidditch/cells";
import { GOALS_LEFT, GOALS_RIGHT } from "@/lib/quidditch/rules";
import { roleLetter, teamRgb } from "@/lib/quidditch/types";
import { Ball } from "./balls";

const GOALS_A = new Set(GOALS_LEFT);
const GOALS_B = new Set(GOALS_RIGHT);

export function Board({
  view,
  meId,
  moves,
  taken,
  targets,
  planned,
  actionTo,
  onCell,
}: {
  view: ClientState;
  meId: string | null;
  moves: string[];
  taken: string[];
  targets: string[];
  planned: string | null;
  actionTo: string | null;
  onCell: (coord: string) => void;
}) {
  const moveSet = new Set(moves);
  const takenSet = new Set(taken);
  const targetSet = new Set(targets);
  const byPos = new Map(view.participants.filter((p) => p.pos).map((p) => [p.pos as string, p]));
  return (
    <div className="pitch-wrap">
      <img className="pitch" src="/assets/board.webp" alt="Поле квиддича" width={1876} height={1166} fetchPriority="high" decoding="sync" />
      <div className="grid">
        {BOARD_CELLS.map((cell) => {
            const coord = cell.coord;
            const gateTeam = GOALS_A.has(coord) ? view.game.teamA : GOALS_B.has(coord) ? view.game.teamB : null;
            const cls = [
              "cell",
              gateTeam ? "gate" : "",
              moveSet.has(coord) ? "target" : "",
              !moveSet.has(coord) && takenSet.has(coord) && !targetSet.has(coord) ? "taken" : "",
              targetSet.has(coord) ? "shot" : "",
              actionTo === coord ? "chosen" : "",
              planned === coord ? "planned" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const box: Record<string, string> = {
              left: `${cell.left}%`,
              top: `${cell.top}%`,
              width: `${cell.width}%`,
              height: `${cell.height}%`,
            };
            if (gateTeam) box["--gate"] = teamRgb(gateTeam);
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
                    className={`piece${person.id === meId ? " me" : ""}${view.turnStates[person.id]?.stunned ? " stunned" : ""}${view.turnStates[person.id]?.bludgerGhost ? " immune" : ""}`}
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
