import { buildMassMatrix, solveLinearSystem } from "./mass-matrix";
import { buildPotentialEnergy } from "./potential-energy";

/**
 * Computes kinetic and potential energies, and the total Hamiltonian mechanical energy.
 * 
 * Kinetic: T = 1/2 * p^T * \dot{q} = 1/2 * p^T * M(q)^-1 * p
 * Potential: V = V(q)
 * Hamiltonian: H = T + V
 */
export function getEnergies(
  q: number[],
  p: number[],
  masses: number[],
  lengths: number[],
  g: number
): { T: number; V: number; H: number; dq: number[] } {
  const N = q.length;

  // 1. Build configuration mass matrix M(q)
  const M = buildMassMatrix(q, masses, lengths);

  // 2. Solve M * dq = p for velocities dq
  const dq = solveLinearSystem(M, p);

  // 3. Kinetic energy: T = 0.5 * sum(p_i * dq_i)
  let T = 0;
  for (let i = 0; i < N; i++) {
    T += p[i] * dq[i];
  }
  T = 0.5 * T;

  // 4. Potential energy: V(q)
  const V = buildPotentialEnergy(q, masses, lengths, g);

  return { T, V, H: T + V, dq };
}
