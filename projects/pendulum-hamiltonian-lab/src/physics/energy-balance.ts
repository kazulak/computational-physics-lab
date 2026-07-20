/**
 * Computes instantaneous power rates for the pendulum system.
 * 
 * Input Power = sum_i ( dq_i * tau_i )
 * Damping Loss = sum_i ( -b_i * dq_i^2 )
 * Net Power = Input Power + Damping Loss
 */
export function calculatePowerRates(
  dq: number[],
  dampingCoefficients: number[],
  appliedTorques: number[]
): {
  inputPower: number;
  dampingLoss: number;
  netPower: number;
} {
  const N = dq.length;
  let inputPower = 0;
  let dampingLoss = 0;

  for (let i = 0; i < N; i++) {
    const b = dampingCoefficients[i] ?? 0;
    const tau = appliedTorques[i] ?? 0;
    const vel = dq[i];

    inputPower += vel * tau;
    dampingLoss -= b * vel * vel; // Loss is negative
  }

  return {
    inputPower,
    dampingLoss,
    netPower: inputPower + dampingLoss,
  };
}
