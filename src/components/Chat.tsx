"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SAMPLE_PROMPTS = [
  "機械学習の基礎を学びたい（数学は高校レベル、Pythonは少し触ったことがあります）",
  "簿記3級を短期間で取りたい。おすすめのテキストと問題集を教えて",
  "統計学を仕事で使う（A/Bテストと回帰）ので、入門から実務までの本を知りたい",
];

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "学びたいテーマを教えてください。目的や前提（初心者/経験あり、使いたい言語、期限など）が分かると精度が上がります。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function onSend() {
    if (!canSend) return;
    setError(null);
    const content = input.trim();
    setInput("");

    const nextMessages = [...messages, { role: "user", content } as const];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed: ${res.status}`);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: String(json.reply ?? "") }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 p-4">
          <div className="text-lg font-semibold">Kindle本推薦チャット</div>
          <div className="text-sm text-black/60">
            テーマ入力 →（必要なら追加質問）→ おすすめ本5〜10冊
          </div>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-auto p-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-black text-white"
                      : "bg-black/5 text-black",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-black/10 p-4">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 統計学を仕事で使うので、入門〜実務のおすすめ本を教えて"
              className="min-h-[48px] flex-1 resize-none rounded-lg border border-black/10 p-3 text-sm outline-none focus:border-black/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSend();
              }}
              disabled={isSending}
            />
            <button
              onClick={onSend}
              disabled={!canSend}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              title="送信（Ctrl/⌘ + Enterでも送信）"
            >
              {isSending ? "送信中…" : "送信"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70 hover:bg-black/5"
                disabled={isSending}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-black/50">
            送信: ボタン / Ctrl(⌘)+Enter
          </div>
        </div>
      </div>
    </div>
  );
}

