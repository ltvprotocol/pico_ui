export function truncate(value: number, decimalPlaces: number): string {
  const factor = 10_000;
  const truncated = Math.floor(value * factor) / factor;
  return truncated.toFixed(decimalPlaces);
};
