export function allowOnlyNumbers(input: string) : string {
  let value = input.replace(/[^0-9.]/g, '');

  const firstDotIndex = value.indexOf('.');

  if (firstDotIndex !== -1) {
    const beforeDot = value.slice(0, firstDotIndex + 1);
    const afterDot = value.slice(firstDotIndex + 1).replace(/\./g, '');
    value = beforeDot + afterDot;
  }

  if (value.startsWith('.')) {
    value = '0' + value;
  }

  return value;
};

export function allowOnlySignedNumbers(value: string): string {
  const cleaned = value.replace(/[^\d.-]/g, '');
  
  const parts = cleaned.split('-');
  if (parts.length > 2) {
    return parts[0] === '' ? '-' + parts.slice(1).join('') : parts.join('');
  }
  
  const decimalParts = cleaned.split('.');
  if (decimalParts.length > 2) {
    return decimalParts[0] + '.' + decimalParts.slice(1).join('');
  }
  
  return cleaned;
};
