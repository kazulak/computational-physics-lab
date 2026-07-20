import { PendulumSystem } from "./types";

export function validateSystem(system: PendulumSystem): string | null {
  if (system.links.length === 0) {
    return "At least one pendulum link is required.";
  }
  if (system.links.length > 4) {
    return "The system is limited to a maximum of 4 links.";
  }

  for (let i = 0; i < system.links.length; i++) {
    const link = system.links[i];
    const label = `Link ${i + 1}`;

    if (!Number.isFinite(link.massKg) || link.massKg <= 0) {
      return `${label}: Mass must be a finite positive number.`;
    }
    if (!Number.isFinite(link.lengthM) || link.lengthM <= 0) {
      return `${label}: Length must be a finite positive number.`;
    }
    if (!Number.isFinite(link.initialAngleDeg)) {
      return `${label}: Initial angle must be a finite number.`;
    }
    if (!Number.isFinite(link.initialAngularVelocityRadPerSec)) {
      return `${label}: Initial velocity must be a finite number.`;
    }
    if (!Number.isFinite(link.dampingCoefficient) || link.dampingCoefficient < 0) {
      return `${label}: Damping coefficient must be a finite non-negative number.`;
    }
  }

  if (!Number.isFinite(system.gravityMPerSec2) || system.gravityMPerSec2 < 0 || system.gravityMPerSec2 > 30) {
    return "Gravity must be a finite number between 0 and 30 m/s².";
  }

  // Verify joint indexes for forces
  const pTorque = system.periodicTorque;
  if (pTorque.enabled) {
    if (pTorque.targetJointIndex < 0 || pTorque.targetJointIndex >= system.links.length) {
      return "Periodic drive: Target joint index is out of bounds.";
    }
    if (!Number.isFinite(pTorque.amplitudeNm) || pTorque.amplitudeNm < 0) {
      return "Periodic drive: Amplitude must be a finite non-negative number.";
    }
    if (!Number.isFinite(pTorque.angularFrequencyRadPerSec) || pTorque.angularFrequencyRadPerSec < 0) {
      return "Periodic drive: Frequency must be a finite non-negative number.";
    }
    if (!Number.isFinite(pTorque.phaseRad)) {
      return "Periodic drive: Phase must be a finite number.";
    }
  }

  const cTorque = system.constantTorque;
  if (cTorque.enabled) {
    if (cTorque.targetJointIndex < 0 || cTorque.targetJointIndex >= system.links.length) {
      return "Constant torque: Target joint index is out of bounds.";
    }
    if (!Number.isFinite(cTorque.torqueNm)) {
      return "Constant torque: Value must be a finite number.";
    }
  }

  return null;
}
