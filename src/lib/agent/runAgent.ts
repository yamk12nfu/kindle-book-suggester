import { getOpenAITools } from "@/tools";
import { runTool } from "@/tools/runTool";
import { createChatCompletion, type OpenAIMessage } from "@/lib/llm/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = [
  "あなたはKindle本の推薦アシスタントです。",
  "ユーザーの学びたいテーマに対して、必要に応じて検索ツールを使い、最終的に5〜10冊を推薦してください。",
  "",
  "制約:",
  "- ユーザーの目的/前提が曖昧なら、最初に1〜2個だけ確認質問をする。",
  "- 推薦は5〜10冊。各冊に: どんな人向け / 得られること / 前提知識 / 注意点 を短く書く。",
  "- 可能なら日本語本を優先。足りなければ英語も提案してよい。",
  "- 可能なら出典リンク（Google BooksのURL）を付ける。",
  "",
  "ツール結果はそのままコピペせず、ユーザーの目的に合わせて編集・選定して提示する。",
].join("\n");

export async function runAgent(userMessages: ChatMessage[]) {
  const tools = getOpenAITools();

  const messages: OpenAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const maxSteps = 6;
  for (let step = 0; step < maxSteps; step++) {
    const res = await createChatCompletion({
      messages,
      tools,
      tool_choice: "auto",
    });

    const assistant = res.choices?.[0]?.message;
    if (!assistant) throw new Error("LLM returned no choices");

    const toolCalls = assistant.tool_calls ?? [];
    if (toolCalls.length === 0) {
      if (assistant.content && assistant.content.trim()) return assistant.content;
      throw new Error("LLM returned empty content");
    }

    // まず assistant メッセージ（tool_calls付き）を履歴に追加
    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      const result = await runTool(call.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("Agent exceeded maxSteps");
}

