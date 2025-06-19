export function truncateTo4Decimals(value: number): string {
  const factor = 10_000;
  const truncated = Math.floor(value * factor) / factor;
  return truncated.toFixed(4);
}