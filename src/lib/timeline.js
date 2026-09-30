/*
 * One timeline for the stage, shared by the CSS poster and the WebGL scene.
 * p runs 0 → 1 over the pinned scroll distance.
 *
 *   0.00 – 0.205  the finished monolith is stripped back, front coat first
 *   0.205 – 0.87  four coats are laid on again, one per step
 *   0.87 – 1.00   the lime finish fills the frame and becomes the page
 */

export const P_COATS = 0.205;
export const P_WASH = 0.87;
const STEP = (P_WASH - P_COATS) / 4;

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

export function sample(p) {
  const c = clamp01((p - P_COATS) / (P_WASH - P_COATS)) * 4; // 0 – 4, continuous through the coats
  const step = p < P_COATS ? 0 : Math.min(4, Math.floor((p - P_COATS) / STEP) + 1);
  const wash = smooth(0.885, 1, p);
  const e = mix(0.16, 1, smooth(0, P_COATS, p)) * (1 - smooth(0.86, 1, p));

  // Presence of each coat (1 = laid on, 0 = lifted clear of the wall).
  const h = clamp01(p / P_COATS);
  const presence = [1, 1, 1, 1];
  for (let i = 1; i < 4; i++) {
    if (p < P_COATS) {
      const start = (3 - i) * 0.2;
      presence[i] = 1 - smooth(start, start + 0.5, h);
    } else {
      presence[i] = smooth(i - 0.1, i + 0.5, c);
    }
  }
  return { p, c, step, wash, e, presence, push: smooth(0.8, 1, p) };
}
