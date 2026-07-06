import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Trophy } from "lucide-react";
import { formatDate } from "@/lib/format";
import { notifyCommunity } from "@/lib/notify";

export default function HOAElections() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [votes, setVotes] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "", candidates: [{ name: "", bio: "", statement: "" }] });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const els = await base44.entities.Election.filter({ community_id: community.id }, "-created_date");
    setElections(els);
    const voteMap = {};
    for (const el of els) {
      voteMap[el.id] = await base44.entities.ElectionVote.filter({ election_id: el.id });
    }
    setVotes(voteMap);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const addCandidate = () => setForm({ ...form, candidates: [...form.candidates, { name: "", bio: "", statement: "" }] });
  const removeCandidate = (i) => setForm({ ...form, candidates: form.candidates.filter((_, idx) => idx !== i) });
  const updateCandidate = (i, field, val) => setForm({
    ...form,
    candidates: form.candidates.map((c, idx) => idx === i ? { ...c, [field]: val } : c)
  });

  const handleCreate = async () => {
    setCreating(true);
    const election = await base44.entities.Election.create({
      title: form.title,
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      candidates: form.candidates.filter(c => c.name.trim()),
      community_id: community.id,
      created_by_id: user.id,
    });
    await notifyCommunity(community.id, {
      type: "election",
      title: `New election: ${form.title}`,
      body: `Voting is open until ${form.end_date}`,
      related_id: election.id,
    });
    setForm({ title: "", description: "", start_date: "", end_date: "", candidates: [{ name: "", bio: "", statement: "" }] });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const handleClose = async (el) => {
    await base44.entities.Election.update(el.id, { status: "closed" });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Elections"
        subtitle="Manage board elections and view results"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Election</Button>}
      />

      {elections.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No elections yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {elections.map(el => {
            const elVotes = votes[el.id] || [];
            const counts = el.candidates.map((_, i) => elVotes.filter(v => v.candidate_index === i).length);
            const total = elVotes.length;
            return (
              <div key={el.id} className="bg-card rounded-2xl warm-shadow p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{el.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${el.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {el.status}
                      </span>
                    </div>
                    {el.description && <p className="text-sm text-muted-foreground mt-1">{el.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {el.start_date ? formatDate(el.start_date) : "Now"} — {formatDate(el.end_date)}
                    </p>
                  </div>
                  {el.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => handleClose(el)}>Close</Button>
                  )}
                </div>
                <div className="space-y-2">
                  {el.candidates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{counts[i]} vote{counts[i] !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      {total > 0 && (
                        <span className="text-sm font-medium text-primary">{Math.round(counts[i] / total * 100)}%</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">{total} total vote{total !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Election</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="2026 Board Election" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Candidates</Label>
                <Button variant="outline" size="sm" onClick={addCandidate}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>
              <div className="space-y-3">
                {form.candidates.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={c.name} onChange={e => updateCandidate(i, "name", e.target.value)} placeholder="Candidate name" className="h-9" />
                      {form.candidates.length > 1 && (
                        <button onClick={() => removeCandidate(i)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input value={c.bio} onChange={e => updateCandidate(i, "bio", e.target.value)} placeholder="Brief bio (optional)" className="h-9" />
                    <Textarea value={c.statement} onChange={e => updateCandidate(i, "statement", e.target.value)} placeholder="Campaign statement (optional)" rows={2} />
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!form.title || !form.end_date || !form.candidates.some(c => c.name.trim()) || creating} className="w-full">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Election
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}