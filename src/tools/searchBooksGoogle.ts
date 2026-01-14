import { z } from "zod";
import { searchGoogleBooksVolumes } from "@/lib/googleBooks";
import type { ToolDefinition } from "./types";

export type BookCandidate = {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  categories: string[];
  publishedDate: string | null;
  thumbnail: string | null;
  infoLink: string | null;
  publisher: string | null;
  language: string | null;
  pageCount: number | null;
  isbn10: string | null;
  isbn13: string | null;
};

function pickIsbn(
  ids:
    | Array<{
        type?: string;
        identifier?: string;
      }>
    | undefined,
) {
  const map = new Map<string, string>();
  for (const item of ids ?? []) {
    const type = item.type?.toUpperCase();
    const identifier = item.identifier ?? "";
    if (!type || !identifier) continue;
    map.set(type, identifier);
  }
  return {
    isbn10: map.get("ISBN_10") ?? null,
    isbn13: map.get("ISBN_13") ?? null,
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function normalizeVolumes(
  items: Array<{ id: string; volumeInfo?: unknown }>,
): BookCandidate[] {
  return items.map((v) => {
    const vi = asRecord(v.volumeInfo);

    const industryRaw = vi["industryIdentifiers"];
    const industry =
      Array.isArray(industryRaw) && industryRaw.length
        ? industryRaw
            .map((x) => {
              const r = asRecord(x);
              const type = typeof r["type"] === "string" ? r["type"] : undefined;
              const identifier =
                typeof r["identifier"] === "string" ? r["identifier"] : undefined;
              return { type, identifier };
            })
            .filter((x) => x.type && x.identifier)
        : undefined;

    const { isbn10, isbn13 } = pickIsbn(industry);

    const imageLinks = asRecord(vi["imageLinks"]);
    const thumbnail =
      typeof imageLinks["thumbnail"] === "string"
        ? (imageLinks["thumbnail"] as string)
        : typeof imageLinks["smallThumbnail"] === "string"
          ? (imageLinks["smallThumbnail"] as string)
          : null;

    return {
      id: v.id,
      title:
        typeof vi["title"] === "string"
          ? (vi["title"] as string)
          : typeof vi["subtitle"] === "string"
            ? (vi["subtitle"] as string)
            : "（無題）",
      authors: asStringArray(vi["authors"]),
      description: typeof vi["description"] === "string" ? (vi["description"] as string) : null,
      categories: asStringArray(vi["categories"]),
      publishedDate:
        typeof vi["publishedDate"] === "string" ? (vi["publishedDate"] as string) : null,
      thumbnail,
      infoLink: typeof vi["infoLink"] === "string" ? (vi["infoLink"] as string) : null,
      publisher: typeof vi["publisher"] === "string" ? (vi["publisher"] as string) : null,
      language: typeof vi["language"] === "string" ? (vi["language"] as string) : null,
      pageCount: typeof vi["pageCount"] === "number" ? (vi["pageCount"] as number) : null,
      isbn10,
      isbn13,
    };
  });
}

export const searchBooksGoogleSchema = z.object({
  query: z.string().min(1).describe("検索クエリ（学習テーマやキーワード）"),
  langRestrict: z
    .string()
    .min(2)
    .optional()
    .default("ja")
    .describe("言語制限（例: ja, en）。既定は ja。"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(40)
    .optional()
    .default(10)
    .describe("取得件数（1〜40）。既定は 10。"),
});

export const searchBooksGoogleTool: ToolDefinition<
  typeof searchBooksGoogleSchema,
  { source: "google_books"; books: BookCandidate[] }
> = {
  name: "searchBooks",
  description:
    "Google Books APIで本を検索し、推薦候補（タイトル/著者/概要/カテゴリ/出版日/サムネ/リンク/ISBN等）を返す。",
  schema: searchBooksGoogleSchema,
  handler: async (input) => {
    const maxResults = input.maxResults ?? 10;
    const langRestrict = input.langRestrict ?? "ja";

    const first = await searchGoogleBooksVolumes({
      query: input.query,
      maxResults,
      langRestrict,
    });

    let candidates = normalizeVolumes(first.items ?? []);

    // フォールバック: 日本語で少なければ言語制限なしも追加で拾う
    if (candidates.length < Math.min(5, maxResults) && langRestrict === "ja") {
      const fallback = await searchGoogleBooksVolumes({
        query: input.query,
        maxResults,
        langRestrict: undefined,
      });
      const merged = [...candidates, ...normalizeVolumes(fallback.items ?? [])];
      const dedup = new Map<string, BookCandidate>();
      for (const b of merged) dedup.set(b.id, b);
      candidates = Array.from(dedup.values()).slice(0, maxResults);
    }

    return { source: "google_books", books: candidates };
  },
};

