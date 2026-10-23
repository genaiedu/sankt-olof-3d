const clamp = value => Math.max(0, Math.min(1, value));

// Exponential adaptation is continuous, reversible, and independent of FPS.
// Most of the change takes place over about two seconds after a portal crossing.
export function blendInterior(current, inside, seconds) {
  const target = Number(inside);
  return clamp(current + (target - current) * -Math.expm1(-Math.max(0, seconds) / .75));
}

export function interiorLightValues(day, interior) {
  const d = clamp(day), weight = clamp(interior);
  const mix = (outside, inside) => outside + (inside - outside) * weight;
  return {
    environment: mix(.025 + d * .65, .025 + d * .13),
    hemisphere: mix(.11 + d * 1.05, .12 + d * .48),
    exposure: mix(1.02 + (1 - d) * .5, 1.18),
    window: d * weight
  };
}
