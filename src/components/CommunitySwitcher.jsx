import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Sidebar community switcher for HOA admins who own more than one community.
// `communities` is the list of owned communities, `community` is the active one,
// `onSwitch(id)` sets the active community.
export default function CommunitySwitcher({ community, communities = [], onSwitch, onNavigate }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  // Always include the active community so the list is never empty.
  const list = communities.some((c) => c.id === community?.id)
    ? communities
    : community
    ? [community, ...communities]
    : communities;

  const handleSelect = async (id) => {
    if (id === community?.id) {
      setOpen(false);
      return;
    }
    setSwitchingId(id);
    await onSwitch(id);
  };

  const handleAdd = () => {
    setOpen(false);
    onNavigate?.();
    navigate("/hoa/add-community");
  };

  return (
    <div className="px-3 py-3 border-b border-sidebar-border">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">Community</p>
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">{community?.name}</p>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <div className="max-h-64 overflow-y-auto">
            {list.map((c) => {
              const active = c.id === community?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  disabled={switchingId !== null}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {(c.city || c.state) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.city, c.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  {switchingId === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : active ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleAdd}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors text-left text-sm font-medium text-primary"
            >
              <Plus className="w-4 h-4" />
              Add Community
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}