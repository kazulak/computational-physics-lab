# Pendulum Hamiltonian Lab

## 1. Product summary

**Pendulum Hamiltonian Lab** is a small educational web application for building and simulating planar pendulum systems.

A user begins with one weight attached to one massless string. They can add more strings and weights to create a serial multi-link pendulum, change its physical parameters, introduce external forces, and observe how the system evolves.

The application should simultaneously show:

1. The animated physical system.
2. The mathematical Hamiltonian.
3. The current kinetic, potential, and total mechanical energy.
4. The generalized coordinates and momenta.
5. Time-series and phase-space plots.
6. Whether energy should be conserved.
7. How damping and external driving change the behavior.

The product should feel like a small university physics tool rather than a commercial dashboard. It should be clean, quiet, understandable, and intentionally plain.

The interface must not use unnecessary animations, gradients, glass effects, decorative cards, oversized typography, or complicated navigation.

---

## 2. Primary learning objective

The application should help users understand the connection between:

* A visible mechanical system.
* Its generalized coordinates.
* Its generalized momenta.
* Its kinetic and potential energy.
* Its Hamiltonian.
* Hamilton’s equations.
* Energy conservation.
* Non-conservative effects such as damping.
* External energy input through applied torque.
* Chaotic motion in multi-link pendulums.

The user should be able to change a physical parameter and immediately understand how that parameter affects both the motion and the mathematics.

The application is not intended to be a general-purpose rigid-body simulator or an engineering analysis package.

---

## 3. Scope of the first version

### 3.1 Included in the MVP

The first usable version should support:

* Between one and four pendulum links.
* One point mass at the end of every link.
* Massless, rigid strings or rods.
* Planar two-dimensional motion.
* A fixed pivot.
* Adjustable mass for every weight.
* Adjustable length for every link.
* Adjustable initial angle for every link.
* Adjustable initial angular velocity for every link.
* Adjustable gravitational acceleration.
* Viscous rotational damping at every joint.
* Sinusoidal driving torque applied to a selected joint.
* Constant torque applied to a selected joint.
* Play, pause, reset, and single-step controls.
* Adjustable simulation speed.
* Hamiltonian display.
* Kinetic, potential, and total-energy display.
* Energy-versus-time plot.
* Angle-versus-time plot.
* Phase-space plot.
* A small collection of educational presets.
* Import and export of a configuration as JSON.
* Deterministic simulation results for the same configuration.

---

## 4. Physical model

### 4.1 Modeling assumptions

The simulated system consists of $N$ point masses connected by $N$ rigid, massless links.

The motion is restricted to a vertical plane.

Each angle is measured from the downward vertical direction:

$$
q =
\begin{bmatrix}
\theta_1 \\
\theta_2 \\
\vdots \\
\theta_N
\end{bmatrix}.
$$

The angle of each link is an absolute angle relative to the vertical, not an angle relative to the preceding link.

The downward equilibrium position is:

$$
\theta_i = 0.
$$

All values should use SI units:

* Mass: kilograms (kg).
* Length: metres (m).
* Time: seconds (s).
* Angle: radians internally, degrees in the user interface.
* Angular velocity: radians per second (rad/s).
* Torque: newton-metres (N·m).
* Energy: joules (J).
* Gravity: metres per second squared (m/s²).

---

### 4.2 Position of each mass

For mass $k$, its Cartesian position is:

$$
x_k = \sum_{i=1}^{k} l_i \sin\theta_i,
$$

$$
y_k = -\sum_{i=1}^{k} l_i \cos\theta_i.
$$

The fixed pivot is located at:

$$
x_0 = 0,\qquad y_0 = 0.
$$

---

### 4.3 Kinetic energy

The kinetic energy can be written as:

$$
T(q,\dot q) = \frac{1}{2}\dot q^\mathsf{T} M(q)\dot q,
$$

where $M(q)$ is the configuration-dependent mass matrix.

For absolute link angles, an element of the mass matrix is:

$$
M_{ij}(q) = l_i l_j \cos(\theta_i-\theta_j) \sum_{k=\max(i,j)}^{N}m_k.
$$

---

### 4.4 Potential energy

The gravitational potential relative to the vertical suspend equilibrium:

$$
V(q) = \sum_{i=1}^{N} \left( \sum_{k=i}^{N}m_k \right) g l_i \left(1-\cos\theta_i\right).
$$

This convention gives $V(0)=0$.

---

### 4.5 Generalized momenta

The canonical momentum is:

$$
p = \frac{\partial L}{\partial \dot q} = M(q)\dot q \implies \dot q = M(q)^{-1}p.
$$

---

### 4.6 Hamiltonian

The general multi-link Hamiltonian is:

$$
H(q,p) = \frac{1}{2}p^\mathsf{T}M(q)^{-1}p + V(q).
$$

For one pendulum:

$$
H(\theta,p) = \frac{p^2}{2ml^2} + mgl(1-\cos\theta).
$$

---

### 4.7 Hamilton’s equations

For an ideal conservative system with external forces $Q$:

$$
\dot q = \frac{\partial H}{\partial p}, \quad \dot p = -\frac{\partial H}{\partial q} + Q.
$$
