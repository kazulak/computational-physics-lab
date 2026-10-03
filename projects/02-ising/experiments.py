"""Reproduce the figures in README.md:  python projects/02-ising/experiments.py   (about 6 minutes)"""

import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.optimize import brentq

from ising import (TC, blocking_error, jackknife, onsager_m, run_metropolis, run_wolff, tau_int)

FIG = Path(__file__).parent / "figures"
BLUE, ORANGE, AQUA, INK, MUTED = "#2a78d6", "#eb6834", "#1baf7a", "#1f1f1f", "#6b6b6b"
plt.rcParams.update({
    "figure.dpi": 150, "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
    "axes.grid": True, "grid.color": "#e6e6e6", "grid.linewidth": 0.6, "lines.linewidth": 1.5,
})

SIZES = (8, 16, 32)
COLORS = dict(zip(SIZES, (BLUE, ORANGE, AQUA)))
WINDOW = (2.20, 2.35)  # quadratic fits of U4(T) are only adequate over a narrow window (see README)
T_GRID = np.unique(np.round(np.r_[np.arange(1.5, 3.501, 0.1), np.arange(2.15, 2.401, 0.025)], 3))


def production():
    """Wolff runs for every (L, T): <|m|> (blocking error) and Binder U4 (jackknife error)."""
    out = {}
    for L in SIZES:
        t0, rows = time.time(), []
        for T in T_GRID:
            n = 5000 if 2.1 <= T <= 2.45 else 2000  # more statistics near T_c
            _, m, _ = run_wolff(L, T, n, np.random.default_rng([2, L, round(T * 1000)]), n_therm=20)
            u4, du4 = jackknife(lambda m2, m4: 1 - m4 / (3 * m2**2), m**2, m**4)
            rows.append((np.abs(m).mean(), blocking_error(np.abs(m)), u4, du4))
        out[L] = np.array(rows).T
        print(f"  production L = {L}: {time.time() - t0:.0f} s")
    return out


def magnetization_plot(data):
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    T = np.linspace(1.5, 3.5, 400)
    ax.plot(T, onsager_m(T), color=INK, lw=1.2, label=r"Onsager, $L\to\infty$")
    for L in SIZES:
        ax.errorbar(T_GRID, data[L][0], data[L][1], fmt="o-", ms=3.5, lw=0.8, capsize=2, color=COLORS[L], label=f"L = {L}")
    ax.axvline(TC, color=MUTED, ls=":", lw=1)
    ax.set(xlabel="T  (J = k$_B$ = 1)", ylabel=r"$\langle |m| \rangle$", xlim=(1.5, 3.5), ylim=(0, 1.05),
           title=r"Magnetization per spin; dotted line: $T_c = 2/\ln(1+\sqrt{2})$")
    ax.legend(frameon=False, loc="upper right")
    fig.tight_layout()
    fig.savefig(FIG / "magnetization.png")


def crossing(T, Ua, dUa, Ub, dUb, rng=None):
    """Intersection of quadratic fits of two U4 curves inside WINDOW (None if they don't cross).
    With rng, the data are resampled within their errors (parametric bootstrap)."""
    sel = (T >= WINDOW[0] - 1e-9) & (T <= WINDOW[1] + 1e-9)
    polys = []
    for U, dU in ((Ua, dUa), (Ub, dUb)):
        y = U[sel] + (dU[sel] * rng.normal(size=sel.sum()) if rng else 0)
        polys.append(np.polyfit(T[sel], y, 2, w=1 / dU[sel]))
    d = polys[0] - polys[1]
    roots = [r.real for r in np.roots(d) if abs(r.imag) < 1e-12 and WINDOW[0] <= r.real <= WINDOW[1]]
    return min(roots, key=lambda r: abs(r - np.mean(WINDOW))) if roots else None


def binder_plot(data):
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    show = (T_GRID >= 2.15) & (T_GRID <= 2.4)
    for L in SIZES:
        ax.errorbar(T_GRID[show], data[L][2][show], data[L][3][show], fmt="o-", ms=3.5, lw=0.8, capsize=2,
                    color=COLORS[L], label=f"L = {L}")
    ax.axvline(TC, color=MUTED, ls=":", lw=1)
    rng, lines, estimates = np.random.default_rng(0), [], {}
    for La, Lb in [(8, 16), (16, 32), (8, 32)]:
        args = (T_GRID, data[La][2], data[La][3], data[Lb][2], data[Lb][3])
        t_x = crossing(*args)
        boot = [crossing(*args, rng=rng) for _ in range(300)]
        boot = [b for b in boot if b is not None]
        estimates[(La, Lb)] = (t_x, np.std(boot))
        lines.append(f"({La},{Lb}): {t_x:.3f} ± {np.std(boot):.3f}")
        print(f"  Binder crossing L = {La}, {Lb}: T = {t_x:.4f} ± {np.std(boot):.4f}  (exact {TC:.4f}, "
              f"deviation {100 * (t_x / TC - 1):+.2f} %)")
        ax.plot(t_x, np.interp(t_x, T_GRID[show], data[Lb][2][show]), "x", color=INK, ms=7, mew=1.5)
    ax.text(0.03, 0.04, "crossings ×\n" + "\n".join(lines) + f"\nexact: {TC:.3f}", transform=ax.transAxes,
            fontsize=8.5, color=INK, va="bottom")
    ax.set(xlabel="T  (J = k$_B$ = 1)", ylabel=r"Binder cumulant $U_4 = 1 - \langle m^4\rangle / 3\langle m^2\rangle^2$",
           xlim=(2.15, 2.4), title="Binder cumulant: curves for different L cross near $T_c$")
    ax.legend(frameon=False, loc="upper right")
    fig.tight_layout()
    fig.savefig(FIG / "binder.png")
    return estimates


def fit_power_law(L, tau, err):
    """Weighted least squares of log tau = log a + z log L. Returns z and its error."""
    p, cov = np.polyfit(np.log(L), np.log(tau), 1, w=tau / err, cov="unscaled")
    return p[0], np.sqrt(cov[0, 0])


def autocorrelation_plot(L_fit_min=16):
    """tau_int of |m| at T_c, in sweeps, for Metropolis vs Wolff (and Wolff per cluster flip)."""
    Ls = [8, 12, 16, 24, 32, 48, 64]
    n_wolff = dict(zip(Ls, [20000, 20000, 20000, 12000, 10000, 8000, 6000]))
    res = {"Metropolis": [], "Wolff": [], "Wolff, per cluster": []}
    print(f"  {'L':>3} {'Metropolis [sweeps]':>20} {'Wolff [sweeps]':>16} {'Wolff [clusters]':>18} {'<C>/N':>7}")
    for L in Ls:
        rng = np.random.default_rng([3, L])
        _, m = run_metropolis(L, TC, max(20000, 40 * L * L), rng, n_therm=2000)
        tm = tau_int(np.abs(m))
        _, m, dt = run_wolff(L, TC, n_wolff[L], rng, n_therm=20, per_sweep=False)
        tw = tau_int(np.abs(m))
        res["Metropolis"].append(tm)
        res["Wolff, per cluster"].append(tw)
        res["Wolff"].append((tw[0] * dt, tw[1] * dt))  # clusters -> sweep equivalents
        print(f"  {L:>3} {tm[0]:>13.2f} ± {tm[1]:<4.2f} {tw[0] * dt:>9.2f} ± {tw[1] * dt:<4.2f} "
              f"{tw[0]:>11.2f} ± {tw[1]:<4.2f} {dt:>7.3f}")
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    fit = np.array(Ls) >= L_fit_min
    zs = {}
    for (name, vals), color, label_xy in zip(res.items(), (ORANGE, BLUE, AQUA), ((-6, 6), (-6, -14), (-6, 6))):
        tau, err = np.array(vals).T
        z, dz = fit_power_law(np.array(Ls)[fit], tau[fit], err[fit])
        zs[name] = (z, dz)
        ax.errorbar(Ls, tau, err, fmt="o", ms=4, capsize=2, color=color)
        x = np.array([L_fit_min, Ls[-1]])
        a = np.exp(np.polyval(np.polyfit(np.log(np.array(Ls)[fit]), np.log(tau[fit]), 1, w=tau[fit] / err[fit]), np.log(x)))
        ax.plot(x, a, color=color, lw=1)
        ax.annotate(rf"{name}: $z = {z:.2f} \pm {dz:.2f}$", (Ls[-1], a[-1]), xytext=label_xy, textcoords="offset points",
                    ha="right", color=INK, fontsize=9)
        print(f"  {name:20s} z = {z:.2f} ± {dz:.2f}  (fit L >= {L_fit_min})")
    ax.set(xscale="log", yscale="log", xlabel="L", ylabel=r"$\tau_{\mathrm{int}}$ of $|m|$ at $T_c$",
           title=r"Critical slowing down: $\tau_{\mathrm{int}} \sim L^z$ (fit L ≥ 16)", xticks=Ls)
    ax.set_xticklabels(Ls)
    ax.minorticks_off()
    fig.tight_layout()
    fig.savefig(FIG / "autocorrelation.png")
    return zs


if __name__ == "__main__":
    FIG.mkdir(exist_ok=True)
    t0 = time.time()
    print("Wolff production runs (magnetization and Binder cumulant)")
    data = production()
    magnetization_plot(data)
    print("Binder cumulant")
    binder_plot(data)
    print("Autocorrelation times at T_c")
    autocorrelation_plot()
    print(f"total: {time.time() - t0:.0f} s")
