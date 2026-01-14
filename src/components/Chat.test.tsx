import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chat } from "./Chat";

describe("Chat", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("初期メッセージが表示される", () => {
    render(<Chat />);
    expect(
      screen.getByText(
        /学びたいテーマを教えてください。目的や前提（初心者\/経験あり、使いたい言語、期限など）が分かると精度が上がります。/,
      ),
    ).toBeInTheDocument();
  });

  it("サンプルプロンプトをクリックすると入力欄にセットされる", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const btn = screen.getByRole("button", { name: /機械学習の基礎を学びたい/ });
    await user.click(btn);

    const textarea = screen.getByPlaceholderText(
      /例: 統計学を仕事で使うので、入門〜実務のおすすめ本を教えて/,
    ) as HTMLTextAreaElement;

    expect(textarea.value).toMatch(/機械学習の基礎を学びたい/);
  });

  it("送信すると /api/chat を呼び、返答が追加される", async () => {
    const user = userEvent.setup();

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "おすすめはA〜Cです。" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    render(<Chat />);

    const textarea = screen.getByPlaceholderText(
      /例: 統計学を仕事で使うので、入門〜実務のおすすめ本を教えて/,
    );
    await user.type(textarea, "統計学のおすすめを教えて");

    await user.click(screen.getByRole("button", { name: "送信" }));

    // API呼び出し確認
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/chat");
    expect(init).toMatchObject({ method: "POST" });

    const body = JSON.parse(String((init as { body?: unknown }).body ?? "{}")) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages.some((m) => m.role === "user" && /統計学のおすすめ/.test(m.content))).toBe(true);

    // 返答がUIに表示される
    expect(await screen.findByText("おすすめはA〜Cです。")).toBeInTheDocument();
  });
});

