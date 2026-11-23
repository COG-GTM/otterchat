import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_READING, lookupWeather } from "../lib/weather.ts";

describe("lookupWeather", () => {
  it("returns a reading for Paris (the city from OTTERCHAT-J) instead of throwing", () => {
    const result = lookupWeather("Paris");
    assert.equal(result.city, "Paris");
    assert.equal(typeof result.condition, "string");
    assert.equal(typeof result.temperatureF, "number");
  });

  it("matches cities case-insensitively and ignores surrounding whitespace", () => {
    assert.deepEqual(
      { ...lookupWeather("  NEW york "), city: "" },
      { ...lookupWeather("new york"), city: "" },
    );
  });

  it("falls back to a default reading for cities with no data", () => {
    const result = lookupWeather("Atlantis");
    assert.deepEqual(result, { city: "Atlantis", ...DEFAULT_READING });
  });
});
