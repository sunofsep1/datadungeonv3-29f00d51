import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterSettingsSearch, type SettingsSearchEntry } from "@/lib/settingsSearchIndex";
import { cn } from "@/lib/utils";

type SettingsSearchProps = {
  className?: string;
  onQueryChange?: (query: string) => void;
};

export function SettingsSearch({ className, onQueryChange }: SettingsSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const results = filterSettingsSearch(query);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goTo = (entry: SettingsSearchEntry) => {
    const hash = entry.fieldId ? `#${entry.fieldId}` : "";
    navigate(`${entry.path}${hash}`);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search settings…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="bg-input pl-9"
          aria-label="Search settings"
          aria-expanded={open && results.length > 0}
          aria-controls="settings-search-results"
        />
      </div>
      {open && query.trim() && results.length > 0 ? (
        <ul
          id="settings-search-results"
          role="listbox"
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {results.map((entry) => (
            <li key={`${entry.path}:${entry.label}`} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                onClick={() => goTo(entry)}
              >
                <span className="font-medium text-foreground">{entry.label}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.group} · {entry.path.replace("/settings/", "").replace("/", " › ") || "settings"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && results.length === 0 ? (
        <p className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          No settings match &ldquo;{query.trim()}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
