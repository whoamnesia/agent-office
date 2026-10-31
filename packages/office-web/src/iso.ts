/** Isometric projection: tile = 32×16 art pixels; z is pixels up. */
export const TW = 32;
export const TH = 16;

export function isoX(tx: number, ty: number): number {
  return (tx - ty) * (TW / 2);
}
export function isoY(tx: number, ty: number, z = 0): number {
  return (tx + ty) * (TH / 2) - z;
}
/** Screen (world-container space) → tile coordinates on the plane z. */
export function unIso(sx: number, sy: number, z = 0): [number, number] {
  const a = sx / (TW / 2);
  const b = (sy + z) / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
}
/** Depth key for painter's sorting (larger = closer to the camera). */
export function depth(tx: number, ty: number, bias = 0): number {
  return tx + ty + bias;
}
