import { formatFloat } from "./numbers";

export function formatMass(value: number): string {
  return `${formatFloat(value, 3)} kg`;
}

export function formatLength(value: number): string {
  return `${formatFloat(value, 3)} m`;
}

export function formatTime(value: number): string {
  return `${formatFloat(value, 3)} s`;
}

export function formatEnergy(value: number): string {
  return `${formatFloat(value, 4)} J`;
}

export function formatVelocity(value: number): string {
  return `${formatFloat(value, 3)} rad/s`;
}

export function formatTorque(value: number): string {
  return `${formatFloat(value, 3)} N·m`;
}

export function formatGravity(value: number): string {
  return `${formatFloat(value, 2)} m/s²`;
}

export function formatPower(value: number): string {
  const formatted = formatFloat(value, 4);
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatted} W`;
}

export function formatDamping(value: number): string {
  return `${formatFloat(value, 3)} N·m·s/rad`;
}
