import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import DrawerSelect from "@/components/mobile/DrawerSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { REQUEST_TYPE_ICONS } from "@/lib/defaultRequestTypes";

const emptyType = {
  name: "", description: "", icon: "Wrench", category: "maintenance",
  requires_attachment: false, attachment_label: "Attachments (photos, plans, documents)",
  active: true, custom_fields: [],
};

// Modal editor for a single request type + its custom fields.
export default function RequestTypeEditor({ open, onOpenChange, initial, onSave }) {
  const [form, setForm] = useState(initial || emptyType);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial || emptyType);
  }, [initial, open]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const addField = () => set({ custom_fields: [...(form.custom_fields || []), { label: "", type: "text", required: false, options: [] }] });
  const updateField = (i, patch) => set({ custom_fields: form.custom_fields.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  const removeField = (i) => set({ custom_fields: form.custom_fields.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Request Type" : "New Request Type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => set({ name: e.target.value })} className="mt-1.5" placeholder="Fence Installation" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set({ description: e.target.value })} className="mt-1.5" rows={2} placeholder="What this request is for" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Icon</Label>
              <DrawerSelect
                value={form.icon}
                onValueChange={v => set({ icon: v })}
                title="Choose an icon"
                className="mt-1.5"
                options={REQUEST_TYPE_ICONS.map(ic => ({ value: ic, label: ic }))}
              />
            </div>
            <div>
              <Label>Category</Label>
              <DrawerSelect
                value={form.category}
                onValueChange={v => set({ category: v })}
                title="Choose a category"
                className="mt-1.5"
                options={[
                  { value: "plan_review", label: "Approval — homeowner does the work" },
                  { value: "maintenance", label: "Maintenance — HOA handles it" },
                  { value: "repair", label: "Repair — HOA handles it" },
                  { value: "other", label: "Other — HOA handles it" },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Require attachment</p>
              <p className="text-xs text-muted-foreground">Resident must upload at least one file</p>
            </div>
            <Switch checked={form.requires_attachment} onCheckedChange={v => set({ requires_attachment: v })} />
          </div>
          <div>
            <Label>Attachment label</Label>
            <Input value={form.attachment_label} onChange={e => set({ attachment_label: e.target.value })} className="mt-1.5" />
          </div>

          {/* Custom fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Custom fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}><Plus className="w-4 h-4 mr-1" /> Add field</Button>
            </div>
            <div className="space-y-3">
              {(form.custom_fields || []).map((field, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={field.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Field label" className="h-9" />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => removeField(i)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="w-36">
                      <DrawerSelect
                        value={field.type}
                        onValueChange={v => updateField(i, { type: v })}
                        title="Field type"
                        className="h-9"
                        options={[
                          { value: "text", label: "Short text" },
                          { value: "textarea", label: "Long text" },
                          { value: "number", label: "Number" },
                          { value: "select", label: "Dropdown" },
                        ]}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-sm">
                      <Switch checked={field.required} onCheckedChange={v => updateField(i, { required: v })} />
                      Required
                    </label>
                  </div>
                  {field.type === "select" && (
                    <Input
                      value={(field.options || []).join(", ")}
                      onChange={e => updateField(i, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })}
                      placeholder="Options, comma separated"
                      className="h-9"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}