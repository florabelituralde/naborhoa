import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Loader2, FileUp, FileText, X } from "lucide-react";

const CATEGORIES = [
  { id: "bylaws", label: "Bylaws" },
  { id: "rules", label: "Rules" },
  { id: "minutes", label: "Minutes" },
  { id: "forms", label: "Forms" },
  { id: "other", label: "Other" },
];

// Optional step: upload starter documents (bylaws, rules, forms...) for the community.
// Docs are staged in local state and created after the community exists.
export default function CommunityDocumentsStep({ value, onChange, onFinish, onBack, submitting }) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("bylaws");

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([
        ...value,
        {
          title: title.trim() || file.name,
          category,
          file_url,
          file_type: file.type,
        },
      ]);
      setTitle("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="bg-card rounded-2xl warm-shadow-md p-8">
      <h2 className="text-2xl font-bold mb-1">Add documents</h2>
      <p className="text-muted-foreground mb-6">
        Upload bylaws, rules, or forms for your residents. This step is optional — you can add more anytime.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="docTitle">Document title (optional)</Label>
          <Input
            id="docTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Community Bylaws 2026"
            className="mt-1.5 h-11"
          />
        </div>
        <div>
          <Label>Category</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  category === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <>
              <FileUp className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload a document (PDF, DOC, image)</span>
            </>
          )}
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>

        {value.length > 0 && (
          <div className="space-y-2">
            {value.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{doc.category}</p>
                </div>
                <button type="button" onClick={() => remove(idx)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="h-12" disabled={submitting}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button type="button" onClick={onFinish} disabled={uploading || submitting} className="flex-1 h-12">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {value.length > 0 ? "Finish setup" : "Skip & finish"}
            {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}