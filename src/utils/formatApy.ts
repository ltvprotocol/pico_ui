export const formatApy = (value: number | null) => {
  if (value === null) return null;
  return `${value.toFixed(2)}%`;
};