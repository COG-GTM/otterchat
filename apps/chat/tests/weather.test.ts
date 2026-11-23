import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_READING, lookupReading, type Reading } from "../lib/weather.ts";

describe("lookupReading (get_weather)", () => {
  it("returns a reading for a city missing from an empty map (OTTERCHAT-K: Tokyo)", () => {
    const reading = lookupReading({}, "Tokyo");
    assert.deepEqual(reading, DEFAULT_READING);
    assert.equal(typeof reading.condition, "string");
  });

  it("returns the stored reading, matching case- and whitespace-insensitively", () => {
    const readings: Record<string, Reading> = { tokyo: { condition: "Rain", temperatureF: 55 } };
    assert.deepEqual(lookupReading(readings, "  TOKYO "), { condition: "Rain", temperatureF: 55 });
  });

  it("ignores inherited Object.prototype keys like 'constructor'", () => {
    assert.deepEqual(lookupReading({}, "constructor"), DEFAULT_READING);
    assert.deepEqual(lookupReading({}, "__proto__"), DEFAULT_READING);
  });
});
