export type WeatherReading = { city: string; condition: string; temperatureF: number };

type Reading = Omit<WeatherReading, "city">;

export const DEFAULT_READING: Reading = { condition: "Sunny", temperatureF: 72 };

export const READINGS: Record<string, Reading> = {
  paris: { condition: "Partly Cloudy", temperatureF: 64 },
  london: { condition: "Rainy", temperatureF: 55 },
  "new york": { condition: "Clear", temperatureF: 68 },
  "san francisco": { condition: "Foggy", temperatureF: 61 },
  tokyo: { condition: "Sunny", temperatureF: 75 },
};

export function lookupWeather(city: string): WeatherReading {
  const reading = READINGS[city.trim().toLowerCase()] ?? DEFAULT_READING;
  return { city, ...reading };
}
