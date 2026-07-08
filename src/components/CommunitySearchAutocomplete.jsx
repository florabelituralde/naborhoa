import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, Hash, Loader2 } from "lucide-react";

// Autocomplete search for HOA communities by neighborhood name or ZIP code.
// As the user types, suggestions appear for matching community names and
// ZIP codes. Selecting a suggestion (or pressing Enter) triggers onSearch
// with { type: "name" | "zip" | "text", value }.
export default function CommunitySearchAutocomplete({ communities, onSearch, searching }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getSuggestions = () => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return { names: [], zips: [] };

    const nameMap = new Map();
    communities.forEach((c) => {
      if ((c.name || "").toLowerCase().includes(q)) {
        if (!nameMap.has(c.name)) {
          nameMap.set(c.name, {
            label: c.name,
            location: [c.city, c.state].filter(Boolean).join(", "),
            count: 0,
          });
        }
        nameMap.get(c.name).count++;
      }
    });

    const zipMap = new Map();
    communities.forEach((c) => {
      if ((c.zip || "").toLowerCase().includes(q)) {
        if (!zipMap.has(c.zip)) {
          zipMap.set(c.zip, {
            zip: c.zip,
            location: [c.city, c.state].filter(Boolean).join(", "),
            count: 0,
          });
        }
        zipMap.get(c.zip).count++;
      }
    });

    return {
      names: Array.from(nameMap.values()).slice(0, 5),
      zips: Array.from(zipMap.values()).slice(0, 5),
    };
  };

  const suggestions = open ? getSuggestions() : { names: [], zips: [] };
  const hasSuggestions = suggestions.names.length > 0 || suggestions.zips.length > 0;

  const triggerSearch = (type, value) => {
    setOpen(false);
    onSearch({ type, value: value ?? query });
  };

  return (
    <div className="space-y-3">
      <div className="relative" ref={boxRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => e.key === "Enter" && triggerSearch("text")}
          onFocus={() => setOpen(true)}
          placeholder="e.g. Oakwood Hills, Austin, or 78701"
          className="h-12 pl-9"
          autoFocus
        />
        {open && hasSuggestions && (
          <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {suggestions.names.length > 0 && (
              <div className="p-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Neighborhoods</p>
                {suggestions.names.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => { setQuery(s.label); triggerSearch("name", s.label); }}
                    className="w-full text-left px-2 py-2 hover:bg-muted/50 rounded-md text-sm flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.label}</p>
                      {s.location && <p className="text-xs text-muted-foreground truncate">{s.location}</p>}
                    </div>
                    {s.count > 1 && <span className="text-xs text-muted-foreground shrink-0">{s.count}</span>}
                  </button>
                ))}
              </div>
            )}
            {suggestions.zips.length > 0 && (
              <div className={`p-1 ${suggestions.names.length > 0 ? "border-t border-border" : ""}`}>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">ZIP Codes</p>
                {suggestions.zips.map((s) => (
                  <button
                    key={s.zip}
                    type="button"
                    onClick={() => { setQuery(s.zip); triggerSearch("zip", s.zip); }}
                    className="w-full text-left px-2 py-2 hover:bg-muted/50 rounded-md text-sm flex items-center gap-2"
                  >
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.zip}</p>
                      {s.location && <p className="text-xs text-muted-foreground truncate">{s.location}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{s.count} {s.count === 1 ? "community" : "communities"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Button onClick={() => triggerSearch("text")} disabled={searching} className="w-full h-12">
        {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
        Search Communities
      </Button>
    </div>
  );
}