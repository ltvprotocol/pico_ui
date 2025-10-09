import { truncate } from "./truncate";

export function formatLtv(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return truncate(numValue, 2);
}
