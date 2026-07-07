import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MapPin } from "lucide-react";

// Address search backed by Google Places (via the google-address-search
// backend function). Calls onChange with { address, zip }. If the lookup
// service isn't configured, the user can still type an address manually.
export default function AddressAutocomplete({ value, onChange, placeholder = "Search your address" }) {
  const [input, setInput] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => { setInput(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = (q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 3) { setSuggestions([]); setOpen(false); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await base44.functions.invoke("google-address-search", { action: "search", query: q });
        setSuggestions(res?.data?.suggestions || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
      setLoading(false);
    }, 350);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInput(v);
    onChange({ address: v, zip: "" });
    runSearch(v);
  };

  const pick = async (s) => {
    setOpen(false);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("google-address-search", { action: "details", place_id: s.place_id });
      const d = res?.data;
      if (d?.formatted_address) {
        setInput(d.formatted_address);
        onChange({ address: d.formatted_address, zip: d.zip || "" });
      } else {
        setInput(s.description);
        onChange({ address: s.description, zip: "" });
      }
    } catch {
      setInput(s.description);
      onChange({ address: s.description, zip: "" });
    }
    setLoading(false);
  };

  return (
    <div className="relative mt-1.5" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={input}
          onChange={handleChange}
          placeholder={placeholder}
          className="h-11 pl-9"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{s.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}