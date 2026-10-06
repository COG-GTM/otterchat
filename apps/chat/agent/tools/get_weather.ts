import { defineTool } from "eve/tools";
import { z } from "zod";

// the runtime tool name is the filename (snake_case ASCII)
export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1) }),
  async execute({ city }) {
    return { city, condition: "Sunny", temperatureF: 72 };
  },
});
