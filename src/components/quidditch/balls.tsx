import { useId } from "react";
import { placeFeatherPath, SNITCH, snitchFeathersCached, snitchHub } from "@/lib/quidditch/snitch-shape";

function Wing({ side, grad }: { side: "left" | "right"; grad: string }) {
  const [hx, hy] = snitchHub(side);
  return (
    <g
      className={`wing ${side}`}
      style={{
        transformBox: "view-box",
        transformOrigin: `${(hx / SNITCH.viewW) * 100}% ${(hy / SNITCH.viewH) * 100}%`,
      }}
    >
      {snitchFeathersCached().map((feather, i) => (
        <g key={i}>
          <path d={placeFeatherPath(feather, side)} fill="none" stroke="#c5bfb4" strokeWidth={SNITCH.feather + 0.45} strokeLinecap="round" />
          <path d={placeFeatherPath(feather, side)} fill="none" stroke={`url(#${grad})`} strokeWidth={SNITCH.feather} strokeLinecap="round" />
          <path d={placeFeatherPath(feather, side)} fill="none" stroke="#fff" strokeWidth="0.55" strokeLinecap="round" opacity="0.9" />
        </g>
      ))}
    </g>
  );
}

export function Ball({ kind, className }: { kind: "quaffle" | "bludger" | "snitch"; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cls = ["ball", kind, className].filter(Boolean).join(" ");
  if (kind === "snitch") {
    const { cx, cy, ballR: r, viewW, viewH } = SNITCH;
    return (
      <svg className={cls} viewBox={`0 0 ${viewW} ${viewH}`} aria-hidden="true">
        <ellipse cx={cx} cy={cy - 1} rx="46" ry="22" fill={`url(#${uid}-glow)`} />
        <Wing side="left" grad={`${uid}-wing`} />
        <Wing side="right" grad={`${uid}-wing`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-gold)`} />
        <g clipPath={`url(#${uid}-clip)`}>
          <ellipse cx={cx} cy={cy + 1.1} rx={r - 0.4} ry="1.7" fill="none" stroke="#7a5612" strokeWidth="0.55" />
          <ellipse cx={cx} cy={cy + 3.1} rx={r - 1.8} ry="1.25" fill="none" stroke="#6e4c10" strokeWidth="0.5" />
          <path
            d={`M ${cx - 2.3} ${cy + 1.6} v 3.3 M ${cx} ${cy + 1.2} v 4 M ${cx + 2.3} ${cy + 1.6} v 3.3`}
            fill="none"
            stroke="#6a480e"
            strokeWidth="0.55"
            strokeLinecap="round"
          />
        </g>
        <ellipse cx={cx - 2.1} cy={cy - 2.5} rx="2.5" ry="1.45" fill="#fff6d4" opacity="0.9" />
        <defs>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe7a0" stopOpacity="0.22" />
            <stop offset="42%" stopColor="#f0b43a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f0b43a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-gold`} cx="35%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff6c2" />
            <stop offset="40%" stopColor="#f0c84a" />
            <stop offset="100%" stopColor="#8a5a0e" />
          </radialGradient>
          <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f4f1ea" />
            <stop offset="100%" stopColor="#d5cfc4" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <circle cx={cx} cy={cy} r={r - 0.25} />
          </clipPath>
        </defs>
      </svg>
    );
  }
  if (kind === "bludger") {
    return (
      <svg className={cls} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill={`url(#${uid}-iron)`} />
        <ellipse cx="10.4" cy="11.2" rx="4.6" ry="2.8" fill="#fff" opacity="0.55" transform="rotate(-28 10.4 11.2)" />
        <g clipPath={`url(#${uid}-ironClip)`}>
          <path d="M2.2 16.8C6.4 20.4 10.2 19.6 14 15C17.8 10.4 22.4 11.2 29.8 15.2" fill="none" stroke="#d2cdc4" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M2.2 17.2C6.4 20.8 10.2 20 14 15.4C17.8 10.8 22.4 11.6 29.8 15.6" fill="none" stroke="#050403" strokeWidth="1.55" strokeLinecap="round" />
          <ellipse cx="23.4" cy="10.2" rx="2.7" ry="1.9" fill="#050403" stroke="#d2cdc4" strokeWidth="0.7" transform="rotate(-16 23.4 10.2)" />
          <ellipse cx="22.9" cy="9.8" rx="1.2" ry="0.7" fill="#5c5852" transform="rotate(-16 22.9 9.8)" />
          <ellipse cx="17.2" cy="21.2" rx="2.45" ry="1.7" fill="#050403" stroke="#d2cdc4" strokeWidth="0.7" transform="rotate(14 17.2 21.2)" />
          <ellipse cx="16.8" cy="20.8" rx="1.05" ry="0.6" fill="#5c5852" transform="rotate(14 16.8 20.8)" />
        </g>
        <defs>
          <radialGradient id={`${uid}-iron`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#4a4642" />
            <stop offset="20%" stopColor="#161412" />
            <stop offset="100%" stopColor="#050403" />
          </radialGradient>
          <clipPath id={`${uid}-ironClip`}>
            <circle cx="16" cy="16" r="13.6" />
          </clipPath>
        </defs>
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 181 176" aria-hidden="true">
      <image href="/assets/quaffle.png" width="181" height="176" />
    </svg>
  );
}
