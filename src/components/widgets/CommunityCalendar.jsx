import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  isSameMonth, isSameDay, format, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Receipt, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDate(value) {
  if (!value) return null;
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// Month calendar combining HOA invoice due dates and community events.
export default function CommunityCalendar({ invoices = [], events = [] }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  // Build a lookup of day -> items
  const itemsByDay = useMemo(() => {
    const map = {};
    const push = (date, item) => {
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      (map[key] ||= []).push(item);
    };
    invoices.forEach((inv) => {
      if (inv.status === "confirmed" || inv.status === "paid") return;
      push(toDate(inv.due_date), {
        kind: "invoice",
        title: `${inv.type} due`,
        subtitle: formatCurrency(inv.amount),
        date: toDate(inv.due_date),
      });
    });
    events.forEach((ev) => {
      push(toDate(ev.start_time), {
        kind: "event",
        title: ev.title,
        subtitle: ev.location || "",
        date: toDate(ev.start_time),
      });
    });
    return map;
  }, [invoices, events]);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(endOfMonth(monthStart));

  const days = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = itemsByDay[selectedKey] || [];

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Calendar
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-28 text-center">{format(cursor, "MMMM yyyy")}</span>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayItems = itemsByDay[key] || [];
          const inMonth = isSameMonth(d, monthStart);
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, new Date());
          const hasInvoice = dayItems.some((i) => i.kind === "invoice");
          const hasEvent = dayItems.some((i) => i.kind === "event");
          return (
            <button
              key={key}
              onClick={() => setSelected(d)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-colors
                ${isSelected ? "bg-primary text-primary-foreground" : inMonth ? "hover:bg-muted" : "text-muted-foreground/40"}
                ${isToday && !isSelected ? "ring-1 ring-primary/40" : ""}`}
            >
              <span className={isToday && !isSelected ? "font-bold text-primary" : ""}>{format(d, "d")}</span>
              {(hasInvoice || hasEvent) && (
                <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                  {hasInvoice && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-amber-500"}`} />}
                  {hasEvent && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-blue-500"}`} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm font-medium mb-2">{format(selected, "EEEE, MMMM d")}</p>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nothing scheduled this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item, i) => (
              <Link
                key={i}
                to={item.kind === "invoice" ? "/home/invoices" : "/home/events"}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.kind === "invoice" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"}`}>
                  {item.kind === "invoice" ? <Receipt className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Bill due</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Event</span>
        </div>
      </div>
    </div>
  );
}