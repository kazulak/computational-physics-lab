/**
 * Computes the configuration-dependent symmetric mass matrix M(q)
 * for an N-link pendulum using absolute coordinates.
 * 
 * M_ij(q) = l_i * l_j * cos(theta_i - theta_j) * sum_{k=max(i,j)}^{N-1} m_k
 */
export function buildMassMatrix(q: number[], masses: number[], lengths: number[]): number[][] {
  const N = q.length;
  const M = Array.from({ length: N }, () => new Array(N).fill(0));

  // Compute cumulative masses: cumMass[i] = sum_{k=i}^{N-1} m_k
  const cumMass = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let sum = 0;
    for (let i = j; i < N; i++) {
      sum += masses[i];
    }
    cumMass[j] = sum;
  }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const maxIdx = Math.max(i, j);
      const A_ij = lengths[i] * lengths[j] * cumMass[maxIdx];
      M[i][j] = A_ij * Math.cos(q[i] - q[j]);
    }
  }

  return M;
}

/**
 * Solves the linear system M * x = b using Gaussian elimination with partial pivoting.
 * M: NxN matrix
 * b: N-dimensional vector
 * Returns the solution vector x.
 */
export function solveLinearSystem(M: number[][], b: number[]): number[] {
  const n = b.length;
  const A = M.map((row, i) => [...row, b[i]]); // Augmented matrix

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    // Singular matrix check
    if (Math.abs(A[i][i]) < 1e-12) {
      throw new Error("Linear system solver failed: singular mass matrix.");
    }

    // Eliminate column elements below pivot
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = A[i][n] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      A[k][n] -= A[k][i] * x[i];
    }
  }

  return x;
}

/**
 * Checks if the mass matrix is symmetric within floating point tolerance.
 */
export function checkMatrixSymmetry(M: number[][], tolerance = 1e-8): boolean {
  const N = M.length;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (Math.abs(M[i][j] - M[j][i]) > tolerance) {
        return false;
      }
    }
  }
  return true;
}
