import { Link, useSearchParams } from "react-router-dom";
import { Copy, ExternalLink, UserSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useContact } from "@/hooks/useContact";
import {
  buildContactResearchHints,
  primaryContactResearchQuery,
} from "@/lib/contactResearchHints";

export const ID4ME_SEARCH_URL = "https://id4me.me/search";

function HintRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string, label: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-foreground">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs"
        onClick={() => onCopy(value, label)}
      >
        <Copy className="mr-1 h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

export default function ContactResearch() {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get("contact") ?? undefined;
  const { data: contact, isLoading, isError } = useContact(contactId);
  const { toast } = useToast();

  const hints = contact ? buildContactResearchHints(contact) : null;
  const displayName = hints?.name || "Contact";
  const bestQuery = hints ? primaryContactResearchQuery(hints) : "";

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${label} copied — paste into iD4me search.` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const openId4me = async (copyFirst?: string) => {
    if (copyFirst?.trim()) {
      try {
        await navigator.clipboard.writeText(copyFirst.trim());
        toast({
          title: "Copied — opening iD4me",
          description: "Paste into the iD4me search box in the new tab.",
        });
      } catch {
        toast({ title: "Could not copy — opening iD4me anyway", variant: "destructive" });
      }
    }
    window.open(ID4ME_SEARCH_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Contact research"
        description="Verify contact details in iD4me (opens in a new tab), then update the CRM record."
        actions={
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => void openId4me(bestQuery || undefined)}
          >
            Open iD4me
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        }
      />

      <Card className="zoho-card mb-4 border-white/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground">
              <UserSearch className="h-5 w-5 shrink-0 text-primary" />
              <h2 className="text-base font-semibold">Research workflow</h2>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              iD4me uses Auth0 login and cannot run inside an embedded frame. Open it in a new tab,
              paste the copied details, then return here to update the contact.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Copy a field below (or use <strong>Copy &amp; open iD4me</strong>).</li>
              <li>Search in iD4me and confirm the match.</li>
              <li>Update the contact record in DataDungeon with verified details.</li>
            </ol>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button type="button" className="gap-1.5" onClick={() => void openId4me(bestQuery || undefined)}>
              {bestQuery ? "Copy & open iD4me" : "Open iD4me search"}
              <ExternalLink className="h-4 w-4" />
            </Button>
            {contactId ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/contacts/${contactId}`}>Back to contact</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/contacts">Browse contacts</Link>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {contactId ? (
        <Card className="zoho-card border-white/10 p-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ) : isError || !contact || !hints ? (
            <p className="text-sm text-muted-foreground">Could not load contact for research hints.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Researching: {displayName}</p>
                <p className="text-xs text-muted-foreground">Copy fields to paste into iD4me search.</p>
              </div>
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <HintRow label="Name" value={hints.name} onCopy={copyValue} />
                <HintRow label="Phone" value={hints.phone} onCopy={copyValue} />
                <HintRow label="Email" value={hints.email} onCopy={copyValue} />
                <HintRow label="Address" value={hints.address} onCopy={copyValue} />
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="zoho-card border-white/10 p-4">
          <p className="text-sm text-muted-foreground">
            Open a contact and choose <strong>Research</strong> to load their name, phone, and address here
            for copy-paste into iD4me.
          </p>
        </Card>
      )}
    </div>
  );
}
