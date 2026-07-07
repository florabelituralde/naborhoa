import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Optional vendor/company or "other" assignee for a request. This is NOT used
// for approval (admins and board members approve directly) — it's only for
// recording who will physically perform the work, when relevant.
export default function RequestAssignPanel({ request, onSave, updating }) {
  const currentType = request.assignee_type || "none";
  const [mode, setMode] = useState(
    currentType === "vendor" ? "__vendor" : currentType === "other" ? "__other" : "_none"
  );
  const info = request.assignee_info || {};
  const [vendor, setVendor] = useState({
    company: info.company || "",
    contact: info.contact || "",
    category: info.category || "",
    details: info.details || "",
  });
  const [other, setOther] = useState({
    name: currentType === "other" ? (request.assigned_to_name || "") : "",
    details: info.details || "",
  });

  const handleChange = (val) => {
    setMode(val);
    if (val === "_none") {
      onSave({ assignee_type: "none", assigned_to_id: "", assigned_to_name: "", assignee_info: {} });
    }
  };
  const saveVendor = () => {
    if (!vendor.company.trim()) return;
    onSave({ assignee_type: "vendor", assigned_to_id: "", assigned_to_name: vendor.company.trim(), assignee_info: { ...vendor } });
  };
  const saveOther = () => {
    if (!other.name.trim()) return;
    onSave({ assignee_type: "other", assigned_to_id: "", assigned_to_name: other.name.trim(), assignee_info: { details: other.details } });
  };

  return (
    <div className="mb-6">
      <Label>Vendor / Assignee (optional)</Label>
      <Select value={mode} onValueChange={handleChange}>
        <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">None</SelectItem>
          <SelectItem value="__vendor">Vendor / Company</SelectItem>
          <SelectItem value="__other">Other</SelectItem>
        </SelectContent>
      </Select>

      {mode === "__vendor" && (
        <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <div>
            <Label>Company / Vendor name <span className="text-destructive">*</span></Label>
            <Input value={vendor.company} onChange={(e) => setVendor({ ...vendor, company: e.target.value })} className="mt-1.5" placeholder="Acme Plumbing Co." />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Contact (phone / email)</Label>
              <Input value={vendor.contact} onChange={(e) => setVendor({ ...vendor, contact: e.target.value })} className="mt-1.5" placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label>Type of work</Label>
              <Input value={vendor.category} onChange={(e) => setVendor({ ...vendor, category: e.target.value })} className="mt-1.5" placeholder="Plumbing repair" />
            </div>
          </div>
          <div>
            <Label>Notes for homeowner</Label>
            <Textarea value={vendor.details} onChange={(e) => setVendor({ ...vendor, details: e.target.value })} className="mt-1.5" rows={2} placeholder="What the vendor will do, when to expect them..." />
          </div>
          <Button size="sm" onClick={saveVendor} disabled={updating || !vendor.company.trim()}>
            {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Vendor
          </Button>
        </div>
      )}

      {mode === "__other" && (
        <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <div>
            <Label>Name / Title <span className="text-destructive">*</span></Label>
            <Input value={other.name} onChange={(e) => setOther({ ...other, name: e.target.value })} className="mt-1.5" placeholder="e.g. Management Company, Inspector" />
          </div>
          <div>
            <Label>Details for homeowner</Label>
            <Textarea value={other.details} onChange={(e) => setOther({ ...other, details: e.target.value })} className="mt-1.5" rows={3} placeholder="Explain who will handle this and what to expect..." />
          </div>
          <Button size="sm" onClick={saveOther} disabled={updating || !other.name.trim()}>
            {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
          </Button>
        </div>
      )}
    </div>
  );
}