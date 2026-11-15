export function Ball({ kind, className }: { kind: "quaffle" | "bludger" | "snitch"; className?: string }) {
  const cls = ["ball", kind, className].filter(Boolean).join(" ");
  if (kind === "snitch") {
    return <img className={`${cls} gif`} src="/assets/snitch.gif" alt="" draggable={false} />;
  }
  if (kind === "bludger") {
    const parked = className?.includes("on-player");
    if (parked) return <img className={cls} src="/assets/bludger.png" alt="" draggable={false} />;
    const alt = className?.includes("dart-b");
    return <img className={`${cls} gif-roam`} src={alt ? "/assets/bludger-b.gif" : "/assets/bludger.gif"} alt="" draggable={false} />;
  }
  return (
    <svg className={cls} viewBox="0 0 181 176" aria-hidden="true">
      <image href="/assets/quaffle.png" width="181" height="176" />
    </svg>
  );
}
