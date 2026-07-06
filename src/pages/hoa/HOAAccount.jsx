import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, User as UserIcon, Mail } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function HOAAccount() {
  const { user, community } = useOutletContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!community) return;
    setName(community.name || "");
    setDescription(community.description || "");
    setCity(community.city || "");
    setState(community.state || "");
    setZip(community.zip || "");
  }, [community]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Community.update(community.id, {
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
      });
      toast({ title: "Saved", description: "Community details updated." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  if (!community) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="My Account" subtitle="Your profile and community details" />

      {/* Profile */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" />{user?.full_name}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</p>
        </div>
      </div>

      {/* Community Details */}
      <div className="bg-card rounded-2xl warm-shadow p-6">
        <h2 className="font-semibold text-lg mb-4">Community Details</h2>
        <div className="space-y-4">
          <div>
            <Label>Community Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" placeholder="Maple Street HOA" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5" rows={3} placeholder="Tell members about your community" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1.5" placeholder="Austin" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={state} onChange={e => setState(e.target.value)} className="mt-1.5" placeholder="TX" />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input value={zip} onChange={e => setZip(e.target.value)} className="mt-1.5" placeholder="78701" />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !name.trim()} className="mt-6">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}