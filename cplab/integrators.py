"""Fixed-step ODE integrators for y' = f(t, y).

Only methods that at least one project actually uses live here.
"""

import numpy as np


def rk4_step(f, t, y, dt):
    """Classical 4th-order Runge-Kutta. Accurate, but not symplectic:
    energy error drifts secularly over long Hamiltonian runs."""
    k1 = f(t, y)
    k2 = f(t + dt / 2, y + dt / 2 * k1)
    k3 = f(t + dt / 2, y + dt / 2 * k2)
    k4 = f(t + dt, y + dt * k3)
    return y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def implicit_midpoint_step(f, t, y, dt, tol=1e-13, max_iter=100):
    """Implicit midpoint rule, y1 = y + dt f(t + dt/2, (y + y1)/2).

    2nd order and symplectic for *any* Hamiltonian, including non-separable
    ones such as the multi-link pendulum where explicit symplectic Euler /
    leapfrog do not apply. It also conserves quadratic invariants exactly.
    Solved by fixed-point iteration (converges for dt * Lip(f) < 2).
    """
    y1 = y + dt * f(t, y)
    for _ in range(max_iter):
        y_new = y + dt * f(t + dt / 2, (y + y1) / 2)
        if np.max(np.abs(y_new - y1)) < tol:
            return y_new
        y1 = y_new
    raise RuntimeError("implicit midpoint: fixed-point iteration did not converge; reduce dt")


def integrate(step, f, y0, dt, n_steps, t0=0.0):
    """Run `n_steps` of `step`; return times (n+1,) and states (n+1, dim)."""
    ys = np.empty((n_steps + 1, len(y0)))
    ys[0] = y0
    t = t0
    for i in range(n_steps):
        ys[i + 1] = step(f, t, ys[i], dt)
        t += dt
    return t0 + dt * np.arange(n_steps + 1), ys
