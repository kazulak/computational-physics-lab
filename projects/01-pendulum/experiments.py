"""Reproduce the figures in README.md:  python projects/01-pendulum/experiments.py"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.integrate import solve_ivp

from cplab.integrators import implicit_midpoint_step, integrate, rk4_step
from pendulum import NPendulum

FIG = Path(__file__).parent / "figures"
BLUE, ORANGE, INK, MUTED = "#2a78d6", "#eb6834", "#1f1f1f", "#6b6b6b"
plt.rcParams.update({
    "figure.dpi": 150, "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
    "axes.grid": True, "grid.color": "#e6e6e6", "grid.linewidth": 0.6, "lines.linewidth": 1.5,
})

DOUBLE = NPendulum([1.0, 1.0], [1.0, 1.0])


def energy_drift(t_end=500.0, dt=0.02):
    """Non-symplectic RK4 vs symplectic implicit midpoint, same dt, chaotic double pendulum."""
    y0 = DOUBLE.state_from_angles([2.0, 2.5], [0.0, 0.0])
    H0 = DOUBLE.energy(y0)
    n = int(t_end / dt)
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    for step, label, color, dy in [(rk4_step, "RK4 (order 4): secular drift", ORANGE, 6),
                                   (implicit_midpoint_step, "implicit midpoint (order 2, symplectic): bounded", BLUE, -6)]:
        t, ys = integrate(step, DOUBLE.rhs, y0, dt, n)
        err = np.abs(np.array([DOUBLE.energy(y) for y in ys]) - H0) / abs(H0)
        envelope = np.maximum.accumulate(err)
        ax.semilogy(t, envelope, color=color)
        ax.annotate(label, (t[-1], envelope[-1]), xytext=(-4, dy), textcoords="offset points",
                    ha="right", va="bottom" if dy > 0 else "top", color=INK, fontsize=9)
        print(f"{label:50s} max |dH/H0| = {err.max():.2e}, final = {err[-1]:.2e}")
    ax.set(xlabel="t [s]", ylabel=r"$\max_{s \leq t}\ |H(s)-H_0|\,/\,H_0$", xlim=(0, t_end), ylim=(None, 1),
           title=f"Energy error, chaotic double pendulum, dt = {dt}")
    fig.tight_layout()
    fig.savefig(FIG / "energy_drift.png")


def chaos(t_end=30.0, delta0=1e-9):
    """Growth of a tiny perturbation: regular (low energy) vs chaotic (high energy)."""
    t_eval = np.linspace(0, t_end, 3000)
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    for angles, label, color in [([0.3, 0.3], "low energy: regular", BLUE),
                                 ([2.0, 2.5], "high energy: chaotic", ORANGE)]:
        y0 = DOUBLE.state_from_angles(angles, [0.0, 0.0])
        runs = [solve_ivp(DOUBLE.rhs, (0, t_end), y, t_eval=t_eval, method="DOP853",
                          rtol=1e-12, atol=1e-12).y
                for y in (y0, y0 + np.r_[delta0, 0, 0, 0])]
        sep = np.linalg.norm(runs[0] - runs[1], axis=0)
        ax.semilogy(t_eval, sep, color=color, lw=1)
        ax.annotate(label, (t_eval[-1], sep[-1]), xytext=(-4, 6), textcoords="offset points",
                    ha="right", color=INK, fontsize=9)
        if "chaotic" in label:  # largest Lyapunov exponent from the exponential-growth window
            window = (sep > 1e3 * delta0) & (sep < 1e-2)
            lam = np.polyfit(t_eval[window], np.log(sep[window]), 1)[0]
            print(f"estimated largest Lyapunov exponent ~ {lam:.2f} 1/s")
            ax.text(0.02, 0.92, rf"$\lambda_{{\max}} \approx {lam:.1f}\ \mathrm{{s^{{-1}}}}$",
                    transform=ax.transAxes, color=INK)
    ax.set(xlabel="t [s]", ylabel=r"phase-space separation $|\delta y(t)|$", xlim=(0, t_end),
           title=rf"Sensitivity to initial conditions, $|\delta y(0)| = 10^{{{int(np.log10(delta0))}}}$")
    fig.tight_layout()
    fig.savefig(FIG / "chaos.png")


if __name__ == "__main__":
    FIG.mkdir(exist_ok=True)
    energy_drift()
    chaos()
