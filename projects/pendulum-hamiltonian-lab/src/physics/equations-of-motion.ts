import { buildMassMatrix, solveLinearSystem } from "./mass-matrix";
import { computeTotalGeneralizedForce, GeneralizedForce } from "./external-forces";
import { PendulumSystem } from "./types";

/**
 * Computes the time derivative of the canonical state vector [dq/dt, dp/dt].
 * 
 * q: absolute link angles (radians)
 * p: canonical momenta (kg m²/s)
 * t: current time (seconds)
 * system: pendulum specifications (masses, lengths, gravity)
 * forces: composable force models
 * 
 * Returns state derivatives packed as [dq_0, ..., dq_{N-1}, dp_0, ..., dp_{N-1}].
 */
export function getEquationsOfMotion(
  q: number[],
  p: number[],
  t: number,
  system: PendulumSystem,
  forces: GeneralizedForce[]
): number[] {
  const N = q.length;
  const masses = system.links.map(l => l.massKg);
  const lengths = system.links.map(l => l.lengthM);
  const g = system.gravityMPerSec2;

  // 1. Solve M(q) * dq/dt = p for generalized velocities
  const M = buildMassMatrix(q, masses, lengths);
  const dq = solveLinearSystem(M, p);

  // Precompute cumulative masses M'_j = sum_{i=j}^{N-1} m_i
  const cumMass = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let sum = 0;
    for (let i = j; i < N; i++) {
      sum += masses[i];
    }
    cumMass[j] = sum;
  }

  // 2. Compute generalized external forces Q
  const Q = computeTotalGeneralizedForce(t, q, dq, system, forces);

  // 3. Compute momentum derivatives dp/dt
  const dp = new Array(N).fill(0);
  for (let r = 0; r < N; r++) {
    // Gravity torque: - M'_r * g * l_r * sin(q_r)
    const gravityTorque = -cumMass[r] * g * lengths[r] * Math.sin(q[r]);

    // Coriolis / centrifugal interaction torque
    let centrifugalTorque = 0;
    for (let k = 0; k < N; k++) {
      const maxIdx = Math.max(r, k);
      const A_rk = lengths[r] * lengths[k] * cumMass[maxIdx];
      // Note: Math.sin(q[r] - q[k]) is computed using absolute angles
      centrifugalTorque -= A_rk * dq[r] * dq[k] * Math.sin(q[r] - q[k]);
    }

    dp[r] = gravityTorque + centrifugalTorque + Q[r];
  }

  return [...dq, ...dp];
}
