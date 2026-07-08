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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Trophy, Search, UserCheck, Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import { notifyCommunity } from "@/lib/notify";
import { orderedPositionKeys, positionLabel } from "@/lib/electionPositions";
import { useCommunityPositions } from "@/hooks/useCommunityPositions";

export default function HOAElections() {
  const { user, community } = useOutletContext();
  // Fall back to the user's community_id when the Community record itself is
  // missing (e.g. a community seeded without a Community record) so board
  // positions still load and the position dropdown isn't empty.
  const { positions } = useCommunityPositions({ id: community?.id || user?.community_id });
  const [loading, setLoading] = useState(true);
  const [electionResults, setElectionResults] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [homeowners, setHomeowners] = useState([]);
  const [search, setSearch] = useState({});
  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "", candidates: [{ position: "President", homeowner_id: "", name: "", bio: "", statement: "" }] });
  const [creating, setCreating] = useState(false);
  const [promoting, setPromoting] = useState(null);

  const loadData = async () => {
    try {
      // Load the election list client-side so it follows the builder's
      // Test/Production toggle; keep the backend call only for vote tallies
      // (cross-voter counts need the service role). In production the ids
      // match and tallies populate; in test mode the backend hits prod so
      // test elections show no tally bars — admin actions still work.
      const communityId = community?.id || user?.community_id;
      const [elections, res] = await Promise.all([
        base44.entities.Election.filter({ community_id: communityId }, "-created_date"),
        base44.functions.invoke("get-community-results", {}).catch(() => null),
      ]);
      const tallyMap = {};
      for (const el of res?.data?.elections || []) {
        tallyMap[el.id] = { counts: el.counts, total: el.total };
      }
      const results = elections.map(el => {
        const t = tallyMap[el.id];
        return {
          id: el.id,
          title: el.title,
          description: el.description,
          status: el.status,
          start_date: el.start_date,
          end_date: el.end_date,
          promoted: el.promoted,
          promoted_date: el.promoted_date,
          candidates: el.candidates,
          counts: t?.counts || (el.candidates || []).map(() => 0),
          total: t?.total || 0,
        };
      });
      setElectionResults(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (community) loadData(); else setLoading(false); }, [community]);

  // Use the backend function (service role) so the admin can list residents
  // in their community — the User entity's built-in RLS blocks hoa_admin from
  // filtering other users directly, which is why the search came back empty.
  const loadHomeowners = async () => {
    try {
      const res = await base44.functions.invoke("get-community-homeowners", {});
      setHomeowners(res?.data?.homeowners || []);
    } catch {
      setHomeowners([]);
    }
  };
  useEffect(() => { if (showCreate) loadHomeowners(); }, [showCreate]);

  const addCandidate = () => setForm({ ...form, candidates: [...form.candidates, { position: positions[0]?.name || "President", homeowner_id: "", name: "", bio: "", statement: "" }] });
  const removeCandidate = (i) => setForm({ ...form, candidates: form.candidates.filter((_, idx) => idx !== i) });
  const updateCandidate = (i, field, val) => setForm({
    ...form,
    candidates: form.candidates.map((c, idx) => idx === i ? { ...c, [field]: val } : c)
  });
  const pickHomeowner = (i, h) => {
    updateCandidate(i, "name", h.full_name || "");
    updateCandidate(i, "bio", h.email || "");
    updateCandidate(i, "homeowner_id", h.id || "");
    setSearch(s => ({ ...s, [i]: "" }));
  };

  const openCreate = () => {
    const first = positions[0]?.name || "President";
    setForm({ title: "", description: "", start_date: "", end_date: "", candidates: [{ position: first, homeowner_id: "", name: "", bio: "", statement: "" }] });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
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
      setForm({ title: "", description: "", start_date: "", end_date: "", candidates: [{ position: positions[0]?.name || "President", homeowner_id: "", name: "", bio: "", statement: "" }] });
      setShowCreate(false);
      loadData();
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (el) => {
    await base44.entities.Election.update(el.id, { status: "closed" });
    loadData();
  };

  const handlePromote = async (el) => {
    if (!window.confirm("Approve the election winners and promote them to the board? Current board members will be removed automatically after one week.")) return;
    setPromoting(el.id);
    try {
      const res = await base44.functions.invoke("promote-election-winners", { election_id: el.id });
      if (res?.data?.error) throw new Error(res.data.error);
      await loadData();
    } catch (err) {
      window.alert(err.message || "Failed to promote winners");
    } finally {
      setPromoting(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Elections"
        subtitle="Manage board elections and view results"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Election</Button>}
      />

      {electionResults.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No elections yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {electionResults.map(el => {
            const total = el.total;
            const byPosition = {};
            (el.candidates || []).forEach((c, i) => {
              // Normalize to the display label so legacy enum values and
              // display names group together instead of duplicating sections.
              const key = positionLabel(c.position || "board_member");
              if (!byPosition[key]) byPosition[key] = [];
              byPosition[key].push({ ...c, count: el.counts[i] || 0 });
            });
            return (
              <div key={el.id} className="bg-card rounded-2xl warm-shadow p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{el.title}</h3>
                      <StatusBadge status={el.status} />
                    </div>
                    {el.description && <p className="text-sm text-muted-foreground mt-1">{el.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {el.start_date ? formatDate(el.start_date) : "Now"} — {formatDate(el.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {el.status === "active" && (
                      <Button variant="outline" size="sm" onClick={() => handleClose(el)}>Close</Button>
                    )}
                    {el.status === "closed" && !el.promoted && (
                      <Button size="sm" onClick={() => handlePromote(el)} disabled={promoting === el.id}>
                        {promoting === el.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserCheck className="w-4 h-4 mr-1" />}
                        Approve Winners
                      </Button>
                    )}
                    {el.promoted && (
                      <span className="text-xs font-medium text-primary flex items-center gap-1 whitespace-nowrap">
                        <Check className="w-3.5 h-3.5" /> Promoted{el.promoted_date ? ` ${formatDate(el.promoted_date)}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {orderedPositionKeys(byPosition, positions).map(key => {
                    const cands = byPosition[key];
                    if (!cands || cands.length === 0) return null;
                    return (
                      <div key={key}>
                        <p className="text-sm font-semibold mb-2">{positionLabel(key)}</p>
                        <div className="space-y-2">
                          {cands.map((c, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                  {c.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{c.name}</p>
                                  {c.bio && <p className="text-xs text-muted-foreground">{c.bio}</p>}
                                  {c.statement && <p className="text-xs text-muted-foreground italic mt-1">"{c.statement}"</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">{c.count} vote{c.count !== 1 ? "s" : ""}</p>
                                  {total > 0 && <p className="text-sm font-medium text-primary">{Math.round(c.count / total * 100)}%</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                      <Select value={c.position} onValueChange={v => updateCandidate(i, "position", v)}>
                        <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {positions.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {form.candidates.length > 1 && (
                        <button onClick={() => removeCandidate(i)} className="text-muted-foreground hover:text-destructive ml-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input
                          value={search[i] || ""}
                          onChange={e => setSearch(s => ({ ...s, [i]: e.target.value }))}
                          placeholder="Search homeowner to pre-fill"
                          className="h-9"
                        />
                      </div>
                      {search[i] && (
                        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {homeowners
                            .filter(h => (h.full_name || "").toLowerCase().includes((search[i] || "").toLowerCase()) || (h.email || "").toLowerCase().includes((search[i] || "").toLowerCase()))
                            .slice(0, 6)
                            .map(h => (
                              <button key={h.id} type="button" onClick={() => pickHomeowner(i, h)} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm">
                                <p className="font-medium">{h.full_name}</p>
                                {h.email && <p className="text-xs text-muted-foreground">{h.email}</p>}
                              </button>
                            ))}
                          {homeowners.filter(h => (h.full_name || "").toLowerCase().includes((search[i] || "").toLowerCase()) || (h.email || "").toLowerCase().includes((search[i] || "").toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted-foreground">No homeowners found</p>
                          )}
                        </div>
                      )}
                    </div>
                    <Input value={c.name} onChange={e => updateCandidate(i, "name", e.target.value)} placeholder="Candidate name" className="h-9" />
                    <Input value={c.bio} onChange={e => updateCandidate(i, "bio", e.target.value)} placeholder="Brief bio / email (optional)" className="h-9" />
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