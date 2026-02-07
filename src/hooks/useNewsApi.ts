import { useQuery } from "@tanstack/react-query";

export interface NewsArticle {
  title: string;
  source: { name: string };
  publishedAt: string;
  url: string;
  description?: string;
}

interface NewsApiResponse {
  status: string;
  totalResults?: number;
  articles?: NewsArticle[];
  error?: string;
}

async function fetchNews(q = "real estate OR property OR housing Australia", pageSize = 10): Promise<NewsArticle[]> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !anonKey) return [];

  const url =
    `${base}/functions/v1/news-proxy?` +
    `q=${encodeURIComponent(q)}` +
    `&pageSize=${pageSize}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
  });
  const data: NewsApiResponse & { error?: string } = await res.json().catch(() => ({}));

  if (!res.ok || data.status === "error") {
    throw new Error(data.error ?? data.message ?? "Failed to fetch news");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  const articles = data.articles ?? [];
  return articles.filter((a) => a?.title && a?.url);
}

export function useNewsApi(options?: { q?: string; pageSize?: number }) {
  const q = options?.q ?? "real estate OR property OR housing Australia";
  const pageSize = options?.pageSize ?? 10;

  return useQuery({
    queryKey: ["news", q, pageSize],
    queryFn: () => fetchNews(q, pageSize),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
