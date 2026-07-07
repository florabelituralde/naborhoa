import React from "react";
import { FileText, Download } from "lucide-react";

const isImage = (url = "") => /\.(png|jpe?g|gif|webp|bmp)$/i.test(url);

// Forces a real download via a blob; falls back to opening in a new tab if
// the storage host blocks cross-origin fetch.
async function downloadFile(att) {
  try {
    const res = await fetch(att.url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = att.name || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(att.url, "_blank");
  }
}

export default function RequestAttachments({ attachments, image_url }) {
  const list = attachments?.length
    ? attachments
    : image_url
    ? [{ name: "Attachment", url: image_url }]
    : [];
  if (list.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground mb-3">Attachments</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((att, i) => {
          const img = isImage(att.url);
          return (
            <div key={i} className="rounded-xl border border-border overflow-hidden flex flex-col">
              {img ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="block">
                  <img src={att.url} alt={att.name} className="h-28 w-full object-cover" />
                </a>
              ) : (
                <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-3 text-sm hover:bg-muted h-28">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <span className="truncate">{att.name}</span>
                </a>
              )}
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-border bg-muted/40">
                <span className="text-[11px] text-muted-foreground truncate flex-1">{att.category || "File"}</span>
                <button
                  type="button"
                  onClick={() => downloadFile(att)}
                  className="text-primary hover:text-primary/80 shrink-0"
                  title="Download"
                  aria-label={`Download ${att.name}`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}