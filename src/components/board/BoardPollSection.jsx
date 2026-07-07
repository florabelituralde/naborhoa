import React, { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, X, Vote } from "lucide-react";
import { formatDate } from "@/lib/format";
import { notifyCommunity } from "@/lib/notify";

export default function BoardPollSection({ community, user, pollResults, votePath = "/home/polls", onChange }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", options: [""], deadline: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const cleanOptions = form.options.filter(o => o.trim());
    const poll = await base44.entities.Poll.create({
      title: form.title,
      description: form.description,
      options: cleanOptions,
      deadline: form.deadline,
      community_id: community.id,
      author_id: user.id,
    });
    await notifyCommunity(community.id, {
      type: "poll_deadline",
      title: `New poll: ${form.title}`,
      body: `Cast your vote by ${form.deadline}`,
      related_id: poll.id,
    });
    setForm({ title: "", description: "", options: [""], deadline: "" });
    setShowCreate(false);
    setCreating(false);
    onChange();
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Vote className="w-5 h-5 text-primary" /> Polls
        </h2>
        <div className="flex items-center gap-3">
          <Link to={votePath} className="text-sm text-primary font-medium hover:underline">View polls</Link>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New</Button>
        </div>
      </div>
      {pollResults.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No polls yet</p>
      ) : (
        <div className="space-y-5">
          {pollResults.slice(0, 3).map(poll => {
            const total = poll.total;
            return (
              <div key={poll.id}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{poll.title}</p>
                  <StatusBadge status={poll.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Deadline: {formatDate(poll.deadline)} · {total} votes</p>
                <div className="space-y-1.5">
                  {(poll.options || []).map((opt, i) => {
                    const count = poll.counts[i] || 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
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