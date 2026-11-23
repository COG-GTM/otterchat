import assert from "node:assert/strict";
import { describe, it } from "node:test";

import getWeather from "../agent/tools/get_weather.ts";

type WeatherResult = { city: string; condition: string; temperatureF: number };

// Regression for Sentry OTTERCHAT-J: `TypeError: Cannot read properties of undefined (reading 'condition')`
// thrown when the requested city has no entry in the readings table.
const execute = (city: string) =>
  (getWeather.execute as (input: { city: string }) => Promise<WeatherResult>)({ city });

function assertDefaultReading(result: WeatherResult, city: string) {
  assert.equal(result.city, city);
  assert.equal(typeof result.condition, "string");
  assert.ok(result.condition.length > 0);
  assert.equal(typeof result.temperatureF, "number");
  assert.ok(Number.isFinite(result.temperatureF));
}

describe("get_weather tool", () => {
  it("returns a default reading instead of throwing when the city has no reading (OTTERCHAT-J)", async () => {
    assertDefaultReading(await execute("Atlantis"), "Atlantis");
  });

  it("returns a default reading instead of throwing for a mixed-case city with no reading", async () => {
    assertDefaultReading(await execute("SaN FrAnCiScO"), "SaN FrAnCiScO");
  });

  it("returns a default reading instead of throwing for a whitespace-padded city with no reading", async () => {
    assertDefaultReading(await execute("  Paris  "), "  Paris  ");
  });

  it("returns a default reading instead of throwing for a whitespace-only city", async () => {
    assertDefaultReading(await execute("   "), "   ");
  });

  it("falls back to the previous Sunny 72°F reading for unknown cities", async () => {
    assert.deepEqual(await execute("Atlantis"), {
      city: "Atlantis",
      condition: "Sunny",
      temperatureF: 72,
    });
  });
});
