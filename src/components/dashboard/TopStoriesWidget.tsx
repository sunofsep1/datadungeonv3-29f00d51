import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsApi } from "@/hooks/useNewsApi";
import { format, parseISO } from "date-fns";
import { ExternalLink, Newspaper } from "lucide-react";

const TOP_COUNT = 5;

export function TopStoriesWidget() {
  const { data: articles = [], isLoading, isError, error } = useNewsApi({ pageSize: TOP_COUNT });

  return (
    <Card className="zoho-card p-4 md:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-white">Top Stories</h3>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError || articles.length === 0 ? (
        <div className="py-6 text-center text-sm text-white/60">
          <p>{isError ? "Could not load headlines." : "No headlines available."}</p>
          <p className="mt-1 text-xs text-white/40">
            {isError && error instanceof Error ? error.message : "Add NEWS_API_KEY to news-proxy Edge Function secrets for real estate news."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.slice(0, TOP_COUNT).map((article, idx) => (
            <a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                    <span>{article.source?.name ?? "Unknown"}</span>
                    <span>·</span>
                    <span>
                      {article.publishedAt
                        ? format(parseISO(article.publishedAt), "d MMM")
                        : ""}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 text-white/40 group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
