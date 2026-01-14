export type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    categories?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    infoLink?: string;
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
    language?: string;
    pageCount?: number;
  };
};

export type GoogleBooksVolumesResponse = {
  totalItems?: number;
  items?: GoogleBooksVolume[];
};

export async function searchGoogleBooksVolumes(params: {
  query: string;
  maxResults: number;
  langRestrict?: string;
}) {
  const { query, maxResults, langRestrict } = params;

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", "relevance");
  url.searchParams.set("maxResults", String(maxResults));
  if (langRestrict) url.searchParams.set("langRestrict", langRestrict);

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) url.searchParams.set("key", apiKey);

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google Books API error: ${res.status} ${res.statusText}${
        text ? ` - ${text}` : ""
      }`,
    );
  }

  return (await res.json()) as GoogleBooksVolumesResponse;
}

