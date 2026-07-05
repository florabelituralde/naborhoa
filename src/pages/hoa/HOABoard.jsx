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
import { Loader2, Plus, Trash2, Contact, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";

const ROLE_LABELS = {
  president: "President",
  vice_president: "Vice President",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member_at_large: "Member at Large",
};

const ROLE_ORDER = ["president", "vice_president", "treasurer", "secretary", "member_at_large"];

export default function HOABoard() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "member_at_large", bio: "", email: "", term_start: "", term_end: "" });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const mems = await base44.entities.BoardMember.filter({ community_id: community.id });
    setMembers(mems);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const handleAdd = async () => {
    setCreating(true);
    await base44.entities.BoardMember.create({ ...form, community_id: community.id });
    setForm({ name: "", role: "member_at_large", bio: "", email: "", term_start: "", term_end: "" });
    setShowAdd(false);
    setCreating(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.BoardMember.delete(id);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const sorted = [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Board Members"
        subtitle="Manage your HOA board directory"
        action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add Member</Button>}
      />

      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Contact className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No board members yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sorted.map(m => (
            <div key={m.id} className="bg-card rounded-2xl warm-shadow p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{m.name}</h3>
                    <p className="text-xs text-primary font-medium">{ROLE_LABELS[m.role]}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {m.bio && <p className="text-sm text-muted-foreground mt-3">{m.bio}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {m.email && <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {m.email}</p>}
                {(m.term_start || m.term_end) && (
                  <p>Term: {m.term_start ? formatDate(m.term_start) : "—"} to {m.term_end ? formatDate(m.term_end) : "—"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Board Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" placeholder="Jane Smith" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="president">President</SelectItem>
                  <SelectItem value="vice_president">Vice President</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="member_at_large">Member at Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bio (optional)</Label>
              <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="mt-1.5" rows={2} placeholder="Brief background..." />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5" placeholder="jane@neighborhood.org" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term Start</Label>
                <Input type="date" value={form.term_start} onChange={e => setForm({ ...form, term_start: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Term End</Label>
                <Input type="date" value={form.term_end} onChange={e => setForm({ ...form, term_end: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!form.name || creating} className="w-full">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}