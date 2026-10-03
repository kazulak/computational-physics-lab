import numpy as np
import pytest

from ising import (TC, blocking_error, energy, exact, local_dE, magnetization, metropolis_sweep,
                   onsager_m, onsager_u, run_metropolis, run_wolff, tau_int)

RNG = np.random.default_rng(0)


def random_state(L, rng=RNG):
    return (2 * rng.integers(0, 2, (L, L)) - 1).astype(np.int8)


def test_local_dE_equals_global_energy_difference():
    """The dE that Metropolis uses must equal E(flipped) - E(s), for random sites and states."""
    for L in (4, 5, 8):
        s = random_state(L)
        dE = local_dE(s)
        for _ in range(30):
            i, j = RNG.integers(0, L, 2)
            t = s.copy()
            t[i, j] *= -1
            assert energy(t) - energy(s) == dE[i, j]


def test_ground_state_and_energy_range():
    s = np.ones((6, 6), np.int8)
    assert energy(s) == -2 * 36 and magnetization(s) == 36
    assert energy(random_state(6)) >= -2 * 36


def test_metropolis_sweep_at_infinite_temperature_flips_every_spin():
    """beta = 0: every proposal is accepted, so one sweep is s -> -s. Also checks the rng is respected."""
    s = random_state(8)
    t = s.copy()
    metropolis_sweep(t, 0.0, np.random.default_rng(1))
    assert np.array_equal(t, -s)
    a, b = random_state(8, np.random.default_rng(5)), random_state(8, np.random.default_rng(5))
    metropolis_sweep(a, 0.4, np.random.default_rng(2))
    metropolis_sweep(b, 0.4, np.random.default_rng(2))
    assert np.array_equal(a, b)


def test_metropolis_sweep_rejects_odd_lattice():
    with pytest.raises(ValueError):
        metropolis_sweep(random_state(5), 0.4, np.random.default_rng(0))


@pytest.mark.parametrize("T", [2.0, 3.0])
def test_enumeration_matches_known_limits(T):
    """Sanity of the enumeration itself: <e> between -2 and 0, <|m|> in (0, 1]."""
    r = exact(T)
    assert -2 < r["e"] < 0 and 0 < r["absm"] <= 1


def check_against_exact(e, m, T, n_sigma=4):
    ex = exact(T)
    for series, key in ((e, "e"), (m, "absm")):
        series = np.abs(series) if key == "absm" else series
        err = blocking_error(series)
        assert abs(series.mean() - ex[key]) < n_sigma * err, (key, T, series.mean(), ex[key], err)


@pytest.mark.parametrize("T", [2.0, 3.0])
def test_metropolis_reproduces_exact_L4(T):
    e, m = run_metropolis(4, T, 12000, np.random.default_rng(1), n_therm=200)
    check_against_exact(e, m, T)


@pytest.mark.parametrize("T", [2.0, 3.0])
def test_wolff_reproduces_exact_L4(T):
    e, m, _ = run_wolff(4, T, 12000, np.random.default_rng(2), n_therm=20)
    check_against_exact(e, m, T)


@pytest.mark.parametrize("T", [1.5, 3.5])
def test_metropolis_L32_energy_matches_onsager(T):
    """Away from T_c the correlation length is xi ~ 1-2 lattice spacings, so periodic L = 32 differs from
    the infinite lattice by ~exp(-L/xi), far below 1e-4: plain 4 sigma, no extra tolerance."""
    e, _ = run_metropolis(32, T, 3000, np.random.default_rng(3), n_therm=300)
    assert abs(e.mean() - onsager_u(T)) < 4 * blocking_error(e)


def test_onsager_limits():
    assert abs(onsager_u(0.2) + 2) < 1e-6
    assert abs(onsager_u(1e3)) < 3e-3 and abs(onsager_u(50.0) + 2 / 50) < 1e-3  # u ~ -2 beta at high T
    assert np.all(np.diff(onsager_u(np.linspace(0.5, 5, 50))) > 0)  # u rises monotonically with T
    assert onsager_m(0.5) > 0.999 and onsager_m(TC - 1e-6) < 0.5 and onsager_m(TC + 0.1) == 0
    assert np.isclose(onsager_m(2.0), 0.911319, atol=1e-6)  # (1 - sinh(1)^-4)^(1/8)


def test_statistics_on_ar1_process():
    """AR(1) with coefficient a has tau_int = 1/2 + a/(1-a) = (1+a)/(2(1-a)); the error of the mean is
    sigma_x sqrt(2 tau / n)."""
    a, n = 0.9, 200_000
    noise = np.random.default_rng(4).normal(size=n)
    x = np.empty(n)
    x[0] = noise[0]
    for i in range(1, n):
        x[i] = a * x[i - 1] + noise[i]
    tau, err = tau_int(x)
    assert abs(tau - (1 + a) / (2 * (1 - a))) < 3 * err
    sigma = 1 / np.sqrt(1 - a**2)
    assert np.isclose(blocking_error(x), sigma * np.sqrt(2 * tau / n), rtol=0.2)
    iid = np.random.default_rng(5).normal(size=n)
    assert np.isclose(blocking_error(iid), 1 / np.sqrt(n), rtol=0.1) and abs(tau_int(iid)[0] - 0.5) < 0.05
