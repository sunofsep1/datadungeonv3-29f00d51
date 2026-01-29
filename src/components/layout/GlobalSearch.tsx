import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandInput } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContacts } from "@/hooks/useContacts";
import { Users } from "lucide-react";

const GLOBAL_SEARCH_EVENT = "open-global-search";

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: contacts = [] } = useContacts();

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

  const total = filteredContacts.length;

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
      <DialogContent className="zoho-dialog overflow-hidden p-0 gap-0 max-w-2xl bg-[#242424] border-white/10 text-white shadow-xl">
        <Command
          className="rounded-lg border-0 bg-transparent [&_[cmdk-group-heading]]:text-white/60 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-item][data-selected=true]]:bg-white/10 [&_[cmdk-item][data-selected=true]]:text-white"
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search contacts… (⌘K)"
            value={query}
            onValueChange={setQuery}
            className="placeholder:text-white/50 text-white border-b border-white/10 h-12"
          />
        </Command>
        {/* Results rendered outside Command so we control filtering */}
        <div className="max-h-[280px] overflow-y-auto border-t border-white/10">
          {query && total === 0 && (
            <div className="py-6 text-center text-sm text-white/60">No results. Try a different search.</div>
          )}
          {!query && (
            <div className="py-4 px-3 text-sm text-white/50">Type to search contacts.</div>
          )}
          {filteredContacts.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-white/60 uppercase tracking-wider">Contacts</div>
              {filteredContacts.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-none"
                  onClick={() => handleSelect(`/contacts/${c.id}`)}
                >
                  <Users className="h-4 w-4 shrink-0 text-[#00BCD4]" />
                  <span className="truncate">{c.name}</span>
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