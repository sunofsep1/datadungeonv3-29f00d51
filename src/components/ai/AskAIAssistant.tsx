import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { usePerplexity } from "@/hooks/usePerplexity";
import { cn } from "@/lib/utils";

const ASK_AI_EVENT = "open-ask-ai";

export function openAskAI() {
  window.dispatchEvent(new CustomEvent(ASK_AI_EVENT));
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[] | null;
}

export function AskAIAssistant() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { mutate, isPending, data } = usePerplexity();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(ASK_AI_EVENT, handler);
    return () => window.removeEventListener(ASK_AI_EVENT, handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, data]);

  useEffect(() => {
    if (data) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "user") {
          return [
            ...prev,
            { role: "assistant", content: data.answer, citations: data.citations },
          ];
        }
        return prev;
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuery("");
    mutate(
      { query: q },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Something went wrong";
          const hint = msg.toLowerCase().includes("jwt") || msg.toLowerCase().includes("invalid token")
            ? " Try signing out and back in, or check that your app and Edge Functions use the same Supabase project."
            : " Make sure PERPLEXITY_API_KEY is set in Edge Function secrets.";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${msg}.${hint}` },
          ]);
        },
      }
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
        title="Ask AI (Perplexity)"
        onClick={() => setOpen(true)}
        aria-label="Ask AI"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex flex-col w-full sm:max-w-lg p-0 gap-0 bg-background border-border"
        >
          <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask AI
            </SheetTitle>
            <p className="text-xs text-muted-foreground text-left font-normal">
              Powered by Perplexity. Ask about markets, suburbs, or anything real estate.
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-3 min-h-0">
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-2 pt-4">
                  <p>Try asking:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground/90">
                    <li>What are current real estate trends in Sydney?</li>
                    <li>School ratings in Bondi, NSW</li>
                    <li>Property market outlook for 2025</li>
                  </ul>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "ml-8 bg-primary text-primary-foreground"
                      : "mr-8 bg-muted text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                      {msg.citations.slice(0, 5).map((url, j) => (
                        <a
                          key={j}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          [{j + 1}]
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isPending && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching the web…
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about real estate, markets, suburbs…"
              className="min-h-[80px] resize-none"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" className="mt-2 w-full" disabled={!query.trim() || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching…
                </>
              ) : (
                "Ask"
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
