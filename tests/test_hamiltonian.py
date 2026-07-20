"""
Unit tests for the MultiPendulumHamiltonian physics model.
"""

import numpy as np
import pytest
from shared.hamiltonian import MultiPendulumHamiltonian

def test_single_pendulum_energy():
    """Verify that a single pendulum's energy matches analytical formulation."""
    m, l, g = 1.5, 1.2, 9.81
    sys = MultiPendulumHamiltonian(masses=[m], lengths=[l], g=g)
    
    # Test at equilibrium (theta = 0, p = 0) -> Energy should be 0.0 J
    assert np.isclose(sys.hamiltonian([0.0], [0.0]), 0.0)
    
    # Test out of equilibrium at 90 degrees (theta = pi/2, p = 0)
    # V = m * g * l * (1 - cos(pi/2)) = m * g * l
    expected_V = m * g * l
    assert np.isclose(sys.hamiltonian([np.pi / 2], [0.0]), expected_V)

def test_mass_matrix_symmetry_and_positivity():
    """Verify that the configuration-dependent mass matrix is symmetric and positive-definite."""
    sys = MultiPendulumHamiltonian(masses=[1.0, 1.2, 0.8], lengths=[1.0, 0.8, 1.2], g=9.81)
    
    # Test at random angles
    np.random.seed(42)
    theta = np.random.uniform(-np.pi, np.pi, size=sys.N)
    
    M = sys.mass_matrix(theta)
    
    # Symmetry: M_jk = M_kj
    assert np.allclose(M, M.T)
    
    # Positive Definiteness: All eigenvalues are strictly positive
    eigenvalues = np.linalg.eigvalsh(M)
    assert np.all(eigenvalues > 0.0)

def test_equations_of_motion_dimensions():
    """Verify that derivatives vectors have the correct dimensions (2 * N)."""
    sys = MultiPendulumHamiltonian(masses=[1.0, 1.0], lengths=[1.0, 1.0])
    state = [0.1, -0.2, 0.0, 0.0]
    derivs = sys.equations_of_motion(state, t=0.0)
    assert len(derivs) == 4

def test_invalid_parameters():
    """Verify that unphysical or mismatched parameters raise ValueError."""
    # Empty lists
    with pytest.raises(ValueError, match="At least one pendulum link is required"):
        MultiPendulumHamiltonian([], [])
        
    # Mismatched lengths
    with pytest.raises(ValueError, match="Masses and lengths lists must be the same length"):
        MultiPendulumHamiltonian([1.0, 2.0], [1.0])
        
    # Zero or negative masses
    with pytest.raises(ValueError, match="Masses must be strictly positive"):
        MultiPendulumHamiltonian([0.0], [1.0])
    with pytest.raises(ValueError, match="Masses must be strictly positive"):
        MultiPendulumHamiltonian([-1.5], [1.0])
        
    # Zero or negative lengths
    with pytest.raises(ValueError, match="Lengths must be strictly positive"):
        MultiPendulumHamiltonian([1.0], [0.0])
    with pytest.raises(ValueError, match="Lengths must be strictly positive"):
        MultiPendulumHamiltonian([1.0], [-0.5])
        
    # Extreme/Unphysical gravity
    with pytest.raises(ValueError, match="Gravity g must be a finite number and \\|g\\| <= 1000"):
        MultiPendulumHamiltonian([1.0], [1.0], g=1500)
    with pytest.raises(ValueError, match="Gravity g must be a finite number and \\|g\\| <= 1000"):
        MultiPendulumHamiltonian([1.0], [1.0], g=float('nan'))
        
    # Multi-dimensional arrays
    with pytest.raises(ValueError, match="Masses and lengths must be 1D arrays or lists"):
        MultiPendulumHamiltonian([[1.0]], [1.0])
