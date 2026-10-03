import numpy as np
import pytest

from cplab.integrators import implicit_midpoint_step, integrate, rk4_step


def oscillator(t, y):
    return np.array([y[1], -y[0]])


@pytest.mark.parametrize("step, order", [(rk4_step, 4), (implicit_midpoint_step, 2)])
def test_convergence_order(step, order):
    """Global error at t=1 on the harmonic oscillator scales as dt^order."""
    y0 = np.array([1.0, 0.0])
    exact = np.array([np.cos(1.0), -np.sin(1.0)])
    errors = []
    for n in (20, 40, 80):
        _, ys = integrate(step, oscillator, y0, 1.0 / n, n)
        errors.append(np.linalg.norm(ys[-1] - exact))
    observed = np.log2(np.array(errors[:-1]) / np.array(errors[1:]))
    assert np.allclose(observed, order, atol=0.1)


def test_implicit_midpoint_conserves_quadratic_invariant():
    """Implicit midpoint preserves q^2 + p^2 to round-off, for any dt."""
    _, ys = integrate(implicit_midpoint_step, oscillator, np.array([1.0, 0.0]), 0.5, 2000)
    energy = (ys**2).sum(axis=1)
    assert np.max(np.abs(energy - 1.0)) < 1e-11
