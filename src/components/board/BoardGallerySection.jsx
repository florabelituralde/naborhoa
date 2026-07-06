import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Images, X, Check } from "lucide-react";

export default function BoardGallerySection({ community, gallery, onChange }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    setSaving(true);
    try {
      const newUrls = [];
      for (const file of pendingFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newUrls.push(file_url);
      }
      const updated = [...gallery, ...newUrls];
      await base44.entities.Community.update(community.id, { gallery: updated });
      setPendingFiles([]);
      onChange(updated);
    } catch (err) {
      console.error("Failed to upload gallery photos:", err);
    }
    setSaving(false);
  };

  const handleRemove = async (idx) => {
    const updated = gallery.filter((_, i) => i !== idx);
    await base44.entities.Community.update(community.id, { gallery: updated });
    onChange(updated);
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
        <Images className="w-5 h-5 text-primary" /> Community Gallery
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {gallery.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
            <button onClick={() => handleRemove(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg h-20 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">Add</span>
        </div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => setPendingFiles([...pendingFiles, ...Array.from(e.target.files)])} />
      {pendingFiles.length > 0 && (
        <div className="flex items-center gap-3 mt-3">
          <p className="text-xs text-muted-foreground">{pendingFiles.length} photo(s) ready</p>
          <Button size="sm" onClick={handleUpload} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            Upload
          </Button>
        </div>
      )}
    </div>
  );
}