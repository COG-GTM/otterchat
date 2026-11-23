export type Reading = { condition: string; temperatureF: number };

export const DEFAULT_READING: Reading = { condition: "Sunny", temperatureF: 72 };

export function lookupReading(readings: Record<string, Reading>, city: string): Reading {
  const key = city.trim().toLowerCase();
  return Object.hasOwn(readings, key) ? readings[key] : DEFAULT_READING;
}
