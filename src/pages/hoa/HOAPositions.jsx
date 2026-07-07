import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pencil, ArrowUp, ArrowDown, ListOrdered } from "lucide-react";
import { DEFAULT_POSITIONS } from "@/lib/electionPositions";

export default function HOAPositions() {
  const { community } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!community) return;
    try {
      const recs = await base44.entities.BoardPosition.filter({ community_id: community.id });
      recs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setRecords(recs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (community) load(); else setLoading(false); }, [community]);

  const seedDefaults = async () => {
    setSaving(true);
    try {
      await base44.entities.BoardPosition.bulkCreate(
        DEFAULT_POSITIONS.map((name, i) => ({ community_id: community.id, name, sort_order: i }))
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addPosition = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await base44.entities.BoardPosition.create({ community_id: community.id, name, sort_order: records.length });
      setNewName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing?.name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.BoardPosition.update(editing.id, { name: editing.name.trim() });
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.BoardPosition.delete(id);
    load();
  };

  const move = async (rec, dir) => {
    const idx = records.findIndex(r => r.id === rec.id);
    const swap = records[idx + dir];
    if (!swap) return;
    await base44.entities.BoardPosition.bulkUpdate([
      { id: rec.id, sort_order: swap.sort_order },
      { id: swap.id, sort_order: rec.sort_order },
    ]);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <PageHeader title="Board Positions" subtitle="Customize the positions available in elections and your board directory" />

      {records.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-8 text-center">
          <ListOrdered className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Using default HOA positions</p>
          <p className="text-sm text-muted-foreground mb-5">{DEFAULT_POSITIONS.join(", ")}</p>
          <Button onClick={seedDefaults} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Customize Positions
          </Button>
          <p className="text-xs text-muted-foreground mt-3">This copies the defaults so you can edit, add, or remove positions for your community.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {records.map((r, i) => (
              <div key={r.id} className="bg-card rounded-xl warm-shadow p-4 flex items-center gap-3">
                <div className="flex flex-col">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(r, 1)} disabled={i === records.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{r.name}</p>
                </div>
                <button onClick={() => setEditing({ id: r.id, name: r.name })} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl warm-shadow p-4">
            <Label>Add a position</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPosition()} placeholder="e.g. Pool Committee Chair" />
              <Button onClick={addPosition} disabled={!newName.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Positions appear in elections and the board member role list, in this order.</p>
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit position</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Position name</Label>
              <Input value={editing?.name || ""} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} className="mt-1.5" autoFocus />
            </div>
            <Button onClick={saveEdit} disabled={!editing?.name.trim() || saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}