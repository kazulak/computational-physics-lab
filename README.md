# Computational Physics Lab

Self-study projects in computational physics. Each one asks a concrete physics question, builds a minimal model,
**validates it against known results**, and reports what the numerics show. No frontends, just physics, numerics and tests.

| # | Project | Physics | Methods |
|---|---|---|---|
| 01 | [N-link pendulum](projects/01-pendulum) | Hamiltonian mechanics, deterministic chaos | symplectic vs. non-symplectic integration, Lyapunov exponents |
| 03 | [Transverse-field Ising chain](projects/03-spin-chain) | quantum phase transitions, entanglement, CFT | sparse exact diagonalization (Lanczos), free-fermion solution, finite-size scaling |

Planned (one at a time): quantum mechanics (split-operator time evolution, spectra), complex systems (Ising model / Monte Carlo, critical exponents),
many-body physics beyond free fermions (Heisenberg/XXZ chains with symmetry sectors).

## Usage

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest                                              # all validation tests
python projects/01-pendulum/experiments.py          # regenerate a project's figures
```

## Layout and rules

```text
cplab/                  shared numerics; code moves here only once a 2nd project needs it
projects/NN-name/
    README.md           question → model → validation → results → lessons
    <model>.py          the physics
    experiments.py      reproduces every figure in the README
    test_<model>.py     checks against analytic / independent results
    figures/            committed outputs
```

1. One project at a time. Finish it (README with results) before starting the next.
2. Every result needs a validation test against something independent: analytic limits, conservation laws, or published numbers.
3. Plain Python + NumPy/SciPy/Matplotlib. Add a dependency only when a project needs it.
4. Figures are reproducible from a single script.
