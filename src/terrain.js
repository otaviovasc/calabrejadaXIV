// Safe rows use paving; roads and rivers never host trees, even decoratively.
// The legacy isGrass name identifies safe terrain, independent of its artwork.
export function isGrass(kind) {
  return kind === 'start' || kind === 'sidewalk' || kind === 'rest';
}
