export function formatForInput(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }

  if (numValue === 0) {
    return '0';
  }

  if (Math.abs(numValue) < 0.0001 && Math.abs(numValue) > 0) {
    return numValue.toFixed(18);
  }

  return numValue.toString();
}
