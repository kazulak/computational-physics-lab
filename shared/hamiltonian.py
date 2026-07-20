import numpy as np

class MultiPendulumHamiltonian:
    """
    Reference Python implementation of the N-link planar pendulum model
    under Hamiltonian dynamics. Used for golden verification tests.
    """
    def __init__(self, masses, lengths, g=9.81):
        self.masses = np.array(masses, dtype=float)
        self.lengths = np.array(lengths, dtype=float)
        
        if self.masses.ndim != 1 or self.lengths.ndim != 1:
            raise ValueError("Masses and lengths must be 1D arrays or lists.")
        if len(self.masses) == 0:
            raise ValueError("At least one pendulum link is required.")
        if len(self.masses) != len(self.lengths):
            raise ValueError("Masses and lengths lists must be the same length.")
        if np.any(self.masses <= 0):
            raise ValueError("Masses must be strictly positive.")
        if np.any(self.lengths <= 0):
            raise ValueError("Lengths must be strictly positive.")
        if not np.isfinite(g) or abs(g) > 1000:
            raise ValueError("Gravity g must be a finite number and |g| <= 1000.")
            
        self.N = len(self.masses)
        self.g = g
        
    def mass_matrix(self, q):
        q = np.array(q, dtype=float)
        M = np.zeros((self.N, self.N))
        
        # cum_mass[j] = sum_{k=j}^{N-1} m_k
        cum_mass = np.zeros(self.N)
        for j in range(self.N):
            cum_mass[j] = np.sum(self.masses[j:])
            
        for i in range(self.N):
            for j in range(self.N):
                max_idx = max(i, j)
                M[i, j] = self.lengths[i] * self.lengths[j] * cum_mass[max_idx] * np.cos(q[i] - q[j])
        return M
        
    def kinetic_potential(self, q, p):
        q = np.array(q, dtype=float)
        p = np.array(p, dtype=float)
        M = self.mass_matrix(q)
        dq = np.linalg.solve(M, p)
        
        T = 0.5 * np.dot(p, dq)
        
        cum_mass = np.zeros(self.N)
        for j in range(self.N):
            cum_mass[j] = np.sum(self.masses[j:])
            
        V = 0.0
        for j in range(self.N):
            V += cum_mass[j] * self.g * self.lengths[j] * (1.0 - np.cos(q[j]))
        return T, V
        
    def hamiltonian(self, q, p):
        T, V = self.kinetic_potential(q, p)
        return T + V
        
    def equations_of_motion(self, state, t=0.0, damping=0.0, drive_amp=0.0, drive_freq=0.0):
        state = np.array(state, dtype=float)
        q = state[:self.N]
        p = state[self.N:]
        
        M = self.mass_matrix(q)
        dq = np.linalg.solve(M, p)
        
        cum_mass = np.zeros(self.N)
        for j in range(self.N):
            cum_mass[j] = np.sum(self.masses[j:])
            
        dp = np.zeros(self.N)
        for r in range(self.N):
            gravity_torque = -cum_mass[r] * self.g * self.lengths[r] * np.sin(q[r])
            
            centrifugal_torque = 0.0
            for k in range(self.N):
                max_idx = max(r, k)
                A_rk = self.lengths[r] * self.lengths[k] * cum_mass[max_idx]
                centrifugal_torque -= A_rk * dq[r] * dq[k] * np.sin(q[r] - q[k])
                
            damping_torque = -damping * dq[r]
            drive_torque = drive_amp * np.cos(drive_freq * t) if r == 0 else 0.0
            
            dp[r] = gravity_torque + centrifugal_torque + damping_torque + drive_torque
            
        return np.concatenate([dq, dp])
