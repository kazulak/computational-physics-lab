export interface PendulumLink {
  id: string;
  massKg: number;
  lengthM: number;
  initialAngleDeg: number;       // Angles are input in degrees
  initialAngularVelocityRadPerSec: number;
  dampingCoefficient: number;
}

export interface PeriodicTorque {
  enabled: boolean;
  targetJointIndex: number;      // 0-indexed link where torque is applied
  amplitudeNm: number;
  angularFrequencyRadPerSec: number;
  phaseRad: number;
}

export interface ConstantTorque {
  enabled: boolean;
  targetJointIndex: number;
  torqueNm: number;
}

export interface PendulumSystem {
  links: PendulumLink[];
  gravityMPerSec2: number;
  periodicTorque: PeriodicTorque;
  constantTorque: ConstantTorque;
}

export interface CanonicalState {
  timeSec: number;
  q: number[]; // Generalized coordinates (absolute angles in radians)
  p: number[]; // Canonical momenta (kg * m^2 / s)
}

export interface SimulationSettings {
  integratorId: string;
  physicsDtSec: number;
  playbackSpeed: number;
  historyDurationSec: number;
}
