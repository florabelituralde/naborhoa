import React, { useState } from "react";
import { Drawer } from "vaul";
import { Check, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Responsive select control.
// - Desktop: renders the standard shadcn Select (unchanged web behavior).
// - Mobile: renders a native-feeling bottom drawer (Vaul) for choosing an option.
//
// Props:
//   value: string
//   onValueChange: (value) => void
//   options: [{ value, label }]
//   placeholder?: string
//   title?: string   (drawer heading on mobile)
//   className?: string  (applied to the trigger)
export default function DrawerSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  title = "Select an option",
  className,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selected = options.find((o) => o.value === value);

  const handleSelect = (v) => {
    onValueChange(v);
    setOpen(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-border bg-card safe-bottom">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
          <Drawer.Title className="px-5 pt-4 pb-2 text-base font-semibold">{title}</Drawer.Title>
          <div className="overflow-y-auto px-2 pb-4">
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  <span>{o.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}