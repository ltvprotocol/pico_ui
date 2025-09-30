import { truncate } from "./truncate";

export function ltvToLeverage(ltv: number): string {
  if (ltv <= 0 || ltv >= 1) {
    throw new Error("LTV must be between 0 and 1 (exclusive)");
  }
  const maxLeverage = 1 / (1 - ltv);

  if (Number.isInteger(maxLeverage)) {
    return maxLeverage.toString();
  }

  return truncate(maxLeverage, 2)
}
