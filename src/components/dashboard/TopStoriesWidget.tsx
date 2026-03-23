import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsApi } from "@/hooks/useNewsApi";
import { format, parseISO } from "date-fns";
import { ExternalLink, Newspaper } from "lucide-react";

const TOP_COUNT = 5;

export function TopStoriesWidget() {
  const { data: articles = [], isLoading, isError, error } = useNewsApi({ pageSize: TOP_COUNT });

  return (
    <Card className="zoho-card p-3 self-start w-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Newspaper className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">Top Stories</h3>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError || articles.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          <p>{isError ? "Could not load headlines." : "No headlines available."}</p>
          <p className="mt-1 text-xs text-foreground/40">
            {isError && error instanceof Error ? error.message : "Add NEWS_API_KEY to news-proxy Edge Function secrets for real estate news."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {articles.slice(0, TOP_COUNT).map((article, idx) => (
            <a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2.5 rounded-md border border-border hover:bg-muted/50 hover:border-border transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{article.source?.name ?? "Unknown"}</span>
                    <span>·</span>
                    <span>
                      {article.publishedAt
                        ? format(parseISO(article.publishedAt), "d MMM")
                        : ""}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 text-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
