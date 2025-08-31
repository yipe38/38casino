export class ProvablyFair {
  async sha256(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return new Uint8Array(buf);
  }
}

/**
 * Create a deterministic number stream in [0,1) derived from seeds.
 * We concatenate seeds and increment an inner counter to derive enough entropy.
 */
export async function hashToNumbers(pfHelper, seeds, count) {
  const { serverSeed, clientSeed, nonce } = seeds;
  const numbers = [];
  let i = 0;
  while (numbers.length < count) {
    const msg = `${serverSeed}|${clientSeed}|${nonce}|chunk:${i}`;
    const bytes = await pfHelper.sha256(msg);
    // turn bytes into 8 numbers in [0,1)
    for (let off = 0; off + 4 <= bytes.length && numbers.length < count; off += 4) {
      const v = (bytes[off] << 24) | (bytes[off+1] << 16) | (bytes[off+2] << 8) | (bytes[off+3]);
      // unsigned 32-bit -> normalize
      const u = (v >>> 0) / 2**32;
      numbers.push(u);
    }
    i++;
  }
  return numbers;
}
