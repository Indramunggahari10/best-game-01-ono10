// A small seeded RNG (mulberry32): the same seed always deals the same sky, so a
// screenshot staged from a seed is the same frame every time it is taken.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value in [min, max) from the RNG, and a random pick from a list.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
