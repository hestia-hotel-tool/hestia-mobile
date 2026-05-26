/**
 * Encoding utilities (e.g. base64 to ArrayBuffer for uploads)
 */

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = base64.replace(/=+$/, '');
  const bytes = Math.floor((clean.length * 3) / 4);
  const arr = new Uint8Array(bytes);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)] ?? 0;
    const b = lookup[clean.charCodeAt(i + 1)] ?? 0;
    const c = lookup[clean.charCodeAt(i + 2)] ?? 0;
    const d = lookup[clean.charCodeAt(i + 3)] ?? 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    arr[p++] = (n >> 16) & 0xff;
    if (p < bytes) arr[p++] = (n >> 8) & 0xff;
    if (p < bytes) arr[p++] = n & 0xff;
  }
  return arr.buffer;
}
