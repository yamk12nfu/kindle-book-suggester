import { z } from "zod";
import type { ToolDefinition } from "./types";
import { getToolByName } from "./index";

export type ToolRunResult =
  | { ok: true; tool: string; data: unknown }
  | { ok: false; tool: string; error: string };

export async function runTool(toolName: string, rawInput: unknown) {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { ok: false, tool: toolName, error: `Unknown tool: ${toolName}` } as const;
  }

  try {
    const input = tool.schema.parse(rawInput) as z.infer<typeof tool.schema>;
    const data = await (tool as ToolDefinition<z.ZodTypeAny, unknown>).handler(
      input,
    );
    return { ok: true, tool: toolName, data } as const;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to run tool (unknown error)";
    return { ok: false, tool: toolName, error: message } as const;
  }
}

