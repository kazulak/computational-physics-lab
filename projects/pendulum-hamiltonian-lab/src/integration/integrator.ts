export type DerivativeFunction = (state: number[], t: number) => number[];

export interface Integrator {
  readonly id: string;
  readonly name: string;
  step(
    deriv: DerivativeFunction,
    state: number[],
    t: number,
    dt: number
  ): number[];
}

export class ForwardEulerIntegrator implements Integrator {
  readonly id = "euler";
  readonly name = "Forward Euler";

  step(deriv: DerivativeFunction, state: number[], t: number, dt: number): number[] {
    const dState = deriv(state, t);
    return state.map((yi, idx) => yi + dt * dState[idx]);
  }
}

export class SymplecticEulerIntegrator implements Integrator {
  readonly id = "symplectic_euler";
  readonly name = "Symplectic Euler";

  step(deriv: DerivativeFunction, state: number[], t: number, dt: number): number[] {
    const half = state.length / 2;
    const q = state.slice(0, half);
    const p = state.slice(half);

    // 1. Find time derivative of momenta dp/dt at state_n
    const dState = deriv(state, t);
    const dp = dState.slice(half);

    // 2. Update momenta: p_{n+1} = p_n + dt * dp/dt
    const pNew = p.map((pi, idx) => pi + dt * dp[idx]);

    // 3. Find time derivative of coordinates dq/dt using q_n and p_{n+1}
    const stateTemp = [...q, ...pNew];
    const dStateTemp = deriv(stateTemp, t);
    const dqNew = dStateTemp.slice(0, half);

    // 4. Update coordinates: q_{n+1} = q_n + dt * dq/dt
    const qNew = q.map((qi, idx) => qi + dt * dqNew[idx]);

    return [...qNew, ...pNew];
  }
}

export class RK4Integrator implements Integrator {
  readonly id = "rk4";
  readonly name = "Runge-Kutta 4th Order (RK4)";

  step(deriv: DerivativeFunction, state: number[], t: number, dt: number): number[] {
    // k1
    const k1 = deriv(state, t);

    // k2
    const stateK2 = state.map((yi, idx) => yi + 0.5 * dt * k1[idx]);
    const k2 = deriv(stateK2, t + 0.5 * dt);

    // k3
    const stateK3 = state.map((yi, idx) => yi + 0.5 * dt * k2[idx]);
    const k3 = deriv(stateK3, t + 0.5 * dt);

    // k4
    const stateK4 = state.map((yi, idx) => yi + dt * k3[idx]);
    const k4 = deriv(stateK4, t + dt);

    // Update state_n+1 = state_n + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)
    return state.map(
      (yi, idx) => yi + (dt / 6.0) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx])
    );
  }
}

export const INTEGRATORS: Record<string, Integrator> = {
  symplectic_euler: new SymplecticEulerIntegrator(),
  rk4: new RK4Integrator(),
  euler: new ForwardEulerIntegrator(),
};
