const MULTIPLIER_NUMBER = 3n;
const MULTIPLIER_DENOMINATOR = 2n;

export function applyGasSlippage(estimatedGas: bigint): bigint {
  return (estimatedGas * MULTIPLIER_NUMBER) / MULTIPLIER_DENOMINATOR;
}
