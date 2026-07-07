import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";

/**
 * Modern, responsive filter & search bar.
 * - Search is always visible (full width on mobile).
 * - On mobile, advanced filters open in a bottom Sheet; on desktop they're inline.
 * - fields: [{ key, label, type: "select"|"date", options?, allLabel? }]
 * - groupByOptions: optional [{ value, label }]
 */
export default function ListFilterBar({
  search,
  setSearch,
  fields,
  values,
  onChange,
  groupBy,
  setGroupBy,
  groupByOptions,
  totalCount,
  filteredCount,
  onClear,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount =
    (search ? 1 : 0) +
    fields.filter((f) => {
      const v = values[f.key];
      return v && v !== "all" && v !== "";
    }).length;
  const hasActive = activeCount > 0;

  const controlFor = (f) => {
    const v = values[f.key] ?? "";
    if (f.type === "date") {
      return (
        <Input
          type="date"
          value={v}
          onChange={(e) => onChange(f.key, e.target.value)}
          className="w-full"
        />
      );
    }
    return (
      <Select value={v || "all"} onValueChange={(val) => onChange(f.key, val)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{f.allLabel || `All ${f.label.toLowerCase()}`}</SelectItem>
          {f.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const fieldBlock = (f) => (
    <div key={f.key} className={f.span === 2 ? "col-span-2 lg:col-span-1" : ""}>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{f.label}</p>
      {controlFor(f)}
    </div>
  );

  const groupByBlock = groupByOptions && groupByOptions.length > 0 ? (
    <div className="col-span-2 sm:col-span-1">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Group by</p>
      <Select value={groupBy} onValueChange={setGroupBy}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groupByOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {fields.map(fieldBlock)}
      {groupByBlock}
    </div>
  );

  const handleClear = () => {
    onClear();
    setSheetOpen(false);
  };

  return (
    <div className="mb-4">
      <div className="bg-card rounded-2xl warm-shadow p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 h-10"
            />
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="sm:hidden h-10 px-3 relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeCount > 0 && (
                  <span className="ml-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl p-0">
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                </SheetTitle>
              </SheetHeader>
              <div className="px-5 py-4 overflow-y-auto space-y-4">{grid}</div>
              <div className="px-5 py-4 border-t flex items-center justify-between gap-3 safe-bottom">
                <p className="text-xs text-muted-foreground">
                  {filteredCount} of {totalCount}
                </p>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={!hasActive}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden sm:block mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              <span className="text-xs font-normal">
                · {filteredCount} of {totalCount}
              </span>
            </div>
            {hasActive && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          {grid}
        </div>
      </div>
    </div>
  );
}