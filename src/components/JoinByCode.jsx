import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ArrowRight } from "lucide-react";

// Lets a homeowner find their community by entering the join code shown to them
// by their HOA (the same code displayed on the HOA Community tab).
export default function JoinByCode({ onFound }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const matches = await base44.entities.Community.filter({ join_code: trimmed.toUpperCase() });
      if (matches.length === 0) {
        setError("No community found with that code. Double-check it with your HOA.");
      } else {
        onFound(matches[0]);
      }
    } catch (err) {
      setError(err.message || "Lookup failed");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div>
        <Label htmlFor="joincode">Community Join Code</Label>
        <Input
          id="joincode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="e.g. MAPLE24"
          className="mt-1.5 h-12 tracking-widest font-semibold uppercase"
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1.5">Ask your HOA for this code — it's on their Community page.</p>
      </div>
      <Button onClick={lookup} disabled={!code.trim() || loading} className="w-full h-12">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
        Continue
      </Button>
    </div>
  );
}