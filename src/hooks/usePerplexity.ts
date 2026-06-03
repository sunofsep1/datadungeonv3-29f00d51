import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerplexityResponse {
  answer: string;
  citations: string[] | null;
  raw?: unknown;
}

async function askPerplexity(query: string, context?: string): Promise<PerplexityResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const res = await fetch(`${base}/functions/v1/perplexity-proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: query.trim(), context: context?.trim() || undefined }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Failed to get AI response");
  }

  return {
    answer: data.answer ?? "",
    citations: data.citations ?? null,
    raw: data.raw,
  };
}

export function usePerplexity() {
  return useMutation({
    mutationFn: ({ query, context }: { query: string; context?: string }) =>
      askPerplexity(query, context),
  });
}
