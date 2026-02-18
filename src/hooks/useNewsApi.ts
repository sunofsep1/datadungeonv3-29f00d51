import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  message?: string;
}

async function fetchNews(q = "real estate OR property OR housing Australia", pageSize = 10): Promise<NewsArticle[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return [];

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return [];

  const url =
    `${base}/functions/v1/news-proxy?` +
    `q=${encodeURIComponent(q)}` +
    `&pageSize=${pageSize}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const data: NewsApiResponse = await res.json().catch(() => ({}));

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
