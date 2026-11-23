import * as Sentry from "@sentry/node";
import { defineTool } from "eve/tools";
import { z } from "zod";

type Reading = { condition: string; temperatureF: number };

const readings: Record<string, Reading> = {};

// the runtime tool name is the filename (snake_case ASCII)
export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1) }),
  async execute({ city }) {
    try {
      const reading = readings[city.toLowerCase()];
      return { city, condition: reading.condition, temperatureF: reading.temperatureF };
    } catch (error) {
      Sentry.captureException(error, { tags: { tool: "get_weather" }, extra: { city } });
      await Sentry.flush(2000);
      throw error;
    }
  },
});
