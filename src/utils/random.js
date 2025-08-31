import { hashToNumbers } from './provablyFair.js';

/** Choose bomb positions using provably fair keystream (deterministic) or secure RNG fallback. */
export async function chooseBombPositions(rows, cols, bombCount, pfHelper, pfSeeds) {
  const total = rows * cols;
  const indexes = Array.from({length: total}, (_, i) => i);

  // Try provably-fair stream -> shuffle indexes by score, pick first b
  try {
    const stream = await hashToNumbers(pfHelper, pfSeeds, total);
    // Pair each index with a score from the stream and sort
    const paired = indexes.map((i, idx) => [i, stream[idx]]);
    paired.sort((a, b) => a[1] - b[1]);
    const bombs = new Set(paired.slice(0, bombCount).map(p => p[0]));
    return bombs;
  } catch (e) {
    console.warn('ProvablyFair not available, fallback to crypto RNG', e);
    // Fallback: Fisher–Yates with crypto
    for (let i = total - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return new Set(indexes.slice(0, bombCount));
  }
}

/** Fair multiplier after k safe reveals (no house edge) = C(n, k) / C(n-b, k) */
export function fairMultiplier(n, b, k) {
  if (k <= 0) return 1;
  if (k > n - b) return Infinity;
  // compute ratio safely without huge factorials:
  // C(n, k) / C(n-b, k) = Product_{i=0..k-1} (n - i) / (n - b - i)
  let ratio = 1;
  for (let i = 0; i < k; i++) {
    ratio *= (n - i) / (n - b - i);
  }
  return ratio;
}
