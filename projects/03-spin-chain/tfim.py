"""Spin-1/2 transverse-field Ising chain by exact diagonalization.

    H = -J sum_i sz_i sz_{i+1} - h sum_i sx_i        (Pauli matrices; periodic needs L >= 3)

Basis state s = sum_i b_i 2^i, with sz_i = 1 - 2 b_i. Then sz sz is diagonal (parity of
b_i xor b_{i+1}) and sx_i flips bit i (XOR with 2^i). Critical point h = J, c = 1/2 CFT, z = 1.

Free-fermion reference (Jordan-Wigner with sx as the "occupation" axis, sx_i = 1 - 2 c_i^+ c_i):
    H = sum_ij c^+_i A_ij c_j + 1/2 (c^+_i B_ij c^+_j + h.c.) - h L,   A symmetric, B antisymmetric
    E0 = -1/2 sum_k eps_k,  eps_k = singular values of (A - B)            (Lieb-Schultz-Mattis)
Open chain: A = 2h on the diagonal and -J on the off-diagonals, B_{i,i+1} = -J = -B_{i+1,i}.
Periodic chain, even L: the ground state lies in the even-parity (antiperiodic) sector,
eps_k = 2 sqrt(J^2 + h^2 - 2 J h cos k), k = +-(2n-1) pi / L.
"""

import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import eigsh


def hamiltonian(L, h, J=1.0, pbc=True):
    """Sparse CSR 2^L x 2^L Hamiltonian, built with bit operations vectorised over all basis states."""
    N = 1 << L
    s = np.arange(N, dtype=np.int64)
    diag = np.zeros(N)
    for i in range(L if pbc else L - 1):
        diag -= J * (1 - 2 * (((s >> i) ^ (s >> ((i + 1) % L))) & 1))
    cols = np.stack([s] + [s ^ (1 << i) for i in range(L)], axis=1).astype(np.int32)
    vals = np.concatenate([diag[:, None], np.full((N, L), -h)], axis=1)
    return sp.csr_matrix((vals.ravel(), cols.ravel(), np.arange(0, N * (L + 1) + 1, L + 1)), shape=(N, N))


def spectrum(L, h, J=1.0, pbc=True, k=2):
    """Lowest k eigenvalues and eigenvectors: dense eigh for L <= 10, Lanczos (eigsh) beyond."""
    H = hamiltonian(L, h, J, pbc)
    if L <= 10:
        E, V = np.linalg.eigh(H.toarray())
        return E[:k], V[:, :k]
    v0 = np.random.default_rng(0).uniform(-1, 1, H.shape[0]) + 1.0  # fixed start vector: deterministic
    E, V = eigsh(H, k=k, which="SA", v0=v0)
    order = np.argsort(E)
    return E[order], V[:, order]


def gap(L, h, J=1.0, pbc=True):
    """Delta = E1 - E0. For PBC and h < J, E0 and E1 are the (exponentially) near-degenerate parity pair."""
    E, _ = spectrum(L, h, J, pbc, k=2)
    return E[1] - E[0]


def entanglement_entropy(psi, ell):
    """von Neumann entropy (natural log) of the block of sites 0..ell-1, from the SVD of the reshaped state."""
    L = int(np.log2(psi.size))
    p = np.linalg.svd(psi.reshape(1 << (L - ell), 1 << ell), compute_uv=False) ** 2
    p = p[p > 1e-15]
    return float(-np.sum(p * np.log(p)))


def mean_sx(psi):
    """<sx> per site, (1/L) sum_i <psi|sx_i|psi>, for a real normalised state."""
    L = int(np.log2(psi.size))
    s = np.arange(psi.size)
    return sum(psi @ psi[s ^ (1 << i)] for i in range(L)) / L


def corr_zz(psi, i, j):
    """<sz_i sz_j> for a real normalised state."""
    s = np.arange(psi.size)
    return float(np.sum(psi**2 * (1 - 2 * (((s >> i) ^ (s >> j)) & 1))))


def ground_energy_free_fermion(L, h, J=1.0, pbc=True):
    """Exact ground-state energy from the free-fermion solution (periodic: even L only)."""
    if pbc:
        if L % 2:
            raise ValueError("periodic formula assumes even L")
        k = (2 * np.arange(1, L // 2 + 1) - 1) * np.pi / L  # +k and -k contribute equally
        return -2 * np.sum(np.sqrt(J**2 + h**2 - 2 * J * h * np.cos(k)))
    A_minus_B = 2 * h * np.eye(L) - 2 * J * np.eye(L, k=-1)  # lower bidiagonal
    return -0.5 * np.sum(np.linalg.svd(A_minus_B, compute_uv=False))
