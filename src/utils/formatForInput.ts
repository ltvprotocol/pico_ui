import { truncate } from "./truncate";

export function formatForInput(value: string | number, decimals: number = 18): string {
  if (typeof value === 'string') {
    if (value === '' || value === '0') {
      return '0';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return '0';
    }

    if (numValue === 0) {
      return '0';
    }

    const truncated = truncateString(value, decimals);
    return removeTrailingZeros(truncated);
  }

  if (isNaN(value)) {
    return '0';
  }

  if (value === 0) {
    return '0';
  }

  const truncated = truncate(value, decimals);
  return removeTrailingZeros(truncated);
}

function truncateString(value: string, decimals: number): string {
  const [integerPart, decimalPart = ''] = value.split('.');
  
  if (decimalPart.length <= decimals) {
    return value;
  }
  
  return `${integerPart}.${decimalPart.slice(0, decimals)}`;
}

function removeTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/, '');
}
