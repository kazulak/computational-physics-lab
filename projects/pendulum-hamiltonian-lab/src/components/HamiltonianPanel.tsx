import React from "react";
import { CanonicalState, PendulumSystem } from "../physics/types";
import { getEnergies } from "../physics/hamiltonian";
import { formatFloat, formatPercent } from "../formatting/numbers";
import { formatEnergy, formatPower } from "../formatting/units";
import { KatexDisplay } from "./KatexDisplay";
import {
  getSingleLinkHamiltonianLatex,
  getSingleLinkEquationsLatex,
  getMultiLinkHamiltonianLatex,
  getMassMatrixDefinitionLatex,
  getPotentialEnergyDefinitionLatex,
  getMultiLinkEquationsLatex,
} from "../formatting/equations";
import { buildMassMatrix } from "../physics/mass-matrix";

interface HamiltonianPanelProps {
  system: PendulumSystem;
  state: CanonicalState;
  dq: number[];
  integratedWork: number;
  integratedDampingLoss: number;
  energyDriftPercent: number | null;
}

export const HamiltonianPanel: React.FC<HamiltonianPanelProps> = ({
  system,
  state,
  dq,
  integratedWork,
  integratedDampingLoss,
  energyDriftPercent,
}) => {
  const N = system.links.length;
  const masses = system.links.map((l) => l.massKg);
  const lengths = system.links.map((l) => l.lengthM);
  const g = system.gravityMPerSec2;

  // Compute current energies using the exact physics engine
  const { T, V, H } = getEnergies(state.q, state.p, masses, lengths, g);

  // Compute current mass matrix
  const M = buildMassMatrix(state.q, masses, lengths);

  // Determine power rates
  let dampingPower = 0;
  let inputPower = 0;
  for (let i = 0; i < N; i++) {
    const b = system.links[i]?.dampingCoefficient ?? 0;
    dampingPower -= b * dq[i] * dq[i]; // always negative
  }

  const pTorque = system.periodicTorque;
  if (pTorque.enabled && pTorque.targetJointIndex < N) {
    const torque =
      pTorque.amplitudeNm *
      Math.cos(pTorque.angularFrequencyRadPerSec * state.timeSec + pTorque.phaseRad);
    inputPower += dq[pTorque.targetJointIndex] * torque;
  }

  const cTorque = system.constantTorque;
  if (cTorque.enabled && cTorque.targetJointIndex < N) {
    inputPower += dq[cTorque.targetJointIndex] * cTorque.torqueNm;
  }

  const netPower = inputPower + dampingPower;

  // Determine energy conservation status
  const hasDamping = system.links.some((l) => l.dampingCoefficient > 0);
  const hasDrive = system.periodicTorque.enabled || system.constantTorque.enabled;

  let conservationStatus = "conserved";
  if (hasDamping && hasDrive) {
    conservationStatus = "exchange";
  } else if (hasDamping) {
    conservationStatus = "damped";
  } else if (hasDrive) {
    conservationStatus = "driven";
  }

  return (
    <div className="flex flex-col gap-5 p-4 bg-white border border-stone-200 rounded h-full overflow-y-auto">
      {/* 1. Header */}
      <div>
        <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">
          Hamiltonian Formulation
        </h2>
        <div className="text-xs text-stone-500">
          Planar absolute coordinate formulation
        </div>
      </div>

      {/* 2. Math Equation */}
      <div className="p-3 bg-stone-50 border border-stone-150 rounded flex items-center justify-center overflow-x-auto min-h-[70px]">
        {N === 1 ? (
          <div className="flex flex-col items-center gap-2 w-full text-center">
            <KatexDisplay math={getSingleLinkHamiltonianLatex(masses[0], lengths[0], g)} block />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full text-center">
            <KatexDisplay math={getMultiLinkHamiltonianLatex()} block />
          </div>
        )}
      </div>

      {/* 3. Conservation Status Block */}
      <div className="p-3 border rounded text-xs leading-relaxed">
        {conservationStatus === "conserved" && (
          <div className="border-emerald-250 bg-emerald-50 text-emerald-800">
            <div className="font-bold mb-1">Energy status: Expected to be conserved</div>
            <div>No damping or external torque is active. Total mechanical energy should remain constant apart from small numerical drift.</div>
            {energyDriftPercent !== null && (
              <div className="mt-1 font-semibold font-mono-num">
                Relative energy drift: {formatPercent(energyDriftPercent)}
              </div>
            )}
          </div>
        )}
        {conservationStatus === "damped" && (
          <div className="border-amber-250 bg-amber-50/60 text-amber-800">
            <div className="font-bold mb-1">Energy status: Not conserved</div>
            <div>Joint damping removes energy from the system.</div>
            <div className="mt-1 font-mono-num font-semibold">
              Damping power: {formatPower(dampingPower)}
            </div>
          </div>
        )}
        {conservationStatus === "driven" && (
          <div className="border-sky-250 bg-sky-50 text-sky-800">
            <div className="font-bold mb-1">Energy status: Not conserved</div>
            <div>External applied torque injects or removes energy.</div>
            <div className="mt-1 font-mono-num font-semibold">
              External drive power: {formatPower(inputPower)}
            </div>
          </div>
        )}
        {conservationStatus === "exchange" && (
          <div className="border-indigo-250 bg-indigo-50 text-indigo-800">
            <div className="font-bold mb-1">Energy status: Energy exchange active</div>
            <div>Continuous external power input alongside joint damping dissipation.</div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 font-mono-num font-semibold">
              <span>Drive power:</span>
              <span className="text-right">{formatPower(inputPower)}</span>
              <span>Damping power:</span>
              <span className="text-right">{formatPower(dampingPower)}</span>
              <span className="border-t border-indigo-200 mt-1 pt-0.5">Net power:</span>
              <span className="text-right border-t border-indigo-200 mt-1 pt-0.5">{formatPower(netPower)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Energy Quantities */}
      <div className="border-t border-stone-200 pt-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
          Mechanical Energy
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono-num">
          <div className="text-stone-500">Kinetic (T):</div>
          <div className="text-right font-medium">{formatEnergy(T)}</div>

          <div className="text-stone-500">Potential (V):</div>
          <div className="text-right font-medium">{formatEnergy(V)}</div>

          <div className="text-stone-700 font-bold border-t border-stone-100 pt-1">
            Hamiltonian (H):
          </div>
          <div className="text-right font-bold border-t border-stone-100 pt-1 text-stone-900">
            {formatEnergy(H)}
          </div>
        </div>
      </div>

      {/* 5. Work & Power Integrals */}
      {(hasDamping || hasDrive) && (
        <div className="border-t border-stone-200 pt-3">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Integrated Energy Exchange
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono-num">
            {hasDrive && (
              <>
                <div className="text-stone-500">External Work:</div>
                <div className="text-right text-sky-700 font-medium">
                  {formatEnergy(integratedWork)}
                </div>
              </>
            )}
            {hasDamping && (
              <>
                <div className="text-stone-500">Damping Loss:</div>
                <div className="text-right text-amber-700 font-medium">
                  {formatEnergy(integratedDampingLoss)}
                </div>
              </>
            )}
            <div className="text-stone-700 font-bold border-t border-stone-100 pt-1">
              Net Work Change:
            </div>
            <div className="text-right font-bold border-t border-stone-100 pt-1 text-stone-900">
              {formatEnergy(integratedWork + integratedDampingLoss)}
            </div>
          </div>
        </div>
      )}

      {/* 6. Generalized Coordinates and Momenta */}
      <div className="border-t border-stone-200 pt-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
          State Variables (q, p)
        </h3>
        <div className="flex flex-col gap-1.5 font-mono-num text-xs">
          {system.links.map((link, idx) => {
            const angleDeg = (state.q[idx] * 180) / Math.PI;
            return (
              <div key={link.id} className="p-2 bg-stone-50 border border-stone-200 rounded">
                <div className="font-semibold text-stone-600 mb-1">Bob {idx + 1}</div>
                <div className="grid grid-cols-2 gap-x-2 text-stone-700">
                  <span>Angle (q):</span>
                  <span className="text-right">
                    {formatFloat(state.q[idx], 4)} rad ({formatFloat(angleDeg, 1)}°)
                  </span>
                  <span>Momentum (p):</span>
                  <span className="text-right">{formatFloat(state.p[idx], 4)} kg·m²/s</span>
                  <span>Velocity (dq/dt):</span>
                  <span className="text-right">{formatFloat(dq[idx], 4)} rad/s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Disclosures for substitutions */}
      <div className="border-t border-stone-200 pt-3 flex flex-col gap-1.5">
        <details className="group border border-stone-200 rounded text-xs">
          <summary className="p-2 font-medium text-stone-600 bg-stone-50 hover:bg-stone-100/60 cursor-pointer list-none flex justify-between items-center focus:outline-none">
            <span>Mass Matrix M(q)</span>
            <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 border-t border-stone-200 flex flex-col gap-2 bg-white">
            <div className="flex justify-center py-1 overflow-x-auto text-center">
              <KatexDisplay math={getMassMatrixDefinitionLatex()} block />
            </div>
            <div className="mt-2">
              <div className="font-semibold text-stone-500 mb-1 uppercase tracking-wider text-[10px]">
                Numerical Matrix values (kg·m²):
              </div>
              <div className="font-mono-num bg-stone-900 text-stone-100 p-2 rounded text-[11px] leading-relaxed overflow-x-auto">
                {M.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-4 min-w-[200px]">
                    {row.map((val, cIdx) => (
                      <span key={cIdx} className="w-16 text-right inline-block">
                        {formatFloat(val, 4)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="group border border-stone-200 rounded text-xs">
          <summary className="p-2 font-medium text-stone-600 bg-stone-50 hover:bg-stone-100/60 cursor-pointer list-none flex justify-between items-center focus:outline-none">
            <span>Potential Energy V(q)</span>
            <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 border-t border-stone-200 flex flex-col gap-2 bg-white text-center">
            <KatexDisplay math={getPotentialEnergyDefinitionLatex()} block />
          </div>
        </details>

        <details className="group border border-stone-200 rounded text-xs">
          <summary className="p-2 font-medium text-stone-600 bg-stone-50 hover:bg-stone-100/60 cursor-pointer list-none flex justify-between items-center focus:outline-none">
            <span>Equations of Motion</span>
            <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-3 border-t border-stone-200 flex flex-col gap-2 bg-white">
            <div className="flex justify-center py-1 overflow-x-auto text-center">
              <KatexDisplay
                math={N === 1 ? getSingleLinkEquationsLatex() : getMultiLinkEquationsLatex()}
                block
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
export default HamiltonianPanel;
