/**
 * Computes the gravitational potential energy V(q) of the pendulum.
 * The potential energy is normalized to zero at the downward equilibrium position (q = 0).
 * 
 * V(q) = sum_{j=0}^{N-1} ( M'_j * g * l_j * (1 - cos(q_j)) )
 * where M'_j = sum_{i=j}^{N-1} m_i
 */
export function buildPotentialEnergy(q: number[], masses: number[], lengths: number[], g: number): number {
  const N = q.length;
  let V = 0;

  // Compute cumulative masses: cumMass[j] = sum_{i=j}^{N-1} m_i
  const cumMass = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let sum = 0;
    for (let i = j; i < N; i++) {
      sum += masses[i];
    }
    cumMass[j] = sum;
  }

  for (let j = 0; j < N; j++) {
    const M_prime = cumMass[j];
    V += M_prime * g * lengths[j] * (1 - Math.cos(q[j]));
  }

  return V;
}
