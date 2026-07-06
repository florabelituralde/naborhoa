import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, Building2 } from "lucide-react";

// Lets an existing HOA admin add another community to their organization.
// The new community becomes their active community and they land on its dashboard.
export default function HOAAddCommunity() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", city: "", state: "", zip: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [dupError, setDupError] = useState("");

  const handleCreate = async () => {
    setDupError("");
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      if (!me.organization_id) {
        setDupError("Your account isn't linked to an organization.");
        setSubmitting(false);
        return;
      }

      // Prevent two communities in the exact same city/state.
      const city = form.city.trim().toLowerCase();
      const state = form.state.trim().toLowerCase();
      if (city) {
        const existing = await base44.entities.Community.list();
        const clash = existing.find(c =>
          (c.city || "").trim().toLowerCase() === city &&
          (c.state || "").trim().toLowerCase() === state
        );
        if (clash) {
          setDupError(`A community already exists in ${form.city}${form.state ? ", " + form.state : ""} ("${clash.name}").`);
          setSubmitting(false);
          return;
        }
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const commRecord = await base44.entities.Community.create({
        name: form.name.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        description: form.description.trim(),
        organization_id: me.organization_id,
        join_code: code,
      });

      // Make the new community the active one.
      await base44.auth.updateMe({ community_id: commRecord.id });
      window.location.href = "/hoa/dashboard";
    } catch (err) {
      console.error(err);
      setDupError("Could not create the community. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <PageHeader title="Add Community" subtitle="Create another community under your organization" />

      <div className="bg-card rounded-2xl warm-shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground">You'll switch to this community once it's created.</p>
        </div>

        {dupError && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{dupError}</div>}

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Community Name</Label>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maple Street Estates" className="mt-1.5 h-11" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Austin" className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="TX" className="mt-1.5 h-11" />
            </div>
          </div>
          <div>
            <Label htmlFor="zip">Zip Code</Label>
            <Input id="zip" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="78701" className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/hoa/dashboard")} className="h-12">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || !form.city.trim() || submitting} className="flex-1 h-12">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Community <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}