import numpy as np
import pytest
from scipy.integrate import solve_ivp
from scipy.special import ellipk

from cplab.integrators import implicit_midpoint_step, rk4_step
from pendulum import NPendulum

RNG = np.random.default_rng(0)


def numerical_jacobian(F, x, h=1e-6):
    return np.array([(F(x + h * e) - F(x - h * e)) / (2 * h) for e in np.eye(len(x))]).T


def test_rhs_is_hamiltons_equations():
    """dq/dt = dH/dp and dp/dt = -dH/dq, checked against finite differences of H."""
    sys = NPendulum([1.0, 0.7, 1.3], [1.0, 0.8, 1.2])
    y = RNG.normal(size=6)
    grad_H = numerical_jacobian(lambda z: np.array([sys.energy(z)]), y)[0]
    expected = np.concatenate([grad_H[3:], -grad_H[:3]])
    assert np.allclose(sys.rhs(0.0, y), expected, atol=1e-7)


def test_mass_matrix_symmetric_positive_definite():
    sys = NPendulum([1.0, 1.2, 0.8, 0.5], [1.0, 0.8, 1.2, 0.6])
    M = sys.mass_matrix(RNG.uniform(-np.pi, np.pi, 4))
    assert np.allclose(M, M.T)
    assert np.all(np.linalg.eigvalsh(M) > 0)


def test_double_pendulum_matches_textbook_lagrangian():
    """Compare against the standard closed-form double-pendulum accelerations."""
    m1, m2, l1, l2, g = 1.0, 2.0, 1.0, 0.5, 9.81
    sys = NPendulum([m1, m2], [l1, l2], g)
    th, w = np.array([0.4, -1.1]), np.array([0.3, 2.0])
    d = th[0] - th[1]
    den = 2 * m1 + m2 - m2 * np.cos(2 * d)
    a1 = (-g * (2 * m1 + m2) * np.sin(th[0]) - m2 * g * np.sin(th[0] - 2 * th[1])
          - 2 * np.sin(d) * m2 * (w[1] ** 2 * l2 + w[0] ** 2 * l1 * np.cos(d))) / (l1 * den)
    a2 = (2 * np.sin(d) * (w[0] ** 2 * l1 * (m1 + m2) + g * (m1 + m2) * np.cos(th[0])
          + w[1] ** 2 * l2 * m2 * np.cos(d))) / (l2 * den)
    y = sys.state_from_angles(th, w)
    # qddot = d/dt (M^{-1} p): differentiate qdot along the flow numerically
    eps = 1e-6
    qdot = lambda z: sys.velocities(*sys.split(z))
    qddot = (qdot(y + eps * sys.rhs(0, y)) - qdot(y - eps * sys.rhs(0, y))) / (2 * eps)
    assert np.allclose(qddot, [a1, a2], rtol=1e-6)


@pytest.mark.parametrize("theta0", [0.1, 2.0, 3.0])
def test_single_pendulum_period_matches_elliptic_integral(theta0):
    """Exact period T = 4 sqrt(l/g) K(sin^2(theta0/2)) at any amplitude."""
    l, g = 1.3, 9.81
    sys = NPendulum([0.5], [l], g)
    T_exact = 4 * np.sqrt(l / g) * ellipk(np.sin(theta0 / 2) ** 2)
    crossing = lambda t, y: y[0]  # q = 0 crossings are half a period apart
    sol = solve_ivp(sys.rhs, (0, 3 * T_exact), [theta0, 0.0], events=crossing,
                    rtol=1e-11, atol=1e-12)
    t_cross = sol.t_events[0]
    assert np.isclose(2 * np.mean(np.diff(t_cross)), T_exact, rtol=1e-7)


def test_implicit_midpoint_is_symplectic_and_rk4_is_not():
    """One-step map Phi must satisfy D Phi^T J D Phi = J (non-separable H, N=2)."""
    sys = NPendulum([1.0, 1.0], [1.0, 1.0])
    y0, dt = np.array([1.0, -0.5, 0.3, 0.2]), 0.05
    J = np.block([[np.zeros((2, 2)), np.eye(2)], [-np.eye(2), np.zeros((2, 2))]])
    defect = {}
    for step in (implicit_midpoint_step, rk4_step):
        D = numerical_jacobian(lambda y: step(sys.rhs, 0.0, y, dt), y0)
        defect[step] = np.linalg.norm(D.T @ J @ D - J)
    assert defect[implicit_midpoint_step] < 1e-8
    assert defect[rk4_step] > 1e-7


def test_rejects_unphysical_parameters():
    with pytest.raises(ValueError):
        NPendulum([], [])
    with pytest.raises(ValueError):
        NPendulum([1.0, 2.0], [1.0])
    with pytest.raises(ValueError):
        NPendulum([1.0], [-1.0])
