import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, X, Vote, Lock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { notifyCommunity } from "@/lib/notify";
import AttachmentUploader from "@/components/AttachmentUploader";
import AnnouncementAttachments from "@/components/AnnouncementAttachments";

export default function HOAPolls() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", options: [""], deadline: "", attachments: [] });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const res = await base44.functions.invoke("get-community-results", {});
      setPolls(res?.data?.polls || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community) loadData();
    else setLoading(false);
  }, [community]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const cleanOptions = form.options.filter(o => o.trim());
      const poll = await base44.entities.Poll.create({
        title: form.title,
        description: form.description,
        options: cleanOptions,
        deadline: form.deadline,
        community_id: community.id,
        author_id: user.id,
        attachments: form.attachments,
      });
      await notifyCommunity(community.id, {
        type: "poll_deadline",
        title: `New poll: ${form.title}`,
        body: `Cast your vote by ${form.deadline}`,
        related_id: poll.id,
      });
      setForm({ title: "", description: "", options: [""], deadline: "", attachments: [] });
      setShowCreate(false);
      loadData();
    } finally {
      setCreating(false);
    }
  };

  const closePoll = async (poll) => {
    await base44.entities.Poll.update(poll.id, { status: "closed" });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Polls"
        subtitle="Create community votes and surveys"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Poll</Button>}
      />

      {polls.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Vote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No polls yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => {
            const totalVotes = poll.total;
            return (
              <div key={poll.id} className="bg-card rounded-2xl warm-shadow p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{poll.title}</h3>
                      <StatusBadge status={poll.status} />
                    </div>
                    {poll.description && <p className="text-sm text-muted-foreground mb-3">{poll.description}</p>}
                    <p className="text-xs text-muted-foreground">Deadline: {formatDate(poll.deadline)} · {totalVotes} votes</p>
                  </div>
                  {poll.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => closePoll(poll)}>
                      <Lock className="w-4 h-4 mr-1" /> Close
                    </Button>
                  )}
                </div>
                <div className="space-y-2 mt-4">
                  {poll.options.map((opt, i) => {
                    const count = poll.counts[i] || 0;
                    const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <AnnouncementAttachments attachments={poll.attachments} />
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="Approve the new budget?" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-1.5">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[i] = e.target.value;
                        setForm({ ...form, options: newOpts });
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                    {form.options.length > 1 && (
                      <button onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive px-2">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </Button>
              </div>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Attachments (photos or files)</Label>
              <div className="mt-1.5">
                <AttachmentUploader value={form.attachments} onChange={(atts) => setForm({ ...form, attachments: atts })} />
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!form.title || form.options.filter(o => o.trim()).length < 2 || !form.deadline || creating}
              className="w-full"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Poll
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}