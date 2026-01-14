import { z } from "zod";

export type ToolHandler<TInput, TOutput> = (
  input: TInput,
) => Promise<TOutput> | TOutput;

export type ToolDefinition<TSchema extends z.ZodTypeAny, TOutput> = {
  name: string;
  description: string;
  schema: TSchema;
  handler: ToolHandler<z.infer<TSchema>, TOutput>;
};

