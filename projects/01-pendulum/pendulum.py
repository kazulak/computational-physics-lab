"""Planar N-link pendulum (point masses, massless rigid rods) in Hamiltonian form.

Coordinates q_i are absolute angles from the downward vertical, p_i the
conjugate momenta. With A_ij = l_i l_j sum_{k >= max(i,j)} m_k:

    M_ij(q) = A_ij cos(q_i - q_j)
    H(q, p) = 1/2 p^T M(q)^{-1} p + sum_j g l_j (sum_{k>=j} m_k) (1 - cos q_j)
    dq/dt   = M^{-1} p
    dp_r/dt = -g l_r (sum_{k>=r} m_k) sin q_r - qdot_r sum_k A_rk qdot_k sin(q_r - q_k) + Q_r

Q(t, q, qdot) is an optional generalized force (damping, driving), acting on
the absolute angles. Note: a motor *at a joint* between links i-1 and i
would instead enter as Q_i = +tau, Q_{i-1} = -tau.
"""

import numpy as np


class NPendulum:
    def __init__(self, masses, lengths, g=9.81, generalized_force=None):
        self.m = np.asarray(masses, dtype=float)
        self.l = np.asarray(lengths, dtype=float)
        if self.m.ndim != 1 or self.m.shape != self.l.shape or self.m.size == 0:
            raise ValueError("masses and lengths must be non-empty 1D arrays of equal length")
        if np.any(self.m <= 0) or np.any(self.l <= 0):
            raise ValueError("masses and lengths must be positive")
        self.n = self.m.size
        self.g = float(g)
        self.Q = generalized_force
        tail_mass = np.cumsum(self.m[::-1])[::-1]  # sum_{k>=j} m_k
        idx = np.arange(self.n)
        self.A = np.outer(self.l, self.l) * tail_mass[np.maximum.outer(idx, idx)]
        self.k_grav = self.g * self.l * tail_mass  # V = sum k_grav (1 - cos q)

    def split(self, y):
        return y[: self.n], y[self.n :]

    def mass_matrix(self, q):
        return self.A * np.cos(np.subtract.outer(q, q))

    def velocities(self, q, p):
        return np.linalg.solve(self.mass_matrix(q), p)

    def energy(self, y):
        q, p = self.split(y)
        T = 0.5 * p @ self.velocities(q, p)
        V = self.k_grav @ (1 - np.cos(q))
        return T + V

    def rhs(self, t, y):
        q, p = self.split(y)
        qdot = self.velocities(q, p)
        pdot = -self.k_grav * np.sin(q) - qdot * ((self.A * np.sin(np.subtract.outer(q, q))) @ qdot)
        if self.Q is not None:
            pdot = pdot + self.Q(t, q, qdot)
        return np.concatenate([qdot, pdot])

    def state_from_angles(self, q, qdot):
        """Build y = (q, p) from angles and angular velocities."""
        q = np.asarray(q, dtype=float)
        return np.concatenate([q, self.mass_matrix(q) @ np.asarray(qdot, dtype=float)])

    def positions(self, q):
        """Cartesian bob positions (x, y), pivot at origin, y pointing up."""
        q = np.atleast_2d(q)
        x = np.cumsum(self.l * np.sin(q), axis=-1)
        y = -np.cumsum(self.l * np.cos(q), axis=-1)
        return np.stack([x, y], axis=-1)
