import * as Sentry from "@sentry/node";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { lookupWeather } from "@/lib/weather";

// the runtime tool name is the filename (snake_case ASCII)
export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1) }),
  async execute({ city }) {
    try {
      return lookupWeather(city);
    } catch (error) {
      Sentry.captureException(error, { tags: { tool: "get_weather" }, extra: { city } });
      await Sentry.flush(2000);
      throw error;
    }
  },
});
