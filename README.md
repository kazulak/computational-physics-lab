# Computational Physics Lab

Welcome to the **Computational Physics Lab**! This repository is a collection of numerical simulations, dynamical systems analysis, and physics visualizations. The focus is on implementing physical models from classical mechanics, electromagnetism, and quantum mechanics, with a particular emphasis on Hamiltonian formulations, phase-space dynamics, and chaotic behavior.

---

## Directory Structure

The repository is consolidated to encourage reuse of numerical methods and visual tools, keeping code clean, quiet, and aligned with standard software practices:

```text
computational-physics-lab/
├── .gitignore
├── README.md
├── requirements.txt              # Reference python library packages
├── run.sh                        # One-command launcher for web application
├── shared/                       # Python reference solvers and models
│   ├── __init__.py
│   ├── hamiltonian.py            # Reference MultiPendulumHamiltonian in Python
│   └── integrators.py            # Reference ODE solvers
└── projects/                     # Standalone simulation projects
    └── pendulum-hamiltonian-lab/ # TS/React web app (Vite structure)
        ├── package.json
        ├── index.html
        ├── tsconfig.json
        ├── src/
        │   ├── App.tsx           # Main application state loop
        │   ├── main.tsx          # React application mount
        │   ├── index.css         # Clean, quiet CSS stylesheet
        │   ├── app/
        │   │   └── presets.ts    # Single, double, driven presets
        │   ├── physics/          # Decoupled physics math logic
        │   │   ├── types.ts      # Canonical state / links definitions
        │   │   ├── geometry.ts   # Absolute Cartesian coordinates
        │   │   ├── mass-matrix.ts
        │   │   ├── potential-energy.ts
        │   │   ├── hamiltonian.ts
        │   │   ├── external-forces.ts
        │   │   ├── energy-balance.ts
        │   │   └── validation.ts
        │   ├── integration/      # Decoupled numerical solver clocks
        │   │   ├── integrator.ts # RK4, Symplectic Euler, Euler
        │   │   └── simulation-clock.ts
        │   └── components/       # Interface rendering modules
        │       ├── PlaybackControls.tsx
        │       ├── SimulationCanvas.tsx
        │       ├── SystemControls.tsx
        │       ├── HamiltonianPanel.tsx
        │       └── ...
        └── tests/
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18+ and npm)

### Setup and Run (One-Command Launcher)

To automatically verify packages, install dependencies, and launch the Vite development server, run the launcher from the root of the repository:

```bash
./run.sh
```

This will spin up a local web server (typically on `http://localhost:5173`) and automatically serve the interactive application in your default web browser.

---

## Reference Python Solver & Invariant Tests

We maintain a Python implementation of the physics engine and integrators inside the `shared/` layer. These are used as a reference layer to run invariant and property-based regression checks.

To run the unit tests:

```bash
# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Execute physics tests
PYTHONPATH=. pytest
```
