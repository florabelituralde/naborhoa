import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, X } from "lucide-react";

const ATTACHMENT_CATEGORIES = [
  "Photo / Evidence",
  "Document",
  "Receipt / Invoice",
  "Permit / Approval",
  "Plan / Drawing",
  "Other",
];

// Homeowner edit + resubmit dialog. Used while a request is "submitted" (edit)
// or "info_requested" (resubmit with the requested info). Saving runs through
// the homeowner-update-request backend function, which notifies HOA/board.
export default function RequestEditDialog({ request, open, onOpenChange, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [existing, setExisting] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(request.title || "");
      setDescription(request.description || "");
      setContactPhone(request.contact_phone || "");
      setContactEmail(request.contact_email || "");
      setExisting(request.attachments || []);
      setNewFiles([]);
      setError(null);
    }
  }, [open, request.id]);

  const addFiles = (fileList) => {
    const next = Array.from(fileList).map((file) => ({
      file,
      category: file.type?.startsWith("image/") ? "Photo / Evidence" : "Document",
    }));
    setNewFiles((prev) => [...prev, ...next]);
  };
  const removeNewFile = (i) => setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
  const removeExisting = (i) => setExisting((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const uploaded = [];
      for (const item of newFiles) {
        const result = await base44.integrations.Core.UploadFile({ file: item.file });
        uploaded.push({ name: item.file.name, url: result.file_url, category: item.category });
      }
      const attachments = [...existing, ...uploaded];
      const { data } = await base44.functions.invoke("homeowner-update-request", {
        request_id: request.id,
        title,
        description,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        attachments,
      });
      if (data?.error) throw new Error(data.error);
      onSaved(data.request);
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const resubmitting = request.status === "info_requested";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resubmitting ? "Resubmit with updates" : "Edit Request"}</DialogTitle>
          <DialogDescription>
            {resubmitting
              ? "Provide the requested information and resubmit to the HOA."
              : "Update your request details. The HOA will be notified."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={4} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Contact phone</Label>
              <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Attachments</Label>
            {existing.length > 0 && (
              <div className="mt-2 space-y-2">
                {existing.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border px-3 py-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{a.name}{a.category ? ` · ${a.category}` : ""}</span>
                    <button onClick={() => removeExisting(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div onClick={() => fileInputRef.current?.click()} className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Add more photos or files</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            {newFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {newFiles.map((item, i) => (
                  <div key={i} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{item.file.name}</span>
                      <button onClick={() => removeNewFile(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                    <Select value={item.category} onValueChange={(v) => setNewFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, category: v } : p)))}>
                      <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ATTACHMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting || !title.trim() || !description.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {resubmitting ? "Resubmit" : "Save Updates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}