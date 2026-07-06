import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ChevronDown, ChevronUp } from "lucide-react";

export default function GuestAccess() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const go = (e) => {
    e?.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/c/${trimmed}`);
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          Have a community code? Continue as guest
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <form onSubmit={go} className="mt-3 flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter community code"
            className="h-10 uppercase"
            autoFocus
          />
          <Button type="submit" disabled={!code.trim()} className="h-10 px-5">
            Go
          </Button>
        </form>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Pay dues or ask the HOA assistant without creating an account.
      </p>
    </div>
  );
}