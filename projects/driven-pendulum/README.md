# Driven and Damped Pendulum

This project simulates a driven, damped pendulum, illustrating non-conservative systems, attractor dynamics, Poincaré sections, bifurcation diagrams, and chaos.

## Physics Formulation

By adding damping (friction) and a periodic driving force, the system becomes non-conservative:

$$ \ddot{\theta} + \gamma \dot{\theta} + \omega_0^2 \sin\theta = F_0 \cos(\omega_d t) $$

Where:
- $\gamma$ is the damping coefficient.
- $F_0$ is the amplitude of the driving force.
- $\omega_d$ is the driving frequency.

For high driving amplitudes $F_0$, the system exhibits chaotic dynamics, which are analyzed using:
- **Phase Portraits**: Showing trajectories crossing due to the explicit time dependence.
- **Poincaré Sections**: Strobing the trajectory at the driving frequency to reveal the strange attractor.
- **Bifurcation Diagrams**: Plotting the steady-state velocity against $F_0$ to observe period-doubling routes to chaos.
