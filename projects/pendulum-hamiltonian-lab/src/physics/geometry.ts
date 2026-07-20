export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculates the Cartesian (x, y) position of each mass in the pendulum chain.
 * The pivot point is located at (0, 0).
 * 
 * y increases vertically upwards, so the pendulum hangs in the negative y region.
 * Absolute angles theta_i are measured from the vertical downward direction.
 */
export function getMassPositions(q: number[], lengths: number[]): Point2D[] {
  const N = q.length;
  const positions: Point2D[] = [{ x: 0, y: 0 }]; // Pivot at index 0

  let currentX = 0;
  let currentY = 0;

  for (let i = 0; i < N; i++) {
    const theta = q[i];
    const L = lengths[i];

    currentX += L * Math.sin(theta);
    currentY -= L * Math.cos(theta); // downward suspension in standard coordinates

    positions.push({ x: currentX, y: currentY });
  }

  return positions;
}
