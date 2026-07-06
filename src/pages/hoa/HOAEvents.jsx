import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Calendar, MapPin, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const TYPE_STYLES = {
  meeting: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  social: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  deadline: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export default function HOAEvents() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "meeting", start_time: "", end_time: "", location: "" });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const evs = await base44.entities.Event.filter({ community_id: community.id }, "start_time");
    setEvents(evs);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const handleCreate = async () => {
    setCreating(true);
    await base44.entities.Event.create({
      title: form.title,
      description: form.description,
      type: form.type,
      location: form.location,
      community_id: community.id,
      created_by_id: user.id,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
    });
    setForm({ title: "", description: "", type: "meeting", start_time: "", end_time: "", location: "" });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Event.delete(id);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_time) >= now);
  const past = events.filter(e => new Date(e.start_time) < now);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Events"
        subtitle="Schedule board meetings and community events"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Event</Button>}
      />

      {events.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No events scheduled yet</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-lg mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(ev => <EventCard key={ev.id} event={ev} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-4 text-muted-foreground">Past</h2>
              <div className="space-y-3">
                {past.slice().reverse().map(ev => <EventCard key={ev.id} event={ev} onDelete={handleDelete} past />)}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="Board Meeting" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="social">Social Event</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>End</Label>
                <Input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="mt-1.5" placeholder="Community Center" />
            </div>
            <Button onClick={handleCreate} disabled={!form.title || !form.start_time || !form.end_time || creating} className="w-full">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, onDelete, past }) {
  return (
    <div className={`bg-card rounded-2xl warm-shadow p-5 ${past ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
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
        {onDelete && (
          <button onClick={() => onDelete(event.id)} className="text-muted-foreground hover:text-destructive ml-4">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}