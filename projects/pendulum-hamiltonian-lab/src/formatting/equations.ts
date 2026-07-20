/**
 * Generates LaTeX mathematical physics strings for the single link and N-link
 * Hamiltonian pendulum models.
 */

export function getSingleLinkHamiltonianLatex(m: number, l: number, g: number): string {
  // Renders the single bob analytical Hamiltonian
  return `H(\\theta, p) = \\frac{p^2}{2 m l^2} + m g l (1 - \\cos \\theta)`;
}

export function getSingleLinkEquationsLatex(): string {
  return `\\dot{\\theta} = \\frac{p}{m l^2}, \\quad \\dot{p} = -m g l \\sin \\theta - b \\dot{\\theta} + \\tau_{\\text{ext}}(t)`;
}

export function getMultiLinkHamiltonianLatex(): string {
  return `H(\\mathbf{q}, \\mathbf{p}) = \\frac{1}{2} \\mathbf{p}^T \\mathbf{M}(\\mathbf{q})^{-1} \\mathbf{p} + V(\\mathbf{q})`;
}

export function getMassMatrixDefinitionLatex(): string {
  return `M_{jk}(\\mathbf{q}) = l_j l_k M'_{\\max(j,k)} \\cos(q_j - q_k), \\quad M'_j = \\sum_{i=j}^N m_i`;
}

export function getPotentialEnergyDefinitionLatex(): string {
  return `V(\\mathbf{q}) = \\sum_{j=1}^N M'_j g l_j (1 - \\cos q_j)`;
}

export function getMultiLinkEquationsLatex(): string {
  return `\\dot{q}_r = \\left[\\mathbf{M}(\\mathbf{q})^{-1}\\mathbf{p}\\right]_r, \\quad \\dot{p}_r = - M'_r g l_r \\sin q_r - \\sum_{k=1}^N l_r l_k M'_{\\max(r,k)} \\dot{q}_r \\dot{q}_k \\sin(q_r - q_k) + Q_r`;
}
