import { PendulumSystem } from "../physics/types";

export interface Preset {
  name: string;
  description: string;
  system: PendulumSystem;
}

export const PRESETS: Preset[] = [
  {
    name: "Small-Angle Ideal Pendulum",
    description: "One link at a small release angle (10°). Total energy is conserved and coordinates evolve almost sinusoidally.",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 10.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.0,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: false,
        targetJointIndex: 0,
        amplitudeNm: 0.0,
        angularFrequencyRadPerSec: 1.0,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
  {
    name: "Large-Angle Nonlinear Pendulum",
    description: "One link at a large release angle (90°). Illustrates the deviation from simple harmonic motion (longer period, non-sinusoidal profile).",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 90.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.0,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: false,
        targetJointIndex: 0,
        amplitudeNm: 0.0,
        angularFrequencyRadPerSec: 1.0,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
  {
    name: "Damped Pendulum",
    description: "One link with friction. Mechanical energy decays over time, spiral trajectory in phase space towards origin.",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 120.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.25,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: false,
        targetJointIndex: 0,
        amplitudeNm: 0.0,
        angularFrequencyRadPerSec: 1.0,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
  {
    name: "Driven & Damped Pendulum",
    description: "One link with joint friction and a periodic external torque. Demonstrates energy resonance, phase-locking, and chaos depending on driving frequency.",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 0.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.1,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: true,
        targetJointIndex: 0,
        amplitudeNm: 1.5,
        angularFrequencyRadPerSec: 1.3,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
  {
    name: "Double Pendulum (Chaotic)",
    description: "Two links released from asymmetric initial angles. Exhibits chaotic motion sensitive to initial conditions. Total energy is conserved.",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 90.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.0,
        },
        {
          id: "link-2",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 45.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.0,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: false,
        targetJointIndex: 0,
        amplitudeNm: 0.0,
        angularFrequencyRadPerSec: 1.0,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
  {
    name: "Driven & Damped Double Pendulum",
    description: "Two links with joint damping and a sinusoidal torque applied at the pivot joint. Demonstrates energy exchange across degrees of freedom.",
    system: {
      links: [
        {
          id: "link-1",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 0.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.1,
        },
        {
          id: "link-2",
          massKg: 1.0,
          lengthM: 1.0,
          initialAngleDeg: 0.0,
          initialAngularVelocityRadPerSec: 0.0,
          dampingCoefficient: 0.1,
        },
      ],
      gravityMPerSec2: 9.81,
      periodicTorque: {
        enabled: true,
        targetJointIndex: 0,
        amplitudeNm: 2.5,
        angularFrequencyRadPerSec: 2.0,
        phaseRad: 0.0,
      },
      constantTorque: {
        enabled: false,
        targetJointIndex: 0,
        torqueNm: 0.0,
      },
    },
  },
];
