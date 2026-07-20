/**
 * Formats a floating-point number to a fixed decimal precision.
 * Gracefully handles special values like NaN and Infinity.
 */
export function formatFloat(value: number, decimals = 4): string {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";

  // Use fixed precision formatting
  return value.toFixed(decimals);
}

/**
 * Formats a percentage value.
 */
export function formatPercent(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
