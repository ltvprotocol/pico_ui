export function limitDecimals(
  input: string,
  maxDecimals = 18
) : string {
  const dotIndex = input.indexOf('.');

  if (dotIndex === -1) return input;

  const integerPart = input.slice(0, dotIndex);
  const decimalPart = input.slice(dotIndex + 1).slice(0, maxDecimals);

  return `${integerPart}.${decimalPart}`;
}
