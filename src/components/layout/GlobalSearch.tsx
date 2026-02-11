import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandInput } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useContacts } from "@/hooks/useContacts";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useListings } from "@/hooks/useListings";
import { Users, Building2, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GLOBAL_SEARCH_EVENT = "open-global-search";

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: contacts = [] } = useContacts();
  const { data: properties = [] } = useProperties();
  const { data: listings = [] } = useListings();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(GLOBAL_SEARCH_EVENT, handler);
    return () => window.removeEventListener(GLOBAL_SEARCH_EVENT, handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const q = query.trim().toLowerCase();

  const filteredContacts = useMemo(() => {
    if (!q) return contacts.slice(0, 5);
    return contacts.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [contacts, q]);

  const filteredProperties = useMemo(() => {
    if (!q) return properties.slice(0, 4);
    return properties.filter((p) => {
      const addr = formatPropertyAddress(p).toLowerCase();
      const city = (p.city ?? "").toLowerCase();
      const postcode = (p.postcode ?? "").toLowerCase();
      return addr.includes(q) || city.includes(q) || postcode.includes(q);
    });
  }, [properties, q]);

  const filteredListings = useMemo(() => {
    if (!q) return listings.slice(0, 4);
    return listings.filter((l) => {
      const addr = ((l as { address?: string | null }).address ?? "").toLowerCase();
      return addr.includes(q);
    });
  }, [listings, q]);

  const total = filteredContacts.length + filteredProperties.length + filteredListings.length;

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent className="zoho-dialog overflow-hidden p-0 gap-0 max-w-2xl bg-popover border-border text-popover-foreground shadow-xl" aria-describedby="global-search-desc">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription id="global-search-desc" className="sr-only">
          Search contacts, properties, and listings. Type to filter, then select a result to open it.
        </DialogDescription>
        <Command
          className="rounded-lg border-0 bg-transparent [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-item][data-selected=true]]:bg-accent [&_[cmdk-item][data-selected=true]]:text-foreground"
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search contacts, properties, listings… (⌘K)"
            value={query}
            onValueChange={setQuery}
            className="placeholder:text-muted-foreground text-foreground border-b border-border h-12"
          />
        </Command>
        <div className="max-h-[320px] overflow-y-auto border-t border-border">
          {query && total === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">No results. Try a different search.</div>
          )}
          {!query && (
            <div className="py-4 px-3 text-sm text-muted-foreground">Type to search contacts, properties, or listings.</div>
          )}
          {filteredContacts.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contacts</div>
              {filteredContacts.slice(0, 6).map((c) => (
                <button
                  key={`c-${c.id}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent rounded-none"
                  onClick={() => handleSelect(`/contacts/${c.id}`)}
                >
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate flex-1">{c.name}</span>
                  {(c.email ?? (c as { phone?: string }).phone) && (
                    <Badge variant="secondary" className="text-[10px] font-normal bg-secondary text-secondary-foreground shrink-0">
                      {c.email ?? (c as { phone?: string }).phone}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
          {filteredProperties.length > 0 && (
            <div className="py-1 border-t border-border/50">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties</div>
              {filteredProperties.slice(0, 4).map((p) => (
                <button
                  key={`p-${p.id}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent rounded-none"
                  onClick={() => handleSelect(`/properties/${p.id}`)}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate flex-1">{formatPropertyAddress(p) || "Property"}</span>
                  <Badge variant="secondary" className="text-[10px] font-normal bg-secondary text-secondary-foreground shrink-0">
                    Property
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {filteredListings.length > 0 && (
            <div className="py-1 border-t border-border/50">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Listings</div>
              {filteredListings.slice(0, 4).map((l) => (
                <button
                  key={`l-${l.id}`}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent rounded-none"
                  onClick={() => handleSelect(`/listings/${l.id}`)}
                >
                  <Home className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate flex-1">{(l as { address?: string }).address ?? "Listing"}</span>
                  <Badge variant="secondary" className="text-[10px] font-normal bg-secondary text-secondary-foreground shrink-0">
                    Listing
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_EVENT));
}