import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Searchable multi-select dropdown so picking specific homeowners scales
// to hundreds of members without a giant checkbox list.
export default function HomeownerMultiSelect({
  homeowners = [],
  selected = [],
  onChange,
  placeholder = "Select homeowners",
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? homeowners.find((h) => h.id === selected[0])?.full_name || "1 selected"
        : `${selected.length} homeowners selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{summary}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search homeowners..." />
          <CommandList>
            <CommandEmpty>No homeowners found.</CommandEmpty>
            <CommandGroup>
              {homeowners.map((h) => (
                <CommandItem
                  key={h.id}
                  value={`${h.full_name} ${h.email || ""}`}
                  onSelect={() => toggle(h.id)}
                >
                  <Check className={cn("mr-2 h-4 w-4", selected.includes(h.id) ? "opacity-100" : "opacity-0")} />
                  {h.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}