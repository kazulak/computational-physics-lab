"""2D Ising model on an L x L square lattice (periodic boundaries, J = 1, h = 0, k_B = 1).

    E(s) = - sum_<ij> s_i s_j,   s_i = +-1,   P(s) ~ exp(-E/T)
    T_c  = 2 / ln(1 + sqrt 2) = 2.26919...     (Onsager)

energy() and magnetization() return totals; run_* and exact() return per-spin values.
Algorithms: checkerboard Metropolis (local) and Wolff (cluster). Reference: exact L = 4
enumeration and Onsager's infinite-lattice u(T), m(T). Statistics: blocking, jackknife, tau_int.
All randomness comes from a numpy Generator passed in, so every run is reproducible.
"""

from functools import lru_cache

import numpy as np
from scipy.special import ellipk

TC = 2 / np.log(1 + np.sqrt(2))


# ---------------------------------------------------------------- model
def energy(s):
    """Total energy; each bond counted once via the right and down neighbours."""
    return -int(np.sum(s * (np.roll(s, 1, 0) + np.roll(s, 1, 1))))


def magnetization(s):
    return int(s.sum())


def local_dE(s):
    """Energy change if each single spin were flipped: 2 s_i * (sum of its 4 neighbours)."""
    nb = np.roll(s, 1, 0) + np.roll(s, -1, 0) + np.roll(s, 1, 1) + np.roll(s, -1, 1)
    return 2 * s * nb


@lru_cache(maxsize=None)
def _sublattices(L):
    parity = (np.add.outer(np.arange(L), np.arange(L)) & 1).astype(bool)
    return ~parity, parity


def metropolis_sweep(s, beta, rng):
    """One sweep, in place: update the two checkerboard sublattices in turn.
    Same-colour sites share no bond, so their simultaneous update is exact Metropolis (needs even L)."""
    if s.shape[0] % 2:
        raise ValueError("checkerboard update needs even L")
    table = np.minimum(1.0, np.exp(-beta * np.arange(-8, 9, 4)))  # accept prob for dE = -8..8
    u = rng.random((2,) + s.shape)
    for mask, ui in zip(_sublattices(s.shape[0]), u):
        flip = (ui < table[local_dE(s) // 4 + 2]) & mask
        s[flip] *= -1


@lru_cache(maxsize=None)
def _neighbours(L):
    x, y = np.divmod(np.arange(L * L), L)
    return list(zip(*[(a % L * L + b % L).tolist() for a, b in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))]))


def wolff_step(s, beta, rng):
    """Grow one cluster from a random seed (bond probability 1 - exp(-2 beta)) and flip it.
    Returns the cluster size."""
    p, nbrs = 1 - np.exp(-2 * beta), _neighbours(s.shape[0])
    spins = memoryview(s.reshape(-1))  # plain-int access into the (contiguous) array: much faster than numpy scalars
    seed = int(rng.integers(len(spins)))
    spin = spins[seed]
    spins[seed] = -spin
    stack, size = [seed], 1
    while stack:
        for j in nbrs[stack.pop()]:
            if spins[j] == spin and rng.random() < p:
                spins[j] = -spin
                stack.append(j)
                size += 1
    return size


# ---------------------------------------------------------------- runs
def initial_state(L, T, rng):
    """Ordered start below T_c, random start above."""
    return np.ones((L, L), np.int8) if T < TC else (2 * rng.integers(0, 2, (L, L)) - 1).astype(np.int8)


def run_metropolis(L, T, n_meas, rng, n_therm=0):
    """Return per-spin e, m after each sweep (n_therm sweeps discarded)."""
    s, beta, N = initial_state(L, T, rng), 1 / T, L * L
    e, m = np.empty(n_meas), np.empty(n_meas)
    for k in range(n_therm + n_meas):
        metropolis_sweep(s, beta, rng)
        if k >= n_therm:
            e[k - n_therm], m[k - n_therm] = energy(s) / N, magnetization(s) / N
    return e, m


def run_wolff(L, T, n_meas, rng, n_therm=10, per_sweep=True):
    """Return per-spin e, m and dt, the mean number of sweeps (flipped sites / N) per measurement.
    n_therm is the burn-in in sweeps of work (flipped sites / N).
    per_sweep=True: measure after a fixed number of clusters, ~ N / <cluster size> (calibrated after
    burn-in), i.e. about one sweep of work; False: after every cluster, for tau_int.
    (A stopping rule that depends on the cluster sizes themselves would bias the averages.)"""
    s, beta, N = initial_state(L, T, rng), 1 / T, L * L
    e, m = np.empty(n_meas), np.empty(n_meas)
    burned = 0
    while burned < n_therm * N:
        burned += wolff_step(s, beta, rng)
    sizes = [wolff_step(s, beta, rng) for _ in range(50)]
    steps = max(1, round(N / np.mean(sizes))) if per_sweep else 1
    flipped = 0
    for k in range(n_meas):
        flipped += sum(wolff_step(s, beta, rng) for _ in range(steps))
        e[k], m[k] = energy(s) / N, magnetization(s) / N
    return e, m, flipped / (N * n_meas)


# ---------------------------------------------------------------- exact references
@lru_cache(maxsize=None)
def _all_states(L):
    bits = (np.arange(2 ** (L * L))[:, None] >> np.arange(L * L)) & 1
    s = (2 * bits - 1).astype(np.int8).reshape(-1, L, L)
    E = -(s * (np.roll(s, 1, 1) + np.roll(s, 1, 2))).sum((1, 2), dtype=np.int64)
    return E, s.sum((1, 2), dtype=np.int64)


def exact(T, L=4):
    """Exact finite-lattice averages by enumerating all 2^(L^2) states: <e>, <|m|>."""
    E, M = _all_states(L)
    N, w = L * L, np.exp(-(E - E.min()) / T)
    w /= w.sum()
    return {"e": w @ E / N, "absm": w @ np.abs(M) / N}


def onsager_u(T):
    """Energy per spin of the infinite lattice (T != T_c)."""
    b = 1 / np.asarray(T, float)
    k = 2 * np.sinh(2 * b) / np.cosh(2 * b) ** 2
    return -(1 / np.tanh(2 * b)) * (1 + 2 / np.pi * (2 * np.tanh(2 * b) ** 2 - 1) * ellipk(k**2))


def onsager_m(T):
    """Spontaneous magnetization (1 - sinh(2/T)^-4)^(1/8) below T_c, 0 above."""
    T = np.asarray(T, float)
    x = 1 - np.sinh(2 / T) ** -4.0
    return np.where(T < TC, np.maximum(x, 0) ** 0.125, 0.0)


# ---------------------------------------------------------------- statistics
def blocking_error(x, min_blocks=32):
    """Standard error of the mean by repeated pairwise blocking; the largest value over
    block sizes that still leave >= min_blocks blocks (it plateaus once blocks exceed tau)."""
    x, err = np.asarray(x, float), []
    while len(x) >= min_blocks:
        err.append(np.sqrt(x.var(ddof=1) / len(x)))
        x = x[: len(x) // 2 * 2].reshape(-1, 2).mean(1)
    return max(err)


def jackknife(f, *series, n_blocks=20):
    """f(means of series) and its blocked-jackknife error; blocks must exceed the correlation time."""
    n = len(series[0]) // n_blocks * n_blocks
    blocks = np.array([np.asarray(x[:n], float).reshape(n_blocks, -1).mean(1) for x in series])
    full = f(*blocks.mean(1))
    loo = np.array([f(*np.delete(blocks, i, axis=1).mean(1)) for i in range(n_blocks)])
    return full, np.sqrt((n_blocks - 1) / n_blocks * np.sum((loo - loo.mean()) ** 2))


def tau_int(x, c=6.0):
    """Integrated autocorrelation time tau = 1/2 + sum_{t=1}^W rho(t) and its error, with Sokal's
    automatic window: the smallest W with W >= c * tau(W). Returns (nan, nan) if no such W."""
    x = np.asarray(x, float) - np.mean(x)
    n = len(x)
    f = np.fft.rfft(x, 2 * n)
    acf = np.fft.irfft(f * f.conj())[:n] / (n - np.arange(n))
    tau = 0.5 + np.cumsum(acf[1:] / acf[0])
    W = np.nonzero(np.arange(1, n) >= c * tau)[0]
    if len(W) == 0:
        return np.nan, np.nan
    W = W[0] + 1
    return tau[W - 1], tau[W - 1] * np.sqrt((4 * W + 2) / n)
