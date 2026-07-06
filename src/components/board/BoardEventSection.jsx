import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Calendar, Clock, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const TYPE_STYLES = {
  meeting: "bg-blue-50 text-blue-700",
  social: "bg-green-50 text-green-700",
  deadline: "bg-red-50 text-red-700",
};

export default function BoardEventSection({ community, user, events, onChange }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "meeting", start_time: "", end_time: "", location: "" });
  const [creating, setCreating] = useState(false);

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
    onChange();
  };

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_time) >= now);

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Upcoming Events
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No upcoming events</p>
      ) : (
        <div className="space-y-2">
          {upcoming.slice(0, 5).map(ev => (
            <div key={ev.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">{ev.title}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[ev.type] || TYPE_STYLES.meeting}`}>{ev.type}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDateTime(ev.start_time)}</span>
                {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {ev.location}</span>}
              </div>
            </div>
          ))}
        </div>
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