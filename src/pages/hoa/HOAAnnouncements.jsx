import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pin, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HOAAnnouncements() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const anns = await base44.entities.Announcement.filter({ community_id: community.id }, "-created_date");
    setAnnouncements(anns);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const handleCreate = async () => {
    setCreating(true);
    await base44.entities.Announcement.create({
      ...form,
      community_id: community.id,
      author_id: user.id,
    });
    setForm({ title: "", body: "", pinned: false });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Announcement.delete(id);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Announcements"
        subtitle="Post community-wide notices and updates"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Announcement</Button>}
      />

      {announcements.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-card rounded-2xl warm-shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.pinned && <Pin className="w-4 h-4 text-primary" />}
                    <h3 className="font-semibold text-lg">{ann.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{formatDate(ann.created_date)}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ann.body}</p>
                </div>
                <button onClick={() => handleDelete(ann.id)} className="text-muted-foreground hover:text-destructive ml-4">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="Pool Maintenance Notice" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="mt-1.5" rows={5} placeholder="Write your announcement..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} className="w-4 h-4 accent-primary" />
              <span className="text-sm">Pin to top</span>
            </label>
            <Button onClick={handleCreate} disabled={!form.title || !form.body || creating} className="w-full">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post Announcement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}