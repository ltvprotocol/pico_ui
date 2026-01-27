export function formatPoints(
  value: number,
  decimals = 24,
  fractionDigits = 2
): string {
  if (!Number.isFinite(value)) return '0';

  const human = value / 10 ** decimals;
  const factor = 10 ** fractionDigits;

  const floored = Math.floor(human * factor) / factor;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(floored);
}
