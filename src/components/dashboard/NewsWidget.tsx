import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsApi } from "@/hooks/useNewsApi";
import { format, parseISO } from "date-fns";
import { ExternalLink, Newspaper } from "lucide-react";

const NEWS_COUNT = 8;

export function NewsWidget() {
  const { data: articles = [], isLoading, isError, error } = useNewsApi({ pageSize: NEWS_COUNT });

  return (
    <Card className="zoho-card p-3 self-start w-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Newspaper className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-base font-semibold text-foreground">Property News</h3>
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : isError || articles.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          <p>{isError ? "Could not load news." : "No news available."}</p>
          <p className="mt-1 text-xs text-foreground/40">
            {isError && error instanceof Error ? error.message : "Deploy news-proxy Edge Function and set NEWS_API_KEY in Supabase secrets."}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[200px] pr-2">
          <div className="space-y-1">
            {articles.map((article, idx) => (
              <a
                key={idx}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 truncate">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.source?.name ?? "Unknown"} ·{" "}
                    {article.publishedAt
                      ? format(parseISO(article.publishedAt), "d MMM, HH:mm")
                      : ""}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-foreground/40 group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
