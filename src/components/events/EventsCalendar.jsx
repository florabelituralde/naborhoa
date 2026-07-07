import React, { useState } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_DOT = {
  meeting: "bg-blue-500",
  social: "bg-emerald-500",
  deadline: "bg-rose-500",
};

// Calendar + list view for community events with a Monthly / Yearly toggle.
//   - Monthly: a month grid with event dots, plus a list of that month's events.
//   - Yearly: 12 mini-month grids, plus the year's events grouped by month.
// `renderEventCard(event)` lets each page render its own event card (with or
// without admin actions).
export default function EventsCalendar({ events = [], renderEventCard }) {
  const [view, setView] = useState("month"); // "month" | "year"
  const [cursor, setCursor] = useState(() => moment().startOf("month"));

  const evMoment = (e) => moment(e.start_time);
  const year = cursor.year();
  const month = cursor.month();

  const monthEvents = events
    .filter((e) => { const m = evMoment(e); return m.year() === year && m.month() === month; })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const yearEvents = events
    .filter((e) => evMoment(e).year() === year)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const goPrev = () => setCursor((c) => moment(c).subtract(1, view === "month" ? "month" : "year"));
  const goNext = () => setCursor((c) => moment(c).add(1, view === "month" ? "month" : "year"));
  const goToday = () => setCursor(moment().startOf(view === "month" ? "month" : "year"));
  const openMonth = (m) => {
    setCursor(moment().year(year).month(m).startOf("month"));
    setView("month");
  };
  const switchView = (v) => {
    setView(v);
    setCursor((c) => moment(c).startOf(v === "month" ? "month" : "year"));
  };

  const label = view === "month" ? cursor.format("MMMM YYYY") : cursor.format("YYYY");

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors" aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goNext} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors" aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="ml-1 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Today
          </button>
          <h2 className="ml-2 text-lg font-semibold">{label}</h2>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
          {["month", "year"].map((v) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`px-3 h-8 rounded-md text-sm font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && <MonthGrid cursor={cursor} events={monthEvents} evMoment={evMoment} />}

      {/* List */}
      {view === "month" ? (
        <EventList title={`Events in ${cursor.format("MMMM YYYY")}`} events={monthEvents} renderEventCard={renderEventCard} />
      ) : (
        <div className="space-y-6">
          {yearEvents.length === 0 && (
            <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
              <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No events in {year}</p>
            </div>
          )}
          {Array.from({ length: 12 }).map((_, m) => {
            const group = yearEvents.filter((e) => evMoment(e).month() === m);
            if (group.length === 0) return null;
            return (
              <div key={m}>
                <button onClick={() => openMonth(m)} className="flex items-center gap-2 mb-3 hover:text-primary transition-colors">
                  <h3 className="font-semibold text-lg">{moment().month(m).format("MMMM")}</h3>
                  <span className="text-xs text-muted-foreground">{group.length} event{group.length === 1 ? "" : "s"}</span>
                </button>
                <div className="space-y-3">
                  {group.map((ev) => (renderEventCard ? renderEventCard(ev) : null))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ cursor, events, evMoment }) {
  const start = moment(cursor).startOf("month");
  const startDay = start.day();
  const daysInMonth = start.daysInMonth();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const today = moment();
  const isToday = (d) => d && today.isSame(moment(cursor).date(d), "day");

  return (
    <div className="bg-card rounded-2xl warm-shadow p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square rounded-lg bg-muted/20" />;
          const dayEvents = events.filter((e) => evMoment(e).date() === d);
          return (
            <div key={i} className={`aspect-square rounded-lg p-1 flex flex-col items-center border ${isToday(d) ? "border-primary bg-primary/5" : "border-transparent"}`}>
              <span className={`text-xs font-medium ${isToday(d) ? "text-primary" : "text-foreground"}`}>{d}</span>
              <div className="flex-1 flex flex-wrap gap-0.5 items-end justify-center mt-0.5">
                {dayEvents.slice(0, 3).map((e, j) => (
                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[e.type] || "bg-primary"}`} />
                ))}
                {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventList({ title, events, renderEventCard }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground">{events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>
      {events.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-10 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No events this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (renderEventCard ? renderEventCard(ev) : null))}
        </div>
      )}
    </div>
  );
}