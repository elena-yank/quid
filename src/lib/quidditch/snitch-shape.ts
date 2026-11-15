/** Golden Snitch feathers in local space: hub (0,0), +x outward, −y up. */

export const SNITCH = {
  viewW: 100,
  viewH: 64,
  cx: 50,
  cy: 45,
  ballR: 6.4,
  hubDist: 4.8,
  hubDrop: -1.6,
  /** Feather thickness in viewBox units. Gaps stay visible between tips. */
  feather: 1.85,
};

export type Pt = [number, number];

export type Feather = { c: Pt; t: Pt; spine: Pt[] };

function quad(p0: Pt, p1: Pt, p2: Pt, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const omt = 1 - u;
    pts.push([omt * omt * p0[0] + 2 * omt * u * p1[0] + u * u * p2[0], omt * omt * p0[1] + 2 * omt * u * p1[1] + u * u * p2[1]]);
  }
  return pts;
}

/** Tips follow one smooth outer curve; feathers stay nearly parallel and separated. */
export function snitchFeathers(): Feather[] {
  const n = 9;
  const feathers: Feather[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const omt = 1 - t;
    const tip: Pt = [
      omt * omt * 43 + 2 * omt * t * 34 + t * t * 20,
      omt * omt * -16 + 2 * omt * t * -5 + t * t * -0.5,
    ];
    const c: Pt = [tip[0] * 0.44, tip[1] * 0.45 - 6 * omt];
    feathers.push({ c, t: tip, spine: quad([0, 0], c, tip, 12) });
  }
  return feathers;
}

export function snitchHub(side: "left" | "right"): Pt {
  const sign = side === "right" ? 1 : -1;
  return [SNITCH.cx + sign * SNITCH.hubDist, SNITCH.cy + SNITCH.hubDrop];
}

export function placePts(pts: Pt[], side: "left" | "right"): Pt[] {
  const [hx, hy] = snitchHub(side);
  const sign = side === "right" ? 1 : -1;
  return pts.map(([x, y]) => [hx + sign * x, hy + y]);
}

export function placeFeatherPath(feather: Feather, side: "left" | "right"): string {
  const [hx, hy] = snitchHub(side);
  const sign = side === "right" ? 1 : -1;
  const [cx, cy] = feather.c;
  const [tx, ty] = feather.t;
  return `M ${hx.toFixed(2)} ${hy.toFixed(2)} Q ${(hx + sign * cx).toFixed(2)} ${(hy + cy).toFixed(2)} ${(hx + sign * tx).toFixed(2)} ${(hy + ty).toFixed(2)}`;
}

let cached: Feather[] | null = null;
export function snitchFeathersCached(): Feather[] {
  cached ??= snitchFeathers();
  return cached;
}
