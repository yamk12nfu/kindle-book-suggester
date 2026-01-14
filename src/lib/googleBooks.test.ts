/**
 * @jest-environment node
 */

import { searchGoogleBooksVolumes } from "./googleBooks";

describe("searchGoogleBooksVolumes", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("クエリと各種パラメータを付けてGoogle Books APIにリクエストする", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "dummy_key";

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalItems: 0, items: [] }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    await searchGoogleBooksVolumes({
      query: "統計学",
      maxResults: 7,
      langRestrict: "ja",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({ method: "GET" });

    const u = new URL(String(url));
    expect(u.origin + u.pathname).toBe("https://www.googleapis.com/books/v1/volumes");
    expect(u.searchParams.get("q")).toBe("統計学");
    expect(u.searchParams.get("printType")).toBe("books");
    expect(u.searchParams.get("orderBy")).toBe("relevance");
    expect(u.searchParams.get("maxResults")).toBe("7");
    expect(u.searchParams.get("langRestrict")).toBe("ja");
    expect(u.searchParams.get("key")).toBe("dummy_key");
  });

  it("APIが非200の場合は本文を含めて例外を投げる", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "quota exceeded",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    await expect(
      searchGoogleBooksVolumes({
        query: "anything",
        maxResults: 10,
        langRestrict: "ja",
      }),
    ).rejects.toThrow("quota exceeded");
  });
});

