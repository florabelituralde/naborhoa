import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Assign a request to a board member, an external vendor/company, or a custom
// "Other" party. Board members are passed in from the community's BoardMember
// list; Vendor and Other reveal a short form whose details are shown to the
// homeowner.
export default function RequestAssignPanel({ request, boardMembers, onSave, updating }) {
  const currentType = request.assignee_type || (request.assigned_to_id ? "staff" : "none");
  const initialMode =
    currentType === "vendor" ? "__vendor"
    : currentType === "other" ? "__other"
    : request.assigned_to_id || "_none";
  const [mode, setMode] = useState(initialMode);

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
    } else if (val !== "__vendor" && val !== "__other") {
      const member = boardMembers.find((m) => m.id === val);
      onSave({ assignee_type: "staff", assigned_to_id: val, assigned_to_name: member?.name || "", assignee_info: {} });
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
      <Label>Assign Request</Label>
      <Select value={mode} onValueChange={handleChange}>
        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select assignee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">Unassigned</SelectItem>
          {boardMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}{m.role ? ` · ${m.role.replace("_", " ")}` : ""}
            </SelectItem>
          ))}
          <SelectItem value="__vendor">Vendor / Company</SelectItem>
          <SelectItem value="__other">Other</SelectItem>
        </SelectContent>
      </Select>
      {boardMembers.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2">No board members found — choose Vendor or Other to assign.</p>
      )}

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