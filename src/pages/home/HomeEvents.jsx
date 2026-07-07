import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2, MapPin, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import EventsCalendar from "@/components/events/EventsCalendar";

const TYPE_STYLES = {
  meeting: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  social: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  deadline: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export default function HomeEvents() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.Event.filter({ community_id: community.id }, "start_time")
      .then(evs => setEvents(evs))
      .finally(() => setLoading(false));
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Events" subtitle={`Community calendar for ${community?.name}`} />

      <EventsCalendar
        events={events}
        renderEventCard={(ev) => <EventCard key={ev.id} event={ev} />}
      />
    </div>
  );
}

function EventCard({ event, past }) {
  return (
    <div className={`bg-card rounded-2xl warm-shadow p-5 ${past ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold">{event.title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[event.type] || TYPE_STYLES.meeting}`}>
          {event.type}
        </span>
      </div>
      {event.description && <p className="text-sm text-muted-foreground mb-2">{event.description}</p>}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDateTime(event.start_time)}</span>
        {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>}
      </div>
    </div>
  );
}