import { runTool } from "./runTool";

describe("runTool", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("未知のツール名はエラーを返す", async () => {
    const res = await runTool("no_such_tool", {});
    expect(res.ok).toBe(false);
    expect(res.tool).toBe("no_such_tool");
  });

  it("スキーマ検証に失敗した場合はエラーを返す", async () => {
    const res = await runTool("searchBooks", { query: "" });
    expect(res.ok).toBe(false);
    expect(res.tool).toBe("searchBooks");
    if (!res.ok) {
      expect(res.error).toContain("String");
    }
  });

  it("searchBooks: Google Booksのレスポンスを正規化して返す", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalItems: 1,
        items: [
          {
            id: "vol_1",
            volumeInfo: {
              title: "統計学入門",
              authors: ["山田 太郎"],
              publishedDate: "2020-01-01",
              description: "概要",
              categories: ["Statistics"],
              infoLink: "https://example.com/books/1",
              imageLinks: { thumbnail: "https://example.com/thumb.png" },
              industryIdentifiers: [
                { type: "ISBN_10", identifier: "1234567890" },
                { type: "ISBN_13", identifier: "1234567890123" },
              ],
              language: "ja",
              pageCount: 320,
              publisher: "出版社",
            },
          },
        ],
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    const res = await runTool("searchBooks", { query: "統計学", maxResults: 10 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const out = res.data as { source: string; books: Array<Record<string, unknown>> };
      expect(out.source).toBe("google_books");
      expect(out.books).toHaveLength(1);
      expect(out.books[0].title).toBe("統計学入門");
      expect(out.books[0].authors).toEqual(["山田 太郎"]);
      expect(out.books[0].isbn10).toBe("1234567890");
      expect(out.books[0].isbn13).toBe("1234567890123");
    }
  });

  it("searchBooks: ja制限で少ない場合は言語制限なしでフォールバックする", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalItems: 0, items: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalItems: 1,
          items: [{ id: "vol_fb", volumeInfo: { title: "Fallback Book" } }],
        }),
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    const res = await runTool("searchBooks", { query: "machine learning", maxResults: 10 });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const u1 = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(u1.searchParams.get("langRestrict")).toBe("ja");

    const u2 = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(u2.searchParams.get("langRestrict")).toBe(null);

    if (res.ok) {
      const out = res.data as { books: Array<{ id: string; title: string }> };
      expect(out.books[0].id).toBe("vol_fb");
      expect(out.books[0].title).toBe("Fallback Book");
    }
  });
});

