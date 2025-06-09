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