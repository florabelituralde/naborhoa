import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Megaphone, Pin } from "lucide-react";
import { formatDate } from "@/lib/format";
import { notifyCommunity } from "@/lib/notify";
import AttachmentUploader from "@/components/AttachmentUploader";
import AnnouncementAttachments from "@/components/AnnouncementAttachments";

export default function BoardAnnouncementSection({ community, user, announcements, onChange }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false, attachments: [] });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const ann = await base44.entities.Announcement.create({ ...form, community_id: community.id, author_id: user.id });
    await notifyCommunity(community.id, {
      type: "announcement",
      title: `New announcement: ${form.title}`,
      body: form.body,
      related_id: ann.id,
    });
    setForm({ title: "", body: "", pinned: false, attachments: [] });
    setShowCreate(false);
    setCreating(false);
    onChange();
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" /> Announcements
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Post</Button>
      </div>
      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
      ) : (
        <div className="space-y-3">
          {announcements.slice(0, 4).map(ann => (
            <div key={ann.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5">
                {ann.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                <p className="font-medium text-sm">{ann.title}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(ann.created_date)}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.body}</p>
              <AnnouncementAttachments attachments={ann.attachments} />
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
            <div>
              <Label>Attachments</Label>
              <div className="mt-1.5">
                <AttachmentUploader value={form.attachments} onChange={(attachments) => setForm({ ...form, attachments })} />
              </div>
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