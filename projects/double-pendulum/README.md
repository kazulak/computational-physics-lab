# Double Pendulum

This project simulates a double pendulum (two pendulums attached end-to-end), representing a classic example of a simple physical system that exhibits extreme chaotic behavior and sensitive dependence on initial conditions.

## Physics Formulation

The double pendulum has 2 degrees of freedom, described by angles $\theta_1$ and $\theta_2$. The equations of motion are derived using Lagrangian mechanics:

$$ L = T - V $$

The resulting coupled, non-linear second-order ODEs are solved numerically using high-order integrators (like RK4).

## Visualizations

- **Trajectory Tracking**: Plotting the path traced by the outer pendulum bob.
- **Sensitivity Analysis**: Simulating two double pendulums with slightly different initial conditions ($10^{-5}$ rad difference) to watch their paths diverge exponentially.
