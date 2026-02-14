import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Research() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string; citations?: string[] | null } | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);

  const handleAsk = async () => {
    const q = query.trim();
    if (!q) {
      toast({ title: "Enter a question", variant: "destructive" });
      return;
    }
    const base = import.meta.env.VITE_SUPABASE_URL;
    const url = base ? `${base}/functions/v1/perplexity-proxy` : null;
    if (!url) {
      toast({ title: "App URL not configured", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setUnconfigured(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to use Research", variant: "destructive" });
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: q, context: context.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setUnconfigured(true);
        return;
      }
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || data?.message || "Request failed", variant: "destructive" });
        return;
      }
      setResult({ answer: data?.answer ?? "", citations: data?.citations ?? null });
    } catch {
      toast({ title: "Error", description: "Could not reach Research service", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Research"
        description="Ask questions and get AI-powered answers with web search (Perplexity)."
      />
      <Card className="zoho-card p-6 border-white/10 max-w-3xl">
        {unconfigured ? (
          <p className="text-sm text-muted-foreground">
            Perplexity integration available with API key. See docs/PERPLEXITY_INTEGRATION.md.
          </p>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  className="bg-input"
                  placeholder="e.g. What are current first home buyer grants in Queensland?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                />
              </div>
              <div className="space-y-2">
                <Label>Context (optional)</Label>
                <Textarea
                  className="bg-input min-h-[80px]"
                  placeholder="e.g. Contact name, suburb, or extra context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              <Button onClick={handleAsk} disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                {loading ? "Searching..." : "Ask"}
              </Button>
            </div>
            {result && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Answer</h4>
                <div className="text-foreground whitespace-pre-wrap">{result.answer}</div>
                {result.citations && result.citations.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Sources:</span>{" "}
                    {result.citations.join(", ")}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
