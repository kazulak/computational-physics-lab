# Simple Pendulum: Hamiltonian Dynamics

This project simulates a classical simple pendulum in the Hamiltonian formalism, showcasing conservative motion, energy preservation, and phase-space trajectories.

## Physics Formulation

A simple pendulum consists of a point mass $m$ suspended by a massless, rigid rod of length $l$ under the influence of gravity $g$.

### Hamiltonian

The state of the pendulum is described by its generalized coordinate $q = \theta$ (the angular displacement from the vertical downward position) and its conjugate momentum $p$. The Hamiltonian $H(q, p)$ represents the total mechanical energy of the system:

$$ H(q, p) = T(p) + V(q) $$

Where:
- **Kinetic Energy** $T(p) = \frac{p^2}{2 m l^2}$
- **Potential Energy** $V(q) = m g l (1 - \cos q)$ (taking the potential energy to be zero at the bottom, $q = 0$)

Thus:

$$ H(q, p) = \frac{p^2}{2 m l^2} + m g l (1 - \cos q) $$

### Hamilton's Equations

The equations of motion are given by:

$$ \dot{q} = \frac{\partial H}{\partial p} = \frac{p}{m l^2} $$
$$ \dot{p} = -\frac{\partial H}{\partial q} = -m g l \sin q $$

For small angles ($\sin q \approx q$), this reduces to the simple harmonic oscillator. For larger angles, the system is non-linear and exhibits a phase portrait with distinct regions:
1. **Libration (Oscillation)**: Closed orbits around $(q, p) = (0, 0)$ representing periodic swinging.
2. **Separatrix**: The boundary separating swinging from continuous rotation, corresponding to energy $E = 2 m g l$.
3. **Rotation (Circulation)**: Open undulating curves where the pendulum has enough energy to spin completely around the pivot ($E > 2 m g l$).

## Project Structure

- **`hamiltonian.py`**: Formulates the Hamiltonian and calculates the partial derivatives (equations of motion).
- **`simulation.py`**: Runs the numerical integration and plotting scripts.
- **`notebooks/`**: Contains Jupyter notebooks for step-by-step interactive derivation, phase portrait plotting, and error analysis.

## Running the Simulation

*(Instructions will be updated upon implementation of `simulation.py`.)*
