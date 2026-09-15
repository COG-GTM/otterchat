import { defineAgent, defineDynamic } from "eve";
import type { DynamicResolveContext } from "eve";
import { DEFAULT_TEXT_MODEL_ID, TEXT_MODEL_ATTRIBUTE, resolveTextModel } from "@/lib/models";

function selectedTextModel(ctx: DynamicResolveContext) {
  const attributes = ctx.session.auth.current?.attributes;
  const selected = attributes?.[TEXT_MODEL_ATTRIBUTE];

  return resolveTextModel(typeof selected === "string" ? selected : undefined).id;
}

export default defineAgent({
  model: defineDynamic({
    events: {
      "turn.started": (_event, ctx) => selectedTextModel(ctx),
    },
    fallback: DEFAULT_TEXT_MODEL_ID,
  }),
  reasoning: "none",
});
