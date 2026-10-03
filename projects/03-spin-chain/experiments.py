"""Reproduce the figures in README.md:  python projects/03-spin-chain/experiments.py"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.optimize import brentq

from tfim import entanglement_entropy, gap, spectrum

FIG = Path(__file__).parent / "figures"
BLUE, ORANGE, AQUA, YELLOW, INK, MUTED = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#1f1f1f", "#6b6b6b"
plt.rcParams.update({
    "figure.dpi": 150, "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
    "axes.grid": True, "grid.color": "#e6e6e6", "grid.linewidth": 0.6, "lines.linewidth": 1.5,
})

# uniform grid on [0.5, 1.5] plus extra points around h_c = 1
H_GRID = np.unique(np.round(np.r_[np.linspace(0.5, 1.5, 21), np.linspace(0.9, 1.1, 9)], 4))


def gap_scaling(sizes=(8, 12, 16, 20), hs=H_GRID):
    """L * Delta(L) vs h (PBC): curves for different L cross at h_c with z = 1."""
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    scaled, near = {}, (hs >= 0.9) & (hs <= 1.1)
    zoom = ax.inset_axes([0.07, 0.45, 0.33, 0.48])  # zoom on the crossing region
    zoom.set_title(r"zoom: $h/J \in [0.9, 1.1]$", fontsize=8, color=MUTED)
    zoom.tick_params(labelsize=8)
    for L, color in zip(sizes, [YELLOW, AQUA, ORANGE, BLUE]):
        scaled[L] = L * np.array([gap(L, h) for h in hs])
        ax.plot(hs, scaled[L], color=color, marker="o", ms=3)
        zoom.plot(hs[near], scaled[L][near], color=color, marker="o", ms=3)
        ax.annotate(f"L = {L}", (hs[-1], scaled[L][-1]), xytext=(4, 0), textcoords="offset points",
                    va="center", color=INK, fontsize=9)
    for L1, L2 in zip(sizes[:-1], sizes[1:]):
        diff = CubicSpline(hs, scaled[L1] - scaled[L2])
        h_c = brentq(diff, 0.9, 1.3)
        print(f"crossing L = {L1} / {L2}: h_c ~ {h_c:.4f}   (L*Delta = {float(CubicSpline(hs, scaled[L2])(h_c)):.4f})")
    print(f"L * Delta at h = 1: " + ", ".join(f"L={L}: {np.interp(1.0, hs, scaled[L]):.4f}" for L in sizes)
          + f"   (CFT, L -> inf: pi/2 = {np.pi / 2:.4f})")
    ax.axvline(1.0, color=MUTED, lw=0.8, ls="--")
    zoom.axvline(1.0, color=MUTED, lw=0.8, ls="--")
    ax.set(xlabel=r"transverse field $h/J$", ylabel=r"scaled gap $L\,\Delta(L)$ [$J$]", xlim=(hs[0], hs[-1] + 0.12),
           title="Finite-size gap of the periodic TFIM")
    fig.tight_layout()
    fig.savefig(FIG / "gap_scaling.png")


def entanglement(L=20):
    """Entanglement entropy of a block of ell sites (PBC ground state) vs chord length x."""
    ell = np.arange(1, L // 2 + 1)  # S(ell) = S(L - ell), so half the chain suffices
    x = np.log(L / np.pi * np.sin(np.pi * ell / L))
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    for h, color, label in [(1.0, BLUE, "$h = J$ (critical)"), (2.0, ORANGE, "$h = 2J$ (gapped)")]:
        psi = spectrum(L, h, k=1)[1][:, 0]
        S = np.array([entanglement_entropy(psi, l) for l in ell])
        ax.plot(x, S, "o", ms=4, color=color)
        if h == 1.0:
            sel = ell >= 2  # drop the single-site block, where lattice effects are largest
            slope, offset = np.polyfit(x[sel], S[sel], 1)
            c = 3 * slope
            ax.plot(x, slope * x + offset, color=color, lw=1, ls="--")
            ax.text(0.03, 0.93, rf"fit: $S=\frac{{c}}{{3}}x+$const, $c = {c:.3f}$ (CFT: 0.5)",
                    transform=ax.transAxes, color=INK, va="top")
            print(f"h = 1, L = {L}: c = {c:.4f} (slope {slope:.4f}, offset {offset:.4f}); "
                  f"fit using ell = 2..{L // 2}; all ell = 1..{L // 2}: c = {3 * np.polyfit(x, S, 1)[0]:.4f}")
        else:
            print(f"h = {h}: S(ell = 1, L/4, L/2) = {S[0]:.4f}, {S[L // 4 - 1]:.4f}, {S[-1]:.4f} (saturated)")
        i = 1 if h == 1.0 else -1  # label next to the point, below the critical line / above the gapped one
        ax.annotate(label, (x[i], S[i]), xytext=(8, -14) if h == 1.0 else (-6, 8), textcoords="offset points",
                    ha="left" if h == 1.0 else "right", va="top" if h == 1.0 else "bottom", color=INK, fontsize=9)
    ax.set(xlabel=r"chord length $x=\ln\!\left[\frac{L}{\pi}\sin\frac{\pi \ell}{L}\right]$",
           ylabel=r"entanglement entropy $S(\ell)$ [nats]", ylim=(0, None),
           title=f"Entanglement of a block of $\\ell$ sites, periodic chain $L = {L}$")
    fig.tight_layout()
    fig.savefig(FIG / "entanglement.png")


if __name__ == "__main__":
    FIG.mkdir(exist_ok=True)
    gap_scaling()
    entanglement()
