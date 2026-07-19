# Computational Physics Lab

Welcome to the **Computational Physics Lab**! This repository is a collection of numerical simulations, dynamical systems analysis, and physics visualizations. The focus is on implementing physical models from classical mechanics, electromagnetism, thermodynamics, and quantum mechanics, with a particular emphasis on Hamiltonian and Lagrangian formulations, phase-space dynamics, and chaotic behavior.

## Directory Structure

The repository is organized to encourage reuse of numerical methods and visualization tools:

```text
computational-physics-lab/
├── README.md
├── pyproject.toml
├── shared/                       # Shared utilities and numerical methods
│   ├── __init__.py
│   ├── integrators.py            # ODE solvers (Euler, Runge-Kutta, Symplectic)
│   ├── plotting.py               # Custom plotting functions and stylesheets
│   └── animation.py              # Animation generation and rendering tools
├── projects/                     # Standalone simulation projects
│   ├── simple-pendulum/          # Classical simple pendulum & Hamiltonian phase space
│   │   ├── README.md
│   │   ├── hamiltonian.py
│   │   ├── simulation.py
│   │   └── notebooks/            # Jupyter notebooks for interactive analysis
│   ├── driven-pendulum/          # Damped and driven pendulum (chaos, bifurcation)
│   └── double-pendulum/          # Chaotic double pendulum
└── tests/                        # Unit tests for shared tools and algorithms
```

## Getting Started

### Prerequisites

- Python 3.10+
- [Poetry](https://python-poetry.org/) (recommended for dependency management)

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/kazulak/computational-physics-lab.git
cd computational-physics-lab
poetry install
```

Alternatively, you can install the dependencies using pip:

```bash
pip install -r requirements.txt
```

## Shared Library (`shared/`)

- **`integrators.py`**: Houses standard ODE integrators such as Runge-Kutta 4th order (RK4) as well as symplectic integrators (like Stormer-Verlet or symplectic Euler) which preserve the Hamiltonian (energy) structure of conservative systems.
- **`plotting.py`**: Configures common plotting themes (e.g., dark modes, custom color palettes, phase portraits) so simulations look uniform.
- **`animation.py`**: Simplifies the generation of animations using Matplotlib's `FuncAnimation` or other rendering tools.

## Planned Projects

1. **[Simple Pendulum (Hamiltonian)](file:///home/tom/repos/computational-physics-lab/projects/simple-pendulum/README.md)**: Conservative motion, energy conservation analysis, and phase-space $(q, p)$ visualization.
2. **Driven & Damped Pendulum**: Introduction of non-conservative forces, damping, periodic driving, phase portraits, Poincaré sections, and transition to chaos.
3. **Double Pendulum**: A chaotic system showcasing sensitive dependence on initial conditions, double-swing animation, and Lyapunov exponent calculation.
4. **Coupled Oscillators**: Normal modes, beating patterns, and energy transfer between coupled masses.
