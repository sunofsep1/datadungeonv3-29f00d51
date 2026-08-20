import { ExternalLink, Loader2, Palette, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCancelDesignRequest,
  useCreateDesignRequest,
  useDesignRequests,
  useSelectDesignCandidate,
} from "@/hooks/useDesignRequests";
import {
  buildListingBrief,
  DESIGN_KINDS,
  DESIGN_STATUS_LABEL,
  type DesignRequest,
  type ListingBriefInput,
} from "@/lib/marketingStudio";

type Props = {
  listingId: string;
  listing: ListingBriefInput;
};

function StatusBadge({ status }: { status: DesignRequest["status"] }) {
  const label = DESIGN_STATUS_LABEL[status] ?? status;
  const variant =
    status === "created" ? "default" : status === "failed" ? "destructive" : "secondary";
  const spinning = status === "pending" || status === "generating" || status === "selected";
  return (
    <Badge variant={variant} className="text-[10px] gap-1">
      {spinning && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </Badge>
  );
}

export function MarketingStudioCard({ listingId, listing }: Props) {
  const { toast } = useToast();
  const { data: requests = [], isLoading } = useDesignRequests(listingId);
  const createRequest = useCreateDesignRequest();
  const selectCandidate = useSelectDesignCandidate();
  const cancelRequest = useCancelDesignRequest();

  const queue = async (kind: (typeof DESIGN_KINDS)[number]["key"]) => {
    try {
      await createRequest.mutateAsync({
        listing_id: listingId,
        kind,
        brief: buildListingBrief(kind, listing),
      });
      toast({
        title: "Design queued",
        description: "On-brand options will appear below in a few minutes.",
      });
    } catch (err) {
      toast({
        title: "Could not queue design",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const visible = requests.filter((r) => r.status !== "cancelled");

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Marketing Studio</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            One tap → on-brand Canva designs built from this listing's details.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {DESIGN_KINDS.map(({ key, label, blurb }) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            title={blurb}
            disabled={createRequest.isPending}
            onClick={() => void queue(key)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing generated yet. Tap a button above to create your first design.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((req) => (
            <li key={req.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {DESIGN_KINDS.find((k) => k.key === req.kind)?.label ?? req.kind}
                </span>
                <StatusBadge status={req.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(req.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {["pending", "generating", "candidates_ready"].includes(req.status) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      void cancelRequest.mutateAsync({ id: req.id, listing_id: req.listing_id })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {req.status === "candidates_ready" && (req.candidates?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Pick your favourite — it becomes an editable Canva design:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(req.candidates ?? []).map((c) => (
                      <button
                        key={c.candidate_id}
                        type="button"
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted hover:ring-2 hover:ring-primary transition-shadow"
                        onClick={() =>
                          void selectCandidate.mutateAsync({
                            id: req.id,
                            listing_id: req.listing_id,
                            candidate_id: c.candidate_id,
                          })
                        }
                      >
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt="Design option"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Preview
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          Use this one
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {req.status === "created" && req.design_url && (
                <div className="mt-2">
                  <a
                    href={req.design_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Open in Canva to edit or download
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {req.status === "failed" && req.error && (
                <p className="mt-2 text-xs text-destructive">{req.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
