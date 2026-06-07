import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { ensureGooglePlacesLoaded, getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import { slugifyMarketId, type ContactMarket } from "@/lib/contactMarkets";
import { cn } from "@/lib/utils";

type Suggestion = {
  placeId: string;
  description: string;
  suburb: string;
  state: string;
};

function parseSuggestion(pred: google.maps.places.AutocompletePrediction): Suggestion {
  // terms: [{value:"Redland Bay"}, {value:"QLD"}, {value:"Australia"}] (locality)
  // or:    [{value:"Victoria Point"}, {value:"Redland City Council"}, {value:"QLD"}, {value:"Australia"}]
  const terms = pred.terms ?? [];
  const suburb = terms[0]?.value ?? pred.structured_formatting?.main_text ?? pred.description;

  // Find the 2–3 letter state code in the terms
  const stateRe = /^(QLD|NSW|VIC|SA|WA|TAS|ACT|NT)$/i;
  const stateTerm = terms.find((t) => stateRe.test(t.value));
  const state = stateTerm ? stateTerm.value.toUpperCase() : "QLD";

  return { placeId: pred.place_id, description: pred.description, suburb, state };
}

type Props = {
  onAdd: (market: ContactMarket) => void;
  existingIds: string[];
  className?: string;
};

export function SuburbQuickAdd({ onAdd, existingIds, className }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mapsReady, setMapsReady] = useState(false);
  const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bootstrap Places API
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return;
    ensureGooglePlacesLoaded(apiKey)
      .then(() => {
        svcRef.current = new google.maps.places.AutocompleteService();
        setMapsReady(true);
      })
      .catch(() => {});
  }, []);

  const fetchSuggestions = (value: string) => {
    if (!svcRef.current || value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    svcRef.current.getPlacePredictions(
      {
        input: value,
        types: ["(regions)"],
        componentRestrictions: { country: "au" },
      },
      (preds, status) => {
        setLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const parsed = preds.slice(0, 6).map(parseSuggestion);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
        setActiveIdx(-1);
      },
    );
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const commit = (suggestion: Suggestion) => {
    const label = `${suggestion.suburb} home owners`;
    const baseId = slugifyMarketId(label);
    let id = baseId;
    let n = 2;
    while (existingIds.includes(id)) {
      id = `${baseId}-${n}`;
      n += 1;
    }
    const market: ContactMarket = {
      id,
      label,
      suburbs: [suggestion.suburb],
      state: suggestion.state,
    };
    onAdd(market);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIdx >= 0 ? activeIdx : 0;
      if (suggestions[idx]) commit(suggestions[idx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!mapsReady) {
    // Render a plain input even without Maps (graceful degradation)
    return (
      <div className={cn("px-1 pt-1", className)}>
        <input
          type="text"
          disabled
          placeholder="Add suburb…"
          className="w-full rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative px-1 pt-1", className)}>
      <div className="relative flex items-center">
        <MapPin className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add suburb…"
          className={cn(
            "w-full rounded-md border border-border/50 bg-muted/30 py-1.5 pl-7 pr-2.5 text-xs outline-none",
            "placeholder:text-muted-foreground/50 focus:border-primary/60 focus:bg-background transition-colors",
          )}
          aria-label="Search for a suburb to add as a market"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-1 right-1 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-border/70 bg-popover shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === activeIdx}
              className={cn(
                "flex cursor-pointer flex-col px-3 py-2 text-xs transition-colors",
                i === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
              )}
              onMouseDown={(e) => { e.preventDefault(); commit(s); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="font-medium">{s.suburb}</span>
              <span className="text-[10px] text-muted-foreground">{s.state} · {s.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
