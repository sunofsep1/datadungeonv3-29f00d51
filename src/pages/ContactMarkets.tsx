import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, type ContactWithMeta } from "@/hooks/useContacts";
import { buildMarketStats } from "@/lib/contactMarkets";
import {
  CONTACT_MARKETS_EVENT,
  loadContactMarkets,
  saveContactMarkets,
} from "@/lib/contactMarketsPrefs";
import { MarketCard } from "@/components/contacts/MarketCard";
import { MarketEditorDialog } from "@/components/contacts/MarketEditorDialog";

export default function ContactMarkets() {
  const { data: contacts, isLoading, isError, refetch } = useContacts();
  const [markets, setMarkets] = useState(() => loadContactMarkets());
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const sync = () => setMarkets(loadContactMarkets());
    window.addEventListener(CONTACT_MARKETS_EVENT, sync);
    return () => window.removeEventListener(CONTACT_MARKETS_EVENT, sync);
  }, []);

  const stats = useMemo(
    () => buildMarketStats((contacts ?? []) as ContactWithMeta[], markets),
    [contacts, markets],
  );

  const totalOwners = useMemo(() => stats.reduce((sum, s) => sum + s.total, 0), [stats]);

  if (isLoading) {
    return (
      <div className="animate-fade-in flex flex-col gap-4 pb-6">
        <PageHeader title="My Markets" description="Loading your farming territories…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in flex flex-col gap-4 pb-6">
        <PageHeader title="My Markets" />
        <p className="text-sm text-muted-foreground">Could not load contacts.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader
        title="My Markets"
        description="Home owners grouped by linked property suburb — click a market to open those contacts."
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" />
            Manage markets
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground -mt-2">
        {markets.length} pinned markets · {totalOwners} owner-property matches across tiles (contacts can appear in
        more than one market)
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((row) => (
          <MarketCard key={row.market.id} stats={row} />
        ))}
      </div>

      {markets.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No markets configured. Add Victoria Point, Redland Bay, and your other farm areas.
        </div>
      )}

      <MarketEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        markets={markets}
        onSave={(next) => {
          saveContactMarkets(next);
          setMarkets(next);
        }}
      />
    </div>
  );
}
