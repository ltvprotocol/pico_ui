export const isZeroOrNan = (value: string) => {
  const parsed = parseFloat(value);
  return parsed === 0 || isNaN(parsed);
}