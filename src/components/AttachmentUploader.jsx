import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, X, FileText } from "lucide-react";

const isImage = (url = "") => /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url);

// Multi-file uploader. Uploads each file via the Core integration and calls
// onChange with an attachments array of { name, url }.
export default function AttachmentUploader({ value = [], onChange, label = "Attach photos or files" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const added = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        added.push({ name: file.name, url: file_url });
      }
      onChange([...value, ...added]);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(Array.from(e.target.files))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors text-muted-foreground disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        <span className="text-sm">{uploading ? "Uploading..." : label}</span>
      </button>
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {value.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
              {isImage(att.url) ? (
                <img src={att.url} alt={att.name || ""} className="w-full h-20 object-cover" />
              ) : (
                <div className="w-full h-20 flex flex-col items-center justify-center bg-muted gap-1 px-1">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">{att.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}