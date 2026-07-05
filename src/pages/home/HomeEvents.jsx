import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2, Calendar, MapPin, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const TYPE_STYLES = {
  meeting: "bg-blue-50 text-blue-700",
  social: "bg-green-50 text-green-700",
  deadline: "bg-red-50 text-red-700",
};

export default function HomeEvents() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!community) return;
    base44.entities.Event.filter({ community_id: community.id }, "start_time").then(evs => {
      setEvents(evs);
      setLoading(false);
    });
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_time) >= now);
  const past = events.filter(e => new Date(e.start_time) < now);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Events" subtitle={`Community calendar for ${community?.name}`} />

      {events.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-lg mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-4 text-muted-foreground">Past</h2>
              <div className="space-y-3">
                {past.slice().reverse().map(ev => <EventCard key={ev.id} event={ev} past />)}
              </div>
            </div>
          )}
        </>
      )}
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