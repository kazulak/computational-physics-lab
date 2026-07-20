import { PendulumSystem } from "./types";

export interface GeneralizedForce {
  evaluate(
    time: number,
    q: number[],
    dq: number[],
    system: PendulumSystem
  ): number[];
}

export class DampingForce implements GeneralizedForce {
  evaluate(time: number, q: number[], dq: number[], system: PendulumSystem): number[] {
    return dq.map((vel, idx) => {
      const b = system.links[idx]?.dampingCoefficient ?? 0;
      return -b * vel;
    });
  }
}

export class ConstantTorqueForce implements GeneralizedForce {
  evaluate(time: number, q: number[], dq: number[], system: PendulumSystem): number[] {
    const N = q.length;
    const force = new Array(N).fill(0);
    const cTorque = system.constantTorque;
    if (cTorque.enabled && cTorque.targetJointIndex >= 0 && cTorque.targetJointIndex < N) {
      force[cTorque.targetJointIndex] = cTorque.torqueNm;
    }
    return force;
  }
}

export class PeriodicTorqueForce implements GeneralizedForce {
  evaluate(time: number, q: number[], dq: number[], system: PendulumSystem): number[] {
    const N = q.length;
    const force = new Array(N).fill(0);
    const pTorque = system.periodicTorque;
    if (pTorque.enabled && pTorque.targetJointIndex >= 0 && pTorque.targetJointIndex < N) {
      force[pTorque.targetJointIndex] =
        pTorque.amplitudeNm *
        Math.cos(pTorque.angularFrequencyRadPerSec * time + pTorque.phaseRad);
    }
    return force;
  }
}

/**
 * Combines a collection of forces to evaluate the net external generalized force vector Q.
 */
export function computeTotalGeneralizedForce(
  time: number,
  q: number[],
  dq: number[],
  system: PendulumSystem,
  forces: GeneralizedForce[]
): number[] {
  const N = q.length;
  const total = new Array(N).fill(0);

  for (const force of forces) {
    const contribution = force.evaluate(time, q, dq, system);
    for (let i = 0; i < N; i++) {
      total[i] += contribution[i];
    }
  }

  return total;
}
