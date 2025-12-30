import { parseUnits } from "ethers";
import { allowOnlyNumbers } from "./allowOnlyNumbers";
import { limitDecimals } from "./limitDecimals";

export interface ProcessedInput {
  formattedValue: string;
  parsedValue: bigint | null;
}

export function processInput(
  value: string,
  decimals: number = 18
) : ProcessedInput {
  const numbersOnly = allowOnlyNumbers(value);
  const limited = limitDecimals(numbersOnly, decimals);

  const result: ProcessedInput = {
    formattedValue: limited,
    parsedValue: null
  };

  try {
    const parsed = parseUnits(limited, decimals);
    result.parsedValue = parsed;
  } catch {
    // Parser error, keep null
  }

  return result;
}
