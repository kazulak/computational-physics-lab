import numpy as np
import pytest

from tfim import (corr_zz, entanglement_entropy, gap, ground_energy_free_fermion, hamiltonian,
                  mean_sx, spectrum)


@pytest.mark.parametrize("pbc", [True, False])
def test_hamiltonian_hermitian(pbc):
    H = hamiltonian(7, 0.8, J=1.3, pbc=pbc)
    assert abs(H - H.T).max() == 0


@pytest.mark.parametrize("pbc", [True, False])
def test_bit_construction_matches_kronecker_products(pbc):
    """Independent dense construction from Pauli matrices (site 0 = least significant bit)."""
    L, h, J = 5, 0.9, 1.2
    X, Z, I = np.array([[0, 1], [1, 0]]), np.diag([1, -1]), np.eye(2)

    def op(P, *sites):  # tensor product with P on the given sites, identity elsewhere
        out = np.eye(1)
        for i in reversed(range(L)):
            out = np.kron(out, P if i in sites else I)
        return out

    H = -h * sum(op(X, i) for i in range(L))
    H = H - J * sum(op(Z, i, i + 1) for i in range(L - 1))
    if pbc:
        H = H - J * op(Z, 0, L - 1)
    assert np.allclose(hamiltonian(L, h, J, pbc).toarray(), H, atol=1e-14)


def test_two_site_open_chain_matches_analytic_spectrum():
    """H = -J zz - h (x1 + x2): eigenvalues +-sqrt(J^2 + 4h^2) (symmetric sector) and +-J (antisymmetric)."""
    J, h = 1.0, 0.7
    exact = np.sort([-np.sqrt(J**2 + 4 * h**2), -J, J, np.sqrt(J**2 + 4 * h**2)])
    assert np.allclose(np.linalg.eigvalsh(hamiltonian(2, h, J, pbc=False).toarray()), exact, atol=1e-13)


def test_limits_of_free_fermion_formula():
    L = 8
    assert np.isclose(ground_energy_free_fermion(L, 0.0), -L)  # h = 0: all bonds satisfied
    assert np.isclose(ground_energy_free_fermion(L, 1.7, J=0.0), -L * 1.7)  # J = 0: all spins along x
    assert np.isclose(ground_energy_free_fermion(L, 0.0, pbc=False), -(L - 1))  # open: L-1 bonds
    assert np.isclose(ground_energy_free_fermion(L, 1.7, J=0.0, pbc=False), -L * 1.7)


@pytest.mark.parametrize("pbc", [True, False])
@pytest.mark.parametrize("L", [6, 8, 10])
@pytest.mark.parametrize("h", [0.3, 1.0, 2.5])
def test_ed_ground_energy_matches_free_fermions(L, h, pbc):
    E0 = spectrum(L, h, pbc=pbc, k=1)[0][0]
    assert abs(E0 - ground_energy_free_fermion(L, h, pbc=pbc)) < 1e-10


def test_lanczos_matches_free_fermions():
    L, h = 12, 1.0  # L > 10 takes the eigsh path in spectrum()
    E = spectrum(L, h, k=1)[0][0]
    assert abs(E - ground_energy_free_fermion(L, h)) < 1e-9


def test_entanglement_entropy_basics():
    # J = 0: ground state is a product state |+...+>
    _, V = spectrum(6, 0.9, J=0.0, k=1)
    assert all(entanglement_entropy(V[:, 0], ell) < 1e-12 for ell in range(1, 6))
    # Bell pair
    assert np.isclose(entanglement_entropy(np.array([1, 0, 0, 1]) / np.sqrt(2), 1), np.log(2))
    # pure global state: S(ell) = S(L - ell)
    _, V = spectrum(10, 1.0, k=1)
    S = [entanglement_entropy(V[:, 0], ell) for ell in range(1, 10)]
    assert np.allclose(S, S[::-1], atol=1e-10)


@pytest.mark.parametrize("pbc", [True, False])
def test_hellmann_feynman(pbc):
    """<sx> = -d(E0/L)/dh, central finite difference."""
    L, h, dh = 8, 0.8, 1e-4
    E0 = lambda x: spectrum(L, x, pbc=pbc, k=1)[0][0]
    _, V = spectrum(L, h, pbc=pbc, k=1)
    assert np.isclose(mean_sx(V[:, 0]), -(E0(h + dh) - E0(h - dh)) / (2 * dh * L), atol=1e-8)


def test_energy_expectation_from_observables():
    """E0 = -L (J <zz> + h <sx>) for PBC, with translation-invariant averages."""
    L, h = 8, 0.6
    E, V = spectrum(L, h, k=1)
    zz = np.mean([corr_zz(V[:, 0], i, (i + 1) % L) for i in range(L)])
    assert np.isclose(E[0], -L * (zz + h * mean_sx(V[:, 0])), atol=1e-10)


def test_gap_limits():
    assert np.isclose(gap(8, 1.5, J=0.0), 2 * 1.5)  # J = 0: one spin flip costs 2h
    assert gap(8, 0.0) < 1e-12  # h = 0, PBC: degenerate ferromagnet
    assert gap(10, 0.3) < 1e-3  # ordered phase: near-degenerate parity pair
    assert abs(10 * gap(10, 1.0) - np.pi / 2) < 0.05  # critical: L * gap -> 2 pi v x_sigma = pi/2
