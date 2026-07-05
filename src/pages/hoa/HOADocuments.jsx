import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, FileText, Upload, Download } from "lucide-react";
import { formatDate } from "@/lib/format";

const CATEGORY_COLORS = {
  bylaws: "bg-purple-50 text-purple-700",
  rules: "bg-blue-50 text-blue-700",
  minutes: "bg-amber-50 text-amber-700",
  forms: "bg-green-50 text-green-700",
  other: "bg-gray-100 text-gray-600",
};

export default function HOADocuments() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "other" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    const docs = await base44.entities.Document.filter({ community_id: community.id }, "-created_date");
    setDocuments(docs);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const handleUpload = async () => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
    await base44.entities.Document.create({
      community_id: community.id,
      title: form.title,
      description: form.description,
      file_url,
      file_type: selectedFile.type,
      category: form.category,
      uploaded_by_id: user.id,
      is_public: true,
    });
    setUploading(false);
    setForm({ title: "", description: "", category: "other" });
    setSelectedFile(null);
    setShowUpload(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Document.delete(id);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Documents"
        subtitle="Upload governing docs — these also power the AI assistant"
        action={<Button onClick={() => setShowUpload(true)}><Plus className="w-4 h-4 mr-2" /> Upload Document</Button>}
      />

      {documents.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No documents yet. Upload bylaws, rules, or meeting minutes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-card rounded-2xl warm-shadow p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{doc.title}</h3>
                    {doc.description && <p className="text-sm text-muted-foreground truncate">{doc.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                        {doc.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {selectedFile ? (
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="Community Bylaws 2024" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bylaws">Bylaws</SelectItem>
                  <SelectItem value="rules">Rules</SelectItem>
                  <SelectItem value="minutes">Meeting Minutes</SelectItem>
                  <SelectItem value="forms">Forms</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpload} disabled={!selectedFile || !form.title || uploading} className="w-full">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}