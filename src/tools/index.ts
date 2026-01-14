import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import type { ToolDefinition } from "./types";
import { searchBooksGoogleTool } from "./searchBooksGoogle";

export const tools = [searchBooksGoogleTool] as const;

export function getToolByName(
  name: string,
): ToolDefinition<z.ZodTypeAny, unknown> | undefined {
  return tools.find((t) => t.name === name) as
    | ToolDefinition<z.ZodTypeAny, unknown>
    | undefined;
}

export type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

function toOpenAITool<TSchema extends z.ZodTypeAny, TOutput>(
  tool: ToolDefinition<TSchema, TOutput>,
): OpenAITool {
  const json = zodToJsonSchema(tool.schema, { $refStrategy: "none" }) as unknown;
  const jsonObj =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const maybeSchema = jsonObj["schema"];
  const parameters =
    maybeSchema && typeof maybeSchema === "object"
      ? (maybeSchema as Record<string, unknown>)
      : (jsonObj as Record<string, unknown>);
  // OpenAI expects the JSON schema for the function parameters
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters,
    },
  };
}

export function getOpenAITools(): OpenAITool[] {
  return tools.map((t) => toOpenAITool(t));
}

